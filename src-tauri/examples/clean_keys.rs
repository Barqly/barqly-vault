//! Key directory cleanup utility
//!
//! This utility provides a cross-platform way to clean the application keys directory,
//! with confirmation prompts and safe operation.

// CLI utility examples are allowed to use println! for user interaction
#![allow(clippy::disallowed_macros)]

use barqly_vault_lib::services::shared::get_keys_dir;
use std::fs;
use std::io::{self, Write};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    println!("🔑 Keys Directory Cleanup");
    println!("========================");
    println!();

    // Get keys directory
    let keys_dir = match get_keys_dir() {
        Ok(dir) => dir,
        Err(e) => {
            eprintln!("❌ Could not access keys directory: {e}");
            return Err(e.into());
        }
    };

    if !keys_dir.exists() {
        println!("✅ Keys directory doesn't exist or is already clean");
        println!("📍 Expected location: {}", keys_dir.display());
        return Ok(());
    }

    // Count keys
    let entries = fs::read_dir(&keys_dir)?;
    let key_files: Vec<_> = entries
        .filter_map(|entry| entry.ok())
        .filter(|entry| {
            let file_name = entry.file_name();
            let file_name = file_name.to_string_lossy();
            file_name.starts_with("barqly-")
                && (file_name.ends_with(".agekey.enc") || file_name.ends_with(".agekey.meta"))
        })
        .collect();

    if key_files.is_empty() {
        println!("✅ No keys found in directory");
        println!("📍 Keys directory: {}", keys_dir.display());
        return Ok(());
    }

    println!("📍 Keys directory: {}", keys_dir.display());
    println!("🔍 Found {} key files:", key_files.len());

    // Group by key label for better display
    let mut key_labels = std::collections::HashSet::new();
    for entry in &key_files {
        let file_name = entry.file_name();
        let file_name = file_name.to_string_lossy();
        if file_name.starts_with("barqly-")
            && let Some(label_end) = file_name.find(".agekey.")
        {
            let label = &file_name[7..label_end]; // Skip "barqly-"
            key_labels.insert(label.to_string());
        }
    }

    // Show key labels (not all individual files)
    let mut labels: Vec<_> = key_labels.into_iter().collect();
    labels.sort();

    for (i, label) in labels.iter().enumerate() {
        if i < 10 {
            println!("   • {label}");
        } else if i == 10 {
            println!("   • ... and {} more", labels.len() - 10);
            break;
        }
    }

    println!();
    println!("⚠️  This will permanently delete all key files.");
    println!("   Make sure you have backups of any important keys!");
    println!();

    print!("Continue with cleanup? (y/N): ");
    io::stdout().flush()?;

    let mut input = String::new();
    io::stdin().read_line(&mut input)?;
    let input = input.trim();

    if input != "y" && input != "Y" {
        println!("Cleanup cancelled.");
        return Ok(());
    }

    println!();
    println!("🧹 Cleaning keys directory...");

    let mut cleaned_count = 0;
    let mut error_count = 0;

    for entry in key_files {
        let path = entry.path();
        match fs::remove_file(&path) {
            Ok(()) => {
                cleaned_count += 1;
                if cleaned_count <= 5 {
                    println!("   ✅ {}", entry.file_name().to_string_lossy());
                } else if cleaned_count == 6 {
                    println!("   ✅ ... continuing cleanup");
                }
            }
            Err(e) => {
                error_count += 1;
                eprintln!(
                    "   ❌ Failed to remove {}: {}",
                    entry.file_name().to_string_lossy(),
                    e
                );
            }
        }
    }

    println!();
    if error_count == 0 {
        println!("✅ Cleanup complete! Removed {cleaned_count} key files");
    } else {
        println!(
            "⚠️  Cleanup completed with {error_count} errors. {cleaned_count} files removed, {error_count} errors"
        );
    }

    // Check if directory is now empty
    if let Ok(entries) = fs::read_dir(&keys_dir) {
        let remaining_count = entries.count();
        if remaining_count == 0 {
            println!("🗑️  Keys directory is now empty");
        } else {
            println!("📋 {remaining_count} non-key files remain in directory");
        }
    }

    Ok(())
}
