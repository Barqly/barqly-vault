// build.rs needs println! to communicate with cargo
#![allow(clippy::disallowed_macros)]

use std::process::Command;

fn main() {
    // Rerun if .git directory changes (for git hash updates)
    println!("cargo:rerun-if-changed=../.git/HEAD");
    println!("cargo:rerun-if-changed=../.git/index");

    // Get git commit hash (short version)
    let git_hash = Command::new("git")
        .args(&["rev-parse", "--short=8", "HEAD"])
        .output()
        .ok()
        .and_then(|output| {
            if output.status.success() {
                String::from_utf8(output.stdout).ok()
            } else {
                None
            }
        })
        .unwrap_or_else(|| "unknown".to_string())
        .trim()
        .to_string();

    // Check if working directory is dirty
    let git_dirty = Command::new("git")
        .args(&["status", "--porcelain"])
        .output()
        .ok()
        .map(|output| !output.stdout.is_empty())
        .unwrap_or(false);

    let git_suffix = if git_dirty { "-dirty" } else { "" };

    // Get current branch name
    let git_branch = Command::new("git")
        .args(&["rev-parse", "--abbrev-ref", "HEAD"])
        .output()
        .ok()
        .and_then(|output| {
            if output.status.success() {
                String::from_utf8(output.stdout).ok()
            } else {
                None
            }
        })
        .unwrap_or_else(|| "unknown".to_string())
        .trim()
        .to_string();

    // Get build timestamp in ISO 8601 format
    let build_timestamp = chrono::Utc::now().to_rfc3339();

    // Get rustc version
    let rustc_version = Command::new("rustc")
        .args(&["--version"])
        .output()
        .ok()
        .and_then(|output| {
            if output.status.success() {
                String::from_utf8(output.stdout).ok()
            } else {
                None
            }
        })
        .unwrap_or_else(|| "unknown".to_string())
        .trim()
        .to_string();

    // Set environment variables for use in the code
    println!("cargo:rustc-env=BUILD_GIT_HASH={}{}", git_hash, git_suffix);
    println!("cargo:rustc-env=BUILD_GIT_BRANCH={}", git_branch);
    println!("cargo:rustc-env=BUILD_TIMESTAMP={}", build_timestamp);
    println!("cargo:rustc-env=BUILD_RUSTC_VERSION={}", rustc_version);

    // Build Tauri application
    tauri_build::build()
}