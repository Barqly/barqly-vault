//! Cross-platform Binary Resolver
//!
//! This module provides robust resolution of bundled binaries across different
//! platform packaging formats (macOS .app, Windows MSI, Linux .deb).
//!
//! ## Platform Layouts
//!
//! - **macOS**: `/Applications/Barqly Vault.app/Contents/Resources/bin/darwin/`
//! - **Windows**: `C:\Program Files\Barqly Vault\resources\bin\windows\`
//! - **Linux**: `/usr/lib/Barqly Vault/bin/linux/` (NO "resources" subdirectory)
//!
//! ## Resolution Strategy
//!
//! 1. Try Tauri's resource directory with platform variations
//! 2. Fallback to executable parent directory (handles symlinks)
//! 3. Development mode fallback using CARGO_MANIFEST_DIR
//!
//! This approach ensures binaries are found regardless of installation method
//! while following platform-specific packaging standards.

use std::path::PathBuf;
use tauri::Manager;
use tracing::{debug, info, warn};

use super::super::super::key_management::yubikey::infrastructure::pty::app_handle::get_app_handle;

/// Platform-specific directory name for binaries
fn get_platform_dir() -> &'static str {
    if cfg!(target_os = "macos") {
        "darwin"
    } else if cfg!(target_os = "linux") {
        "linux"
    } else if cfg!(target_os = "windows") {
        "windows"
    } else {
        panic!("Unsupported platform")
    }
}

/// Platform-specific binary extension
fn get_binary_extension(base_name: &str) -> String {
    if cfg!(target_os = "windows") {
        format!("{}.exe", base_name)
    } else {
        base_name.to_string()
    }
}

/// Resolve bundled binary path using platform-aware fallback chain
///
/// This function tries multiple possible locations to find bundled binaries,
/// accounting for different packaging structures across platforms.
///
/// # Arguments
/// * `binary_name` - Base name of the binary (e.g., "age", "ykman", "age-plugin-yubikey")
///
/// # Returns
/// * `Some(PathBuf)` - Path to the binary if found
/// * `None` - If binary not found in any location
pub fn resolve_bundled_binary(binary_name: &str) -> Option<PathBuf> {
    let os_dir = get_platform_dir();
    let filename = get_binary_extension(binary_name);
    let mut candidates = Vec::new();

    info!(
        "Resolving binary '{}' for platform '{}' (filename: '{}')",
        binary_name, os_dir, filename
    );

    // 1. Try Tauri resource directory variations
    if let Some(app_handle) = get_app_handle() {
        if let Ok(resource_dir) = app_handle.path().resource_dir() {
            info!("Tauri resource directory: {}", resource_dir.display());

            // Pattern 1: Direct bin directory (Linux .deb layout)
            // Example: /usr/lib/Barqly Vault/bin/linux/age
            let direct_path = resource_dir.join("bin").join(os_dir).join(&filename);
            candidates.push(direct_path);

            // Pattern 2: With resources subdirectory (macOS/Windows layout)
            // Example: /Applications/Barqly Vault.app/Contents/Resources/bin/darwin/age
            let resources_path = resource_dir
                .join("resources")
                .join("bin")
                .join(os_dir)
                .join(&filename);
            candidates.push(resources_path);
        } else {
            warn!("Failed to get Tauri resource directory");
        }

        // Also try using Tauri's resolve API (legacy approach for compatibility)
        match app_handle.path().resolve(
            format!("bin/{}/{}", os_dir, filename),
            tauri::path::BaseDirectory::Resource,
        ) {
            Ok(resolved_path) => {
                debug!("Tauri resolved path: {}", resolved_path.display());
                candidates.push(resolved_path);
            }
            Err(e) => {
                debug!("Tauri resolve API failed: {:?}", e);
            }
        }
    } else {
        warn!("No Tauri AppHandle available - running outside of Tauri context");
    }

    // 2. Fallback to executable parent directory
    // This handles Linux where /usr/bin/barqly-vault symlinks to /usr/lib/Barqly Vault/barqly-vault
    match std::env::current_exe() {
        Ok(exe) => {
            info!("Current executable: {}", exe.display());

            // Try parent directory
            if let Some(parent) = exe.parent() {
                let parent_bin_path = parent.join("bin").join(os_dir).join(&filename);
                candidates.push(parent_bin_path);

                // Also try parent's parent (in case exe is in a bin subdirectory)
                if let Some(grandparent) = parent.parent() {
                    let grandparent_bin_path = grandparent.join("bin").join(os_dir).join(&filename);
                    candidates.push(grandparent_bin_path);
                }
            }
        }
        Err(e) => {
            warn!("Failed to get current executable path: {:?}", e);
        }
    }

    // 3. Development mode fallback
    // This uses the compile-time CARGO_MANIFEST_DIR for local development
    let dev_path = PathBuf::from(env!("CARGO_MANIFEST_DIR"))
        .join("bin")
        .join(os_dir)
        .join(&filename);
    candidates.push(dev_path.clone());
    debug!("Development fallback path: {}", dev_path.display());

    // Log all candidates for debugging
    info!(
        "Searching for binary '{}' in {} candidate locations:",
        binary_name,
        candidates.len()
    );

    // Find first existing path
    for (index, candidate) in candidates.iter().enumerate() {
        let exists = candidate.exists();
        let is_file = candidate.is_file();

        info!(
            "  [{}/{}] {} - exists: {}, is_file: {}",
            index + 1,
            candidates.len(),
            candidate.display(),
            exists,
            is_file
        );

        if exists && is_file {
            info!(
                "✅ FOUND binary '{}' at: {}",
                binary_name,
                candidate.display()
            );
            return Some(candidate.clone());
        }
    }

    warn!(
        "❌ Binary '{}' NOT FOUND in any of {} locations checked",
        binary_name,
        candidates.len()
    );
    None
}

/// Get path to age binary
pub fn get_age_path() -> Result<PathBuf, String> {
    resolve_bundled_binary("age").ok_or_else(|| {
        let expected_locations = if cfg!(target_os = "linux") {
            "/usr/lib/Barqly Vault/bin/linux/"
        } else if cfg!(target_os = "macos") {
            "/Applications/Barqly Vault.app/Contents/Resources/bin/darwin/"
        } else {
            "C:\\Program Files\\Barqly Vault\\resources\\bin\\windows\\"
        };
        format!(
            "age binary not found. Expected in: {}. Check installation integrity.",
            expected_locations
        )
    })
}

/// Get path to age-plugin-yubikey binary
pub fn get_age_plugin_path() -> Result<PathBuf, String> {
    resolve_bundled_binary("age-plugin-yubikey").ok_or_else(|| {
        let expected_locations = if cfg!(target_os = "linux") {
            "/usr/lib/Barqly Vault/bin/linux/"
        } else if cfg!(target_os = "macos") {
            "/Applications/Barqly Vault.app/Contents/Resources/bin/darwin/"
        } else {
            "C:\\Program Files\\Barqly Vault\\resources\\bin\\windows\\"
        };
        format!(
            "age-plugin-yubikey binary not found. Expected in: {}. Check installation integrity.",
            expected_locations
        )
    })
}

/// Get path to ykman binary
pub fn get_ykman_path() -> Result<PathBuf, String> {
    resolve_bundled_binary("ykman").ok_or_else(|| {
        let expected_locations = if cfg!(target_os = "linux") {
            "/usr/lib/Barqly Vault/bin/linux/"
        } else if cfg!(target_os = "macos") {
            "/Applications/Barqly Vault.app/Contents/Resources/bin/darwin/"
        } else {
            "C:\\Program Files\\Barqly Vault\\resources\\bin\\windows\\"
        };
        format!(
            "ykman binary not found. Expected in: {}. Check installation integrity.",
            expected_locations
        )
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_platform_dir() {
        let dir = get_platform_dir();
        assert!(
            dir == "darwin" || dir == "linux" || dir == "windows",
            "Platform directory must be valid"
        );
    }

    #[test]
    fn test_binary_extension() {
        let age = get_binary_extension("age");
        if cfg!(target_os = "windows") {
            assert_eq!(age, "age.exe");
        } else {
            assert_eq!(age, "age");
        }
    }

    #[test]
    fn test_resolve_development_binaries() {
        // In development, binaries should be found in CARGO_MANIFEST_DIR/bin/[platform]/
        // This test will pass in development but may fail in production
        let age_path = resolve_bundled_binary("age");
        if cfg!(debug_assertions) {
            // In debug mode (development), we expect to find the binary
            assert!(age_path.is_some(), "Should find age binary in development");
        }
    }
}
