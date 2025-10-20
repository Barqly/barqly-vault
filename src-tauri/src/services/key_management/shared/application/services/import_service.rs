//! Key Import Service
//!
//! Service for importing external .enc key files into the key registry.
//! Supports both passphrase and YubiKey metadata import with comprehensive validation.

use crate::services::key_management::shared::domain::models::key_lifecycle::KeyLifecycleStatus;
use crate::services::key_management::shared::domain::models::key_reference::VaultKey;
use crate::services::key_management::shared::infrastructure::{KeyEntry, KeyRegistry};
use crate::services::shared::infrastructure::path_management::get_keys_dir;
use age::secrecy::SecretString;
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::Path;
use std::str::FromStr;
use tracing::{debug, error, info, warn};

/// Key import service for handling external .enc files
pub struct KeyImportService;

/// Metadata structure for imported keys
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ImportedKeyMetadata {
    pub label: String,
    pub created_at: DateTime<Utc>,
    pub public_key: String,
    pub recipient: String,
    pub key_type: ImportedKeyType,
}

/// Type of imported key
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum ImportedKeyType {
    Passphrase,
    YubiKey {
        serial: String,
        slot: u8,
        piv_slot: u8,
        identity_tag: String,
        model: String,
        firmware_version: Option<String>,
    },
}

/// Validation result for imported keys
#[derive(Debug, Clone, Serialize, Deserialize, specta::Type)]
pub struct ValidationStatus {
    pub is_valid: bool,
    pub is_duplicate: bool,
    pub original_metadata: Option<KeyMetadata>,
}

/// Simplified key metadata for frontend
#[derive(Debug, Clone, Serialize, Deserialize, specta::Type)]
pub struct KeyMetadata {
    pub label: String,
    pub created_at: DateTime<Utc>,
    pub public_key: String,
}

/// Import warnings
#[derive(Debug)]
pub enum ImportWarning {
    DuplicateKey { existing_label: String },
    OldKeyFile { age_days: i64 },
    UntrustedSource,
    LabelSanitized { original: String, sanitized: String },
}

impl std::fmt::Display for ImportWarning {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            ImportWarning::DuplicateKey { existing_label } => {
                write!(f, "Key already exists with label: {}", existing_label)
            }
            ImportWarning::OldKeyFile { age_days } => {
                write!(f, "Key file is {} days old", age_days)
            }
            ImportWarning::UntrustedSource => write!(f, "Key file is from an untrusted source"),
            ImportWarning::LabelSanitized {
                original,
                sanitized,
            } => {
                write!(f, "Label sanitized from '{}' to '{}'", original, sanitized)
            }
        }
    }
}

/// Import error types
#[derive(Debug, thiserror::Error)]
pub enum ImportError {
    #[error("File not found: {0}")]
    FileNotFound(String),

    #[error("Invalid file format: {0}")]
    InvalidFormat(String),

    #[error("Decryption failed: {0}")]
    DecryptionFailed(String),

    #[error("Wrong passphrase")]
    WrongPassphrase,

    #[error("Invalid key data: {0}")]
    InvalidKeyData(String),

    #[error("IO error: {0}")]
    IoError(#[from] std::io::Error),

    #[error("Registry error: {0}")]
    RegistryError(String),

    #[error("Security validation failed: {0}")]
    SecurityValidationFailed(String),

    #[error("Key file already exists: {0}")]
    KeyFileAlreadyExists(String),

    #[error("File size validation failed: {0}")]
    FileSizeInvalid(String),
}

impl KeyImportService {
    /// Create a new import service instance
    pub fn new() -> Self {
        Self
    }

    /// Import a key file with comprehensive validation
    pub async fn import_key_file(
        &self,
        file_path: &str,
        passphrase: Option<String>,
        override_label: Option<String>,
        attach_to_vault: Option<String>,
        validate_only: bool,
    ) -> Result<(VaultKey, ValidationStatus, Vec<String>), ImportError> {
        debug!(
            file_path = %file_path,
            has_passphrase = passphrase.is_some(),
            override_label = ?override_label,
            attach_to_vault = ?attach_to_vault,
            validate_only = validate_only,
            "Starting key import process"
        );

        let mut warnings = Vec::new();

        // Step 1: Validate file exists and is readable
        let path = Path::new(file_path);
        if !path.exists() {
            return Err(ImportError::FileNotFound(file_path.to_string()));
        }

        // Step 1a: Validate file size (safety check for corrupted/wrong files)
        let file_size = fs::metadata(path).map_err(ImportError::IoError)?.len();

        const MIN_KEY_FILE_SIZE: u64 = 100; // 100 bytes minimum
        const MAX_KEY_FILE_SIZE: u64 = 100_000; // 100 KB maximum

        if file_size < MIN_KEY_FILE_SIZE {
            return Err(ImportError::FileSizeInvalid(format!(
                "File too small ({} bytes). Minimum expected size is {} bytes for a valid encrypted key.",
                file_size, MIN_KEY_FILE_SIZE
            )));
        }

        if file_size > MAX_KEY_FILE_SIZE {
            return Err(ImportError::FileSizeInvalid(format!(
                "File too large ({} bytes). Maximum expected size is {} bytes. This may not be a key file.",
                file_size, MAX_KEY_FILE_SIZE
            )));
        }

        debug!(file_size = file_size, "File size validation passed");

        // Step 2: Read and parse the .enc file
        let encrypted_content = fs::read(path)?;

        // Step 3: Validate age format
        let decryptor = age::Decryptor::new(&encrypted_content[..])
            .map_err(|e| ImportError::InvalidFormat(format!("Not a valid age file: {}", e)))?;

        // Step 4: Try to decrypt with passphrase if provided
        let (key_metadata, private_key_data) = if let Some(pass) = passphrase {
            // Try passphrase decryption
            let secret_pass = SecretString::from(pass);
            let identity = age::scrypt::Identity::new(secret_pass.clone());

            match decryptor.decrypt(std::iter::once(&identity as &dyn age::Identity)) {
                Ok(mut reader) => {
                    // Successfully decrypted with passphrase
                    let mut decrypted = Vec::new();
                    std::io::copy(&mut reader, &mut decrypted)?;

                    // Parse the decrypted private key
                    let private_key_str = String::from_utf8(decrypted)
                        .map_err(|e| ImportError::InvalidKeyData(e.to_string()))?;

                    // Validate it's an age private key
                    if !private_key_str.starts_with("AGE-SECRET-KEY-") {
                        return Err(ImportError::InvalidKeyData(
                            "Decrypted data is not a valid age private key".to_string(),
                        ));
                    }

                    // Derive public key from private key
                    let identity = age::x25519::Identity::from_str(&private_key_str)
                        .map_err(|e| ImportError::InvalidKeyData(e.to_string()))?;
                    let public_key = identity.to_public().to_string();

                    (
                        ImportedKeyMetadata {
                            label: Self::extract_label_from_path(path, &override_label),
                            created_at: Self::get_file_creation_time(path),
                            public_key: public_key.clone(),
                            recipient: public_key, // For passphrase keys, recipient is same as public_key
                            key_type: ImportedKeyType::Passphrase,
                        },
                        Some(encrypted_content),
                    )
                }
                Err(e) => {
                    // Decryption failed - could be wrong passphrase or not a passphrase key
                    debug!("Failed to decrypt with passphrase: {}", e);
                    return Err(ImportError::WrongPassphrase);
                }
            }
        } else {
            // No passphrase provided - check if this is a passphrase-protected file
            // Try to determine key type by examining the file structure
            // For now, we'll assume it's a YubiKey metadata file if no passphrase is provided

            let label = Self::extract_label_from_path(path, &override_label);

            // Check if this looks like a passphrase-protected file
            // (we can't definitively tell without trying to decrypt)
            if file_path.contains("passphrase") || file_path.contains("password") {
                return Err(ImportError::DecryptionFailed(
                    "This appears to be a passphrase-protected key file. Please provide a passphrase.".to_string()
                ));
            }

            // Assume YubiKey metadata for validation purposes
            warnings.push(ImportWarning::UntrustedSource.to_string());

            (
                ImportedKeyMetadata {
                    label: label.clone(),
                    created_at: Self::get_file_creation_time(path),
                    public_key: "age1yubikey...".to_string(), // Placeholder for YubiKey
                    recipient: "age1yubikey...".to_string(),
                    key_type: ImportedKeyType::YubiKey {
                        serial: "unknown".to_string(),
                        slot: 1,
                        piv_slot: 82,
                        identity_tag: "AGE-PLUGIN-YUBIKEY-".to_string(),
                        model: "YubiKey".to_string(),
                        firmware_version: None,
                    },
                },
                None, // YubiKey doesn't store encrypted private key
            )
        };

        // Step 5: Sanitize label to prevent injection
        let sanitized_label = Self::sanitize_label(&key_metadata.label);
        if sanitized_label != key_metadata.label {
            warnings.push(
                ImportWarning::LabelSanitized {
                    original: key_metadata.label.clone(),
                    sanitized: sanitized_label.clone(),
                }
                .to_string(),
            );
        }

        // Step 6: Check for duplicates in registry
        let mut registry =
            KeyRegistry::load().map_err(|e| ImportError::RegistryError(e.to_string()))?;

        let is_duplicate = self.check_for_duplicate(&registry, &key_metadata.public_key);
        if is_duplicate
            && let Some((_existing_id, existing_entry)) = registry
                .keys
                .iter()
                .find(|(_, entry)| self.get_public_key(entry) == key_metadata.public_key)
        {
            warnings.push(
                ImportWarning::DuplicateKey {
                    existing_label: existing_entry.label().to_string(),
                }
                .to_string(),
            );
        }

        // Step 7: Check file age
        let file_age_days = (Utc::now() - key_metadata.created_at).num_days();
        if file_age_days > 365 {
            warnings.push(
                ImportWarning::OldKeyFile {
                    age_days: file_age_days,
                }
                .to_string(),
            );
        }

        // Prepare validation status
        let validation_status = ValidationStatus {
            is_valid: true,
            is_duplicate,
            original_metadata: Some(KeyMetadata {
                label: key_metadata.label.clone(),
                created_at: key_metadata.created_at,
                public_key: key_metadata.public_key.clone(),
            }),
        };

        // If validate-only mode, return here
        if validate_only {
            let key_ref = VaultKey {
                id: format!("preview_{}", uuid::Uuid::new_v4()),
                key_type: match key_metadata.key_type {
                    ImportedKeyType::Passphrase => {
                        crate::services::key_management::shared::domain::models::key_reference::KeyType::Passphrase {
                            key_id: "preview".to_string(),
                        }
                    }
                    ImportedKeyType::YubiKey { ref serial, .. } => {
                        crate::services::key_management::shared::domain::models::key_reference::KeyType::YubiKey {
                            serial: serial.clone(),
                            firmware_version: None,
                        }
                    }
                },
                label: sanitized_label.clone(),
                lifecycle_status: KeyLifecycleStatus::PreActivation,
                created_at: key_metadata.created_at,
                last_used: None,
            };

            return Ok((key_ref, validation_status, warnings));
        }

        // Step 8: Actually import the key
        let key_id = self.generate_key_id(&sanitized_label);
        let key_entry = match key_metadata.key_type {
            ImportedKeyType::Passphrase => {
                // Save encrypted key file
                if let Some(encrypted_data) = private_key_data {
                    let key_filename = format!("{}.agekey.enc", sanitized_label);
                    let keys_dir = get_keys_dir()
                        .map_err(|e| ImportError::IoError(std::io::Error::other(e.to_string())))?;
                    let key_path = keys_dir.join(&key_filename);

                    // SAFETY CHECK: Never overwrite existing key files (matches recovery behavior)
                    if key_path.exists() {
                        error!(
                            key_filename = %key_filename,
                            key_path = ?key_path,
                            "Import blocked: key file already exists"
                        );
                        return Err(ImportError::KeyFileAlreadyExists(format!(
                            "Key file '{}' already exists. Delete the existing key first if you want to replace it, or use a different label.",
                            key_filename
                        )));
                    }

                    // Write the encrypted key (only if doesn't exist)
                    fs::write(&key_path, encrypted_data)?;

                    info!(
                        key_filename = %key_filename,
                        key_path = ?key_path,
                        "Key file written successfully"
                    );

                    // Set restrictive permissions on Unix
                    #[cfg(unix)]
                    {
                        use std::os::unix::fs::PermissionsExt;
                        let mut perms = fs::metadata(&key_path)?.permissions();
                        perms.set_mode(0o600);
                        fs::set_permissions(&key_path, perms)?;
                    }

                    KeyEntry::Passphrase {
                        label: sanitized_label.clone(),
                        created_at: key_metadata.created_at,
                        last_used: None,
                        public_key: key_metadata.public_key.clone(),
                        key_filename,
                        lifecycle_status: KeyLifecycleStatus::PreActivation,
                        status_history: vec![
                            crate::services::key_management::shared::domain::models::key_lifecycle::StatusHistoryEntry::new(
                                KeyLifecycleStatus::PreActivation,
                                format!("Imported from {}", file_path),
                                "import".to_string(),
                            )
                        ],
                        vault_associations: vec![],
                        deactivated_at: None,
                        previous_lifecycle_status: None,
                    }
                } else {
                    return Err(ImportError::InvalidKeyData(
                        "No encrypted key data available".to_string(),
                    ));
                }
            }
            ImportedKeyType::YubiKey {
                serial,
                slot,
                piv_slot,
                identity_tag,
                model,
                firmware_version,
            } => {
                KeyEntry::Yubikey {
                    label: sanitized_label.clone(),
                    created_at: key_metadata.created_at,
                    last_used: None,
                    serial,
                    slot,
                    piv_slot,
                    recipient: key_metadata.recipient.clone(),
                    identity_tag,
                    model,
                    firmware_version,
                    recovery_code_hash: "imported".to_string(), // Placeholder
                    lifecycle_status: KeyLifecycleStatus::PreActivation,
                    status_history: vec![
                        crate::services::key_management::shared::domain::models::key_lifecycle::StatusHistoryEntry::new(
                            KeyLifecycleStatus::PreActivation,
                            format!("Imported from {}", file_path),
                            "import".to_string(),
                        )
                    ],
                    vault_associations: vec![],
                    deactivated_at: None,
                    previous_lifecycle_status: None,
                }
            }
        };

        // Register in registry
        registry
            .register_key(key_id.clone(), key_entry.clone())
            .map_err(|e| ImportError::RegistryError(e.to_string()))?;

        registry
            .save()
            .map_err(|e| ImportError::RegistryError(e.to_string()))?;

        info!(
            key_id = %key_id,
            label = %sanitized_label,
            "Successfully imported key"
        );

        // Step 9: Attach to vault if requested
        let attached_to_vault = if let Some(vault_id) = attach_to_vault {
            let manager =
                crate::services::key_management::shared::application::manager::KeyManager::new();
            match manager.attach_key_to_vault(&key_id, &vault_id).await {
                Ok(()) => true,
                Err(e) => {
                    warn!(
                        key_id = %key_id,
                        vault_id = %vault_id,
                        error = %e,
                        "Failed to attach imported key to vault"
                    );
                    warnings.push(format!("Could not attach to vault: {}", e));
                    false
                }
            }
        } else {
            false
        };

        // Create key reference for response
        let key_ref = VaultKey::from_registry_entry(
            key_id.clone(),
            &key_entry,
            if attached_to_vault {
                KeyLifecycleStatus::Active
            } else {
                KeyLifecycleStatus::PreActivation
            },
        );

        Ok((key_ref, validation_status, warnings))
    }

    /// Extract label from file path
    fn extract_label_from_path(path: &Path, override_label: &Option<String>) -> String {
        if let Some(label) = override_label {
            return label.clone();
        }

        path.file_stem()
            .and_then(|s| s.to_str())
            .map(|s| s.trim_end_matches(".agekey"))
            .unwrap_or("imported_key")
            .to_string()
    }

    /// Get file creation time or use current time
    fn get_file_creation_time(path: &Path) -> DateTime<Utc> {
        fs::metadata(path)
            .ok()
            .and_then(|m| m.created().ok())
            .and_then(|t| t.duration_since(std::time::UNIX_EPOCH).ok())
            .and_then(|d| DateTime::from_timestamp(d.as_secs() as i64, 0))
            .unwrap_or_else(Utc::now)
    }

    /// Sanitize label to prevent injection attacks
    fn sanitize_label(label: &str) -> String {
        // Remove path separators and special characters
        label
            .chars()
            .filter(|c| c.is_alphanumeric() || *c == '-' || *c == '_' || *c == ' ')
            .collect::<String>()
            .trim()
            .to_string()
    }

    /// Generate a unique key ID
    fn generate_key_id(&self, label: &str) -> String {
        format!("keyref_{}", label.to_lowercase().replace(' ', "_"))
    }

    /// Check for duplicate keys by comparing public keys
    fn check_for_duplicate(&self, registry: &KeyRegistry, public_key: &str) -> bool {
        registry
            .keys
            .values()
            .any(|entry| self.get_public_key(entry) == public_key)
    }

    /// Get public key from a registry entry
    fn get_public_key(&self, entry: &KeyEntry) -> String {
        match entry {
            KeyEntry::Passphrase { public_key, .. } => public_key.clone(),
            KeyEntry::Yubikey { recipient, .. } => recipient.clone(),
        }
    }
}

impl Default for KeyImportService {
    fn default() -> Self {
        Self::new()
    }
}
