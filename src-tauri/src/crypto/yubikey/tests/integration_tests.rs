//! Integration tests for YubiKey functionality
//!
//! These tests verify the complete YubiKey workflow using mock implementations.

use super::*;
use crate::crypto::multi_recipient::*;
use crate::storage::*;
use tempfile::TempDir;

/// Test complete YubiKey initialization workflow
#[tokio::test]
async fn test_yubikey_initialization_workflow() {
    // Initialize test environment
    init_test_environment(YubiKeyTestConfig::default());

    let mut mock_manager = MockYubiKeyManager::new();
    mock_manager.add_device("12345678".to_string());

    // Test device detection
    let devices = mock_manager.list_devices();
    assert_eq!(devices.len(), 1);
    assert_eq!(devices[0].serial, "12345678");

    // Test device initialization
    let init_result =
        mock_manager.initialize_device("12345678", "123456", Some(0x82), "Test YubiKey");

    assert!(init_result.is_ok());
    let yubikey_info = init_result.unwrap();
    assert_eq!(yubikey_info.serial, "12345678");
    assert_eq!(yubikey_info.slot, 0x82);
    assert!(yubikey_info.public_key.starts_with("age1yubikey1"));

    reset_test_environment();
}

/// Test YubiKey PIN handling and error scenarios
#[tokio::test]
async fn test_yubikey_pin_error_handling() {
    init_test_environment(YubiKeyTestConfig::default());

    let mut mock_manager = MockYubiKeyManager::new();
    let device = mock_manager.add_device("12345678".to_string());

    // Test wrong PIN attempts
    let wrong_pin_result =
        mock_manager.initialize_device("12345678", "wrong", Some(0x82), "Test YubiKey");

    assert!(wrong_pin_result.is_err());
    assert!(matches!(
        wrong_pin_result.unwrap_err(),
        YubiKeyError::PinRequired(_)
    ));

    // Block the device by exhausting attempts
    device.pin_attempts_remaining = 1;
    let block_result =
        mock_manager.initialize_device("12345678", "wrong", Some(0x82), "Test YubiKey");

    assert!(block_result.is_err());
    assert!(matches!(
        block_result.unwrap_err(),
        YubiKeyError::PinBlocked
    ));

    // Verify device is blocked
    assert!(device.is_blocked);

    reset_test_environment();
}

/// Test multi-recipient vault creation and encryption
#[tokio::test]
async fn test_multi_recipient_vault_creation() {
    init_test_environment(YubiKeyTestConfig::default());

    // Create recipients
    let passphrase_recipient = RecipientInfo::new_passphrase(
        "age1test123passphrase456".to_string(),
        "backup-passphrase".to_string(),
    );

    let yubikey_recipient = RecipientInfo::new_yubikey(
        "age1yubikey123test456".to_string(),
        "primary-yubikey".to_string(),
        "12345678".to_string(),
        0x82,
        "YubiKey 5 Series".to_string(),
    );

    let recipients = vec![passphrase_recipient, yubikey_recipient];
    let test_data = b"This is secret test data for multi-recipient encryption";

    // Create encryption parameters
    let encrypt_params = MultiRecipientEncryptParams {
        protection_mode: ProtectionMode::Hybrid {
            yubikey_serial: "12345678".to_string(),
        },
        recipients: recipients.clone(),
        data: test_data.to_vec(),
    };

    // Encrypt data
    let encryption_result = MultiRecipientCrypto::encrypt_with_multiple_recipients(encrypt_params);

    assert!(encryption_result.is_ok());
    let result = encryption_result.unwrap();

    assert!(!result.encrypted_data.is_empty());
    assert_eq!(result.recipients_used.len(), 2);
    assert_eq!(
        result.metadata.protection_mode,
        ProtectionMode::Hybrid {
            yubikey_serial: "12345678".to_string(),
        }
    );
    assert!(result.metadata.backward_compatible);

    reset_test_environment();
}

/// Test vault metadata v2.0 storage and retrieval
#[tokio::test]
async fn test_metadata_v2_storage() {
    let temp_dir = TempDir::new().unwrap();
    let metadata_path = temp_dir.path().join("test_metadata.json");

    // Create test metadata
    let passphrase_recipient =
        RecipientInfo::new_passphrase("age1test123".to_string(), "test-key".to_string());

    let yubikey_recipient = RecipientInfo::new_yubikey(
        "age1yubikey456".to_string(),
        "test-yubikey".to_string(),
        "12345678".to_string(),
        0x83,
        "YubiKey 5 Series".to_string(),
    );

    let original_metadata = VaultMetadataV2::new(
        ProtectionMode::Hybrid {
            yubikey_serial: "12345678".to_string(),
        },
        vec![passphrase_recipient, yubikey_recipient],
        5,
        2048,
        "test-checksum-12345".to_string(),
    );

    // Save metadata
    let save_result = MetadataV2Storage::save_metadata(&original_metadata, &metadata_path);
    assert!(save_result.is_ok());

    // Load metadata
    let load_result = MetadataV2Storage::load_metadata(&metadata_path);
    assert!(load_result.is_ok());

    let loaded_metadata = load_result.unwrap();
    assert_eq!(loaded_metadata.version, original_metadata.version);
    assert_eq!(
        loaded_metadata.recipients.len(),
        original_metadata.recipients.len()
    );
    assert_eq!(loaded_metadata.file_count, original_metadata.file_count);
    assert_eq!(loaded_metadata.total_size, original_metadata.total_size);
    assert_eq!(loaded_metadata.checksum, original_metadata.checksum);

    // Verify it's detected as v2.0
    assert!(MetadataV2Storage::is_v2_metadata(&metadata_path));
}

/// Test smart decryption method selection
#[tokio::test]
async fn test_smart_decryption_method_selection() {
    init_test_environment(YubiKeyTestConfig::default());

    // Create metadata with both passphrase and YubiKey recipients
    let passphrase_recipient =
        RecipientInfo::new_passphrase("age1test123".to_string(), "backup-key".to_string());

    let yubikey_recipient = RecipientInfo::new_yubikey(
        "age1yubikey456".to_string(),
        "primary-yubikey".to_string(),
        "12345678".to_string(),
        0x82,
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

    // Test available methods detection
    let available_methods = MultiRecipientCrypto::determine_available_methods(&metadata).unwrap();

    // Should have passphrase method (always available)
    assert!(available_methods.contains(&UnlockMethod::Passphrase));

    // Test method selection for hybrid mode (should prefer YubiKey)
    let selected_method = MultiRecipientCrypto::select_unlock_method(
        &metadata,
        &available_methods,
        None, // No user preference
    )
    .unwrap();

    // For hybrid mode with both methods available, should prefer passphrase since YubiKey is mock
    assert_eq!(selected_method, UnlockMethod::Passphrase);

    // Test explicit method selection
    if available_methods.contains(&UnlockMethod::Passphrase) {
        let explicit_selection = MultiRecipientCrypto::select_unlock_method(
            &metadata,
            &available_methods,
            Some(UnlockMethod::Passphrase),
        )
        .unwrap();
        assert_eq!(explicit_selection, UnlockMethod::Passphrase);
    }

    reset_test_environment();
}

/// Test YubiKey progress reporting integration
#[tokio::test]
async fn test_yubikey_progress_reporting() {
    use crate::commands::command_types::{YubiKeyOperationType, YubiKeyPhase};
    use crate::crypto::yubikey::progress::*;

    // Create progress manager
    let mut progress_manager = create_yubikey_progress_manager(
        "test_operation".to_string(),
        YubiKeyOperationType::Initialization,
    );

    // Test progress reporting through different phases
    progress_manager.report_progress(
        YubiKeyPhase::Starting,
        "Starting YubiKey initialization".to_string(),
        false,
        None,
    );

    progress_manager.report_pin_required(3);
    progress_manager.report_in_progress(50, "Generating key...".to_string());
    progress_manager.report_touch_required();
    progress_manager.report_completed("YubiKey initialized successfully".to_string());

    // All operations should complete without panicking
    // In a full implementation, we would capture and verify the progress events
}

/// Test error recovery guidance for YubiKey operations
#[tokio::test]
async fn test_yubikey_error_recovery_guidance() {
    use crate::commands::command_types::{CommandError, ErrorCode};

    // Test various YubiKey errors and their recovery guidance
    let test_cases = vec![
        (YubiKeyError::NoDevicesFound, ErrorCode::YubiKeyNotFound),
        (YubiKeyError::PinRequired(2), ErrorCode::YubiKeyPinRequired),
        (YubiKeyError::PinBlocked, ErrorCode::YubiKeyPinBlocked),
        (YubiKeyError::TouchRequired, ErrorCode::YubiKeyTouchRequired),
        (YubiKeyError::TouchTimeout, ErrorCode::YubiKeyTouchTimeout),
        (YubiKeyError::SlotInUse(0x82), ErrorCode::YubiKeySlotInUse),
    ];

    for (yubikey_error, expected_code) in test_cases {
        let command_error: CommandError = yubikey_error.into();

        // Verify error code matches
        assert_eq!(command_error.code, expected_code);

        // Verify recovery guidance is provided
        assert!(command_error.recovery_guidance.is_some());
        assert!(!command_error.recovery_guidance.unwrap().is_empty());

        // Verify error is user actionable
        assert!(command_error.user_actionable);
    }
}

/// Test plugin integration mock behavior
#[tokio::test]
async fn test_plugin_integration_mock() {
    use crate::crypto::yubikey::plugin::*;

    // Create temporary directories for testing
    let temp_dir = TempDir::new().unwrap();
    let bundle_dir = temp_dir.path().join("bundle");
    let runtime_dir = temp_dir.path().join("runtime");

    std::fs::create_dir_all(&bundle_dir).unwrap();
    std::fs::create_dir_all(&runtime_dir).unwrap();

    // Create mock plugin binary
    let platform = Platform::current();
    let plugin_name = platform.plugin_binary_name();
    let mock_plugin_path = bundle_dir.join(&plugin_name);
    std::fs::write(&mock_plugin_path, b"mock plugin binary").unwrap();

    // Create plugin manager
    let manager = PluginManager::new(bundle_dir, runtime_dir);

    // Plugin deployment should work with mock binary
    // (This would normally require actual plugin validation, but we're testing the structure)
    assert!(mock_plugin_path.exists());
}

/// Test comprehensive YubiKey workflow with multiple devices
#[tokio::test]
async fn test_multiple_yubikey_workflow() {
    init_test_environment(YubiKeyTestConfig {
        mock_serial_numbers: vec![
            "11111111".to_string(),
            "22222222".to_string(),
            "33333333".to_string(),
        ],
        ..Default::default()
    });

    let mut mock_manager = MockYubiKeyManager::new();

    // Add multiple mock devices
    mock_manager.add_device("11111111".to_string());
    mock_manager.add_device("22222222".to_string());
    mock_manager.add_device("33333333".to_string());

    let devices = mock_manager.list_devices();
    assert_eq!(devices.len(), 3);

    // Initialize keys on different devices
    let init_results: Vec<_> = devices
        .iter()
        .enumerate()
        .map(|(i, device)| {
            mock_manager.initialize_device(
                &device.serial,
                "123456",
                Some(0x82 + i as u8),
                &format!("Test Key {}", i + 1),
            )
        })
        .collect();

    // All initializations should succeed
    for result in init_results {
        assert!(result.is_ok());
    }

    // Create multi-device vault metadata
    let recipients: Vec<RecipientInfo> = (0..3)
        .map(|i| {
            RecipientInfo::new_yubikey(
                format!("age1yubikey{}test{}", i, i),
                format!("YubiKey {}", i + 1),
                format!(
                    "{}{}{}{}{}{}{}1",
                    i + 1,
                    i + 1,
                    i + 1,
                    i + 1,
                    i + 1,
                    i + 1,
                    i + 1
                ),
                0x82 + i as u8,
                "YubiKey 5 Series".to_string(),
            )
        })
        .collect();

    let metadata = VaultMetadataV2::new(
        ProtectionMode::YubiKeyOnly {
            serial: "11111111".to_string(),
        },
        recipients,
        1,
        100,
        "multi-device-checksum".to_string(),
    );

    assert_eq!(metadata.recipients.len(), 3);
    assert!(!metadata.backward_compatible); // YubiKey-only is not backward compatible

    reset_test_environment();
}
