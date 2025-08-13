# Recovery Scenarios: YubiKey Integration

## Overview

This document details various recovery scenarios users might face with YubiKey-protected vaults and provides clear recovery paths for each situation.

## Recovery Matrix

| Scenario        | Available Assets  | Recovery Method   | Success Rate |
| --------------- | ----------------- | ----------------- | ------------ |
| Lost YubiKey    | Passphrase        | Use passphrase    | 100%         |
| Lost YubiKey    | Backup YubiKey    | Use backup        | 100%         |
| Lost YubiKey    | Neither           | No recovery       | 0%           |
| Forgotten PIN   | Passphrase        | Use passphrase    | 100%         |
| Forgotten PIN   | Other YubiKey     | Use other key     | 100%         |
| Locked YubiKey  | Passphrase        | Use passphrase    | 100%         |
| Broken YubiKey  | Any backup method | Use backup        | 100%         |
| Lost everything | Cloud backup      | Restore & decrypt | Varies       |

## Detailed Recovery Scenarios

### Scenario 1: Lost Primary YubiKey

#### Situation

User's daily-carry YubiKey is lost or stolen.

#### Available Options

**Option A: Use Backup YubiKey**

```
Recovery Steps:
1. Launch Barqly Vault
2. Select vault to decrypt
3. Insert backup YubiKey
4. Enter backup YubiKey PIN
5. Successfully decrypt

Post-Recovery:
1. Remove lost YubiKey from system
2. Add new YubiKey as replacement
3. Update all vaults for new key
```

**Option B: Use Passphrase**

```
Recovery Steps:
1. Launch Barqly Vault
2. Select vault to decrypt
3. Choose "Decrypt with Passphrase"
4. Enter passphrase
5. Successfully decrypt

Post-Recovery:
1. Remove lost YubiKey from system
2. Consider adding new YubiKey
```

#### Implementation

```rust
#[tauri::command]
pub async fn initiate_recovery_mode(
    vault_path: String,
) -> CommandResponse<RecoveryOptions> {
    let metadata = load_vault_metadata(&vault_path)?;
    let mut options = RecoveryOptions::default();

    // Check available recovery methods
    for recipient in &metadata.recipients {
        match recipient.type_ {
            RecipientType::Passphrase => {
                if passphrase_key_exists(&recipient.public_key) {
                    options.passphrase_available = true;
                }
            },
            RecipientType::YubiKey => {
                if let Some(serial) = &recipient.device_info.serial {
                    if detect_yubikey(*serial).is_ok() {
                        options.backup_yubikeys.push(*serial);
                    }
                }
            },
        }
    }

    Ok(CommandResponse::Success {
        data: options,
        message: format!("Found {} recovery options",
            options.count_available()),
    })
}
```

### Scenario 2: Forgotten YubiKey PIN

#### Situation

User cannot remember their YubiKey PIN after multiple attempts.

#### Warning State

```
PIN Entry Failed
────────────────
Incorrect PIN. Attempts remaining: 2

⚠️ Warning: After 3 total failed attempts,
this YubiKey will be locked.

[Try Again] [Use Different Method]
```

#### After Lockout

```
YubiKey Locked
──────────────
This YubiKey has been locked after 3 failed PIN attempts.

Recovery Options:
1. Use your passphrase to decrypt
2. Use a backup YubiKey
3. Reset this YubiKey (destroys key!)

[Use Passphrase] [Use Backup] [Learn About Reset]
```

#### Reset Process

```rust
pub struct YubiKeyResetGuide {
    steps: Vec<String>,
    warnings: Vec<String>,
    alternatives: Vec<String>,
}

impl YubiKeyResetGuide {
    pub fn new() -> Self {
        Self {
            steps: vec![
                "1. Understand: Reset DESTROYS the key permanently".into(),
                "2. Ensure you have backup access method".into(),
                "3. Use YubiKey Manager to reset PIV".into(),
                "4. Generate new key on reset YubiKey".into(),
                "5. Update all vaults with new key".into(),
            ],
            warnings: vec![
                "This action cannot be undone".into(),
                "All data encrypted ONLY with this key will be lost".into(),
                "Reset requires physical access to YubiKey".into(),
            ],
            alternatives: vec![
                "Use passphrase if configured".into(),
                "Use backup YubiKey if available".into(),
                "Restore from recent backup".into(),
            ],
        }
    }
}
```

### Scenario 3: YubiKey Hardware Failure

#### Situation

YubiKey stops responding or is physically damaged.

#### Detection

```rust
pub enum YubiKeyHealth {
    Healthy,
    Intermittent,
    NotResponding,
    NotDetected,
}

pub async fn diagnose_yubikey(serial: u32) -> YubiKeyHealth {
    // Multiple connection attempts
    for attempt in 0..3 {
        if let Ok(yk) = connect_yubikey(serial).await {
            if yk.verify_communication().is_ok() {
                return YubiKeyHealth::Healthy;
            }
        }
        sleep(Duration::from_millis(500)).await;
    }

    // Check if visible but not responding
    if list_yubikeys().iter().any(|yk| yk.serial == serial) {
        YubiKeyHealth::NotResponding
    } else {
        YubiKeyHealth::NotDetected
    }
}
```

#### Recovery Flow

```
YubiKey Not Responding
──────────────────────

Your YubiKey appears to be malfunctioning.

Troubleshooting:
□ Remove and reinsert YubiKey
□ Try different USB port
□ Restart application
□ Check for driver updates

Still not working?

[Use Passphrase] [Use Backup YubiKey] [Contact Support]
```

### Scenario 4: Complete System Recovery

#### Situation

New computer setup or complete system restore needed.

#### Recovery Checklist

```
System Recovery Checklist
────────────────────────

□ Install Barqly Vault
□ Restore vault files from backup
□ Locate key backups

Choose recovery method:

Option 1: YubiKey Recovery
  □ Insert YubiKey
  □ No import needed (key on device)
  □ Enter PIN
  □ Ready to decrypt

Option 2: Passphrase Recovery
  □ Import backed-up key file
  □ Enter passphrase
  □ Verify key works
  □ Ready to decrypt

Option 3: Backup Card Recovery
  □ Scan QR code from card
  □ Or manually enter key
  □ Enter passphrase
  □ Ready to decrypt
```

#### Implementation

```rust
#[tauri::command]
pub async fn system_recovery_wizard() -> CommandResponse<RecoveryWizard> {
    let wizard = RecoveryWizard {
        steps: vec![
            RecoveryStep::DetectVaults,
            RecoveryStep::IdentifyKeys,
            RecoveryStep::ImportKeys,
            RecoveryStep::VerifyAccess,
            RecoveryStep::CompleteRecovery,
        ],
        current_step: 0,
        discovered_vaults: vec![],
        available_methods: vec![],
    };

    Ok(CommandResponse::Success {
        data: wizard,
        message: "Starting recovery wizard".into(),
    })
}
```

### Scenario 5: Partial Recovery (Some Keys Lost)

#### Situation

User has lost some but not all authentication methods.

#### Assessment

```
Recovery Assessment
──────────────────

Scanning your vaults and available keys...

Found 25 encrypted vaults

Can decrypt with current keys: 20 vaults (80%)
Cannot decrypt: 5 vaults (20%)

Missing keys:
• YubiKey #12345678 (last seen: 30 days ago)

Available keys:
• ✅ Passphrase key
• ✅ YubiKey #87654321

[Show Recoverable Vaults] [Show Lost Vaults]
```

### Scenario 6: Enterprise Recovery

#### Situation

Employee leaves company, YubiKey must be revoked.

#### Admin Recovery Process

```rust
pub struct EnterpriseRecovery {
    pub escrow_enabled: bool,
    pub recovery_keys: Vec<RecoveryKey>,
    pub admin_override: bool,
}

impl EnterpriseRecovery {
    pub async fn revoke_user_yubikey(
        user_id: &str,
        admin_auth: AdminCredentials,
    ) -> Result<(), Error> {
        // Verify admin authorization
        verify_admin(admin_auth)?;

        // Get user's vaults
        let vaults = get_user_vaults(user_id)?;

        // Re-encrypt without revoked key
        for vault in vaults {
            let mut recipients = vault.recipients.clone();
            recipients.retain(|r| r.user_id != user_id);

            // Add enterprise recovery key if needed
            if recipients.is_empty() {
                recipients.push(get_enterprise_recovery_key()?);
            }

            re_encrypt_vault(vault, recipients)?;
        }

        Ok(())
    }
}
```

## Recovery Best Practices

### Preventive Measures

#### 1. Regular Backup Verification

```
Monthly Backup Check
───────────────────

It's been 30 days since your last backup verification.

Test your recovery methods:
□ Insert backup YubiKey and verify PIN
□ Test passphrase in private browsing
□ Locate printed backup card
□ Verify cloud backup accessible

[Start Verification] [Remind Me Later]
```

#### 2. Redundancy Requirements

```rust
pub fn assess_redundancy(metadata: &MetadataV2) -> RedundancyLevel {
    let active_recipients = metadata.recipients
        .iter()
        .filter(|r| r.status == "active")
        .count();

    let has_passphrase = metadata.recipients
        .iter()
        .any(|r| r.type_ == RecipientType::Passphrase);

    let yubikey_count = metadata.recipients
        .iter()
        .filter(|r| r.type_ == RecipientType::YubiKey)
        .count();

    match (active_recipients, has_passphrase, yubikey_count) {
        (1, _, _) => RedundancyLevel::Critical,  // Single point of failure
        (2, true, 1) => RedundancyLevel::Good,   // Passphrase + 1 YubiKey
        (3, true, 2) => RedundancyLevel::Excellent, // Passphrase + 2 YubiKeys
        _ => RedundancyLevel::Acceptable,
    }
}
```

### Recovery Documentation

#### User Recovery Card Template

```markdown
# Barqly Vault Recovery Information

## Your Protection Methods

- [ ] Passphrase (memorized)
- [ ] YubiKey Serial: ****\_\_**** (location: ****\_****)
- [ ] Backup YubiKey Serial: ****\_\_**** (location: ****\_****)
- [ ] Printed backup (location: ****\_****)

## Recovery Procedures

### If YubiKey Lost:

1. Use passphrase or backup YubiKey
2. Remove lost key from system
3. Add replacement YubiKey

### If PIN Forgotten:

1. Use passphrase instead
2. Or use backup YubiKey
3. Reset YubiKey if needed (data loss!)

### If Everything Lost:

1. Check cloud backups
2. Check offsite storage
3. Contact: ******\_\_******

## Important Contacts

- IT Support: ******\_\_******
- Barqly Support: support@barqly.com

Last Updated: ******\_\_******
```

## Recovery Metrics

### Track Recovery Success

```rust
#[derive(Serialize)]
pub struct RecoveryMetrics {
    pub total_attempts: u32,
    pub successful_recoveries: u32,
    pub failed_recoveries: u32,
    pub average_time_to_recovery: Duration,
    pub most_common_failure: String,
    pub recovery_methods_used: HashMap<String, u32>,
}

pub fn log_recovery_attempt(
    method: RecoveryMethod,
    success: bool,
    duration: Duration,
) {
    // Log to analytics
    analytics::track("recovery_attempt", json!({
        "method": method,
        "success": success,
        "duration_seconds": duration.as_secs(),
        "timestamp": Utc::now(),
    }));

    // Update metrics
    RECOVERY_METRICS.lock().unwrap().record(method, success, duration);
}
```

## Emergency Recovery Hotline

### Support Script for Recovery

```
1. Verify user identity
2. Assess available recovery methods
3. Guide through appropriate recovery
4. Document recovery attempt
5. Follow up on success

Common Issues:
- YubiKey not detected → USB/driver troubleshooting
- PIN forgotten → Alternative method guidance
- No backups → Set expectations, prevent future
- Partial recovery → Identify recoverable vaults
```

## Conclusion

Successful recovery depends on:

1. **Multiple backup methods** configured during setup
2. **Regular verification** of backup methods
3. **Clear documentation** of recovery procedures
4. **User education** about recovery importance
5. **Support availability** during crisis

The system should guide users to configure adequate backup methods and regularly verify they work, preventing most recovery failures before they occur.
