//! Passphrase validation commands
//!
//! This module provides Tauri commands for validating passphrase strength
//! and verifying key-passphrase combinations.

use crate::commands::types::{
    CommandError, CommandResponse, ErrorCode, ErrorHandler, ValidateInput, ValidationHelper,
};
use crate::constants::*;
use crate::crypto::key_mgmt::decrypt_private_key;
use crate::prelude::*;
use crate::storage::KeyRegistry;
use crate::storage::key_store::load_encrypted_key;
use age::secrecy::SecretString;

/// Input for passphrase validation command
#[derive(Debug, Deserialize, specta::Type)]
pub struct ValidatePassphraseInput {
    pub passphrase: String,
}

/// Response from passphrase validation
#[derive(Debug, Serialize, specta::Type)]
pub struct ValidatePassphraseResponse {
    pub is_valid: bool,
    pub message: String,
}

impl ValidateInput for ValidatePassphraseInput {
    fn validate(&self) -> Result<(), Box<CommandError>> {
        ValidationHelper::validate_not_empty(&self.passphrase, "Passphrase")?;
        Ok(())
    }
}

/// Validate passphrase strength
#[tauri::command]
#[specta::specta]
#[instrument(skip(input), fields(passphrase_length = input.passphrase.len()))]
pub async fn validate_passphrase(
    input: ValidatePassphraseInput,
) -> CommandResponse<ValidatePassphraseResponse> {
    // Create error handler
    let error_handler = ErrorHandler::new();

    // Validate input
    input
        .validate()
        .map_err(|e| error_handler.handle_validation_error("input", &e.message))?;

    // Log operation start with structured fields
    info!(
        passphrase_length = input.passphrase.len(),
        "Starting passphrase validation"
    );

    let passphrase = &input.passphrase;

    // Check minimum length as per security principles
    if passphrase.len() < MIN_PASSPHRASE_LENGTH {
        warn!(
            reason = "insufficient_length",
            required_length = MIN_PASSPHRASE_LENGTH,
            actual_length = passphrase.len(),
            "Passphrase validation failed: insufficient length"
        );
        return Ok(ValidatePassphraseResponse {
            is_valid: false,
            message: format!("Passphrase must be at least {MIN_PASSPHRASE_LENGTH} characters long"),
        });
    }

    // Check for complexity requirements (at least 3 of 4 categories)
    let has_uppercase = passphrase.chars().any(|c| c.is_uppercase());
    let has_lowercase = passphrase.chars().any(|c| c.is_lowercase());
    let has_digit = passphrase.chars().any(|c| c.is_numeric());
    let has_special = passphrase.chars().any(|c| !c.is_alphanumeric());

    let complexity_score = [has_uppercase, has_lowercase, has_digit, has_special]
        .iter()
        .filter(|&&x| x)
        .count();

    if complexity_score < 3 {
        warn!(
            reason = "insufficient_complexity",
            complexity_score = complexity_score,
            required_score = 3,
            "Passphrase validation failed: insufficient complexity"
        );
        return Ok(ValidatePassphraseResponse {
            is_valid: false,
            message: "Passphrase must contain at least 3 of: uppercase letters, lowercase letters, numbers, and special characters".to_string(),
        });
    }

    // Check for common weak patterns
    let common_patterns = [
        "password", "123456", "qwerty", "admin", "letmein", "welcome", "monkey", "dragon",
        "master", "football", "baseball", "shadow", "michael", "jennifer", "thomas", "jessica",
        "jordan", "hunter", "michelle", "charlie", "andrew", "daniel", "maggie", "summer",
    ];

    let passphrase_lower = passphrase.to_lowercase();
    for pattern in &common_patterns {
        if passphrase_lower.contains(pattern) {
            warn!(
                reason = "weak_pattern",
                pattern = %pattern,
                "Passphrase validation failed: contains weak pattern"
            );
            return Ok(ValidatePassphraseResponse {
                is_valid: false,
                message: "Passphrase contains common weak patterns".to_string(),
            });
        }
    }

    // Check for sequential patterns
    if contains_sequential_pattern(passphrase) {
        warn!(
            reason = "sequential_pattern",
            "Passphrase validation failed: contains sequential pattern"
        );
        return Ok(ValidatePassphraseResponse {
            is_valid: false,
            message: "Passphrase contains sequential patterns (like 123, abc)".to_string(),
        });
    }

    // Log successful validation
    info!(
        complexity_score = complexity_score,
        "Passphrase validation successful"
    );
    Ok(ValidatePassphraseResponse {
        is_valid: true,
        message: "Passphrase meets security requirements".to_string(),
    })
}

/// Check for sequential patterns in passphrase
pub(crate) fn contains_sequential_pattern(passphrase: &str) -> bool {
    if passphrase.len() < MIN_LENGTH_FOR_SEQUENCE_CHECK {
        return false;
    }

    let chars: Vec<char> = passphrase.chars().collect();

    for i in 0..chars.len() - 2 {
        let c1 = chars[i] as u32;
        let c2 = chars[i + 1] as u32;
        let c3 = chars[i + 2] as u32;

        // Check for sequential characters (like abc, 123)
        if c2 == c1 + 1 && c3 == c2 + 1 {
            return true;
        }

        // Check for reverse sequential characters (like cba, 321)
        if c2 == c1 - 1 && c3 == c2 - 1 {
            return true;
        }
    }

    false
}

/// Input for key-passphrase verification command
#[derive(Debug, Deserialize, specta::Type)]
pub struct VerifyKeyPassphraseInput {
    pub key_id: String,
    pub passphrase: String,
}

/// Response from key-passphrase verification
#[derive(Debug, Serialize, specta::Type)]
pub struct VerifyKeyPassphraseResponse {
    pub is_valid: bool,
    pub message: String,
}

impl ValidateInput for VerifyKeyPassphraseInput {
    fn validate(&self) -> Result<(), Box<CommandError>> {
        ValidationHelper::validate_not_empty(&self.key_id, "Key ID")?;
        ValidationHelper::validate_not_empty(&self.passphrase, "Passphrase")?;
        ValidationHelper::validate_key_label(&self.key_id)?;
        Ok(())
    }
}

/// Verify that a passphrase can decrypt a specific key
///
/// This command efficiently validates a key-passphrase combination
/// without performing full file decryption. It only attempts to decrypt
/// the private key, making it suitable for validation workflows.
///
/// # Security
/// - Constant-time operations where possible to prevent timing attacks
/// - No unnecessary file I/O or temporary file creation
/// - Proper error handling without information leakage
///
/// # Performance
/// - Fast operation independent of encrypted file size
/// - Only loads and decrypts the private key
/// - Minimal memory footprint
#[tauri::command]
#[specta::specta]
#[instrument(skip(input), fields(key_id = %input.key_id))]
pub async fn verify_key_passphrase(
    input: VerifyKeyPassphraseInput,
) -> CommandResponse<VerifyKeyPassphraseResponse> {
    // Create error handler
    let error_handler = ErrorHandler::new();

    // Validate input
    input
        .validate()
        .map_err(|e| error_handler.handle_validation_error("input", &e.message))?;

    // Log operation start
    info!(
        key_id = %input.key_id,
        "Starting key-passphrase verification"
    );

    // Load the key registry to check key type
    let registry = match KeyRegistry::load() {
        Ok(r) => r,
        Err(e) => {
            error!(
                key_id = %input.key_id,
                error = %e,
                "Failed to load key registry"
            );
            return Err(Box::new(CommandError::operation(
                ErrorCode::StorageFailed,
                format!("Failed to load key registry: {e}"),
            )));
        }
    };

    // Get the key entry from registry
    let key_entry = match registry.get_key(&input.key_id) {
        Some(entry) => entry,
        None => {
            error!(
                key_id = %input.key_id,
                "Key not found in registry"
            );
            return Err(Box::new(CommandError::operation(
                ErrorCode::KeyNotFound,
                format!("Key '{}' not found", input.key_id),
            )));
        }
    };

    // Handle verification based on key type
    match key_entry {
        crate::storage::KeyEntry::Passphrase { key_filename, .. } => {
            // For passphrase keys, load the encrypted key file and try to decrypt it
            let encrypted_key = match load_encrypted_key(key_filename) {
                Ok(key) => key,
                Err(e) => {
                    error!(
                        key_id = %input.key_id,
                        key_filename = %key_filename,
                        error = %e,
                        "Failed to load encrypted key file"
                    );
                    return Err(Box::new(CommandError::operation(
                        ErrorCode::KeyNotFound,
                        format!("Key file '{}' not found", key_filename),
                    )));
                }
            };

            // Attempt to decrypt the private key with the provided passphrase
            let passphrase = SecretString::from(input.passphrase);
            match decrypt_private_key(&encrypted_key, passphrase) {
                Ok(_) => {
                    // Passphrase is correct - key was successfully decrypted
                    info!(
                        key_id = %input.key_id,
                        "Passphrase verification successful"
                    );

                    Ok(VerifyKeyPassphraseResponse {
                        is_valid: true,
                        message: "Passphrase is correct".to_string(),
                    })
                }
                Err(e) => {
                    // Passphrase is incorrect or key is corrupted
                    info!(
                        key_id = %input.key_id,
                        error = %e,
                        "Passphrase verification failed"
                    );

                    Ok(VerifyKeyPassphraseResponse {
                        is_valid: false,
                        message: "Incorrect passphrase".to_string(),
                    })
                }
            }
        }
        crate::storage::KeyEntry::Yubikey { serial, .. } => {
            // For YubiKey keys, verify the PIN using PIV operations
            info!(
                key_id = %input.key_id,
                serial = %serial,
                "Starting YubiKey PIN verification"
            );

            // Use the dedicated PIN verification function with serial binding
            match crate::key_management::yubikey::infrastructure::pty::verify_yubikey_pin(
                serial,
                &input.passphrase,
            ) {
                Ok(true) => {
                    info!(
                        key_id = %input.key_id,
                        serial = %serial,
                        "YubiKey PIN verification successful"
                    );
                    Ok(VerifyKeyPassphraseResponse {
                        is_valid: true,
                        message: "PIN is correct".to_string(),
                    })
                }
                Ok(false) => {
                    info!(
                        key_id = %input.key_id,
                        serial = %serial,
                        "YubiKey PIN verification failed - incorrect PIN"
                    );
                    Ok(VerifyKeyPassphraseResponse {
                        is_valid: false,
                        message: "Incorrect PIN".to_string(),
                    })
                }
                Err(e) => {
                    error!(
                        key_id = %input.key_id,
                        serial = %serial,
                        error = %e,
                        "YubiKey PIN verification failed due to error"
                    );
                    Ok(VerifyKeyPassphraseResponse {
                        is_valid: false,
                        message: "YubiKey PIN verification failed. Please ensure your YubiKey is connected and try again.".to_string(),
                    })
                }
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_validate_passphrase_strength() {
        // Test strong passphrase
        let strong_pass = ValidatePassphraseInput {
            passphrase: "MyS3cureP@ssw0rd!".to_string(),
        };
        assert!(strong_pass.validate().is_ok());

        // Test weak passphrase (too short)
        let short_pass = ValidatePassphraseInput {
            passphrase: "Short1!".to_string(),
        };
        // This should pass validation input check but fail the actual validation
        assert!(short_pass.validate().is_ok());
    }

    #[test]
    fn test_contains_sequential_pattern() {
        assert!(contains_sequential_pattern("abc123"));
        assert!(contains_sequential_pattern("test123abc"));
        assert!(contains_sequential_pattern("xyz789"));
        assert!(contains_sequential_pattern("321cba"));
        assert!(!contains_sequential_pattern("random5@7"));
        assert!(!contains_sequential_pattern("P@ssw0rd"));
        assert!(!contains_sequential_pattern("ab")); // Too short
    }

    #[test]
    fn test_verify_key_passphrase_input_validation() {
        // Test valid input (use dash instead of underscore)
        let valid_input = VerifyKeyPassphraseInput {
            key_id: "test-key".to_string(),
            passphrase: "TestPassword123!".to_string(),
        };
        assert!(valid_input.validate().is_ok());

        // Test empty key_id
        let empty_key = VerifyKeyPassphraseInput {
            key_id: "".to_string(),
            passphrase: "TestPassword123!".to_string(),
        };
        assert!(empty_key.validate().is_err());

        // Test empty passphrase
        let empty_pass = VerifyKeyPassphraseInput {
            key_id: "test-key".to_string(),
            passphrase: "".to_string(),
        };
        assert!(empty_pass.validate().is_err());

        // Test valid key label (underscore is now allowed)
        let valid_underscore = VerifyKeyPassphraseInput {
            key_id: "test_key".to_string(),
            passphrase: "TestPassword123!".to_string(),
        };
        assert!(valid_underscore.validate().is_ok());

        // Test invalid key label (contains path separator)
        let invalid_label = VerifyKeyPassphraseInput {
            key_id: "../malicious".to_string(),
            passphrase: "TestPassword123!".to_string(),
        };
        assert!(invalid_label.validate().is_err());
    }
}
