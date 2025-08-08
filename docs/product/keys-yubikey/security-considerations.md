# Security Considerations: YubiKey Integration

## Overview

This document analyzes the security implications of adding YubiKey support to Barqly Vault, identifying potential threats and mitigation strategies.

## Threat Model

### Primary Assets to Protect
1. **Private Keys**: Age encryption keys (on YubiKey and passphrase-protected)
2. **PINs**: YubiKey PIN codes
3. **Encrypted Vaults**: User's encrypted files
4. **Metadata**: Information about keys and vaults

### Threat Actors
1. **Remote Attackers**: Malware, network attacks
2. **Physical Attackers**: Device theft, shoulder surfing
3. **Insider Threats**: Malicious software dependencies
4. **User Errors**: Misconfiguration, poor practices

## Security Analysis by Component

### YubiKey Hardware Security

#### Strengths
- Private keys generated on-chip, never exportable
- Hardware-backed cryptographic operations
- Tamper-resistant secure element
- PIN protection with lockout after failures
- Optional touch requirement for operations

#### Vulnerabilities
- **Physical Loss**: No remote wipe capability
- **PIN Bruteforce**: Limited to 3-8 attempts (configurable)
- **Supply Chain**: Potential for compromised devices
- **Side Channels**: Theoretical power/timing analysis

#### Mitigations
```rust
// Enforce strong PIN requirements
pub fn validate_pin(pin: &str) -> Result<(), SecurityError> {
    if pin.len() < 6 {
        return Err(SecurityError::PinTooShort);
    }
    
    // Prevent common PINs
    const BLOCKED_PINS: &[&str] = &[
        "000000", "111111", "123456", "654321",
        "000001", "123123", "666666", "696969"
    ];
    
    if BLOCKED_PINS.contains(&pin) {
        return Err(SecurityError::CommonPin);
    }
    
    // Prevent sequential patterns
    if is_sequential(pin) {
        return Err(SecurityError::SequentialPin);
    }
    
    Ok(())
}
```

### Multi-Recipient Encryption Security

#### Strengths
- Each recipient has independent decryption capability
- Compromise of one key doesn't affect others
- Age format is cryptographically sound
- No key escrow or recovery backdoor

#### Vulnerabilities
- **Metadata Leakage**: Recipients visible in file headers
- **Chosen Ciphertext**: Theoretical attacks on age format
- **Recipient Confusion**: Wrong key might decrypt wrong file

#### Mitigations
```rust
// Verify recipient matches expected key
pub fn verify_recipient_authorization(
    vault_metadata: &VaultMetadata,
    decrypting_key: &str
) -> bool {
    vault_metadata.recipients
        .iter()
        .any(|r| r.public_key == decrypting_key)
}
```

### Plugin Security

#### Vulnerabilities
- **Supply Chain Attack**: Compromised age-plugin-yubikey
- **Binary Injection**: Replaced plugin executable
- **Privilege Escalation**: Plugin running with elevated permissions
- **Communication Intercept**: Plugin I/O could be monitored

#### Mitigations
```rust
// Verify plugin binary integrity
pub fn verify_plugin_integrity() -> Result<(), SecurityError> {
    let plugin_path = get_plugin_path()?;
    let actual_hash = calculate_sha256(&plugin_path)?;
    
    // Known good hashes for each version
    const KNOWN_HASHES: &[(&str, &str)] = &[
        ("0.5.0", "sha256:abcd1234..."),
        ("0.5.1", "sha256:efgh5678..."),
    ];
    
    let plugin_version = get_plugin_version()?;
    let expected_hash = KNOWN_HASHES
        .iter()
        .find(|(v, _)| v == &plugin_version)
        .map(|(_, h)| h)
        .ok_or(SecurityError::UnknownPluginVersion)?;
    
    if actual_hash != expected_hash {
        return Err(SecurityError::PluginTampered);
    }
    
    Ok(())
}

// Sandbox plugin execution
#[cfg(target_os = "macos")]
fn sandbox_plugin_execution() {
    // Use macOS sandbox profile
    let sandbox_profile = r#"
        (version 1)
        (deny default)
        (allow process-fork)
        (allow process-exec)
        (allow file-read* (literal "/dev/null"))
        (allow file-write* (literal "/dev/null"))
        (allow iokit-open (iokit-user-client-class "IOUSBDeviceUserClient"))
    "#;
    
    // Apply sandbox before executing plugin
}
```

### PIN Management Security

#### Vulnerabilities
- **Memory Disclosure**: PIN in application memory
- **Keystroke Logging**: PIN entry could be captured
- **Shoulder Surfing**: Visual PIN observation
- **Cache Timing**: PIN comparison timing attacks

#### Mitigations
```rust
use zeroize::Zeroizing;
use subtle::ConstantTimeEq;

// Secure PIN handling
pub struct SecurePin(Zeroizing<String>);

impl SecurePin {
    pub fn new(pin: String) -> Self {
        SecurePin(Zeroizing::new(pin))
    }
    
    // Constant-time comparison
    pub fn verify(&self, other: &str) -> bool {
        let a = self.0.as_bytes();
        let b = other.as_bytes();
        
        if a.len() != b.len() {
            return false;
        }
        
        a.ct_eq(b).into()
    }
}

// Clear PIN from memory after use
impl Drop for SecurePin {
    fn drop(&mut self) {
        // Zeroizing handles secure cleanup
    }
}
```

### Metadata Security

#### Vulnerabilities
- **Information Disclosure**: Metadata reveals key relationships
- **Tampering**: Modified metadata could misdirect users
- **Privacy Leak**: Usage patterns visible in metadata

#### Mitigations
```rust
// Sign metadata for integrity
use ed25519_dalek::{Keypair, Signature};

pub struct SignedMetadata {
    pub metadata: MetadataV2,
    pub signature: Signature,
}

impl SignedMetadata {
    pub fn create(metadata: MetadataV2, keypair: &Keypair) -> Self {
        let bytes = serde_json::to_vec(&metadata).unwrap();
        let signature = keypair.sign(&bytes);
        
        SignedMetadata {
            metadata,
            signature,
        }
    }
    
    pub fn verify(&self, public_key: &PublicKey) -> bool {
        let bytes = serde_json::to_vec(&self.metadata).unwrap();
        public_key.verify(&bytes, &self.signature).is_ok()
    }
}

// Encrypt sensitive metadata fields
pub fn encrypt_metadata_field(field: &str, key: &[u8]) -> String {
    let cipher = ChaCha20Poly1305::new(key.into());
    let nonce = generate_nonce();
    let ciphertext = cipher.encrypt(&nonce, field.as_bytes()).unwrap();
    
    base64::encode([&nonce[..], &ciphertext[..]].concat())
}
```

## Security Best Practices

### For Users

#### YubiKey Management
1. **Always register multiple YubiKeys** (minimum 2)
2. **Store backup YubiKey separately** (safe deposit box)
3. **Use unique PINs** per YubiKey
4. **Enable touch requirement** for high-security vaults
5. **Test recovery quarterly**

#### PIN Security
1. **Never share PINs**
2. **Use different PIN than other services**
3. **Change PIN if device compromised**
4. **Don't write PIN with YubiKey**

#### Backup Strategy
```
Recommended Setup:
├── Primary YubiKey (daily carry)
├── Backup YubiKey (home safe)
├── Passphrase (memorized + secure storage)
└── Printed backup card (safe deposit box)
```

### For Developers

#### Secure Coding Practices
1. **Never log sensitive data** (PINs, keys, passphrases)
2. **Use constant-time comparisons** for secrets
3. **Zeroize memory** after use
4. **Validate all inputs** from plugins
5. **Sandbox plugin execution**

#### Error Handling
```rust
// Don't leak information in errors
pub enum YubiKeyError {
    // Bad: Reveals too much
    // InvalidPin { attempts_remaining: u8 }
    
    // Good: Generic error
    AuthenticationFailed,
}

// Log security events
fn log_security_event(event: SecurityEvent) {
    match event {
        SecurityEvent::YubiKeyAdded { serial } => {
            audit_log!("YubiKey {} added to vault", serial);
        },
        SecurityEvent::DecryptionAttempt { success, method } => {
            audit_log!("Decryption {} via {}", 
                if success { "succeeded" } else { "failed" },
                method
            );
        },
    }
}
```

## Compliance Considerations

### FIPS 140-2
- YubiKey 5 FIPS Series available for compliance
- Ensure FIPS mode enabled when required
- Document cryptographic boundaries

### Common Criteria
- YubiKey certified to CC EAL5+
- Application should maintain certification requirements

### GDPR/Privacy
- Metadata may contain personal information
- Implement right to erasure for metadata
- Document data retention policies

## Incident Response

### Compromised YubiKey
1. Immediately remove from all vaults
2. Re-encrypt vaults with remaining keys
3. Generate new YubiKey
4. Audit access logs for unauthorized use

### Lost YubiKey
1. Use backup YubiKey or passphrase
2. Remove lost key from system
3. Monitor for attempted use
4. Replace with new YubiKey

### Forgotten PIN
1. After 3 failures, YubiKey locks
2. Use alternate authentication method
3. Reset YubiKey if no alternates
4. Implement new keys if reset

## Security Testing Requirements

### Penetration Testing
- [ ] YubiKey communication intercept attempts
- [ ] PIN brute force resistance
- [ ] Plugin tampering detection
- [ ] Metadata manipulation tests
- [ ] Side-channel analysis

### Fuzzing
```rust
#[cfg(test)]
mod fuzz_tests {
    use arbitrary::{Arbitrary, Unstructured};
    
    #[test]
    fn fuzz_pin_validation() {
        let data = [0u8; 1024];
        let mut u = Unstructured::new(&data);
        
        for _ in 0..1000 {
            if let Ok(pin) = String::arbitrary(&mut u) {
                // Should not panic or crash
                let _ = validate_pin(&pin);
            }
        }
    }
}
```

### Security Checklist

#### Before Release
- [ ] All PINs properly zeroized
- [ ] Plugin signature verification enabled
- [ ] Metadata integrity protection
- [ ] Audit logging implemented
- [ ] Security documentation complete

#### Ongoing
- [ ] Monitor for YubiKey vulnerabilities
- [ ] Update plugin regularly
- [ ] Review security logs
- [ ] User security education
- [ ] Incident response drills

## Conclusion

YubiKey integration significantly enhances Barqly Vault's security posture when implemented correctly. The hardware-backed security provides defense against many attacks that purely software-based solutions cannot prevent. However, proper implementation of the security measures outlined in this document is critical to realizing these benefits while avoiding new vulnerabilities.