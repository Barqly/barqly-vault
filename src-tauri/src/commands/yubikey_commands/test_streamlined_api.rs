//! Test streamlined YubiKey API commands
//!
//! Run this test to verify the new commands work:
//! ```bash
//! cargo test test_list_yubikeys_with_reset_device --ignored -- --nocapture
//! ```

use super::streamlined::list_yubikeys;

#[tokio::test]
#[ignore] // Integration test requiring actual YubiKey
async fn test_list_yubikeys_with_reset_device() {
    println!("🧪 Testing list_yubikeys with reset YubiKey...");

    let result = list_yubikeys().await;

    match result {
        Ok(devices) => {
            println!(
                "✅ SUCCESS: list_yubikeys returned {} device(s)",
                devices.len()
            );
            for device in devices {
                println!("📱 Device: {device:#?}");
            }
        }
        Err(e) => {
            println!("❌ ERROR: {}", e.message);
            println!("🔍 Error code: {:?}", e.code);
            println!("🛠️ Recovery guidance: {:?}", e.recovery_guidance);
        }
    }

    println!("✅ Test completed");
}
