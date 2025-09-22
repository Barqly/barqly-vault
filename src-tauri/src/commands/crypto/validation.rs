//! Passphrase validation commands
//!
//! This module provides Tauri commands for validating passphrase strength
//! and verifying key-passphrase combinations.

use crate::commands::types::{
    CommandError, CommandResponse, ErrorCode, ErrorHandler, ValidateInput, ValidationHelper,
};
use crate::constants::*;
use crate::crypto::key_mgmt::decrypt_private_key;
use crate::logging::{log_operation, SpanContext};
use crate::storage::key_store::load_encrypted_key;
use age::secrecy::SecretString;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use tracing::instrument;

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
    // Create span context for operation tracing
    let span_context = SpanContext::new("validate_passphrase")
        .with_attribute("passphrase_length", input.passphrase.len().to_string());

    // Create error handler with span context
    let error_handler = ErrorHandler::new().with_span(span_context.clone());

    // Validate input
    input
        .validate()
        .map_err(|e| error_handler.handle_validation_error("input", &e.message))?;

    // Log operation start with structured context
    let mut attributes = HashMap::new();
    attributes.insert(
        "passphrase_length".to_string(),
        input.passphrase.len().to_string(),
    );
    log_operation(
        crate::logging::LogLevel::Info,
        "Starting passphrase validation",
        &span_context,
        attributes,
    );

    let passphrase = &input.passphrase;

    // Check minimum length as per security principles
    if passphrase.len() < MIN_PASSPHRASE_LENGTH {
        let mut failure_attributes = HashMap::new();
        failure_attributes.insert("reason".to_string(), "insufficient_length".to_string());
        failure_attributes.insert(
            "required_length".to_string(),
            MIN_PASSPHRASE_LENGTH.to_string(),
        );
        failure_attributes.insert("actual_length".to_string(), passphrase.len().to_string());
        log_operation(
            crate::logging::LogLevel::Warn,
            "Passphrase validation failed: insufficient length",
            &span_context,
            failure_attributes,
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
        let mut failure_attributes = HashMap::new();
        failure_attributes.insert("reason".to_string(), "insufficient_complexity".to_string());
        failure_attributes.insert("complexity_score".to_string(), complexity_score.to_string());
        failure_attributes.insert("required_score".to_string(), "3".to_string());
        log_operation(
            crate::logging::LogLevel::Warn,
            "Passphrase validation failed: insufficient complexity",
            &span_context,
            failure_attributes,
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
            let mut failure_attributes = HashMap::new();
            failure_attributes.insert("reason".to_string(), "weak_pattern".to_string());
            failure_attributes.insert("pattern".to_string(), pattern.to_string());
            log_operation(
                crate::logging::LogLevel::Warn,
                "Passphrase validation failed: contains weak pattern",
                &span_context,
                failure_attributes,
            );
            return Ok(ValidatePassphraseResponse {
                is_valid: false,
                message: "Passphrase contains common weak patterns".to_string(),
            });
        }
    }

    // Check for sequential patterns
    if contains_sequential_pattern(passphrase) {
        let mut failure_attributes = HashMap::new();
        failure_attributes.insert("reason".to_string(), "sequential_pattern".to_string());
        log_operation(
            crate::logging::LogLevel::Warn,
            "Passphrase validation failed: contains sequential pattern",
            &span_context,
            failure_attributes,
        );
        return Ok(ValidatePassphraseResponse {
            is_valid: false,
            message: "Passphrase contains sequential patterns (like 123, abc)".to_string(),
        });
    }

    // Log successful validation
    let mut success_attributes = HashMap::new();
    success_attributes.insert("complexity_score".to_string(), complexity_score.to_string());
    log_operation(
        crate::logging::LogLevel::Info,
        "Passphrase validation successful",
        &span_context,
        success_attributes,
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
    // Create span context for operation tracing
    let span_context =
        SpanContext::new("verify_key_passphrase").with_attribute("key_id", input.key_id.clone());

    // Create error handler with span context
    let error_handler = ErrorHandler::new().with_span(span_context.clone());

    // Validate input
    input
        .validate()
        .map_err(|e| error_handler.handle_validation_error("input", &e.message))?;

    // Log operation start
    let mut attributes = HashMap::new();
    attributes.insert("key_id".to_string(), input.key_id.clone());
    log_operation(
        crate::logging::LogLevel::Info,
        "Starting key-passphrase verification",
        &span_context,
        attributes.clone(),
    );

    // Try to load the encrypted key
    let encrypted_key = match load_encrypted_key(&input.key_id) {
        Ok(key) => key,
        Err(e) => {
            let mut error_attributes = HashMap::new();
            error_attributes.insert("key_id".to_string(), input.key_id.clone());
            error_attributes.insert("error".to_string(), e.to_string());
            log_operation(
                crate::logging::LogLevel::Error,
                "Failed to load key for verification",
                &span_context,
                error_attributes,
            );

            // Map storage errors to appropriate command errors
            return Err(match e {
                crate::storage::errors::StorageError::KeyNotFound(_) => {
                    Box::new(CommandError::operation(
                        ErrorCode::KeyNotFound,
                        format!("Key '{}' not found", input.key_id),
                    ))
                }
                _ => Box::new(CommandError::operation(
                    ErrorCode::StorageFailed,
                    format!("Failed to load key: {e}"),
                )),
            });
        }
    };

    // Attempt to decrypt the private key with the provided passphrase
    let passphrase = SecretString::from(input.passphrase);
    match decrypt_private_key(&encrypted_key, passphrase) {
        Ok(_) => {
            // Passphrase is correct - key was successfully decrypted
            let mut success_attributes = HashMap::new();
            success_attributes.insert("key_id".to_string(), input.key_id.clone());
            log_operation(
                crate::logging::LogLevel::Info,
                "Key-passphrase verification successful",
                &span_context,
                success_attributes,
            );

            Ok(VerifyKeyPassphraseResponse {
                is_valid: true,
                message: "Passphrase is correct".to_string(),
            })
        }
        Err(e) => {
            // Check if it's specifically a wrong passphrase error
            match e {
                crate::crypto::CryptoError::WrongPassphrase => {
                    let mut failure_attributes = HashMap::new();
                    failure_attributes.insert("key_id".to_string(), input.key_id.clone());
                    failure_attributes.insert("reason".to_string(), "wrong_passphrase".to_string());
                    log_operation(
                        crate::logging::LogLevel::Warn,
                        "Key-passphrase verification failed: incorrect passphrase",
                        &span_context,
                        failure_attributes,
                    );

                    Ok(VerifyKeyPassphraseResponse {
                        is_valid: false,
                        message: "Incorrect passphrase for the selected key".to_string(),
                    })
                }
                _ => {
                    // Other crypto errors (corrupted key, invalid format, etc.)
                    let mut error_attributes = HashMap::new();
                    error_attributes.insert("key_id".to_string(), input.key_id.clone());
                    error_attributes.insert("error".to_string(), e.to_string());
                    log_operation(
                        crate::logging::LogLevel::Error,
                        "Key-passphrase verification failed with crypto error",
                        &span_context,
                        error_attributes,
                    );

                    Err(Box::new(CommandError::operation(
                        ErrorCode::DecryptionFailed,
                        format!("Failed to verify key: {e}"),
                    )))
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
