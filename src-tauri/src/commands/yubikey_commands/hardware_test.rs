//! Hardware integration test for YubiKey detection
//! 
//! Run this test with an actual YubiKey plugged in:
//! ```bash
//! cargo test test_yubikey_hardware_detection --ignored -- --nocapture
//! ```

use super::device_management::yubikey_list_devices;

#[tokio::test]
#[ignore] // Requires actual YubiKey hardware
async fn test_yubikey_hardware_detection() {
    println!("🔌 Testing YubiKey hardware detection...");
    println!("📝 Make sure your YubiKey is plugged in before running this test");
    
    // Call the actual command that the frontend uses
    let result = yubikey_list_devices().await;
    
    match result {
        Ok(devices) => {
            println!("✅ SUCCESS: yubikey_list_devices returned Ok(Vec)");
            println!("📊 Found {} device(s)", devices.len());
            
            if devices.is_empty() {
                println!("⚠️  No YubiKey devices detected");
                println!("💡 This could mean:");
                println!("   - age-plugin-yubikey is not installed");
                println!("   - YubiKey is not plugged in");
                println!("   - YubiKey driver issues");
            } else {
                println!("🎉 YubiKey device(s) found:");
                for (i, device) in devices.iter().enumerate() {
                    println!("   Device {}: {}", i + 1, device.name);
                    println!("     ID: {}", device.device_id);
                    if let Some(serial) = &device.serial_number {
                        println!("     Serial: {}", serial);
                    }
                    if let Some(version) = &device.firmware_version {
                        println!("     Version: {}", version);
                    }
                    println!("     PIV: {}, OATH: {}, FIDO: {}", 
                        device.has_piv, device.has_oath, device.has_fido);
                }
            }
        }
        Err(e) => {
            println!("❌ ERROR: yubikey_list_devices failed with: {e}");
            println!("🐛 This is the exact error the frontend is experiencing");
            panic!("Hardware test failed - this should not happen with the recent fixes");
        }
    }
    
    println!("✅ Test completed - function returned proper Result type");
}

#[tokio::test] 
#[ignore] // Requires actual YubiKey hardware
async fn test_yubikey_hot_plugging() {
    println!("🔄 Testing YubiKey hot-plugging behavior...");
    println!("📝 Instructions:");
    println!("   1. Make sure YubiKey is plugged in");
    println!("   2. Test will check for devices");
    println!("   3. Unplug YubiKey when prompted");
    println!("   4. Plug it back in when prompted");
    
    // First check - should find devices
    println!("\n🔌 Phase 1: Checking with YubiKey plugged in...");
    let result1 = yubikey_list_devices().await;
    match result1 {
        Ok(devices) => println!("✅ Found {} device(s)", devices.len()),
        Err(e) => println!("❌ Error: {e}"),
    }
    
    println!("\n⏸️  MANUAL ACTION: Unplug your YubiKey now and press Enter...");
    let mut input = String::new();
    std::io::stdin().read_line(&mut input).unwrap();
    
    // Second check - should return empty array (not error)
    println!("🔌 Phase 2: Checking with YubiKey unplugged...");
    let result2 = yubikey_list_devices().await;
    match result2 {
        Ok(devices) => {
            println!("✅ SUCCESS: Got Ok({}) - no crash!", devices.len());
            if devices.is_empty() {
                println!("✅ Correctly returned empty array when no devices");
            }
        }
        Err(e) => {
            println!("❌ ERROR: Should not fail when no YubiKey: {e}");
            panic!("Backend should return Ok(vec![]) when no devices, not error");
        }
    }
    
    println!("\n⏸️  MANUAL ACTION: Plug your YubiKey back in and press Enter...");
    input.clear();
    std::io::stdin().read_line(&mut input).unwrap();
    
    // Third check - should find devices again
    println!("🔌 Phase 3: Checking with YubiKey plugged back in...");
    let result3 = yubikey_list_devices().await;
    match result3 {
        Ok(devices) => {
            println!("✅ Found {} device(s) after re-plugging", devices.len());
            if !devices.is_empty() {
                println!("✅ YubiKey successfully re-detected");
            }
        }
        Err(e) => println!("❌ Error: {e}"),
    }
    
    println!("✅ Hot-plugging test completed");
}