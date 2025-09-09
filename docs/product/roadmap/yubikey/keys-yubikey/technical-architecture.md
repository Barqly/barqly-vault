# Technical Architecture: YubiKey Integration

## Overview

This document details the technical implementation of YubiKey support in Barqly Vault using `age-plugin-yubikey` for native hardware key integration.

## Core Technology Stack

### Dependencies

```toml
# Cargo.toml additions
[dependencies]
age-plugin-yubikey = "0.5"  # Age encryption YubiKey plugin
yubikey = "0.8"             # YubiKey PIV interface
x509-cert = "0.2"           # Certificate handling
rsa = "0.9"                 # RSA operations
p256 = "0.13"               # ECC operations
```

### NPM Packages

```json
{
  "devDependencies": {
    "@types/node-hid": "^1.3.1"
  }
}
```

## Architecture Design

### Multi-Recipient Encryption Model

```
                 age encryption
                      ↓
    ┌─────────────────────────────────┐
    │     Encrypted Vault File         │
    │                                  │
    │  Header:                         │
    │  - Recipient 1: age1regular...   │
    │  - Recipient 2: age1yubikey1...  │
    │  - Recipient 3: age1yubikey1...  │
    │                                  │
    │  Body: Encrypted data            │
    └─────────────────────────────────┘
                      ↓
        Can be decrypted by ANY recipient
```

### Key Management Structure

```rust
// Core data structures
pub struct KeyManager {
    recipients: Vec<Recipient>,
    metadata_path: PathBuf,
}

pub enum Recipient {
    Passphrase {
        identity: age::x25519::Identity,
        public_key: String,
        encrypted_key: Vec<u8>,
        hint: Option<String>,
    },
    YubiKey {
        identity: String,  // age1yubikey1...
        serial: u32,
        slot: PIVSlot,
        device_name: String,
    },
}

pub struct EncryptionContext {
    recipients: Vec<Box<dyn age::Recipient>>,
    metadata: VaultMetadata,
}
```

## YubiKey Integration

### Plugin Bundle Strategy

```bash
# Application bundle structure
Barqly-Vault.app/
├── Contents/
│   ├── MacOS/
│   │   ├── barqly-vault
│   │   └── age-plugin-yubikey  # Bundled plugin binary
│   ├── Resources/
│   │   └── plugins/
│   │       └── age-plugin-yubikey.exe  # Windows version

# Linux package
/usr/lib/barqly-vault/
├── barqly-vault
└── plugins/
    └── age-plugin-yubikey
```

### YubiKey Detection and Management

```rust
use yubikey::{YubiKey, Management, PivSlot};

pub struct YubiKeyManager {
    detected_keys: Vec<YubiKeyInfo>,
}

#[derive(Debug, Serialize)]
pub struct YubiKeyInfo {
    serial: u32,
    version: String,
    available_slots: Vec<PIVSlot>,
    has_pin: bool,
}

impl YubiKeyManager {
    pub fn detect_yubikeys() -> Result<Vec<YubiKeyInfo>, Error> {
        let mut keys = vec![];

        for device in yubikey::reader::list()? {
            if let Ok(yk) = YubiKey::open(device) {
                let serial = yk.serial()?;
                let version = yk.version()?;

                // Check available PIV slots
                let slots = vec![
                    PIVSlot::Retired1,  // 0x82
                    PIVSlot::Retired2,  // 0x83
                    PIVSlot::Retired3,  // 0x84
                ];

                keys.push(YubiKeyInfo {
                    serial,
                    version: format!("{}", version),
                    available_slots: slots,
                    has_pin: yk.verify_pin(b"123456").is_ok(), // Check default
                });
            }
        }

        Ok(keys)
    }
}
```

### Key Generation on YubiKey

```rust
#[tauri::command]
pub async fn generate_yubikey_recipient(
    serial: u32,
    slot: u8,
    pin: String,
) -> CommandResponse<YubiKeyRecipient> {
    // Use age-plugin-yubikey for generation
    let output = Command::new("age-plugin-yubikey")
        .args(&[
            "--generate",
            "--serial", &serial.to_string(),
            "--slot", &format!("{:02x}", slot),
            "--pin-env", "YUBIKEY_PIN",
        ])
        .env("YUBIKEY_PIN", pin)
        .output()?;

    let identity = String::from_utf8(output.stdout)?;
    let public_key = extract_public_key(&identity)?;

    Ok(YubiKeyRecipient {
        identity: public_key,
        serial,
        slot,
    })
}
```

## Backend Implementation

### New Tauri Commands

#### 1. Detect YubiKeys

```rust
#[tauri::command]
pub async fn detect_yubikeys() -> CommandResponse<Vec<YubiKeyInfo>> {
    match YubiKeyManager::detect_yubikeys() {
        Ok(keys) => CommandResponse::Success {
            data: keys,
            message: format!("Found {} YubiKey(s)", keys.len()),
        },
        Err(e) => CommandResponse::Error {
            code: ErrorCode::HardwareError,
            message: format!("Failed to detect YubiKeys: {}", e),
        },
    }
}
```

#### 2. Setup YubiKey Protection

```rust
#[tauri::command]
pub async fn setup_yubikey_protection(
    key_label: String,
    protection_config: ProtectionConfig,
) -> CommandResponse<SetupResult> {
    let mut recipients = vec![];

    // Add passphrase recipient if configured
    if let Some(passphrase) = protection_config.passphrase {
        let identity = age::x25519::Identity::generate();
        let encrypted = encrypt_with_passphrase(&identity, passphrase)?;
        recipients.push(Recipient::Passphrase {
            identity,
            public_key: identity.to_public().to_string(),
            encrypted_key: encrypted,
            hint: protection_config.passphrase_hint,
        });
    }

    // Add YubiKey recipients
    for yubikey_config in protection_config.yubikeys {
        let recipient = generate_yubikey_recipient(
            yubikey_config.serial,
            yubikey_config.slot,
            yubikey_config.pin,
        )?;
        recipients.push(recipient);
    }

    // Save metadata
    save_key_metadata(&key_label, &recipients)?;

    Ok(SetupResult {
        key_label,
        recipients: recipients.len(),
    })
}
```

#### 3. Encrypt with Multiple Recipients

```rust
#[tauri::command]
pub async fn encrypt_file_multi(
    file_path: String,
    key_label: String,
) -> CommandResponse<EncryptResult> {
    // Load all recipients from metadata
    let metadata = load_key_metadata(&key_label)?;
    let recipients = build_recipient_list(&metadata)?;

    // Read file
    let data = fs::read(&file_path)?;

    // Encrypt for all recipients using age
    let encrypted = {
        let encryptor = age::Encryptor::with_recipients(recipients)
            .expect("Failed to create encryptor");

        let mut encrypted = vec![];
        let mut writer = encryptor.wrap_output(&mut encrypted)?;
        writer.write_all(&data)?;
        writer.finish()?;
        encrypted
    };

    // Save encrypted file
    let output_path = format!("{}.age", file_path);
    fs::write(&output_path, encrypted)?;

    // Create vault metadata
    save_vault_metadata(&output_path, &metadata)?;

    Ok(EncryptResult {
        vault_path: output_path,
        recipients_count: metadata.recipients.len(),
    })
}
```

#### 4. Decrypt with Available Method

```rust
#[tauri::command]
pub async fn decrypt_file_smart(
    vault_path: String,
    unlock_method: UnlockMethod,
) -> CommandResponse<DecryptResult> {
    let encrypted = fs::read(&vault_path)?;

    let identity: Box<dyn age::Identity> = match unlock_method {
        UnlockMethod::Passphrase { passphrase } => {
            // Load and decrypt passphrase-protected key
            let encrypted_key = load_encrypted_key()?;
            let identity = decrypt_with_passphrase(encrypted_key, passphrase)?;
            Box::new(identity)
        },
        UnlockMethod::YubiKey { serial, pin } => {
            // Use age-plugin-yubikey
            let identity = unlock_with_yubikey(serial, pin)?;
            Box::new(identity)
        },
    };

    // Decrypt file
    let decrypted = {
        let decryptor = age::Decryptor::new(&encrypted[..])?;
        let mut decrypted = vec![];
        let mut reader = decryptor.decrypt(iter::once(&identity as &dyn age::Identity))?;
        reader.read_to_end(&mut decrypted)?;
        decrypted
    };

    // Save decrypted file
    let output_path = vault_path.trim_end_matches(".age");
    fs::write(&output_path, decrypted)?;

    Ok(DecryptResult {
        output_path: output_path.to_string(),
        size: decrypted.len(),
    })
}
```

### Plugin Communication

```rust
// Helper to communicate with age-plugin-yubikey
pub struct PluginInterface {
    plugin_path: PathBuf,
}

impl PluginInterface {
    pub fn new() -> Result<Self, Error> {
        // Find bundled plugin
        let plugin_path = if cfg!(target_os = "macos") {
            env::current_exe()?
                .parent()
                .unwrap()
                .join("age-plugin-yubikey")
        } else if cfg!(target_os = "windows") {
            env::current_exe()?
                .parent()
                .unwrap()
                .join("age-plugin-yubikey.exe")
        } else {
            PathBuf::from("age-plugin-yubikey")
        };

        Ok(Self { plugin_path })
    }

    pub fn call_plugin(&self, args: &[&str]) -> Result<String, Error> {
        let output = Command::new(&self.plugin_path)
            .args(args)
            .output()?;

        if !output.status.success() {
            return Err(Error::PluginError(
                String::from_utf8_lossy(&output.stderr).to_string()
            ));
        }

        Ok(String::from_utf8(output.stdout)?)
    }
}
```

## Frontend Implementation

### TypeScript Types

```typescript
// types/yubikey.ts
export interface YubiKeyInfo {
  serial: number;
  version: string;
  availableSlots: string[];
  hasPin: boolean;
}

export interface ProtectionConfig {
  mode: "passphrase" | "yubikey" | "both";
  passphrase?: string;
  passphraseHint?: string;
  yubikeys: YubiKeyConfig[];
}

export interface YubiKeyConfig {
  serial: number;
  slot: string;
  pin: string;
  label: string;
}

export interface Recipient {
  type: "passphrase" | "yubikey";
  publicKey: string;
  label: string;
  serial?: number;
  addedAt: string;
}

export type UnlockMethod =
  | { type: "passphrase"; passphrase: string }
  | { type: "yubikey"; serial: number; pin: string };
```

### React Components

```typescript
// components/YubiKeySetup.tsx
export const YubiKeySetup: React.FC = () => {
  const [yubikeys, setYubikeys] = useState<YubiKeyInfo[]>([]);
  const [selectedKeys, setSelectedKeys] = useState<YubiKeyConfig[]>([]);

  const detectYubiKeys = async () => {
    const result = await invoke('detect_yubikeys');
    setYubikeys(result.data);
  };

  const addYubiKey = async (serial: number) => {
    const pin = await promptForPin();
    const slot = await selectSlot();

    const config: YubiKeyConfig = {
      serial,
      slot,
      pin,
      label: `YubiKey ${serial}`,
    };

    setSelectedKeys([...selectedKeys, config]);
  };

  return (
    <div>
      <h3>Configure YubiKey Protection</h3>
      <button onClick={detectYubiKeys}>Detect YubiKeys</button>

      {yubikeys.map(yk => (
        <YubiKeyCard
          key={yk.serial}
          info={yk}
          onAdd={() => addYubiKey(yk.serial)}
        />
      ))}

      <div>
        <h4>Selected YubiKeys:</h4>
        {selectedKeys.map(key => (
          <div key={key.serial}>
            ✅ {key.label} (Serial: {key.serial})
          </div>
        ))}
      </div>
    </div>
  );
};
```

## Error Handling

### YubiKey-Specific Errors

```rust
#[derive(Debug, thiserror::Error)]
pub enum YubiKeyError {
    #[error("No YubiKey detected")]
    NoDeviceFound,

    #[error("YubiKey locked (too many PIN attempts)")]
    DeviceLocked,

    #[error("Invalid PIN")]
    InvalidPin,

    #[error("Slot already in use")]
    SlotOccupied,

    #[error("YubiKey removed during operation")]
    DeviceRemoved,

    #[error("Plugin not found: {0}")]
    PluginNotFound(String),

    #[error("Unsupported YubiKey version: {0}")]
    UnsupportedVersion(String),
}
```

## Performance Considerations

### Caching Strategy

```rust
// Cache YubiKey detection results
pub struct YubiKeyCache {
    last_scan: Instant,
    devices: Vec<YubiKeyInfo>,
    ttl: Duration,
}

impl YubiKeyCache {
    pub fn get_or_refresh(&mut self) -> Result<&Vec<YubiKeyInfo>, Error> {
        if self.last_scan.elapsed() > self.ttl {
            self.devices = YubiKeyManager::detect_yubikeys()?;
            self.last_scan = Instant::now();
        }
        Ok(&self.devices)
    }
}
```

### PIN Caching

```rust
// Session-based PIN caching for convenience
pub struct PinCache {
    pins: HashMap<u32, SecretString>,  // serial -> PIN
    expiry: HashMap<u32, Instant>,
    ttl: Duration,  // Default: 5 minutes
}

impl PinCache {
    pub fn get(&self, serial: u32) -> Option<&SecretString> {
        if let Some(expiry) = self.expiry.get(&serial) {
            if expiry > &Instant::now() {
                return self.pins.get(&serial);
            }
        }
        None
    }

    pub fn set(&mut self, serial: u32, pin: SecretString) {
        self.pins.insert(serial, pin);
        self.expiry.insert(serial, Instant::now() + self.ttl);
    }
}
```

## Testing Strategy

### Mock YubiKey for Development

```rust
#[cfg(test)]
pub struct MockYubiKey {
    serial: u32,
    identities: HashMap<PIVSlot, String>,
}

impl MockYubiKey {
    pub fn generate_identity(&mut self, slot: PIVSlot) -> String {
        let identity = format!("age1yubikey1mock{}slot{:02x}", self.serial, slot as u8);
        self.identities.insert(slot, identity.clone());
        identity
    }
}
```

### Integration Tests

```rust
#[test]
fn test_multi_recipient_encryption() {
    // Setup
    let passphrase_key = age::x25519::Identity::generate();
    let yubikey1_identity = "age1yubikey1test1...";
    let yubikey2_identity = "age1yubikey1test2...";

    // Encrypt for all
    let recipients = vec![
        passphrase_key.to_public(),
        parse_recipient(yubikey1_identity),
        parse_recipient(yubikey2_identity),
    ];

    let encrypted = encrypt_data(b"test data", recipients);

    // Verify each can decrypt
    assert!(decrypt_with_identity(&encrypted, &passphrase_key).is_ok());
    // Mock YubiKey decryption tests...
}
```

## Security Considerations

1. **PIN Security**: Never log or persist PINs
2. **Touch Policy**: Configurable per-operation touch requirement
3. **Key Extraction**: Private keys never leave YubiKey hardware
4. **Backup Requirements**: Enforce backup method when using YubiKey-only
5. **Plugin Verification**: Verify plugin binary signature

## Platform-Specific Notes

### macOS

- Requires user approval for USB device access
- May need entitlements for smartcard access

### Windows

- Requires Windows Smart Card service running
- May need driver installation for older YubiKeys

### Linux

- Requires udev rules for non-root access
- May need pcscd service running
