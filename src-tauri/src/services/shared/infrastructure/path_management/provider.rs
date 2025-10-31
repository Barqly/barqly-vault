//! Centralized Path Provider for Cross-Platform Compatibility
//!
//! This module provides a single source of truth for all path operations in Barqly Vault.
//! It ensures consistent directory naming across platforms and handles the bootstrap sequence
//! where AppHandle is not yet available.
//!
//! ## Directory Structure
//!
//! ### Platform-Specific App Data (non-sync):
//! - **macOS**: `~/Library/Application Support/com.barqly.vault/`
//! - **Windows**: `%APPDATA%\com.barqly.vault\`
//! - **Linux**: `~/.local/share/com.barqly.vault/` (XDG_DATA_HOME)
//!
//! ### User Documents (sync-friendly):
//! - `~/Documents/Barqly-Vaults/` - Encrypted .age files
//! - `~/Documents/Barqly-Recovery/` - Decrypted files

use crate::error::StorageError;
use directories::{BaseDirs, ProjectDirs, UserDirs};
use once_cell::sync::OnceCell;
use std::path::{Path, PathBuf};
use std::sync::RwLock;
use tauri::{AppHandle, Manager};
use tracing::{debug, warn};

// Global PathProvider instance
static PATH_PROVIDER: OnceCell<RwLock<PathProvider>> = OnceCell::new();

/// Platform detection for path resolution
#[derive(Debug, Clone, Copy, PartialEq)]
#[allow(dead_code)] // Variants are conditionally compiled
pub enum Platform {
    MacOS,
    Windows,
    Linux,
}

impl Platform {
    fn current() -> Self {
        #[cfg(target_os = "macos")]
        return Platform::MacOS;

        #[cfg(target_os = "windows")]
        return Platform::Windows;

        #[cfg(target_os = "linux")]
        return Platform::Linux;

        #[cfg(not(any(target_os = "macos", target_os = "windows", target_os = "linux")))]
        compile_error!("Unsupported platform");
    }
}

/// Centralized Path Provider
///
/// This struct manages all path operations for Barqly Vault, ensuring
/// consistent behavior across platforms and during different phases of
/// application startup (before and after AppHandle initialization).
#[derive(Debug)]
pub struct PathProvider {
    /// Optional AppHandle (None during bootstrap)
    app_handle: Option<AppHandle>,
    /// Current platform
    platform: Platform,
    /// Whether we're in headless mode (CI/Docker)
    headless_mode: bool,
}

impl PathProvider {
    /// Initialize the global PathProvider (called early in startup)
    ///
    /// This MUST be called before any path operations, including logging initialization.
    /// It creates a PathProvider without AppHandle for bootstrap compatibility.
    pub fn initialize() -> Result<(), StorageError> {
        if PATH_PROVIDER.get().is_some() {
            return Ok(()); // Already initialized
        }

        let provider = PathProvider {
            app_handle: None,
            platform: Platform::current(),
            headless_mode: Self::detect_headless_mode(),
        };

        PATH_PROVIDER.set(RwLock::new(provider)).map_err(|_| {
            StorageError::InitializationFailed("PathProvider already initialized".into())
        })?;

        debug!(
            "PathProvider initialized for platform: {:?}",
            Platform::current()
        );
        Ok(())
    }

    /// Update the PathProvider with AppHandle after Tauri initialization
    ///
    /// This is called from lib.rs after the Tauri app is set up.
    /// IMPORTANT: This does NOT change the paths, it just enables
    /// Tauri-based resolution for consistency.
    pub fn set_app_handle(app_handle: AppHandle) -> Result<(), StorageError> {
        let provider = PATH_PROVIDER.get().ok_or_else(|| {
            StorageError::InitializationFailed("PathProvider not initialized".into())
        })?;

        let mut provider = provider
            .write()
            .map_err(|_| StorageError::InitializationFailed("PathProvider lock poisoned".into()))?;

        provider.app_handle = Some(app_handle);
        debug!("PathProvider updated with AppHandle");
        Ok(())
    }

    /// Get the global PathProvider instance
    pub fn global() -> Result<&'static RwLock<PathProvider>, StorageError> {
        PATH_PROVIDER.get().ok_or_else(|| {
            StorageError::InitializationFailed("PathProvider not initialized".into())
        })
    }

    /// Detect if we're running in a headless environment
    fn detect_headless_mode() -> bool {
        // Check common CI/Docker environment variables
        std::env::var("CI").is_ok()
            || std::env::var("DOCKER").is_ok()
            || std::env::var("GITHUB_ACTIONS").is_ok()
            || std::env::var("GITLAB_CI").is_ok()
            || std::env::var("JENKINS_URL").is_ok()
            || std::env::var("BUILDKITE").is_ok()
            || std::env::var("CIRCLECI").is_ok()
    }

    /// Get the application configuration directory
    ///
    /// This is the main directory for non-synced application data.
    /// Returns the same path whether AppHandle is available or not.
    ///
    /// # Platform Paths
    /// - **macOS**: `~/Library/Application Support/com.barqly.vault/`
    /// - **Windows**: `%APPDATA%\com.barqly.vault\`
    /// - **Linux**: `~/.local/share/com.barqly.vault/` (XDG_DATA_HOME)
    pub fn app_config_dir(&self) -> Result<PathBuf, StorageError> {
        // Try Tauri path resolver first if available
        if let Some(ref app_handle) = self.app_handle
            && let Ok(path) = app_handle.path().app_config_dir()
        {
            return Ok(path);
        }
        // Fall through to manual construction if Tauri fails

        // Manual construction for bootstrap and fallback
        // CRITICAL: Must match Tauri's naming exactly!
        match self.platform {
            Platform::MacOS => {
                // macOS: ~/Library/Application Support/com.barqly.vault/
                if let Some(proj_dirs) = ProjectDirs::from("com", "barqly", "vault") {
                    Ok(proj_dirs.config_dir().to_path_buf())
                } else {
                    Err(StorageError::DirectoryCreationFailed(PathBuf::from(
                        "Failed to determine macOS app directory",
                    )))
                }
            }
            Platform::Windows => {
                // Windows: %APPDATA%\com.barqly.vault\
                // CRITICAL: Must use com.barqly.vault, NOT barqly\vault
                if let Some(base_dirs) = BaseDirs::new() {
                    Ok(base_dirs.config_dir().join("com.barqly.vault"))
                } else {
                    Err(StorageError::DirectoryCreationFailed(PathBuf::from(
                        "Failed to determine Windows app directory",
                    )))
                }
            }
            Platform::Linux => {
                // Linux: ~/.local/share/com.barqly.vault/ (XDG_DATA_HOME)
                // CRITICAL: Use XDG_DATA_HOME for app data, not XDG_CONFIG_HOME
                // XDG spec: data_dir() for application data, config_dir() for config files only
                if let Some(base_dirs) = BaseDirs::new() {
                    Ok(base_dirs.data_dir().join("com.barqly.vault"))
                } else {
                    // Fallback to XDG_DATA_HOME env var or default
                    let data_home = std::env::var("XDG_DATA_HOME")
                        .map(PathBuf::from)
                        .unwrap_or_else(|_| {
                            let home = std::env::var("HOME").unwrap_or_else(|_| String::from("~"));
                            PathBuf::from(home).join(".local").join("share")
                        });
                    Ok(data_home.join("com.barqly.vault"))
                }
            }
        }
    }

    /// Get the user's Documents directory with headless fallback
    ///
    /// Returns the Documents directory, or a fallback location in headless environments.
    ///
    /// # Fallback Strategy
    /// 1. Try UserDirs::document_dir()
    /// 2. In headless mode: use ~/.local/share/barqly-documents/
    /// 3. Last resort: use home directory
    pub fn documents_dir(&self) -> Result<PathBuf, StorageError> {
        // Try standard Documents directory first
        if let Some(user_dirs) = UserDirs::new()
            && let Some(doc_dir) = user_dirs.document_dir()
        {
            return Ok(doc_dir.to_path_buf());
        }

        // Headless/CI fallback
        if self.headless_mode {
            warn!("Documents directory not found (headless mode), using fallback");

            // Try ~/.local/share/barqly-documents/ as fallback
            if let Some(base_dirs) = BaseDirs::new() {
                let fallback = base_dirs.data_dir().join("barqly-documents");
                debug!("Using headless fallback: {:?}", fallback);
                return Ok(fallback);
            }
        }

        // Last resort: home directory
        if let Some(base_dirs) = BaseDirs::new() {
            warn!("Documents directory not found, falling back to home directory");
            return Ok(base_dirs.home_dir().to_path_buf());
        }

        Err(StorageError::DirectoryCreationFailed(PathBuf::from(
            "Unable to determine documents directory",
        )))
    }

    /// Get the keys subdirectory
    pub fn keys_dir(&self) -> Result<PathBuf, StorageError> {
        Ok(self.app_config_dir()?.join("keys"))
    }

    /// Get the logs subdirectory
    pub fn logs_dir(&self) -> Result<PathBuf, StorageError> {
        Ok(self.app_config_dir()?.join("logs"))
    }

    /// Get the vaults manifest subdirectory (non-sync storage)
    pub fn vaults_manifest_dir(&self) -> Result<PathBuf, StorageError> {
        Ok(self.app_config_dir()?.join("vaults"))
    }

    /// Get the config subdirectory
    pub fn config_dir(&self) -> Result<PathBuf, StorageError> {
        Ok(self.app_config_dir()?.join("config"))
    }

    /// Get the backups subdirectory
    pub fn backups_dir(&self) -> Result<PathBuf, StorageError> {
        Ok(self.app_config_dir()?.join("backups"))
    }

    /// Get the manifest backups subdirectory
    pub fn manifest_backups_dir(&self) -> Result<PathBuf, StorageError> {
        Ok(self.backups_dir()?.join("manifest"))
    }

    /// Get the user-visible Barqly-Vaults directory
    pub fn user_vaults_dir(&self) -> Result<PathBuf, StorageError> {
        Ok(self.documents_dir()?.join("Barqly-Vaults"))
    }

    /// Get the user-visible Barqly-Recovery directory
    pub fn user_recovery_dir(&self) -> Result<PathBuf, StorageError> {
        Ok(self.documents_dir()?.join("Barqly-Recovery"))
    }

    /// Get the device.json file path
    pub fn device_file_path(&self) -> Result<PathBuf, StorageError> {
        Ok(self.app_config_dir()?.join("device.json"))
    }

    /// Get the key registry file path
    pub fn key_registry_path(&self) -> Result<PathBuf, StorageError> {
        Ok(self.keys_dir()?.join("barqly-vault-key-registry.json"))
    }

    /// Ensure a directory exists with proper permissions
    ///
    /// Creates the directory if it doesn't exist and sets appropriate permissions.
    /// On Unix systems, sets permissions to 0o700 for security.
    pub fn ensure_dir_exists(&self, path: &Path) -> Result<(), StorageError> {
        if !path.exists() {
            std::fs::create_dir_all(path).map_err(|e| {
                warn!("Failed to create directory {:?}: {}", path, e);
                StorageError::DirectoryCreationFailed(path.to_path_buf())
            })?;

            debug!("Created directory: {:?}", path);
        }

        // Set restrictive permissions on Unix systems
        #[cfg(unix)]
        {
            use std::os::unix::fs::PermissionsExt;

            let metadata = std::fs::metadata(path)
                .map_err(|_| StorageError::PermissionDenied(path.to_path_buf()))?;

            // Only set permissions if they're not already restrictive
            let current_mode = metadata.permissions().mode();
            if current_mode & 0o777 != 0o700 {
                let mut perms = metadata.permissions();
                perms.set_mode(0o700);
                std::fs::set_permissions(path, perms).map_err(|e| {
                    warn!("Failed to set permissions on {:?}: {}", path, e);
                    StorageError::PermissionDenied(path.to_path_buf())
                })?;

                debug!("Set permissions 0o700 on: {:?}", path);
            }
        }

        Ok(())
    }
}

// ============ Compatibility Functions ============
// These functions maintain backward compatibility with the existing API
// They will be used during the refactoring phase

/// Initialize the PathProvider system (must be called early in startup)
pub fn init_path_provider() -> Result<(), StorageError> {
    PathProvider::initialize()
}

/// Update PathProvider with AppHandle (called after Tauri setup)
pub fn update_with_app_handle(app_handle: AppHandle) -> Result<(), StorageError> {
    PathProvider::set_app_handle(app_handle)
}

/// Get the application configuration directory
#[allow(dead_code)] // For future use
pub fn get_app_config_dir_compat() -> Result<PathBuf, StorageError> {
    let provider = PathProvider::global()?;
    let provider = provider
        .read()
        .map_err(|_| StorageError::InitializationFailed("PathProvider lock poisoned".into()))?;
    provider.app_config_dir()
}

/// Get the keys directory
#[allow(dead_code)] // For future use
pub fn get_keys_dir_compat() -> Result<PathBuf, StorageError> {
    let provider = PathProvider::global()?;
    let provider = provider
        .read()
        .map_err(|_| StorageError::InitializationFailed("PathProvider lock poisoned".into()))?;
    let path = provider.keys_dir()?;
    provider.ensure_dir_exists(&path)?;
    Ok(path)
}

/// Get the logs directory
#[allow(dead_code)] // For future use
pub fn get_logs_dir_compat() -> Result<PathBuf, StorageError> {
    let provider = PathProvider::global()?;
    let provider = provider
        .read()
        .map_err(|_| StorageError::InitializationFailed("PathProvider lock poisoned".into()))?;
    let path = provider.logs_dir()?;
    provider.ensure_dir_exists(&path)?;
    Ok(path)
}

/// Ensure a directory exists with proper permissions
#[allow(dead_code)] // For future use
pub fn ensure_dir_exists_compat(path: &Path) -> Result<(), StorageError> {
    let provider = PathProvider::global()?;
    let provider = provider
        .read()
        .map_err(|_| StorageError::InitializationFailed("PathProvider lock poisoned".into()))?;
    provider.ensure_dir_exists(path)
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::TempDir;

    #[test]
    fn test_path_provider_initialization() {
        // Clear any existing instance for testing
        let _ = PathProvider::initialize();

        // Should succeed on first call or if already initialized
        assert!(PathProvider::initialize().is_ok());

        // Global instance should be available
        assert!(PathProvider::global().is_ok());
    }

    #[test]
    fn test_platform_detection() {
        let platform = Platform::current();

        #[cfg(target_os = "macos")]
        assert_eq!(platform, Platform::MacOS);

        #[cfg(target_os = "windows")]
        assert_eq!(platform, Platform::Windows);

        #[cfg(target_os = "linux")]
        assert_eq!(platform, Platform::Linux);
    }

    #[test]
    fn test_app_config_dir_consistency() {
        let _ = PathProvider::initialize();
        let provider = PathProvider::global().unwrap();
        let provider = provider.read().unwrap();

        let path1 = provider.app_config_dir().unwrap();
        let path2 = provider.app_config_dir().unwrap();

        // Should return the same path consistently
        assert_eq!(path1, path2);

        // Should contain com.barqly.vault
        assert!(path1.to_string_lossy().contains("com.barqly.vault"));
    }

    #[test]
    fn test_subdirectory_paths() {
        let _ = PathProvider::initialize();
        let provider = PathProvider::global().unwrap();
        let provider = provider.read().unwrap();

        let app_dir = provider.app_config_dir().unwrap();
        let keys_dir = provider.keys_dir().unwrap();
        let logs_dir = provider.logs_dir().unwrap();

        assert_eq!(keys_dir, app_dir.join("keys"));
        assert_eq!(logs_dir, app_dir.join("logs"));
    }

    #[test]
    fn test_headless_mode_detection() {
        // Save original env
        let original_ci = std::env::var("CI").ok();

        // Test with CI environment variable
        unsafe {
            std::env::set_var("CI", "true");
        }
        assert!(PathProvider::detect_headless_mode());

        // Restore original env
        unsafe {
            if let Some(val) = original_ci {
                std::env::set_var("CI", val);
            } else {
                std::env::remove_var("CI");
            }
        }
    }

    #[test]
    fn test_ensure_dir_exists() {
        let _ = PathProvider::initialize();
        let provider = PathProvider::global().unwrap();
        let provider = provider.read().unwrap();

        let temp_dir = TempDir::new().unwrap();
        let test_path = temp_dir.path().join("test_dir");

        assert!(!test_path.exists());
        provider.ensure_dir_exists(&test_path).unwrap();
        assert!(test_path.exists());
        assert!(test_path.is_dir());
    }

    #[cfg(unix)]
    #[test]
    fn test_unix_permissions() {
        use std::os::unix::fs::PermissionsExt;

        let _ = PathProvider::initialize();
        let provider = PathProvider::global().unwrap();
        let provider = provider.read().unwrap();

        let temp_dir = TempDir::new().unwrap();
        let test_path = temp_dir.path().join("secure_dir");

        provider.ensure_dir_exists(&test_path).unwrap();

        let metadata = std::fs::metadata(&test_path).unwrap();
        let mode = metadata.permissions().mode();

        // Check that permissions are 0o700
        assert_eq!(mode & 0o777, 0o700);
    }
}
