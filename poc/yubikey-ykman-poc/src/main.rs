use yubikey_ykman_poc::{check_requirements, complete_setup};
use log::{error, info};
use std::env;

const DEFAULT_PIN: &str = "212121";

fn main() {
    env_logger::init();
    
    info!("=== YubiKey Setup POC ===");
    info!("This will initialize your YubiKey with PIN={}", DEFAULT_PIN);
    
    // Check for --auto flag
    let args: Vec<String> = env::args().collect();
    let auto_mode = args.contains(&"--auto".to_string());
    
    if !auto_mode {
        println!("\n⚠️  YubiKey Setup POC");
        println!("This will:");
        println!("1. Change your YubiKey PIN from default (123456) to {}", DEFAULT_PIN);
        println!("2. Set PUK to match PIN");
        println!("3. Set management key to protected TDES");
        println!("4. Generate an age identity");
        println!("\nRun with --auto to proceed automatically");
        println!("Press Enter to continue or Ctrl+C to abort...");
        
        let mut input = String::new();
        std::io::stdin().read_line(&mut input).expect("Failed to read input");
    }
    
    // Check requirements first
    match check_requirements() {
        Ok(reqs) => {
            println!("\n✅ Requirements Check:");
            println!("  ykman: {:?}", reqs.ykman_version);
            println!("  age-plugin: {:?}", reqs.age_plugin_version);
            
            if let Some(info) = &reqs.yubikey_info {
                println!("\n📱 YubiKey Status:");
                println!("  Serial: {}", info.serial);
                println!("  Version: {}", info.version);
                println!("  PIN attempts: {}/3", info.pin_attempts);
                println!("  Management key: {} ({})", 
                    info.management_key_algorithm,
                    if info.management_key_protected { "protected" } else { "unprotected" }
                );
            }
        }
        Err(e) => {
            error!("Requirements check failed: {}", e);
            
            match e {
                yubikey_ykman_poc::errors::YubiKeyError::YkmanNotFound => {
                    println!("\n❌ ykman not found!");
                    println!("Install with:");
                    println!("  macOS: brew install yubikey-manager");
                    println!("  Windows: winget install Yubico.YubiKeyManager");
                    println!("  Linux: apt install yubikey-manager");
                }
                yubikey_ykman_poc::errors::YubiKeyError::AgePluginNotFound => {
                    println!("\n❌ age-plugin-yubikey not found!");
                    println!("Install with:");
                    println!("  macOS: brew install age-plugin-yubikey");
                    println!("  cargo: cargo install age-plugin-yubikey");
                }
                yubikey_ykman_poc::errors::YubiKeyError::NoYubiKey => {
                    println!("\n❌ No YubiKey detected!");
                    println!("Please insert your YubiKey and try again.");
                }
                _ => {
                    println!("\n❌ Error: {}", e);
                }
            }
            std::process::exit(1);
        }
    }
    
    // Run complete setup
    println!("\n🔧 Starting YubiKey setup...");
    
    match complete_setup(Some(DEFAULT_PIN)) {
        Ok(recipient) => {
            println!("\n✅ Setup Complete!\n");
            println!("🔑 Your age recipient (save this!):");
            println!("{}\n", recipient);
            
            // Test encryption/decryption
            println!("📝 Testing encryption and decryption...\n");
            
            // Read test message from file
            let test_file = "test-message.txt";
            let test_message = match std::fs::read_to_string(test_file) {
                Ok(content) => content,
                Err(_) => "Hello from YubiKey POC! This is a secret message.".to_string()
            };
            
            println!("Original message:\n{}", test_message);
            println!("---");
            
            // Encrypt
            match yubikey_ykman_poc::encrypt_data(test_message.as_bytes(), &recipient) {
                Ok(encrypted) => {
                    println!("✅ Encrypted successfully ({} bytes)", encrypted.len());
                    
                    // Save encrypted file
                    let encrypted_file = "test-message.age";
                    if let Err(e) = std::fs::write(encrypted_file, &encrypted) {
                        println!("⚠️ Failed to save encrypted file: {}", e);
                    } else {
                        println!("📁 Saved encrypted file: {}", encrypted_file);
                    }
                    
                    // Decrypt - will prompt for touch
                    println!("\n🔓 Now decrypting (PIN will be auto-provided)...");
                    match yubikey_ykman_poc::decrypt_data(&encrypted, DEFAULT_PIN) {
                        Ok(decrypted) => {
                            let decrypted_text = String::from_utf8_lossy(&decrypted);
                            println!("\n✅ Decrypted message:\n{}", decrypted_text);
                            println!("---");
                            
                            if decrypted_text.trim() == test_message.trim() {
                                println!("\n🎉 Success! Encryption/decryption working perfectly!");
                            } else {
                                println!("\n⚠️ Warning: Decrypted text doesn't match original");
                                println!("Original length: {}, Decrypted length: {}", 
                                        test_message.trim().len(), decrypted_text.trim().len());
                            }
                        }
                        Err(e) => {
                            println!("\n❌ Decryption failed: {}", e);
                            
                            // Try manual decryption command for debugging
                            println!("\n📝 You can try manual decryption with:");
                            println!("  age -d test-message.age");
                        }
                    }
                }
                Err(e) => {
                    println!("❌ Encryption failed: {}", e);
                }
            }
            
            println!("\n📝 Manual usage example:");
            println!("  echo 'secret' | age -r {} -o secret.age", recipient);
            println!("  age -d -i age-plugin-yubikey secret.age");
        }
        Err(e) => {
            error!("Setup failed: {}", e);
            
            match e {
                yubikey_ykman_poc::errors::YubiKeyError::TouchTimeout => {
                    println!("\n⏱️ Touch timeout!");
                    println!("Please touch your YubiKey when it blinks.");
                }
                yubikey_ykman_poc::errors::YubiKeyError::PinFailed(attempts) => {
                    println!("\n❌ Incorrect PIN!");
                    println!("Attempts remaining: {}", attempts);
                    if attempts == 0 {
                        println!("⚠️  YubiKey is locked! Use PUK to unlock.");
                    }
                }
                _ => {
                    println!("\n❌ Error: {}", e);
                }
            }
            std::process::exit(1);
        }
    }
}