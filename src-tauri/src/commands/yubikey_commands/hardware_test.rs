//! Hardware integration test for YubiKey detection
//!
//! Run this test with an actual YubiKey plugged in:
//! ```bash
//! cargo test test_yubikey_hardware_detection --ignored -- --nocapture
//! ```

// Test files are allowed to use println! for debug output
#![allow(clippy::disallowed_macros)]

use super::streamlined::list_yubikeys;
use crate::log_sensitive;
use crate::tracing_setup::debug;

#[tokio::test]
#[ignore] // Requires actual YubiKey hardware
async fn test_yubikey_hardware_detection() {
    log_sensitive!(dev_only: {
        debug!("🔌 Testing YubiKey hardware detection...");
    });
    log_sensitive!(dev_only: {
        debug!("📝 Make sure your YubiKey is plugged in before running this test");
    });

    // Call the actual command that the frontend uses
    let result = list_yubikeys().await;

    match result {
        Ok(devices) => {
            log_sensitive!(dev_only: {
                debug!("✅ SUCCESS: yubikey_list_devices returned Ok(Vec)");
            });
            log_sensitive!(dev_only: {
                debug!("📊 Found {} device(s)", devices.len());
            });

            if devices.is_empty() {
                log_sensitive!(dev_only: {
                    debug!("⚠️  No YubiKey devices detected");
                });
                log_sensitive!(dev_only: {
                    debug!("💡 This could mean:");
                });
                log_sensitive!(dev_only: {
                    debug!("   - age-plugin-yubikey is not installed");
                });
                log_sensitive!(dev_only: {
                    debug!("   - YubiKey is not plugged in");
                });
                log_sensitive!(dev_only: {
                    debug!("   - YubiKey driver issues");
                });
            } else {
                log_sensitive!(dev_only: {
                    debug!("🎉 YubiKey device(s) found:");
                });
                for (i, device) in devices.iter().enumerate() {
                    log_sensitive!(dev_only: {
                        debug!("   Device {}: {}", i + 1, device.serial);
                    });
                    log_sensitive!(dev_only: {
                        debug!("     State: {:?}", device.state);
                    });
                    if let Some(label) = &device.label {
                        log_sensitive!(dev_only: {
                            debug!("     Label: {label}");
                        });
                    }
                    if let Some(recipient) = &device.recipient {
                        log_sensitive!(dev_only: {
                            debug!("     Recipient: {recipient}");
                        });
                    }
                    println!("     PIN Status: {:?}", device.pin_status);
                }
            }
        }
        Err(e) => {
            log_sensitive!(dev_only: {
                debug!("❌ ERROR: yubikey_list_devices failed with: {e}");
            });
            log_sensitive!(dev_only: {
                debug!("🐛 This is the exact error the frontend is experiencing");
            });
            panic!("Hardware test failed - this should not happen with the recent fixes");
        }
    }

    log_sensitive!(dev_only: {
        debug!("✅ Test completed - function returned proper Result type");
    });
}

#[tokio::test]
#[ignore] // Requires actual YubiKey hardware
async fn test_yubikey_hot_plugging() {
    log_sensitive!(dev_only: {
        debug!("🔄 Testing YubiKey hot-plugging behavior...");
    });
    log_sensitive!(dev_only: {
        debug!("📝 Instructions:");
    });
    log_sensitive!(dev_only: {
        debug!("   1. Make sure YubiKey is plugged in");
    });
    log_sensitive!(dev_only: {
        debug!("   2. Test will check for devices");
    });
    log_sensitive!(dev_only: {
        debug!("   3. Unplug YubiKey when prompted");
    });
    log_sensitive!(dev_only: {
        debug!("   4. Plug it back in when prompted");
    });

    // First check - should find devices
    log_sensitive!(dev_only: {
        debug!("\n🔌 Phase 1: Checking with YubiKey plugged in...");
    });
    let result1 = list_yubikeys().await;
    match result1 {
        Ok(devices) => println!("✅ Found {} device(s)", devices.len()),
        Err(e) => println!("❌ Error: {e}"),
    }

    log_sensitive!(dev_only: {
        debug!("\n⏸️  MANUAL ACTION: Unplug your YubiKey now and press Enter...");
    });
    let mut input = String::new();
    std::io::stdin().read_line(&mut input).unwrap();

    // Second check - should return empty array (not error)
    log_sensitive!(dev_only: {
        debug!("🔌 Phase 2: Checking with YubiKey unplugged...");
    });
    let result2 = list_yubikeys().await;
    match result2 {
        Ok(devices) => {
            log_sensitive!(dev_only: {
                debug!("✅ SUCCESS: Got Ok({}) - no crash!", devices.len());
            });
            if devices.is_empty() {
                log_sensitive!(dev_only: {
                    debug!("✅ Correctly returned empty array when no devices");
                });
            }
        }
        Err(e) => {
            log_sensitive!(dev_only: {
                debug!("❌ ERROR: Should not fail when no YubiKey: {e}");
            });
            panic!("Backend should return Ok(vec![]) when no devices, not error");
        }
    }

    log_sensitive!(dev_only: {
        debug!("\n⏸️  MANUAL ACTION: Plug your YubiKey back in and press Enter...");
    });
    input.clear();
    std::io::stdin().read_line(&mut input).unwrap();

    // Third check - should find devices again
    log_sensitive!(dev_only: {
        debug!("🔌 Phase 3: Checking with YubiKey plugged back in...");
    });
    let result3 = list_yubikeys().await;
    match result3 {
        Ok(devices) => {
            log_sensitive!(dev_only: {
                debug!("✅ Found {} device(s) after re-plugging", devices.len());
            });
            if !devices.is_empty() {
                log_sensitive!(dev_only: {
                    debug!("✅ YubiKey successfully re-detected");
                });
            }
        }
        Err(e) => println!("❌ Error: {e}"),
    }

    log_sensitive!(dev_only: {
        debug!("✅ Hot-plugging test completed");
    });
}
