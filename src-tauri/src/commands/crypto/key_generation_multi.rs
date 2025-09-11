//! Multi-recipient key generation command
//!
//! This module provides key generation with support for multiple protection modes:
//! - PassphraseOnly: Traditional passphrase-protected keys
//! - YubiKeyOnly: Hardware-secured keys without passphrase
//! - Hybrid: Both passphrase and YubiKey protection

use crate::commands::types::{
    CommandError, CommandResponse, ErrorCode, ErrorHandler, ValidateInput, ValidationHelper,
};
use crate::crypto::yubikey::{ProtectionMode, YubiIdentityProviderFactory, YubiKeyInfo};
use crate::crypto::{encrypt_private_key, generate_keypair};
use crate::logging::{log_operation, SpanContext};
use crate::storage::{self, RecipientInfo, RecipientType, VaultMetadataV2};
use secrecy::SecretString;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use tracing::instrument;

/// Input for multi-recipient key generation command
#[derive(Debug, Deserialize)]
pub struct GenerateKeyMultiInput {
    pub label: String,
    pub passphrase: Option<String>, // Optional for YubiKey-only mode
    pub protection_mode: Option<ProtectionMode>, // Defaults to PassphraseOnly for backward compat
    pub yubikey_device_id: Option<String>, // For YubiKey modes
    pub yubikey_info: Option<YubiKeyInfo>, // YubiKey configuration
    pub yubikey_pin: Option<String>, // YubiKey PIN for hardware operations
}

/// Response from key generation
#[derive(Debug, Serialize)]
pub struct GenerateKeyMultiResponse {
    pub public_key: String,
    pub key_id: String,
    pub saved_path: String,
    pub protection_mode: ProtectionMode,
    pub recipients: Vec<String>,
}

impl ValidateInput for GenerateKeyMultiInput {
    fn validate(&self) -> Result<(), Box<CommandError>> {
        // Validate label is not empty
        ValidationHelper::validate_not_empty(&self.label, "Key label")?;

        // Validate label format
        ValidationHelper::validate_key_label(&self.label)?;

        // Determine protection mode (default to PassphraseOnly for backward compatibility)
        let protection_mode = self
            .protection_mode
            .as_ref()
            .unwrap_or(&ProtectionMode::PassphraseOnly);

        // Validate based on protection mode
        match protection_mode {
            ProtectionMode::PassphraseOnly => {
                // Passphrase is required for PassphraseOnly mode
                if self.passphrase.is_none() {
                    return Err(Box::new(CommandError::validation(
                        "Passphrase is required for passphrase-only protection mode",
                    )));
                }
                // Validate passphrase strength
                ValidationHelper::validate_passphrase_strength(self.passphrase.as_ref().unwrap())?;
            }
            ProtectionMode::YubiKeyOnly { .. } => {
                // YubiKey device ID is required for YubiKey-only mode
                if self.yubikey_device_id.is_none() {
                    return Err(Box::new(CommandError::validation(
                        "YubiKey device ID is required for YubiKey-only protection mode",
                    )));
                }
                // Passphrase should NOT be provided for YubiKey-only mode
                if self.passphrase.is_some() {
                    return Err(Box::new(CommandError::validation(
                        "Passphrase should not be provided for YubiKey-only protection mode",
                    )));
                }
            }
            ProtectionMode::Hybrid { .. } => {
                // Both passphrase and YubiKey are required for Hybrid mode
                if self.passphrase.is_none() {
                    return Err(Box::new(CommandError::validation(
                        "Passphrase is required for hybrid protection mode",
                    )));
                }
                if self.yubikey_device_id.is_none() {
                    return Err(Box::new(CommandError::validation(
                        "YubiKey device ID is required for hybrid protection mode",
                    )));
                }
                // Validate passphrase strength
                ValidationHelper::validate_passphrase_strength(self.passphrase.as_ref().unwrap())?;
            }
        }

        Ok(())
    }
}

/// Generate a new encryption keypair with multi-recipient support
#[tauri::command]
#[instrument(skip(input), fields(label = %input.label))]
pub async fn generate_key_multi(
    input: GenerateKeyMultiInput,
) -> CommandResponse<GenerateKeyMultiResponse> {
    // Create span context for operation tracing
    let span_context = SpanContext::new("generate_key_multi").with_attribute("label", &input.label);

    // Create error handler with span context
    let error_handler = ErrorHandler::new().with_span(span_context.clone());

    // Validate input
    input
        .validate()
        .map_err(|e| error_handler.handle_validation_error("input", &e.message))?;

    // Determine protection mode (default to PassphraseOnly for backward compatibility)
    let protection_mode = input
        .protection_mode
        .clone()
        .unwrap_or(ProtectionMode::PassphraseOnly);

    // Log operation start with structured context
    let mut attributes = HashMap::new();
    attributes.insert("label".to_string(), input.label.clone());
    attributes.insert(
        "protection_mode".to_string(),
        format!("{protection_mode:?}"),
    );
    log_operation(
        crate::logging::LogLevel::Info,
        "Starting multi-recipient key generation",
        &span_context,
        attributes,
    );

    // Check if label already exists
    let existing_keys = error_handler.handle_operation_error(
        storage::list_keys(),
        "list_keys",
        ErrorCode::StorageFailed,
    )?;

    if existing_keys.iter().any(|k| k.label == input.label) {
        return Err(error_handler.handle_validation_error(
            "label",
            &format!("A key with label '{}' already exists. Please choose a different label or use the existing key.", input.label),
        ));
    }

    // Handle key generation based on protection mode
    let (public_key, saved_path, recipients) = match &protection_mode {
        ProtectionMode::PassphraseOnly => {
            // Standard passphrase-only key generation
            generate_passphrase_only_key(
                &input.label,
                input.passphrase.as_ref().unwrap(),
                &error_handler,
            )
            .await?
        }
        ProtectionMode::YubiKeyOnly { serial } => {
            // YubiKey-only key generation with auto-initialization
            generate_yubikey_only_key_with_initialization(
                &input.label,
                serial,
                input.yubikey_device_id.as_deref(),
                input.yubikey_info.as_ref(),
                input.yubikey_pin.as_deref(),
                &error_handler,
            )
            .await?
        }
        ProtectionMode::Hybrid { yubikey_serial } => {
            // Hybrid key generation (passphrase + YubiKey)
            generate_hybrid_key(
                &input.label,
                input.passphrase.as_ref().unwrap(),
                yubikey_serial,
                input.yubikey_device_id.as_deref(),
                input.yubikey_info.as_ref(),
                input.yubikey_pin.as_deref(),
                &error_handler,
            )
            .await?
        }
    };

    // Log operation completion
    let mut completion_attributes = HashMap::new();
    completion_attributes.insert("label".to_string(), input.label.clone());
    completion_attributes.insert(
        "saved_path".to_string(),
        saved_path.to_string_lossy().to_string(),
    );
    completion_attributes.insert("recipients_count".to_string(), recipients.len().to_string());
    log_operation(
        crate::logging::LogLevel::Info,
        "Multi-recipient keypair generated and saved successfully",
        &span_context,
        completion_attributes,
    );

    Ok(GenerateKeyMultiResponse {
        public_key,
        key_id: input.label,
        saved_path: saved_path.to_string_lossy().to_string(),
        protection_mode,
        recipients,
    })
}

/// Generate a passphrase-only protected key
async fn generate_passphrase_only_key(
    label: &str,
    passphrase: &str,
    error_handler: &ErrorHandler,
) -> Result<(String, std::path::PathBuf, Vec<String>), CommandError> {
    // Generate keypair using crypto module
    let keypair = error_handler.handle_operation_error(
        generate_keypair(),
        "generate_keypair",
        ErrorCode::EncryptionFailed,
    )?;

    // Encrypt private key with passphrase
    let encrypted_key = error_handler.handle_operation_error(
        encrypt_private_key(
            &keypair.private_key,
            SecretString::from(passphrase.to_string()),
        ),
        "encrypt_private_key",
        ErrorCode::EncryptionFailed,
    )?;

    // Create recipient info for passphrase
    let recipient =
        RecipientInfo::new_passphrase(keypair.public_key.to_string(), label.to_string());

    // Create metadata with passphrase-only protection
    let metadata = VaultMetadataV2::new(
        ProtectionMode::PassphraseOnly,
        vec![recipient.clone()],
        1, // Single key file
        encrypted_key.len() as u64,
        calculate_checksum(&encrypted_key),
    );

    // Save to storage with metadata
    let saved_path = error_handler.handle_operation_error(
        storage::save_encrypted_key_with_metadata(
            label,
            &encrypted_key,
            Some(&keypair.public_key.to_string()),
            &metadata,
        ),
        "save_encrypted_key",
        ErrorCode::StorageFailed,
    )?;

    Ok((
        keypair.public_key.to_string(),
        saved_path,
        vec![recipient.label],
    ))
}

/// Generate a YubiKey-only protected key
/// Generate YubiKey-only key (age-plugin-yubikey handles all setup)
async fn generate_yubikey_only_key_with_initialization(
    label: &str,
    serial: &str,
    device_id: Option<&str>,
    _yubikey_info: Option<&YubiKeyInfo>,
    yubikey_pin: Option<&str>,
    error_handler: &ErrorHandler,
) -> Result<(String, std::path::PathBuf, Vec<String>), CommandError> {
    // First, run the streamlined initialization sequence (cg6.md: TDES → PIN → PUK → age-plugin-yubikey)
    if let Some(pin) = yubikey_pin {
        // Use the streamlined initialization from the yubikey_commands module
        use crate::commands::yubikey_commands::streamlined::init_yubikey;
        
        // Initialize YubiKey with the proper sequence before using age-plugin-yubikey
        let _init_result = init_yubikey(serial.to_string(), pin.to_string(), label.to_string())
            .await?;
            
        // The init_yubikey already generated the age identity, so we can return early
        // with the initialization result
        return Ok((
            _init_result.recipient.clone(),
            error_handler.handle_operation_error(
                crate::storage::save_yubikey_metadata(
                    label,
                    &crate::storage::VaultMetadataV2::new(
                        crate::crypto::yubikey::ProtectionMode::YubiKeyOnly {
                            serial: serial.to_string(),
                        },
                        vec![crate::storage::RecipientInfo {
                            recipient_type: crate::storage::RecipientType::YubiKey {
                                serial: serial.to_string(),
                                slot: u8::from_str_radix(&_init_result.slot, 16).unwrap_or(0x9c),
                                model: device_id.unwrap_or("YubiKey").to_string(),
                            },
                            public_key: _init_result.recipient.clone(),
                            label: label.to_string(),
                            created_at: chrono::Utc::now(),
                        }],
                        1,
                        0,
                        String::new(),
                    ),
                    Some(&_init_result.recipient),
                ),
                "save_yubikey_metadata",
                crate::commands::types::ErrorCode::StorageFailed,
            )?,
            vec![label.to_string()],
        ));
    }
    
    // After initialization, use age-plugin-yubikey for key generation
    generate_yubikey_only_key_internal(label, serial, device_id, yubikey_pin, error_handler).await
}

/// Original YubiKey key generation logic (renamed)
async fn generate_yubikey_only_key_internal(
    label: &str,
    serial: &str,
    device_id: Option<&str>,
    yubikey_pin: Option<&str>,
    error_handler: &ErrorHandler,
) -> Result<(String, std::path::PathBuf, Vec<String>), CommandError> {
    // Create YubiKey provider with PTY support for interactive operations
    let provider =
        YubiIdentityProviderFactory::create_pty_provider().map_err(CommandError::from)?;

    // Check if YubiKey is already initialized for age
    let existing_recipients = provider
        .list_recipients()
        .await
        .map_err(CommandError::from)?;

    // Find or create YubiKey recipient
    let yubikey_recipient =
        if let Some(existing) = existing_recipients.iter().find(|r| r.serial == serial) {
            // Use existing YubiKey identity
            existing.clone()
        } else {
            // Initialize new YubiKey identity using provided PIN
            provider
                .register(label, yubikey_pin)
                .await
                .map_err(CommandError::from)?
        };

    // For YubiKey-only mode, we don't generate a local keypair
    // The YubiKey itself provides the identity

    // Create recipient info for YubiKey
    let recipient = RecipientInfo {
        recipient_type: RecipientType::YubiKey {
            serial: serial.to_string(),
            slot: yubikey_recipient.slot,
            model: device_id.unwrap_or("YubiKey").to_string(),
        },
        public_key: yubikey_recipient.recipient.clone(),
        label: label.to_string(),
        created_at: chrono::Utc::now(),
    };

    // Create metadata with YubiKey-only protection
    let metadata = VaultMetadataV2::new(
        ProtectionMode::YubiKeyOnly {
            serial: serial.to_string(),
        },
        vec![recipient.clone()],
        1,             // Single key file
        0,             // No encrypted private key stored for YubiKey-only
        String::new(), // No checksum for YubiKey-only
    );

    // For YubiKey-only mode, we don't store an encrypted private key
    // The YubiKey itself holds the identity
    let saved_path = error_handler.handle_operation_error(
        storage::save_yubikey_metadata(label, &metadata, Some(&yubikey_recipient.recipient)),
        "save_yubikey_metadata",
        ErrorCode::StorageFailed,
    )?;

    Ok((
        yubikey_recipient.recipient,
        saved_path,
        vec![recipient.label],
    ))
}

/// Generate a hybrid protected key (passphrase + YubiKey)
async fn generate_hybrid_key(
    label: &str,
    passphrase: &str,
    yubikey_serial: &str,
    device_id: Option<&str>,
    _yubikey_info: Option<&YubiKeyInfo>,
    yubikey_pin: Option<&str>,
    error_handler: &ErrorHandler,
) -> Result<(String, std::path::PathBuf, Vec<String>), CommandError> {
    // Generate keypair
    let keypair = error_handler.handle_operation_error(
        generate_keypair(),
        "generate_keypair",
        ErrorCode::EncryptionFailed,
    )?;

    // Create passphrase recipient
    let passphrase_recipient = RecipientInfo::new_passphrase(
        keypair.public_key.to_string(),
        format!("{label}_passphrase"),
    );

    // Create YubiKey provider and get/create recipient
    let provider = YubiIdentityProviderFactory::create_default().map_err(CommandError::from)?;

    let existing_recipients = provider
        .list_recipients()
        .await
        .map_err(CommandError::from)?;

    let yubikey_recipient_info = if let Some(existing) = existing_recipients
        .iter()
        .find(|r| r.serial == yubikey_serial)
    {
        existing.clone()
    } else {
        // Use provided YubiKey PIN
        provider
            .register(&format!("{label}_yubikey"), yubikey_pin)
            .await
            .map_err(CommandError::from)?
    };

    // Create YubiKey recipient info
    let yubikey_recipient = RecipientInfo {
        recipient_type: RecipientType::YubiKey {
            serial: yubikey_serial.to_string(),
            slot: yubikey_recipient_info.slot,
            model: device_id.unwrap_or("YubiKey").to_string(),
        },
        public_key: yubikey_recipient_info.recipient.clone(),
        label: format!("{label}_yubikey"),
        created_at: chrono::Utc::now(),
    };

    // Encrypt private key with passphrase (for backward compatibility)
    let encrypted_key = error_handler.handle_operation_error(
        encrypt_private_key(
            &keypair.private_key,
            SecretString::from(passphrase.to_string()),
        ),
        "encrypt_private_key",
        ErrorCode::EncryptionFailed,
    )?;

    // Create metadata with hybrid protection
    let recipients = vec![passphrase_recipient.clone(), yubikey_recipient.clone()];
    let metadata = VaultMetadataV2::new(
        ProtectionMode::Hybrid {
            yubikey_serial: yubikey_serial.to_string(),
        },
        recipients.clone(),
        1,
        encrypted_key.len() as u64,
        calculate_checksum(&encrypted_key),
    );

    // Save to storage with metadata
    let saved_path = error_handler.handle_operation_error(
        storage::save_encrypted_key_with_metadata(
            label,
            &encrypted_key,
            Some(&keypair.public_key.to_string()),
            &metadata,
        ),
        "save_encrypted_key",
        ErrorCode::StorageFailed,
    )?;

    let recipient_labels = recipients.iter().map(|r| r.label.clone()).collect();
    Ok((keypair.public_key.to_string(), saved_path, recipient_labels))
}

/// Calculate checksum for data
fn calculate_checksum(data: &[u8]) -> String {
    use sha2::{Digest, Sha256};
    let mut hasher = Sha256::new();
    hasher.update(data);
    hex::encode(hasher.finalize())
}
