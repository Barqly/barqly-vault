//! Unit tests for YubiKey functionality
//!
//! This module contains comprehensive unit tests for all YubiKey components
//! using mock implementations to ensure reliability in CI/CD environments.

use super::mock_yubikey::*;
use super::*;
use crate::crypto::yubikey::*;
use crate::crypto::yubikey::management::PinPolicy;
use crate::storage::{RecipientInfo, RecipientType, VaultMetadataV2};

#[test]
fn test_yubikey_device_status_enum() {
    let statuses = vec![
        DeviceStatus::Ready,
        DeviceStatus::Locked,
        DeviceStatus::PinRequired,
        DeviceStatus::Uninitialized,
        DeviceStatus::Error {
            message: "Test error".to_string(),
        },
    ];

    // Test serialization/deserialization
    for status in statuses {
        let json = serde_json::to_string(&status).unwrap();
        let deserialized: DeviceStatus = serde_json::from_str(&json).unwrap();

        match (&status, &deserialized) {
            (DeviceStatus::Ready, DeviceStatus::Ready) => {}
            (DeviceStatus::Locked, DeviceStatus::Locked) => {}
            (DeviceStatus::PinRequired, DeviceStatus::PinRequired) => {}
            (DeviceStatus::Uninitialized, DeviceStatus::Uninitialized) => {}
            (DeviceStatus::Error { message: m1 }, DeviceStatus::Error { message: m2 }) => {
                assert_eq!(m1, m2);
            }
            _ => panic!("Status mismatch: {:?} vs {:?}", status, deserialized),
        }
    }
}

#[test]
fn test_protection_mode_enum() {
    let modes = vec![
        ProtectionMode::PassphraseOnly,
        ProtectionMode::YubiKeyOnly {
            serial: "12345678".to_string(),
        },
        ProtectionMode::Hybrid {
            yubikey_serial: "87654321".to_string(),
        },
    ];

    for mode in modes {
        let json = serde_json::to_string(&mode).unwrap();
        let deserialized: ProtectionMode = serde_json::from_str(&json).unwrap();

        match (&mode, &deserialized) {
            (ProtectionMode::PassphraseOnly, ProtectionMode::PassphraseOnly) => {}
            (
                ProtectionMode::YubiKeyOnly { serial: s1 },
                ProtectionMode::YubiKeyOnly { serial: s2 },
            ) => {
                assert_eq!(s1, s2);
            }
            (
                ProtectionMode::Hybrid { yubikey_serial: s1 },
                ProtectionMode::Hybrid { yubikey_serial: s2 },
            ) => {
                assert_eq!(s1, s2);
            }
            _ => panic!("Mode mismatch: {:?} vs {:?}", mode, deserialized),
        }
    }
}

#[test]
fn test_yubikey_manager_pin_validation() {
    let manager = YubiKeyManager::new();

    // Valid PINs
    assert!(manager.validate_pin("123456").is_ok());
    assert!(manager.validate_pin("12345678").is_ok());
    assert!(manager.validate_pin("000000").is_ok());

    // Invalid PINs
    assert!(manager.validate_pin("12345").is_err()); // Too short
    assert!(manager.validate_pin("123456789").is_err()); // Too long
    assert!(manager.validate_pin("abc123").is_err()); // Contains letters
    assert!(manager.validate_pin("12-34-56").is_err()); // Contains symbols
    assert!(manager.validate_pin("").is_err()); // Empty
}

#[test]
fn test_yubikey_manager_slot_selection() {
    let manager = YubiKeyManager::new();

    // Test with preferred slots available
    let available_slots = vec![0x82, 0x83, 0x84, 0x9D];
    let selected = manager.find_available_slot(&available_slots).unwrap();
    assert_eq!(selected, 0x82); // Should pick first preferred slot

    // Test with only non-preferred slots
    let available_slots = vec![0x9A, 0x9C];
    let selected = manager.find_available_slot(&available_slots).unwrap();
    assert_eq!(selected, 0x9A); // Should pick first available

    // Test with no slots available
    let available_slots = vec![];
    assert!(manager.find_available_slot(&available_slots).is_err());
}

#[test]
fn test_recipient_info_creation() {
    let passphrase_recipient = RecipientInfo::new_passphrase(
        "age1test123456".to_string(),
        "test-passphrase-key".to_string(),
    );

    assert!(matches!(
        passphrase_recipient.recipient_type,
        RecipientType::Passphrase
    ));
    assert_eq!(passphrase_recipient.label, "test-passphrase-key");
    assert_eq!(passphrase_recipient.public_key, "age1test123456");

    let yubikey_recipient = RecipientInfo::new_yubikey(
        "age1yubikey123456".to_string(),
        "test-yubikey".to_string(),
        "12345678".to_string(),
        0x82,
        "YubiKey 5 Series".to_string(),
    );

    match &yubikey_recipient.recipient_type {
        RecipientType::YubiKey {
            serial,
            slot,
            model,
        } => {
            assert_eq!(serial, "12345678");
            assert_eq!(*slot, 0x82);
            assert_eq!(model, "YubiKey 5 Series");
        }
        _ => panic!("Expected YubiKey recipient type"),
    }
}

#[test]
fn test_vault_metadata_v2_creation() {
    let passphrase_recipient =
        RecipientInfo::new_passphrase("age1test123".to_string(), "backup-key".to_string());

    let yubikey_recipient = RecipientInfo::new_yubikey(
        "age1yubikey456".to_string(),
        "primary-yubikey".to_string(),
        "12345678".to_string(),
        0x83,
        "YubiKey 5 Series".to_string(),
    );

    let metadata = VaultMetadataV2::new(
        ProtectionMode::Hybrid {
            yubikey_serial: "12345678".to_string(),
        },
        vec![passphrase_recipient, yubikey_recipient],
        5,
        1024,
        "test-checksum".to_string(),
    );

    assert_eq!(metadata.version, "2.0");
    assert!(metadata.backward_compatible);
    assert_eq!(metadata.recipients.len(), 2);
    assert_eq!(metadata.file_count, 5);
    assert_eq!(metadata.total_size, 1024);

    // Test recipient filtering
    let passphrase_recipients = metadata.get_recipients_by_type("passphrase");
    assert_eq!(passphrase_recipients.len(), 1);

    let yubikey_recipients = metadata.get_recipients_by_type("yubikey");
    assert_eq!(yubikey_recipients.len(), 1);

    let yubikey_for_serial = metadata.get_yubikey_recipients_for_serial("12345678");
    assert_eq!(yubikey_for_serial.len(), 1);

    // Test age recipients extraction
    let age_recipients = metadata.get_age_recipients();
    assert_eq!(age_recipients.len(), 2);
    assert!(age_recipients.contains(&"age1test123".to_string()));
    assert!(age_recipients.contains(&"age1yubikey456".to_string()));
}

#[test]
fn test_vault_metadata_v2_validation() {
    // Test valid hybrid metadata
    let passphrase_recipient =
        RecipientInfo::new_passphrase("age1test123".to_string(), "backup-key".to_string());

    let yubikey_recipient = RecipientInfo::new_yubikey(
        "age1yubikey456".to_string(),
        "primary-yubikey".to_string(),
        "12345678".to_string(),
        0x83,
        "YubiKey 5 Series".to_string(),
    );

    let metadata = VaultMetadataV2::new(
        ProtectionMode::Hybrid {
            yubikey_serial: "12345678".to_string(),
        },
        vec![passphrase_recipient, yubikey_recipient],
        1,
        100,
        "test-checksum".to_string(),
    );

    assert!(metadata.validate().is_ok());

    // Test invalid metadata - no recipients
    let mut invalid_metadata = metadata.clone();
    invalid_metadata.recipients.clear();
    assert!(invalid_metadata.validate().is_err());

    // Test invalid metadata - wrong version
    invalid_metadata.version = "1.0".to_string();
    assert!(invalid_metadata.validate().is_err());
}

#[test]
fn test_backward_compatibility_detection() {
    // Passphrase-only should be backward compatible
    let metadata = VaultMetadataV2::new(
        ProtectionMode::PassphraseOnly,
        vec![RecipientInfo::new_passphrase(
            "age1test123".to_string(),
            "key".to_string(),
        )],
        1,
        100,
        "checksum".to_string(),
    );
    assert!(metadata.is_compatible_with_v1());

    // Hybrid should be backward compatible
    let hybrid_metadata = VaultMetadataV2::new(
        ProtectionMode::Hybrid {
            yubikey_serial: "12345678".to_string(),
        },
        vec![
            RecipientInfo::new_passphrase("age1test123".to_string(), "key".to_string()),
            RecipientInfo::new_yubikey(
                "age1yubikey456".to_string(),
                "yk".to_string(),
                "12345678".to_string(),
                0x82,
                "YK5".to_string(),
            ),
        ],
        1,
        100,
        "checksum".to_string(),
    );
    assert!(hybrid_metadata.is_compatible_with_v1());

    // YubiKey-only should NOT be backward compatible
    let yubikey_only_metadata = VaultMetadataV2::new(
        ProtectionMode::YubiKeyOnly {
            serial: "12345678".to_string(),
        },
        vec![RecipientInfo::new_yubikey(
            "age1yubikey456".to_string(),
            "yk".to_string(),
            "12345678".to_string(),
            0x82,
            "YK5".to_string(),
        )],
        1,
        100,
        "checksum".to_string(),
    );
    assert!(!yubikey_only_metadata.is_compatible_with_v1());
}

#[test]
fn test_error_conversion() {
    // Test YubiKey error to command error conversion
    let yubikey_errors = vec![
        YubiKeyError::NoDevicesFound,
        YubiKeyError::DeviceNotFound("12345678".to_string()),
        YubiKeyError::PinRequired(2),
        YubiKeyError::PinBlocked,
        YubiKeyError::TouchRequired,
        YubiKeyError::TouchTimeout,
        YubiKeyError::SlotInUse(0x82),
        YubiKeyError::InitializationFailed("Test error".to_string()),
    ];

    for yubikey_error in yubikey_errors {
        let command_error: crate::commands::command_types::CommandError = yubikey_error.into();

        // Verify that the error has proper recovery guidance
        assert!(command_error.recovery_guidance.is_some());
        assert!(command_error.user_actionable);
        assert!(!command_error.message.is_empty());
    }
}

#[test]
fn test_unlock_credentials_serialization() {
    let credentials = vec![
        UnlockCredentials::Passphrase {
            key_label: "test-key".to_string(),
            passphrase: "secret123".to_string(),
        },
        UnlockCredentials::YubiKey {
            serial: "12345678".to_string(),
            pin: Some("123456".to_string()),
        },
        UnlockCredentials::YubiKey {
            serial: "87654321".to_string(),
            pin: None,
        },
    ];

    for credential in credentials {
        let json = serde_json::to_string(&credential).unwrap();
        let deserialized: UnlockCredentials = serde_json::from_str(&json).unwrap();

        match (&credential, &deserialized) {
            (
                UnlockCredentials::Passphrase {
                    key_label: k1,
                    passphrase: p1,
                },
                UnlockCredentials::Passphrase {
                    key_label: k2,
                    passphrase: p2,
                },
            ) => {
                assert_eq!(k1, k2);
                assert_eq!(p1, p2);
            }
            (
                UnlockCredentials::YubiKey {
                    serial: s1,
                    pin: p1,
                },
                UnlockCredentials::YubiKey {
                    serial: s2,
                    pin: p2,
                },
            ) => {
                assert_eq!(s1, s2);
                assert_eq!(p1, p2);
            }
            _ => panic!("Credential type mismatch"),
        }
    }
}

#[test]
fn test_progress_types_serialization() {
    use crate::commands::command_types::{YubiKeyOperationType, YubiKeyPhase};

    let operation_types = vec![
        YubiKeyOperationType::Detection,
        YubiKeyOperationType::Initialization,
        YubiKeyOperationType::Authentication,
        YubiKeyOperationType::KeyGeneration,
        YubiKeyOperationType::Encryption,
        YubiKeyOperationType::Decryption,
        YubiKeyOperationType::PluginDeployment,
    ];

    for op_type in operation_types {
        let json = serde_json::to_string(&op_type).unwrap();
        let _deserialized: YubiKeyOperationType = serde_json::from_str(&json).unwrap();
    }

    let phases = vec![
        YubiKeyPhase::Starting,
        YubiKeyPhase::InProgress {
            percentage: Some(50),
        },
        YubiKeyPhase::InProgress { percentage: None },
        YubiKeyPhase::WaitingForPin,
        YubiKeyPhase::WaitingForTouch,
        YubiKeyPhase::Completing,
        YubiKeyPhase::Completed,
        YubiKeyPhase::Failed {
            error: "Test error".to_string(),
        },
    ];

    for phase in phases {
        let json = serde_json::to_string(&phase).unwrap();
        let _deserialized: YubiKeyPhase = serde_json::from_str(&json).unwrap();
    }
}

#[test]
fn test_recipient_info_description() {
    let passphrase_recipient =
        RecipientInfo::new_passphrase("age1test123".to_string(), "My Backup Key".to_string());

    let description = passphrase_recipient.get_description();
    assert_eq!(description, "Passphrase: My Backup Key");

    let yubikey_recipient = RecipientInfo::new_yubikey(
        "age1yubikey456".to_string(),
        "Work YubiKey".to_string(),
        "12345678".to_string(),
        0x82,
        "YubiKey 5 Series".to_string(),
    );

    let description = yubikey_recipient.get_description();
    assert_eq!(description, "YubiKey YubiKey 5 Series: 12345678 (slot 130)");
}

#[test]
fn test_pin_policy_display() {
    assert_eq!(format!("{}", PinPolicy::Never), "never");
    assert_eq!(format!("{}", PinPolicy::Once), "once");
    assert_eq!(format!("{}", PinPolicy::Always), "always");
}
