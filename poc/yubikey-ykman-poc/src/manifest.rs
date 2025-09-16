use serde::{Deserialize, Serialize};
use std::fs;
use std::path::Path;
use crate::errors::{Result, YubiKeyError};

/// YubiKey manifest that stores metadata after key generation
#[derive(Debug, Serialize, Deserialize)]
pub struct YubiKeyManifest {
    pub yubikey: YubiKeyInfo,
    pub age: AgeInfo,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct YubiKeyInfo {
    pub serial: String,
    pub slot: u32,
    pub pin_policy: String,
    pub touch_policy: String,
    pub created_at: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct AgeInfo {
    pub recipient: String,
    pub identity: String,
}

impl YubiKeyManifest {
    /// Create a new manifest
    pub fn new(
        serial: String,
        slot: u32,
        pin_policy: String,
        touch_policy: String,
        recipient: String,
        identity: String,
    ) -> Self {
        Self {
            yubikey: YubiKeyInfo {
                serial,
                slot,
                pin_policy,
                touch_policy,
                created_at: chrono::Utc::now().to_rfc3339(),
            },
            age: AgeInfo {
                recipient,
                identity,
            },
        }
    }

    /// Save manifest to JSON file
    pub fn save_to_file<P: AsRef<Path>>(&self, path: P) -> Result<()> {
        let json = serde_json::to_string_pretty(self)
            .map_err(|e| YubiKeyError::OperationFailed(format!("Failed to serialize manifest: {}", e)))?;

        fs::write(path, json)
            .map_err(|e| YubiKeyError::OperationFailed(format!("Failed to write manifest: {}", e)))?;

        Ok(())
    }

    /// Load manifest from JSON file
    pub fn load_from_file<P: AsRef<Path>>(path: P) -> Result<Self> {
        let json = fs::read_to_string(path)
            .map_err(|e| YubiKeyError::OperationFailed(format!("Failed to read manifest: {}", e)))?;

        let manifest = serde_json::from_str(&json)
            .map_err(|e| YubiKeyError::OperationFailed(format!("Failed to parse manifest: {}", e)))?;

        Ok(manifest)
    }

    /// Create identity file content from manifest
    pub fn create_identity_content(&self) -> String {
        format!(
            "#       Serial: {}, Slot: {}\n\
             #   PIN policy: {}\n\
             # Touch policy: {}\n\
             #    Recipient: {}\n\
             {}\n",
            self.yubikey.serial,
            self.yubikey.slot,
            self.yubikey.pin_policy,
            self.yubikey.touch_policy,
            self.age.recipient,
            self.age.identity
        )
    }

    /// Create a temporary identity file from manifest
    pub fn create_temp_identity_file(&self) -> Result<String> {
        use crate::TMP_DIR;
        use std::env;
        // Create tmp directory if it doesn't exist
        let cwd = env::current_dir()
            .map_err(|e| YubiKeyError::OperationFailed(format!("Failed to get current dir: {}", e)))?;
        let tmp_dir = cwd.join(TMP_DIR);
        let _ = fs::create_dir_all(&tmp_dir);
        let temp_path = tmp_dir.join(format!("yubikey_identity_{}.txt", self.yubikey.serial));
        let content = self.create_identity_content();

        fs::write(&temp_path, content)
            .map_err(|e| YubiKeyError::OperationFailed(format!("Failed to create identity file: {}", e)))?;

        Ok(temp_path.display().to_string())
    }
}

/// Default manifest file path
pub const DEFAULT_MANIFEST_PATH: &str = "yubikey-manifest.json";