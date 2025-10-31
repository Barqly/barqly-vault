//! Device Identity Management
//!
//! Provides unique device identification for tracking vault operations across machines.
//! Each installation gets a persistent UUID that survives app restarts.

use crate::error::StorageError;
use crate::prelude::*;
use crate::services::shared::infrastructure::io::atomic_write_sync;
use crate::services::shared::infrastructure::path_management::get_app_dir;
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use std::path::{Path, PathBuf};
use uuid::Uuid;

#[cfg(unix)]
use nix::libc;

/// Device information for machine tracking
///
/// Stored in `device.json` at the root of the app directory.
/// Generated once on first launch and persisted across app restarts.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct DeviceInfo {
    /// Unique machine identifier (UUID v4)
    pub machine_id: String,

    /// Human-readable machine label (from hostname or manual input)
    pub machine_label: String,

    /// When this device identity was first created
    pub created_at: DateTime<Utc>,

    /// App version that created this device identity
    pub app_version: String,
}

impl DeviceInfo {
    /// Create a new device identity
    ///
    /// Generates a new UUID v4 and attempts to read the system hostname.
    /// Falls back to "unknown" if hostname cannot be determined.
    ///
    /// # Arguments
    /// * `app_version` - Current application version (e.g., "2.0.0")
    pub fn new(app_version: impl Into<String>) -> Self {
        let machine_id = Uuid::new_v4().to_string();
        let machine_label = get_hostname().unwrap_or_else(|| "unknown".to_string());

        Self {
            machine_id,
            machine_label,
            created_at: Utc::now(),
            app_version: app_version.into(),
        }
    }

    /// Get the path to the device.json file
    ///
    /// Returns `~/Library/Application Support/com.barqly.vault/device.json` on macOS.
    pub fn get_device_file_path() -> Result<PathBuf, StorageError> {
        let app_dir = get_app_dir()?;
        Ok(app_dir.join("device.json"))
    }

    /// Load device info from disk, or generate new if doesn't exist
    ///
    /// This is the main entry point for getting device information.
    /// On first launch, it creates a new identity and persists it.
    ///
    /// # Arguments
    /// * `app_version` - Current application version
    ///
    /// # Errors
    /// Returns `StorageError` if file operations fail
    pub fn load_or_create(app_version: impl Into<String>) -> Result<Self, StorageError> {
        let path = Self::get_device_file_path()?;

        if path.exists() {
            Self::load(&path)
        } else {
            let device_info = Self::new(app_version);
            device_info.save(&path)?;
            info!(
                machine_id = %device_info.machine_id,
                machine_label = %device_info.machine_label,
                "Created new device identity"
            );
            Ok(device_info)
        }
    }

    /// Load device info from file
    fn load(path: &Path) -> Result<Self, StorageError> {
        let content = std::fs::read_to_string(path).map_err(|e| StorageError::FileReadFailed {
            path: path.to_path_buf(),
            source: e,
        })?;

        let device_info: DeviceInfo =
            serde_json::from_str(&content).map_err(|e| StorageError::InvalidFormat {
                path: path.to_path_buf(),
                message: format!("Failed to parse device.json: {}", e),
            })?;

        debug!(
            machine_id = %device_info.machine_id,
            machine_label = %device_info.machine_label,
            "Loaded device identity"
        );

        Ok(device_info)
    }

    /// Save device info to file using atomic write
    fn save(&self, path: &Path) -> Result<(), StorageError> {
        let json =
            serde_json::to_string_pretty(self).map_err(|e| StorageError::SerializationFailed {
                message: format!("Failed to serialize device.json: {}", e),
            })?;

        atomic_write_sync(path, json.as_bytes()).map_err(|e| StorageError::FileWriteFailed {
            path: path.to_path_buf(),
            source: std::io::Error::other(e),
        })?;

        debug!(path = %path.display(), "Saved device identity");
        Ok(())
    }
}

/// Get system hostname
///
/// Attempts to read the hostname using platform-specific methods.
/// Returns `None` if hostname cannot be determined.
fn get_hostname() -> Option<String> {
    // Try to get hostname from environment first (works across platforms)
    if let Ok(hostname) = std::env::var("HOSTNAME")
        && !hostname.is_empty()
    {
        return Some(hostname);
    }

    // Platform-specific hostname retrieval
    #[cfg(unix)]
    {
        use std::ffi::CStr;
        use std::os::raw::c_char;

        let mut buf = [0u8; 256];
        unsafe {
            if libc::gethostname(buf.as_mut_ptr() as *mut c_char, buf.len()) == 0
                && let Ok(cstr) = CStr::from_bytes_until_nul(&buf)
                && let Ok(hostname) = cstr.to_str()
            {
                return Some(hostname.to_string());
            }
        }
    }

    #[cfg(windows)]
    {
        if let Ok(hostname) = std::env::var("COMPUTERNAME") {
            if !hostname.is_empty() {
                return Some(hostname);
            }
        }
    }

    None
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::TempDir;

    #[test]
    fn test_device_info_creation() {
        let device_info = DeviceInfo::new("2.0.0");

        assert!(!device_info.machine_id.is_empty());
        assert!(!device_info.machine_label.is_empty());
        assert_eq!(device_info.app_version, "2.0.0");

        // Verify UUID format (36 characters with hyphens)
        assert_eq!(device_info.machine_id.len(), 36);
        assert_eq!(
            device_info.machine_id.chars().filter(|&c| c == '-').count(),
            4
        );
    }

    #[test]
    fn test_device_info_uniqueness() {
        let device1 = DeviceInfo::new("2.0.0");
        let device2 = DeviceInfo::new("2.0.0");

        // Each instance should have a unique UUID
        assert_ne!(device1.machine_id, device2.machine_id);
    }

    #[test]
    fn test_device_info_serialization() {
        let device_info = DeviceInfo::new("2.0.0");

        let json = serde_json::to_string(&device_info).unwrap();
        let deserialized: DeviceInfo = serde_json::from_str(&json).unwrap();

        assert_eq!(device_info.machine_id, deserialized.machine_id);
        assert_eq!(device_info.machine_label, deserialized.machine_label);
        assert_eq!(device_info.app_version, deserialized.app_version);
    }

    #[test]
    fn test_device_info_save_and_load() {
        let temp_dir = TempDir::new().unwrap();
        let device_path = temp_dir.path().join("device.json");

        let original = DeviceInfo::new("2.0.0");
        original.save(&device_path).unwrap();

        assert!(device_path.exists());

        let loaded = DeviceInfo::load(&device_path).unwrap();

        assert_eq!(original.machine_id, loaded.machine_id);
        assert_eq!(original.machine_label, loaded.machine_label);
        assert_eq!(original.app_version, loaded.app_version);
    }

    #[test]
    fn test_get_hostname() {
        let hostname = get_hostname();

        // Hostname should be available on most systems
        // But we don't enforce it as a hard requirement
        if let Some(name) = hostname {
            assert!(!name.is_empty());
            debug!("Detected hostname: {}", name);
        }
    }

    #[test]
    fn test_device_info_persistence() {
        let temp_dir = TempDir::new().unwrap();
        let device_path = temp_dir.path().join("device.json");

        // First load should create new
        let first = DeviceInfo::new("2.0.0");
        first.save(&device_path).unwrap();

        // Second load should return same UUID
        let second = DeviceInfo::load(&device_path).unwrap();

        assert_eq!(first.machine_id, second.machine_id);
        assert_eq!(first.created_at, second.created_at);
    }

    #[test]
    fn test_device_file_path() {
        // Initialize PathProvider for testing
        let _ = crate::services::shared::infrastructure::path_management::init_path_provider();

        let path = DeviceInfo::get_device_file_path().unwrap();

        // Should end with device.json
        assert!(path.ends_with("device.json"));

        // Should contain app identifier
        assert!(path.to_string_lossy().contains("barqly"));
    }
}
