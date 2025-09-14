use anyhow::Result;
use log::{error, info, warn};
use std::io::{self, Write};
use yubikey_apdu_poc::{
    initialize_yubikey_with_protected_key, check_protected_key_status,
    TouchPolicy, DEFAULT_MGMT_KEY, complete_yubikey_setup
};
use yubikey::YubiKey;

// Test configuration
const TARGET_PIN: &str = "212121";
const DEFAULT_PIN: &str = "123456";

fn main() -> Result<()> {
    // Initialize logging
    env_logger::init();
    
    info!("=== YubiKey APDU POC - PIN-Protected TDES Management Key ===");
    info!("");
    info!("AUTO-RUNNING HYBRID TEST WITH CACHED POLICY");
    info!("");
    
    // Check for YubiKey
    match YubiKey::open() {
        Ok(yk) => {
            info!("✅ YubiKey detected: Serial #{:?}", yk.serial());
        }
        Err(e) => {
            error!("❌ No YubiKey detected: {}", e);
            error!("Please insert a YubiKey and try again.");
            return Err(e.into());
        }
    }
    
    // AUTO-RUN: Option 7 with automatic yes and cached policy
    test_hybrid_implementation_auto()
}

fn test_with_default_pin() -> Result<()> {
    info!("\n=== Test 1: Setting management key with default PIN ===");
    info!("Using PIN: {}", DEFAULT_PIN);
    info!("Touch policy: Cached");
    
    // First change PIN/PUK if needed
    info!("Note: This assumes PIN is already set to {}", DEFAULT_PIN);
    info!("If this fails, you may need to reset your YubiKey PIV applet.");
    
    match initialize_yubikey_with_protected_key(DEFAULT_PIN, TouchPolicy::Cached) {
        Ok(_) => {
            info!("✅ Successfully set PIN-protected management key!");
            info!("The key is now protected by PIN: {}", DEFAULT_PIN);
        }
        Err(e) => {
            error!("❌ Failed to set management key: {}", e);
            if e.to_string().contains("Wrong PIN") {
                info!("Hint: The PIN might not be {}. Try option 2 or 3.", DEFAULT_PIN);
            }
        }
    }
    
    Ok(())
}

fn test_with_target_pin() -> Result<()> {
    info!("\n=== Test 2: Setting management key with target PIN ===");
    info!("Using PIN: {}", TARGET_PIN);
    info!("Touch policy: Cached");
    
    info!("Note: This assumes PIN has been changed to {}", TARGET_PIN);
    
    match initialize_yubikey_with_protected_key(TARGET_PIN, TouchPolicy::Cached) {
        Ok(_) => {
            info!("✅ Successfully set PIN-protected management key!");
            info!("The key is now protected by PIN: {}", TARGET_PIN);
        }
        Err(e) => {
            error!("❌ Failed to set management key: {}", e);
            if e.to_string().contains("Wrong PIN") {
                info!("Hint: The PIN might not be {}. Try option 1 or 3.", TARGET_PIN);
            }
        }
    }
    
    Ok(())
}

fn test_with_custom_pin() -> Result<()> {
    info!("\n=== Test 3: Setting management key with custom PIN ===");
    
    print!("Enter current PIN: ");
    io::stdout().flush()?;
    let mut pin = String::new();
    io::stdin().read_line(&mut pin)?;
    let pin = pin.trim();
    
    println!("Select touch policy:");
    println!("1. Never (no touch required)");
    println!("2. Cached (touch cached for 15 seconds)");
    println!("3. Always (touch required every time)");
    print!("Choice (1-3): ");
    io::stdout().flush()?;
    
    let mut choice = String::new();
    io::stdin().read_line(&mut choice)?;
    
    let touch_policy = match choice.trim() {
        "1" => TouchPolicy::Never,
        "2" => TouchPolicy::Cached,
        "3" => TouchPolicy::Always,
        _ => {
            warn!("Invalid choice, using Cached");
            TouchPolicy::Cached
        }
    };
    
    info!("Using PIN: {} (length: {})", "*".repeat(pin.len()), pin.len());
    info!("Touch policy: {:?}", touch_policy);
    
    match initialize_yubikey_with_protected_key(pin, touch_policy) {
        Ok(_) => {
            info!("✅ Successfully set PIN-protected management key!");
            info!("The key is now protected by your PIN");
        }
        Err(e) => {
            error!("❌ Failed to set management key: {}", e);
        }
    }
    
    Ok(())
}

fn check_pin_status() -> Result<()> {
    info!("\n=== Checking PIN Status ===");
    
    print!("Enter PIN to check: ");
    io::stdout().flush()?;
    let mut pin = String::new();
    io::stdin().read_line(&mut pin)?;
    let pin = pin.trim();
    
    match check_protected_key_status(pin) {
        Ok(true) => {
            info!("✅ PIN is valid and can access protected functions");
        }
        Ok(false) => {
            warn!("⚠️ PIN verification failed or no protected key found");
        }
        Err(e) => {
            error!("❌ Error checking status: {}", e);
        }
    }
    
    Ok(())
}

fn compare_with_ykman() -> Result<()> {
    info!("\n=== Compare with ykman ===");
    info!("This will show the equivalent ykman command.");
    info!("");
    info!("To set a PIN-protected TDES management key with ykman:");
    info!("");
    info!("ykman piv access change-management-key \\");
    info!("  -a TDES \\");
    info!("  --protect \\");
    info!("  -m {} \\", hex::encode(DEFAULT_MGMT_KEY));
    info!("  -P [YOUR_PIN] \\");
    info!("  -f");
    info!("");
    info!("Our APDU implementation does the same thing using:");
    info!("1. VERIFY PIN: 00 20 00 80 08 [PIN padded]");
    info!("2. SET MGMT KEY: 00 FF FF FF 1B 03 9B 18 [24-byte key]");
    info!("3. STORE METADATA: 00 DB 3F FF [Length] [TLV data]");
    
    Ok(())
}

fn full_initialization() -> Result<()> {
    info!("\n=== Full YubiKey Initialization Sequence ===");
    info!("This will:");
    info!("1. Use yubikey crate to change PIN/PUK");
    info!("2. Use our APDU to set protected management key");
    info!("3. Verify with age-plugin-yubikey");
    warn!("");
    warn!("⚠️ WARNING: This will change your YubiKey PIN/PUK!");
    warn!("Current PIN must be: {}", DEFAULT_PIN);
    print!("Continue? (y/n): ");
    io::stdout().flush()?;
    
    let mut confirm = String::new();
    io::stdin().read_line(&mut confirm)?;
    
    if confirm.trim().to_lowercase() != "y" {
        info!("Cancelled.");
        return Ok(());
    }
    
    // Step 1: Change PIN/PUK using yubikey crate
    info!("\nStep 1: Changing PIN/PUK...");
    match change_pin_puk() {
        Ok(_) => info!("✅ PIN/PUK changed successfully"),
        Err(e) => {
            error!("❌ Failed to change PIN/PUK: {}", e);
            return Err(e);
        }
    }
    
    // Step 2: Set protected management key
    info!("\nStep 2: Setting protected management key...");
    match initialize_yubikey_with_protected_key(TARGET_PIN, TouchPolicy::Cached) {
        Ok(_) => info!("✅ Protected management key set successfully"),
        Err(e) => {
            error!("❌ Failed to set management key: {}", e);
            return Err(e);
        }
    }
    
    // Step 3: Test with age-plugin-yubikey
    info!("\nStep 3: Testing with age-plugin-yubikey...");
    info!("Run this command to test:");
    info!("age-plugin-yubikey --identity");
    info!("It should prompt for PIN: {}", TARGET_PIN);
    
    info!("\n✅ Full initialization complete!");
    info!("PIN: {}", TARGET_PIN);
    info!("PUK: {}", TARGET_PIN);
    info!("Management Key: PIN-protected TDES (random)");
    
    Ok(())
}

fn change_pin_puk() -> Result<()> {
    let mut yk = YubiKey::open()?;
    
    // With the "untested" feature, we can use change_pin and change_puk!
    
    // Change PIN
    info!("Changing PIN from {} to {}...", DEFAULT_PIN, TARGET_PIN);
    match yk.change_pin(DEFAULT_PIN.as_bytes(), TARGET_PIN.as_bytes()) {
        Ok(_) => info!("✅ PIN changed successfully"),
        Err(e) => {
            if e.to_string().contains("incorrect") {
                warn!("PIN already changed or different from default");
            } else {
                return Err(e.into());
            }
        }
    }
    
    // Change PUK  
    info!("Changing PUK to match PIN...");
    match yk.change_puk("12345678".as_bytes(), TARGET_PIN.as_bytes()) {
        Ok(_) => info!("✅ PUK changed successfully"),
        Err(e) => {
            if e.to_string().contains("incorrect") {
                warn!("PUK already changed or different from default");
            } else {
                return Err(e.into());
            }
        }
    }
    
    info!("✅ PIN and PUK changes complete using yubikey crate!");
    Ok(())
}

fn test_hybrid_implementation_auto() -> Result<()> {
    info!("\n=== 🚀 HYBRID IMPLEMENTATION TEST (AUTO-RUN) ===");
    info!("Auto-running with cached touch policy...");
    info!("  1. PIN/PUK changes using yubikey crate");
    info!("  2. Management key using raw APDU via pcsc");
    info!("  3. Key generation using age-plugin-yubikey");
    
    info!("\n🔧 Starting hybrid implementation...");
    
    // Run the complete setup with cached policy automatically
    match complete_yubikey_setup(
        DEFAULT_PIN,  // old PIN
        TARGET_PIN,   // new PIN
        "12345678",   // old PUK (default)
        TouchPolicy::Cached,  // Use cached policy by default
        "hybrid-test-key"
    ) {
        Ok(recipient) => {
            info!("\n✅ ========================================");
            info!("✅ HYBRID IMPLEMENTATION SUCCESS!");
            info!("✅ ========================================");
            info!("✅ All operations completed without ykman!");
            info!("✅ Your age recipient: {}", recipient);
            info!("✅ ========================================");
            
            info!("\n📝 Next steps:");
            info!("1. Test encryption: echo 'test' | age -r {} -o test.age", recipient);
            let serial = yubikey::YubiKey::open()
                .ok()
                .and_then(|yk| Some(yk.serial()))
                .map(|s| format!("{:?}", s))
                .unwrap_or_else(|| "SERIAL".to_string());
            info!("2. Test decryption: age -d -i age-yubikey-identity-{}.txt test.age", serial);
            info!("3. When prompted, enter PIN: {}", TARGET_PIN);
        }
        Err(e) => {
            error!("❌ Hybrid implementation failed: {}", e);
            error!("You may need to reset your YubiKey PIV applet");
        }
    }
    
    Ok(())
}

fn test_hybrid_implementation() -> Result<()> {
    info!("\n=== 🚀 HYBRID IMPLEMENTATION TEST ===");
    info!("This demonstrates the complete solution without ykman:");
    info!("  1. PIN/PUK changes using yubikey crate");
    info!("  2. Management key using raw APDU via pcsc");
    info!("  3. Key generation using age-plugin-yubikey");
    
    warn!("\n⚠️ This will modify your YubiKey!");
    print!("Continue? (y/n): ");
    io::stdout().flush()?;
    
    let mut confirm = String::new();
    io::stdin().read_line(&mut confirm)?;
    
    if confirm.trim().to_lowercase() != "y" {
        info!("Cancelled.");
        return Ok(());
    }
    
    // Get touch policy preference
    println!("\nSelect touch policy:");
    println!("1. Never (no touch required)");
    println!("2. Cached (touch cached for 15 seconds) - RECOMMENDED");
    println!("3. Always (touch required every time)");
    print!("Choice (1-3): ");
    io::stdout().flush()?;
    
    let mut choice = String::new();
    io::stdin().read_line(&mut choice)?;
    
    let touch_policy = match choice.trim() {
        "1" => TouchPolicy::Never,
        "2" => TouchPolicy::Cached,
        "3" => TouchPolicy::Always,
        _ => {
            info!("Invalid choice, using Cached");
            TouchPolicy::Cached
        }
    };
    
    info!("\n🔧 Starting hybrid implementation...");
    
    // Run the complete setup
    match complete_yubikey_setup(
        DEFAULT_PIN,  // old PIN
        TARGET_PIN,   // new PIN
        "12345678",   // old PUK (default)
        touch_policy,
        "hybrid-test-key"
    ) {
        Ok(recipient) => {
            info!("\n✅ ========================================");
            info!("✅ HYBRID IMPLEMENTATION SUCCESS!");
            info!("✅ ========================================");
            info!("✅ All operations completed without ykman!");
            info!("✅ Your age recipient: {}", recipient);
            info!("✅ ========================================");
            
            info!("\n📝 Next steps:");
            info!("1. Test encryption: echo 'test' | age -r {} -o test.age", recipient);
            let serial = yubikey::YubiKey::open()
                .ok()
                .and_then(|yk| Some(yk.serial()))
                .map(|s| format!("{:?}", s))
                .unwrap_or_else(|| "SERIAL".to_string());
            info!("2. Test decryption: age -d -i age-yubikey-identity-{}.txt test.age", serial);
            info!("3. When prompted, enter PIN: {}", TARGET_PIN);
        }
        Err(e) => {
            error!("❌ Hybrid implementation failed: {}", e);
            error!("You may need to reset your YubiKey PIV applet");
        }
    }
    
    Ok(())
}