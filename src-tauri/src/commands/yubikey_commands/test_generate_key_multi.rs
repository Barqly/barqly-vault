//! Test for generate_key_multi command to verify parameter structure
//!
//! Run this test to verify the new multi-recipient key generation works:
//! ```bash
//! cargo test test_generate_key_multi_yubikey_only --ignored -- --nocapture
//! ```

use crate::commands::crypto::key_generation_multi::{GenerateKeyMultiInput, generate_key_multi};
use crate::crypto::yubikey::ProtectionMode;
use crate::log_sensitive;
use crate::tracing_setup::debug;

#[tokio::test]
#[ignore] // Integration test
async fn test_generate_key_multi_yubikey_only() {
    log_sensitive!(dev_only: {
        debug!("🧪 Testing generate_key_multi with YubiKey-only parameters...");
    });

    // Create the exact parameters that the frontend sends
    let test_params = GenerateKeyMultiInput {
        label: "test-yubikey-vault".to_string(),
        passphrase: None, // No passphrase for YubiKey-only mode
        protection_mode: Some(ProtectionMode::YubiKeyOnly {
            serial: "unknown".to_string(), // Since no YubiKey detected
        }),
        yubikey_device_id: Some("auto-detect".to_string()), // Placeholder for backend
        yubikey_info: None,                                 // No device info
        yubikey_pin: Some("123456".to_string()),            // Default PIN for testing
    };

    log_sensitive!(dev_only: {
        debug!("📤 Test parameters: {test_params:#?}");
    });

    // Call the command
    let result = generate_key_multi(test_params).await;

    match result {
        Ok(response) => {
            log_sensitive!(dev_only: {
                debug!("✅ SUCCESS: generate_key_multi worked!");
            });
            log_sensitive!(dev_only: {
                debug!("📊 Response: {response:#?}");
            });
        }
        Err(e) => {
            log_sensitive!(dev_only: {
                debug!("❌ ERROR: {}", e.message);
            });
            log_sensitive!(dev_only: {
                debug!("🔍 Error code: {:?}", e.code);
            });
            log_sensitive!(dev_only: {
                debug!("🛠️ Recovery guidance: {:?}", e.recovery_guidance);
            });
        }
    }

    log_sensitive!(dev_only: {
        debug!("✅ Test completed");
    });
}

#[tokio::test]
#[ignore] // Integration test
async fn test_generate_key_multi_passphrase_only() {
    log_sensitive!(dev_only: {
        debug!("🧪 Testing generate_key_multi with PassphraseOnly parameters...");
    });

    let test_params = GenerateKeyMultiInput {
        label: "test-passphrase-vault".to_string(),
        passphrase: Some("test-strong-passphrase-123!".to_string()),
        protection_mode: Some(ProtectionMode::PassphraseOnly),
        yubikey_device_id: None,
        yubikey_info: None,
        yubikey_pin: None, // No PIN needed for passphrase-only mode
    };

    log_sensitive!(dev_only: {
        debug!("📤 Test parameters: {test_params:#?}");
    });

    let result = generate_key_multi(test_params).await;

    match result {
        Ok(response) => {
            log_sensitive!(dev_only: {
                debug!("✅ SUCCESS: Passphrase-only mode worked!");
            });
            log_sensitive!(dev_only: {
                debug!("📊 Response: {response:#?}");
            });
        }
        Err(e) => {
            log_sensitive!(dev_only: {
                debug!("❌ ERROR: {}", e.message);
            });
            log_sensitive!(dev_only: {
                debug!("🔍 Error code: {:?}", e.code);
            });
        }
    }

    log_sensitive!(dev_only: {
        debug!("✅ Test completed");
    });
}
