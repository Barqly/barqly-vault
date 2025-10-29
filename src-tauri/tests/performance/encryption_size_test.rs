/// Performance test to reproduce encryption hang with files > 150KB
///
/// This test demonstrates the pipe buffer deadlock issue with age CLI encryption.
///
/// Run with:
/// ```
/// cargo test --test encryption_size_test -- --nocapture
/// ```

use std::fs;
use std::io::Write;
use std::path::PathBuf;
use std::process::{Command, Stdio};

#[test]
#[ignore] // Manual test - user runs explicitly
fn test_encryption_with_different_sizes() {
    println!("\n🔬 Testing encryption with different file sizes...\n");

    let test_dir = PathBuf::from("/Users/nauman/Downloads/BV-Perf-Test");

    if !test_dir.exists() {
        panic!("Test directory not found: {}", test_dir.display());
    }

    // Test files created by user
    let test_files = vec![
        ("small", 138),   // 138KB - should work
        ("medium", 211),  // 211KB - hangs
        ("large", 2500),  // 2.5MB - hangs
        ("xlarge", 6000), // 6MB - hangs
    ];

    for (name, size_kb) in test_files {
        println!("📄 Testing {name} file (~{size_kb}KB)...");

        // Create test data
        let data_size = size_kb * 1024;
        let test_data = vec![b'X'; data_size];

        // Test direct age CLI encryption
        let result = test_age_cli_encryption(&test_data);

        match result {
            Ok(duration) => {
                println!("  ✅ SUCCESS in {:?}", duration);
            }
            Err(e) => {
                println!("  ❌ FAILED: {}", e);
            }
        }
        println!();
    }
}

fn test_age_cli_encryption(data: &[u8]) -> Result<std::time::Duration, String> {
    let start = std::time::Instant::now();

    let age_path = "/Users/nauman/projects/barqly-vault/src-tauri/bin/darwin/age";

    // Use dummy passphrase recipient (not YubiKey to isolate issue)
    let recipient = "age1qyqszqgpqyqszqgpqyqszqgpqyqszqgpqyqszqgpqyqszqgpqyqsl6q5c8";

    let mut child = Command::new(age_path)
        .args(&["-r", recipient])
        .stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
        .map_err(|e| format!("Failed to spawn: {}", e))?;

    // BUG REPRODUCTION: Write to stdin synchronously
    if let Some(mut stdin) = child.stdin.take() {
        println!("  Writing {} bytes to stdin...", data.len());

        // This will BLOCK if data > pipe buffer (~65KB)
        if let Err(e) = stdin.write_all(data) {
            return Err(format!("Broken pipe during write: {}", e));
        }

        drop(stdin);
        println!("  Stdin closed, waiting for output...");
    }

    // This hangs if above write_all blocked in deadlock
    let output = child.wait_with_output()
        .map_err(|e| format!("Wait failed: {}", e))?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(format!("Age failed: {}", stderr));
    }

    println!("  Encrypted {} bytes → {} bytes", data.len(), output.stdout.len());

    Ok(start.elapsed())
}

#[test]
#[ignore]
fn test_age_cli_with_threading() {
    println!("\n🔬 Testing FIXED version with threading...\n");

    let test_data = vec![b'X'; 500 * 1024]; // 500KB - would deadlock in buggy version

    println!("📄 Testing 500KB with threading fix...");

    let age_path = "/Users/nauman/projects/barqly-vault/src-tauri/bin/darwin/age";
    let recipient = "age1qyqszqgpqyqszqgpqyqszqgpqyqszqgpqyqszqgpqyqszqgpqyqsl6q5c8";

    let mut child = Command::new(age_path)
        .args(&["-r", recipient])
        .stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
        .expect("spawn");

    // FIX: Write to stdin in separate thread
    let stdin = child.stdin.take().expect("stdin");
    let data_clone = test_data.clone();

    let write_thread = std::thread::spawn(move || {
        let mut stdin = stdin;
        stdin.write_all(&data_clone).expect("write");
        drop(stdin);
        println!("  ✅ Stdin write completed in thread");
    });

    // Meanwhile, wait_with_output() reads stdout/stderr
    println!("  Waiting for output (stdout/stderr reading concurrently)...");
    let output = child.wait_with_output().expect("wait");

    write_thread.join().expect("join");

    println!("  ✅ SUCCESS! Encrypted {} bytes", output.stdout.len());
    assert!(output.status.success());
}

#[test]
#[ignore]
fn test_demonstrate_pipe_buffer_limit() {
    println!("\n🔬 Demonstrating pipe buffer limit (~65KB)...\n");

    for size_kb in [50, 65, 70, 100, 200] {
        let data = vec![b'X'; size_kb * 1024];
        println!("Testing {}KB:", size_kb);

        let result = test_age_cli_encryption(&data);

        match result {
            Ok(duration) => println!("  ✅ Success ({:?})", duration),
            Err(e) => println!("  ❌ Failed: {}", e),
        }
    }
}
