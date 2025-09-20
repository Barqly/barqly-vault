//! Input validation traits and helpers
//!
//! This module provides traits and helpers for validating command inputs.

use super::{CommandError, ErrorCode};
use crate::constants::*;
use std::collections::HashMap;

/// Trait for validatable command inputs
pub trait ValidateInput {
    fn validate(&self) -> Result<(), Box<CommandError>>;
}

/// Enhanced validation trait with detailed error reporting
pub trait ValidateInputDetailed {
    fn validate_detailed(&self) -> Result<(), Box<CommandError>>;

    /// Get field-specific validation rules
    fn get_validation_rules() -> HashMap<String, String> {
        HashMap::new()
    }

    /// Validate a specific field
    fn validate_field(&self, _field_name: &str) -> Result<(), Box<CommandError>> {
        self.validate_detailed()
    }
}

/// Validation helper for consistent error messages
pub struct ValidationHelper;

impl ValidationHelper {
    /// Validate that a string is not empty
    pub fn validate_not_empty(value: &str, field_name: &str) -> Result<(), Box<CommandError>> {
        if value.trim().is_empty() {
            let recovery_guidance = match field_name {
                "key label" => "Enter a descriptive name for your encryption key (e.g., 'personal-backup', 'family-keys')",
                "passphrase" => "Create a strong passphrase to protect your private key - this cannot be recovered if lost",
                "file path" => "Browse to select a file or folder you want to encrypt",
                "output path" => "Choose where to save the encrypted file",
                _ => &format!("Please provide a {field_name}")
            };
            return Err(Box::new(
                CommandError::validation(format!("{field_name} cannot be empty"))
                    .with_recovery_guidance(recovery_guidance.to_string()),
            ));
        }
        Ok(())
    }

    /// Validate string length
    pub fn validate_length(
        value: &str,
        field_name: &str,
        min: usize,
        max: usize,
    ) -> Result<(), Box<CommandError>> {
        let len = value.len();
        if len < min {
            return Err(Box::new(
                CommandError::validation(format!(
                    "{field_name} is too short (minimum {min} characters)"
                ))
                .with_recovery_guidance(format!("Please provide a longer {field_name}")),
            ));
        }
        if len > max {
            return Err(Box::new(
                CommandError::validation(format!(
                    "{field_name} is too long (maximum {max} characters)"
                ))
                .with_recovery_guidance(format!("Please provide a shorter {field_name}")),
            ));
        }
        Ok(())
    }

    /// Validate path exists and is accessible
    pub fn validate_path_exists(path: &str, field_name: &str) -> Result<(), Box<CommandError>> {
        let path_buf = std::path::Path::new(path);
        if !path_buf.exists() {
            return Err(Box::new(
                CommandError::operation(
                    ErrorCode::FileNotFound,
                    format!("{field_name} not found: {path}"),
                )
                .with_recovery_guidance("Please check the path and try again"),
            ));
        }
        Ok(())
    }

    /// Validate path is a file
    pub fn validate_is_file(path: &str, field_name: &str) -> Result<(), Box<CommandError>> {
        let path_buf = std::path::Path::new(path);
        if !path_buf.is_file() {
            return Err(Box::new(
                CommandError::validation(format!("{field_name} must be a file: {path}"))
                    .with_recovery_guidance("Please select a valid file"),
            ));
        }
        Ok(())
    }

    /// Validate path is a directory
    pub fn validate_is_directory(path: &str, field_name: &str) -> Result<(), Box<CommandError>> {
        let path_buf = std::path::Path::new(path);
        if !path_buf.is_dir() {
            return Err(Box::new(
                CommandError::validation(format!("{field_name} must be a directory: {path}"))
                    .with_recovery_guidance("Please select a valid directory"),
            ));
        }
        Ok(())
    }

    /// Validate file size is within limits
    pub fn validate_file_size(path: &str, max_size_mb: u64) -> Result<(), Box<CommandError>> {
        let path_buf = std::path::Path::new(path);
        if let Ok(metadata) = std::fs::metadata(path_buf) {
            let size_mb = metadata.len() / BYTES_PER_MB;
            if size_mb > max_size_mb {
                let file_name = path_buf
                    .file_name()
                    .and_then(|name| name.to_str())
                    .unwrap_or("file");
                return Err(Box::new(
                    CommandError::operation(
                        ErrorCode::FileTooLarge,
                        format!("File '{file_name}' is too large: {size_mb} MB (maximum {max_size_mb} MB)"),
                    )
                    .with_recovery_guidance(format!(
                        "Try: 1) Compress the file first, 2) Split into smaller parts, or 3) Use files under {max_size_mb} MB. For Bitcoin wallets, most files are much smaller than this limit."
                    )),
                ));
            }
        }
        Ok(())
    }

    /// Validate key label format
    pub fn validate_key_label(label: &str) -> Result<(), Box<CommandError>> {
        // Key labels should only contain letters, numbers, dashes, and underscores
        if !label.chars().all(|c| c.is_alphanumeric() || c == '-' || c == '_') {
            let invalid_chars: Vec<char> = label
                .chars()
                .filter(|c| !c.is_alphanumeric() && *c != '-' && *c != '_')
                .collect();
            let invalid_chars_str = invalid_chars.iter().collect::<String>();
            return Err(Box::new(
                CommandError::operation(
                    ErrorCode::InvalidKeyLabel,
                    format!("Key label contains invalid characters: {invalid_chars_str}"),
                )
                .with_recovery_guidance("Remove special characters and spaces. Valid: letters (a-z, A-Z), numbers (0-9), dashes (-), and underscores (_). Example: 'my-bitcoin-keys' or 'bitcoin_wallet_2024'"),
            ));
        }
        Ok(())
    }

    /// Validate passphrase strength
    pub fn validate_passphrase_strength(passphrase: &str) -> Result<(), Box<CommandError>> {
        if passphrase.len() < MIN_PASSPHRASE_LENGTH_BASIC {
            return Err(Box::new(
                CommandError::operation(
                    ErrorCode::WeakPassphrase,
                    format!(
                        "Passphrase is too short ({} characters, minimum {MIN_PASSPHRASE_LENGTH_BASIC})",
                        passphrase.len()
                    ),
                )
                .with_recovery_guidance("Create a passphrase with at least 12 characters. Consider using a memorable phrase like 'MyBitcoin-Backup2024!' instead of random characters"),
            ));
        }

        let has_letter = passphrase.chars().any(|c| c.is_alphabetic());
        let has_digit = passphrase.chars().any(|c| c.is_numeric());
        let has_special = passphrase.chars().any(|c| !c.is_alphanumeric());

        if !has_letter || !has_digit {
            let mut missing_requirements = Vec::new();
            if !has_letter {
                missing_requirements.push("letters");
            }
            if !has_digit {
                missing_requirements.push("numbers");
            }

            let message = if missing_requirements.len() == 2 {
                "Passphrase must contain letters and numbers".to_string()
            } else {
                format!("Passphrase missing: {}", missing_requirements.join(", "))
            };

            let recovery_guidance = if has_special {
                "Your passphrase has good special characters. Add some letters and numbers to strengthen it further"
            } else {
                "Include letters, numbers, and symbols for better security. Example: 'MySecure-Backup2024!'"
            };

            return Err(Box::new(
                CommandError::operation(ErrorCode::WeakPassphrase, message)
                    .with_recovery_guidance(recovery_guidance),
            ));
        }

        Ok(())
    }
}
