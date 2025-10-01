//! Development key generator
//!
//! Generates a set of sample encryption keys for development and testing purposes.

// CLI utility examples are allowed to use println! for user interaction
#![allow(clippy::disallowed_macros)]

use barqly_vault_lib::services::key_management::passphrase::{
    encrypt_private_key, generate_keypair,
};
use barqly_vault_lib::services::key_management::shared::{key_exists, save_encrypted_key};
use secrecy::SecretString;

// Development key configurations
const DEV_KEYS: &[(&str, &str)] = &[
    ("dev-key-1", "dev-passphrase-123456"),
    ("dev-key-2", "dev-passphrase-654321"),
    ("test-key-short", "test123456789"),
    ("test-key-bitcoin-custody", "bitcoin-dev-passphrase-2024"),
];

fn main() -> Result<(), Box<dyn std::error::Error>> {
    println!("🔑 Development Key Generator");
    println!("===========================");
    println!();

    println!("Creating sample keys for development testing:");
    for (label, _) in DEV_KEYS {
        println!("   • {label} (Sample development key)");
    }
    println!();

    let mut created_count = 0;
    let mut skipped_count = 0;

    for (label, passphrase) in DEV_KEYS {
        print!("🔐 Generating key '{label}'... ");

        // Check if key already exists
        match key_exists(label) {
            Ok(true) => {
                println!("⏭️  (already exists)");
                skipped_count += 1;
                continue;
            }
            Ok(false) => {
                // Continue with key generation
            }
            Err(e) => {
                println!("❌ Error checking key existence: {e}");
                continue;
            }
        }

        // Generate the age keypair
        match generate_keypair() {
            Ok(keypair) => {
                // Encrypt the private key with passphrase
                match encrypt_private_key(
                    &keypair.private_key,
                    SecretString::from(passphrase.to_string()),
                ) {
                    Ok(encrypted_key) => {
                        // Save the encrypted key
                        match save_encrypted_key(
                            label,
                            &encrypted_key,
                            Some(keypair.public_key.as_str()),
                        ) {
                            Ok(_) => {
                                println!("✅");
                                println!("   Public key: {}", keypair.public_key.as_str());
                                created_count += 1;
                            }
                            Err(e) => {
                                println!("❌ Failed to save: {e}");
                            }
                        }
                    }
                    Err(e) => {
                        println!("❌ Failed to encrypt: {e}");
                    }
                }
            }
            Err(e) => {
                println!("❌ Failed to generate: {e}");
            }
        }
    }

    println!();
    println!("📊 Summary:");
    println!("   • {created_count} keys created");
    println!("   • {skipped_count} keys skipped (already existed)");
    println!("   • {} total keys configured", DEV_KEYS.len());

    if created_count > 0 {
        println!();
        println!("💡 Test passphrases:");
        for (label, passphrase) in DEV_KEYS {
            println!("   • {label}: {passphrase}");
        }

        println!();
        println!("🚀 Ready for development!");
        println!("   Use these keys in the UI to test encryption/decryption flows");
        println!("   Keys are stored in your platform-specific config directory");
    }

    Ok(())
}
