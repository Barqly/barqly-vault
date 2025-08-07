//! Development environment reset utility
//!
//! This utility clears all development data including keys, logs, config,
//! and caches to provide a clean development environment.

use barqly_vault_lib::storage::path_management::{
    get_app_dir, get_config_dir, get_keys_dir, get_logs_dir,
};
use std::fs;
use std::io::{self, Write};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    println!("🧹 Development Environment Reset");
    println!("===============================");
    println!();
    println!("⚠️  This will remove:");
    println!("   • All development keys and metadata");
    println!("   • Application logs");
    println!("   • Configuration files");
    println!("   • Application caches");
    println!();

    print!("Continue? (y/N): ");
    io::stdout().flush()?;

    let mut input = String::new();
    io::stdin().read_line(&mut input)?;
    let input = input.trim();

    if input != "y" && input != "Y" {
        println!("Reset cancelled.");
        return Ok(());
    }

    println!();

    // Clear keys directory
    if let Ok(keys_dir) = get_keys_dir() {
        if keys_dir.exists() {
            println!("🔑 Clearing keys directory: {}", keys_dir.display());
            fs::remove_dir_all(&keys_dir)?;
            println!("   ✅ Keys cleared");
        } else {
            println!("🔑 Keys directory not found (already clean)");
        }
    } else {
        println!("🔑 Could not access keys directory");
    }

    // Clear logs directory
    if let Ok(logs_dir) = get_logs_dir() {
        if logs_dir.exists() {
            println!("📋 Clearing logs directory: {}", logs_dir.display());
            fs::remove_dir_all(&logs_dir)?;
            println!("   ✅ Logs cleared");
        } else {
            println!("📋 Logs directory not found (already clean)");
        }
    } else {
        println!("📋 Could not access logs directory");
    }

    // Clear config directory
    if let Ok(config_dir) = get_config_dir() {
        if config_dir.exists() {
            println!("🗂️  Clearing config directory: {}", config_dir.display());
            fs::remove_dir_all(&config_dir)?;
            println!("   ✅ Config cleared");
        } else {
            println!("🗂️  Config directory not found (already clean)");
        }
    } else {
        println!("🗂️  Could not access config directory");
    }

    // Show app directory location for reference
    if let Ok(app_dir) = get_app_dir() {
        println!();
        println!("📍 Application directory: {}", app_dir.display());

        // If app directory is now empty, remove it too
        if app_dir.exists() {
            if let Ok(entries) = fs::read_dir(&app_dir) {
                if entries.count() == 0 {
                    println!("🗑️  Removing empty app directory");
                    fs::remove_dir(&app_dir)?;
                }
            }
        }
    }

    println!();
    println!("✅ Development environment reset complete!");
    println!("💡 Run 'make dev-keys' to generate fresh development keys");

    Ok(())
}
