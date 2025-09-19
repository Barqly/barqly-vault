//! YubiKey manifest management
//!
//! Stores YubiKey registration data in keys directory for recovery

use crate::storage::path_management::get_keys_dir;
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use std::fs;
use std::path::PathBuf;

/// YubiKey registration entry
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct YubiKeyEntry {
    pub serial: String,
    pub slot: u8,             // Retired slot number (1-20)
    pub recipient: String,    // age1yubikey...
    pub identity_tag: String, // AGE-PLUGIN-YUBIKEY-...
    pub label: String,
    pub created_at: DateTime<Utc>,
    pub recovery_code_hash: String, // SHA256 hash for verification
}

/// YubiKey manifest containing all registered keys
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct YubiKeyManifest {
    pub version: String,
    pub yubikeys: Vec<YubiKeyEntry>,
}

impl Default for YubiKeyManifest {
    fn default() -> Self {
        Self::new()
    }
}

impl YubiKeyManifest {
    /// Create new empty manifest
    pub fn new() -> Self {
        Self {
            version: "1.0".to_string(),
            yubikeys: Vec::new(),
        }
    }

    /// Load manifest from disk
    pub fn load() -> Result<Self, Box<dyn std::error::Error>> {
        let path = Self::get_manifest_path()?;

        if !path.exists() {
            return Ok(Self::new());
        }

        let content = fs::read_to_string(&path)?;
        let manifest: Self = serde_json::from_str(&content)?;
        Ok(manifest)
    }

    /// Save manifest to disk
    pub fn save(&self) -> Result<(), Box<dyn std::error::Error>> {
        let path = Self::get_manifest_path()?;

        // Pretty print for readability
        let json = serde_json::to_string_pretty(self)?;
        fs::write(&path, json)?;

        // Set restrictive permissions on Unix
        #[cfg(unix)]
        {
            use std::os::unix::fs::PermissionsExt;
            let permissions = fs::Permissions::from_mode(0o600);
            fs::set_permissions(&path, permissions)?;
        }

        Ok(())
    }

    /// Add or update a YubiKey entry
    pub fn register_yubikey(
        &mut self,
        serial: String,
        slot: u8,
        recipient: String,
        identity_tag: String,
        label: String,
        recovery_code: &str,
    ) -> Result<(), Box<dyn std::error::Error>> {
        // Hash recovery code for verification (don't store plaintext)
        let mut hasher = Sha256::new();
        hasher.update(recovery_code.as_bytes());
        let recovery_code_hash = format!("{:x}", hasher.finalize());

        // Remove existing entry if present
        self.yubikeys.retain(|yk| yk.serial != serial);

        // Add new entry
        self.yubikeys.push(YubiKeyEntry {
            serial,
            slot,
            recipient,
            identity_tag,
            label,
            created_at: Utc::now(),
            recovery_code_hash,
        });

        self.save()?;
        Ok(())
    }

    /// Find YubiKey by serial
    pub fn find_by_serial(&self, serial: &str) -> Option<&YubiKeyEntry> {
        self.yubikeys.iter().find(|yk| yk.serial == serial)
    }

    /// Find YubiKey by recipient
    pub fn find_by_recipient(&self, recipient: &str) -> Option<&YubiKeyEntry> {
        self.yubikeys.iter().find(|yk| yk.recipient == recipient)
    }

    /// Check if a serial is registered
    pub fn is_registered(&self, serial: &str) -> bool {
        self.yubikeys.iter().any(|yk| yk.serial == serial)
    }

    /// Verify recovery code
    pub fn verify_recovery_code(&self, serial: &str, recovery_code: &str) -> bool {
        if let Some(entry) = self.find_by_serial(serial) {
            let mut hasher = Sha256::new();
            hasher.update(recovery_code.as_bytes());
            let hash = format!("{:x}", hasher.finalize());
            return hash == entry.recovery_code_hash;
        }
        false
    }

    /// Get manifest file path
    fn get_manifest_path() -> Result<PathBuf, Box<dyn std::error::Error>> {
        let keys_dir = get_keys_dir()?;
        Ok(keys_dir.join("yubikey-manifest.json"))
    }
}

/// Generate a Base58 recovery code
pub fn generate_recovery_code() -> String {
    use rand::Rng;

    const BASE58_CHARS: &[u8] = b"123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
    const CODE_LENGTH: usize = 8;

    let mut rng = rand::thread_rng();
    let code: String = (0..CODE_LENGTH)
        .map(|_| {
            let idx = rng.gen_range(0..BASE58_CHARS.len());
            BASE58_CHARS[idx] as char
        })
        .collect();

    code
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_recovery_code_generation() {
        let code = generate_recovery_code();
        assert_eq!(code.len(), 8);

        // Check no confusing characters
        assert!(!code.contains('0'));
        assert!(!code.contains('O'));
        assert!(!code.contains('l'));
        assert!(!code.contains('I'));
    }

    #[test]
    fn test_recovery_code_verification() {
        let mut manifest = YubiKeyManifest::new();
        let recovery_code = "Nx2mBtQa";

        manifest
            .register_yubikey(
                "12345678".to_string(),
                1,
                "age1yubikey...".to_string(),
                "AGE-PLUGIN...".to_string(),
                "Test Key".to_string(),
                recovery_code,
            )
            .unwrap();

        assert!(manifest.verify_recovery_code("12345678", recovery_code));
        assert!(!manifest.verify_recovery_code("12345678", "WrongCode"));
    }
}
