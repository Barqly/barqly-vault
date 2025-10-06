//! Multi-recipient encryption support for YubiKey integration
//!
//! This module implements encryption and decryption operations that support
//! multiple recipients including both passphrase and YubiKey protection.

use super::{CryptoError, Result};
use crate::services::key_management::yubikey::domain::models::{
    ProtectionMode, UnlockCredentials, UnlockMethod,
};
use crate::services::key_management::yubikey::infrastructure::pty::core::get_age_path;
use crate::services::vault::{RecipientInfo, RecipientType, VaultMetadata};
use age::Recipient;
use std::io::Write;
use std::str::FromStr;

/// Multi-recipient encryption parameters
#[derive(Debug, Clone)]
pub struct MultiRecipientEncryptParams {
    pub protection_mode: ProtectionMode,
    pub recipients: Vec<RecipientInfo>,
    pub data: Vec<u8>,
}

/// Multi-recipient decryption parameters  
#[derive(Debug, Clone)]
pub struct MultiRecipientDecryptParams {
    pub metadata: VaultMetadata,
    pub unlock_method: Option<UnlockMethod>,
    pub credentials: UnlockCredentials,
    pub encrypted_data: Vec<u8>,
}

/// Encryption result with metadata
#[derive(Debug, Clone)]
pub struct EncryptionResult {
    pub encrypted_data: Vec<u8>,
    pub metadata: VaultMetadata,
    pub recipients_used: Vec<String>,
}

/// Decryption result with method information
#[derive(Debug, Clone)]
pub struct DecryptionResult {
    pub decrypted_data: Vec<u8>,
    pub method_used: UnlockMethod,
    pub recipient_used: String,
}

/// Multi-recipient encryption engine
pub struct MultiRecipientCrypto;

impl MultiRecipientCrypto {
    /// Encrypt data with multiple recipients
    ///
    /// This function encrypts data so it can be decrypted by any of the specified recipients.
    /// It supports both passphrase-based and YubiKey-based recipients.
    pub fn encrypt_with_multiple_recipients(
        params: MultiRecipientEncryptParams,
    ) -> Result<EncryptionResult> {
        let mut age_recipients = Vec::new();
        let mut recipients_used = Vec::new();

        let data = params.data.clone();
        let protection_mode = params.protection_mode.clone();
        let recipients = params.recipients.clone();

        // Convert each recipient to age format
        for recipient_info in &recipients {
            let age_recipient = Self::create_age_recipient(recipient_info)?;
            age_recipients.push(age_recipient);
            recipients_used.push(recipient_info.label.clone());
        }

        // Perform multi-recipient encryption using age
        let encrypted_data = Self::encrypt_with_age_recipients(&data, age_recipients)?;

        // Create vault metadata
        let metadata = VaultMetadata::new(
            protection_mode,
            recipients,
            1, // Single data blob
            data.len() as u64,
            Self::calculate_checksum(&data)?,
        );

        Ok(EncryptionResult {
            encrypted_data,
            metadata,
            recipients_used,
        })
    }

    /// Decrypt data using smart method selection
    ///
    /// This function attempts to decrypt data using the most appropriate method
    /// based on availability and user preference.
    pub async fn decrypt_with_smart_selection(
        params: MultiRecipientDecryptParams,
    ) -> Result<DecryptionResult> {
        // Determine available unlock methods
        let available_methods = Self::determine_available_methods(&params.metadata)?;

        // Select the best method to use
        let unlock_method = params.unlock_method.clone();
        let selected_method =
            Self::select_unlock_method(&params.metadata, &available_methods, unlock_method)?;

        // Perform decryption with selected method
        Self::decrypt_with_method(&params, selected_method).await
    }

    /// Create age recipient from recipient info
    fn create_age_recipient(recipient_info: &RecipientInfo) -> Result<Box<dyn Recipient + Send>> {
        match &recipient_info.recipient_type {
            RecipientType::Passphrase { .. } => {
                // For passphrase recipients, we use the public key directly
                let recipient = age::x25519::Recipient::from_str(&recipient_info.public_key)
                    .map_err(|e| {
                        CryptoError::InvalidKey(format!("Invalid passphrase recipient: {e}"))
                    })?;
                Ok(Box::new(recipient))
            }
            RecipientType::YubiKey { .. } => {
                // For YubiKey recipients, we'll use X25519 for now (simplified)
                // In a full implementation, this would use age-plugin-yubikey
                let recipient = age::x25519::Recipient::from_str(&recipient_info.public_key)
                    .map_err(|e| {
                        CryptoError::InvalidKey(format!("Invalid YubiKey recipient: {e}"))
                    })?;
                Ok(Box::new(recipient))
            }
        }
    }

    /// Encrypt data using age with multiple recipients
    fn encrypt_with_age_recipients(
        data: &[u8],
        recipients: Vec<Box<dyn Recipient + Send>>,
    ) -> Result<Vec<u8>> {
        // age 0.11 expects an iterator of references
        let encryptor = age::Encryptor::with_recipients(
            recipients.iter().map(|r| r.as_ref() as &dyn Recipient),
        )
        .expect("at least one recipient");

        let mut encrypted_output = Vec::new();
        let mut writer = encryptor
            .wrap_output(&mut encrypted_output)
            .map_err(|e| CryptoError::EncryptionFailed(format!("Failed to wrap output: {e}")))?;

        writer
            .write_all(data)
            .map_err(|e| CryptoError::EncryptionFailed(format!("Failed to write data: {e}")))?;

        writer.finish().map_err(|e| {
            CryptoError::EncryptionFailed(format!("Failed to finish encryption: {e}"))
        })?;

        Ok(encrypted_output)
    }

    /// Determine which unlock methods are currently available
    fn determine_available_methods(metadata: &VaultMetadata) -> Result<Vec<UnlockMethod>> {
        let mut available_methods = Vec::new();

        // Check for passphrase recipients
        if !metadata.get_recipients_by_type("passphrase").is_empty() {
            available_methods.push(UnlockMethod::Passphrase);
        }

        // Check for YubiKey recipients and their availability
        let yubikey_recipients = metadata.get_recipients_by_type("yubikey");
        for recipient in yubikey_recipients {
            if recipient.is_available() {
                available_methods.push(UnlockMethod::YubiKey);
                break; // Only add once even if multiple YubiKeys are available
            }
        }

        Ok(available_methods)
    }

    /// Select the best unlock method based on metadata and preferences
    fn select_unlock_method(
        metadata: &VaultMetadata,
        available_methods: &[UnlockMethod],
        user_preference: Option<UnlockMethod>,
    ) -> Result<UnlockMethod> {
        // If user specified a preference, try to use it
        if let Some(preferred) = user_preference {
            if available_methods.contains(&preferred) {
                return Ok(preferred);
            } else {
                return Err(CryptoError::DecryptionFailed(
                    "Requested unlock method is not available".to_string(),
                ));
            }
        }

        // Auto-select based on protection mode and availability
        match &metadata.protection_mode {
            ProtectionMode::PassphraseOnly => {
                if available_methods.contains(&UnlockMethod::Passphrase) {
                    Ok(UnlockMethod::Passphrase)
                } else {
                    Err(CryptoError::DecryptionFailed(
                        "Passphrase method not available".to_string(),
                    ))
                }
            }
            ProtectionMode::YubiKeyOnly { .. } => {
                if available_methods.contains(&UnlockMethod::YubiKey) {
                    Ok(UnlockMethod::YubiKey)
                } else {
                    Err(CryptoError::DecryptionFailed(
                        "YubiKey method not available".to_string(),
                    ))
                }
            }
            ProtectionMode::Hybrid { .. } => {
                // Prefer YubiKey if available, fall back to passphrase
                if available_methods.contains(&UnlockMethod::YubiKey) {
                    Ok(UnlockMethod::YubiKey)
                } else if available_methods.contains(&UnlockMethod::Passphrase) {
                    Ok(UnlockMethod::Passphrase)
                } else {
                    Err(CryptoError::DecryptionFailed(
                        "No unlock methods available".to_string(),
                    ))
                }
            }
        }
    }

    /// Decrypt data using a specific method
    async fn decrypt_with_method(
        params: &MultiRecipientDecryptParams,
        method: UnlockMethod,
    ) -> Result<DecryptionResult> {
        match (method, &params.credentials) {
            (
                UnlockMethod::Passphrase,
                UnlockCredentials::Passphrase {
                    key_label,
                    passphrase,
                },
            ) => Self::decrypt_with_passphrase(
                &params.encrypted_data,
                &params.metadata,
                key_label,
                passphrase,
            ),
            (UnlockMethod::YubiKey, UnlockCredentials::YubiKey { serial, pin }) => {
                Self::decrypt_with_yubikey(
                    &params.encrypted_data,
                    &params.metadata,
                    serial,
                    pin.as_deref(),
                )
                .await
            }
            _ => Err(CryptoError::DecryptionFailed(
                "Unlock method doesn't match provided credentials".to_string(),
            )),
        }
    }

    /// Decrypt using passphrase method
    fn decrypt_with_passphrase(
        encrypted_data: &[u8],
        metadata: &VaultMetadata,
        key_label: &str,
        passphrase: &str,
    ) -> Result<DecryptionResult> {
        // Find the passphrase recipient
        let recipient = metadata
            .recipients
            .iter()
            .find(|r| {
                matches!(r.recipient_type, RecipientType::Passphrase { .. }) && r.label == key_label
            })
            .ok_or_else(|| {
                CryptoError::DecryptionFailed(format!(
                    "Passphrase recipient '{key_label}' not found"
                ))
            })?;

        // Load the private key using the passphrase
        // Note: This assumes the public_key field actually contains encrypted private key data
        // In a real implementation, you would store encrypted private keys separately
        let private_key = crate::services::key_management::passphrase::decrypt_private_key(
            recipient.public_key.as_bytes(),
            secrecy::SecretString::from(passphrase.to_string()),
        )?;

        // Decrypt the data
        let decrypted_data = super::age_operations::decrypt_data(encrypted_data, &private_key)?;

        Ok(DecryptionResult {
            decrypted_data,
            method_used: UnlockMethod::Passphrase,
            recipient_used: recipient.label.clone(),
        })
    }

    /// Decrypt using YubiKey method
    async fn decrypt_with_yubikey(
        encrypted_data: &[u8],
        metadata: &VaultMetadata,
        serial: &str,
        pin: Option<&str>,
    ) -> Result<DecryptionResult> {
        // Find the YubiKey recipient
        let recipient = metadata
            .recipients
            .iter()
            .find(|r| match &r.recipient_type {
                RecipientType::YubiKey { serial: s, .. } => s == serial,
                _ => false,
            })
            .ok_or_else(|| {
                CryptoError::DecryptionFailed(format!(
                    "YubiKey recipient with serial '{serial}' not found"
                ))
            })?;

        // Use age-plugin-yubikey to decrypt
        Self::decrypt_with_age_plugin(encrypted_data, recipient, serial, pin).await
    }

    /// Decrypt using age-plugin-yubikey
    async fn decrypt_with_age_plugin(
        encrypted_data: &[u8],
        recipient: &RecipientInfo,
        _serial: &str,
        pin: Option<&str>,
    ) -> Result<DecryptionResult> {
        // Get the plugin path from DDD infrastructure
        let plugin_path = crate::services::key_management::yubikey::infrastructure::age::AgePluginProvider::find_plugin_binary()
            .map_err(|e| CryptoError::DecryptionFailed(format!("Plugin error: {e}")))?;

        // Set up environment for age decryption
        let mut env_path = std::env::var("PATH").unwrap_or_default();
        if let Some(plugin_dir) = plugin_path.parent() {
            env_path = format!("{}:{}", plugin_dir.display(), env_path);
        }

        // Create age decryption command
        use tokio::io::AsyncWriteExt;
        use tokio::process::Command as TokioCommand;

        let age_path = get_age_path();
        let mut cmd = TokioCommand::new(&age_path);
        cmd.arg("-d")
            .env("PATH", env_path)
            .stdin(std::process::Stdio::piped())
            .stdout(std::process::Stdio::piped())
            .stderr(std::process::Stdio::piped());

        // Add PIN to environment if provided
        if let Some(pin_value) = pin {
            cmd.env("YUBIKEY_PIN", pin_value);
        }

        let mut child = cmd.spawn().map_err(|e| {
            CryptoError::DecryptionFailed(format!("Failed to spawn age process: {e}"))
        })?;

        // Write encrypted data to stdin
        if let Some(stdin) = child.stdin.take() {
            let mut stdin = stdin;
            stdin.write_all(encrypted_data).await.map_err(|e| {
                CryptoError::DecryptionFailed(format!("Failed to write to age stdin: {e}"))
            })?;
            stdin.shutdown().await.map_err(|e| {
                CryptoError::DecryptionFailed(format!("Failed to close age stdin: {e}"))
            })?;
        }

        // Wait for completion and collect output
        let output = child.wait_with_output().await.map_err(|e| {
            CryptoError::DecryptionFailed(format!("Failed to wait for age process: {e}"))
        })?;

        if !output.status.success() {
            let stderr = String::from_utf8_lossy(&output.stderr);
            return Err(CryptoError::DecryptionFailed(format!(
                "age decryption failed: {stderr}"
            )));
        }

        Ok(DecryptionResult {
            decrypted_data: output.stdout,
            method_used: UnlockMethod::YubiKey,
            recipient_used: recipient.label.clone(),
        })
    }

    /// Calculate checksum for data integrity verification
    fn calculate_checksum(data: &[u8]) -> Result<String> {
        use sha2::{Digest, Sha256};
        let mut hasher = Sha256::new();
        hasher.update(data);
        Ok(hex::encode(hasher.finalize()))
    }

    /// Verify data integrity using checksum
    pub fn verify_integrity(data: &[u8], expected_checksum: &str) -> Result<bool> {
        let calculated_checksum = Self::calculate_checksum(data)?;
        Ok(calculated_checksum == expected_checksum)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::services::vault::RecipientInfo;

    #[test]
    fn test_checksum_calculation() {
        let data = b"test data";
        let checksum1 = MultiRecipientCrypto::calculate_checksum(data).unwrap();
        let checksum2 = MultiRecipientCrypto::calculate_checksum(data).unwrap();

        assert_eq!(checksum1, checksum2);
        assert!(!checksum1.is_empty());
    }

    #[test]
    fn test_integrity_verification() {
        let data = b"test data";
        let checksum = MultiRecipientCrypto::calculate_checksum(data).unwrap();

        assert!(MultiRecipientCrypto::verify_integrity(data, &checksum).unwrap());
        assert!(!MultiRecipientCrypto::verify_integrity(b"different data", &checksum).unwrap());
    }

    #[test]
    fn test_available_methods_detection() {
        let passphrase_recipient = RecipientInfo::new_passphrase(
            "age1test123".to_string(),
            "test-key".to_string(),
            "test-key.agekey.enc".to_string(),
        );

        let metadata = VaultMetadata::new(
            ProtectionMode::PassphraseOnly,
            vec![passphrase_recipient],
            1,
            100,
            "test-checksum".to_string(),
        );

        let available = MultiRecipientCrypto::determine_available_methods(&metadata).unwrap();
        assert!(available.contains(&UnlockMethod::Passphrase));
        assert!(!available.contains(&UnlockMethod::YubiKey));
    }

    #[test]
    fn test_method_selection() {
        let passphrase_recipient = RecipientInfo::new_passphrase(
            "age1test123".to_string(),
            "test-key".to_string(),
            "test-key.agekey.enc".to_string(),
        );

        let metadata = VaultMetadata::new(
            ProtectionMode::PassphraseOnly,
            vec![passphrase_recipient],
            1,
            100,
            "test-checksum".to_string(),
        );

        let available = vec![UnlockMethod::Passphrase];
        let selected =
            MultiRecipientCrypto::select_unlock_method(&metadata, &available, None).unwrap();

        assert_eq!(selected, UnlockMethod::Passphrase);
    }
}
