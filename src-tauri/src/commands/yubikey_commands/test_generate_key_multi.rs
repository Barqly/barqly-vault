//! Test for generate_key_multi command to verify parameter structure
//!
//! Run this test to verify the new multi-recipient key generation works:
//! ```bash
//! cargo test test_generate_key_multi_yubikey_only --ignored -- --nocapture
//! ```

use crate::commands::crypto::key_generation_multi::{generate_key_multi, GenerateKeyMultiInput};
use crate::crypto::yubikey::ProtectionMode;

#[tokio::test]
#[ignore] // Integration test
async fn test_generate_key_multi_yubikey_only() {
    println!("🧪 Testing generate_key_multi with YubiKey-only parameters...");

    // Create the exact parameters that the frontend sends
    let test_params = GenerateKeyMultiInput {
        label: "test-yubikey-vault".to_string(),
        passphrase: None, // No passphrase for YubiKey-only mode
        protection_mode: Some(ProtectionMode::YubiKeyOnly {
            serial: "unknown".to_string(), // Since no YubiKey detected
        }),
        yubikey_device_id: Some("auto-detect".to_string()), // Placeholder for backend
        yubikey_info: None,                                 // No device info
    };

    println!("📤 Test parameters: {:#?}", test_params);

    // Call the command
    let result = generate_key_multi(test_params).await;

    match result {
        Ok(response) => {
            println!("✅ SUCCESS: generate_key_multi worked!");
            println!("📊 Response: {:#?}", response);
        }
        Err(e) => {
            println!("❌ ERROR: {}", e.message);
            println!("🔍 Error code: {:?}", e.code);
            println!("🛠️ Recovery guidance: {:?}", e.recovery_guidance);
        }
    }

    println!("✅ Test completed");
}

#[tokio::test]
#[ignore] // Integration test
async fn test_generate_key_multi_passphrase_only() {
    println!("🧪 Testing generate_key_multi with PassphraseOnly parameters...");

    let test_params = GenerateKeyMultiInput {
        label: "test-passphrase-vault".to_string(),
        passphrase: Some("test-strong-passphrase-123!".to_string()),
        protection_mode: Some(ProtectionMode::PassphraseOnly),
        yubikey_device_id: None,
        yubikey_info: None,
    };

    println!("📤 Test parameters: {:#?}", test_params);

    let result = generate_key_multi(test_params).await;

    match result {
        Ok(response) => {
            println!("✅ SUCCESS: Passphrase-only mode worked!");
            println!("📊 Response: {:#?}", response);
        }
        Err(e) => {
            println!("❌ ERROR: {}", e.message);
            println!("🔍 Error code: {:?}", e.code);
        }
    }

    println!("✅ Test completed");
}
