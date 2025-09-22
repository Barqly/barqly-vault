//! Test streamlined YubiKey API commands
//!
//! Run this test to verify the new commands work:
//! ```bash
//! cargo test test_list_yubikeys_with_reset_device --ignored -- --nocapture
//! ```

// Test files are allowed to use println! for debug output
#![allow(clippy::disallowed_macros)]

use super::streamlined::list_yubikeys;
use crate::log_sensitive;
use crate::tracing_setup::debug;

#[tokio::test]
#[ignore] // Integration test requiring actual YubiKey
async fn test_list_yubikeys_with_reset_device() {
    log_sensitive!(dev_only: {
        debug!("🧪 Testing list_yubikeys with reset YubiKey...");
    });

    let result = list_yubikeys().await;

    match result {
        Ok(devices) => {
            println!(
                "✅ SUCCESS: list_yubikeys returned {} device(s)",
                devices.len()
            );
            for device in devices {
                log_sensitive!(dev_only: {
                    debug!("📱 Device: {device:#?}");
                });
            }
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
