//! Recipient validation for public-key-only entries
//!
//! Validates age1... public keys and sanitizes labels for recipient entries.
//! Recipients are public keys belonging to OTHER people that the user wants
//! to encrypt data FOR.

use thiserror::Error;

/// Maximum label length for recipients
pub const MAX_LABEL_LENGTH: usize = 128;

/// Minimum label length for recipients
pub const MIN_LABEL_LENGTH: usize = 1;

/// Age public key prefix
const AGE_PUBLIC_KEY_PREFIX: &str = "age1";

/// Expected length of an age public key (age1 + 58 chars = 62 total)
const AGE_PUBLIC_KEY_LENGTH: usize = 62;

/// Validation errors for recipient entries
#[derive(Debug, Error)]
pub enum RecipientValidationError {
    #[error("Invalid public key format: must start with 'age1'")]
    InvalidPublicKeyPrefix,

    #[error("Invalid public key length: expected 62 characters, got {0}")]
    InvalidPublicKeyLength(usize),

    #[error("Invalid public key: contains invalid characters")]
    InvalidPublicKeyCharacters,

    #[error("Label is required")]
    LabelEmpty,

    #[error("Label exceeds maximum length of {MAX_LABEL_LENGTH} characters")]
    LabelTooLong,

    #[error("Label contains invalid characters")]
    LabelInvalidCharacters,
}

/// Validate an age public key (age1... format)
///
/// Age public keys:
/// - Start with "age1"
/// - Are exactly 62 characters total
/// - Use Bech32 encoding (lowercase alphanumeric, no 1, b, i, o)
pub fn validate_public_key(key: &str) -> Result<(), RecipientValidationError> {
    let key = key.trim();

    // Check prefix
    if !key.starts_with(AGE_PUBLIC_KEY_PREFIX) {
        return Err(RecipientValidationError::InvalidPublicKeyPrefix);
    }

    // Check length
    if key.len() != AGE_PUBLIC_KEY_LENGTH {
        return Err(RecipientValidationError::InvalidPublicKeyLength(key.len()));
    }

    // Check characters (Bech32 encoding - lowercase only, specific charset)
    // Valid Bech32 chars: qpzry9x8gf2tvdw0s3jn54khce6mua7l (no 1, b, i, o after prefix)
    let payload = &key[AGE_PUBLIC_KEY_PREFIX.len()..];
    let valid_chars = "qpzry9x8gf2tvdw0s3jn54khce6mua7l";
    if !payload.chars().all(|c| valid_chars.contains(c)) {
        return Err(RecipientValidationError::InvalidPublicKeyCharacters);
    }

    Ok(())
}

/// Validate and sanitize a recipient label
///
/// - Trims whitespace
/// - Checks length bounds
/// - Rejects dangerous characters
pub fn validate_label(label: &str) -> Result<String, RecipientValidationError> {
    let trimmed = label.trim();

    // Check empty
    if trimmed.is_empty() {
        return Err(RecipientValidationError::LabelEmpty);
    }

    // Check length
    if trimmed.len() > MAX_LABEL_LENGTH {
        return Err(RecipientValidationError::LabelTooLong);
    }

    // Reject dangerous characters (control chars, path separators)
    let forbidden_chars = ['\0', '\n', '\r', '\t', '/', '\\', '<', '>', '|', '"', '\''];
    if trimmed
        .chars()
        .any(|c| forbidden_chars.contains(&c) || c.is_control())
    {
        return Err(RecipientValidationError::LabelInvalidCharacters);
    }

    Ok(trimmed.to_string())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_valid_public_key() {
        // Valid age public key format
        let key = "age1ql3z7hjy54pw3hyww5ayyfg7zqgvc7w3j2elw8zmrj2kg5sfn9aqmcac8p";
        assert!(validate_public_key(key).is_ok());
    }

    #[test]
    fn test_invalid_prefix() {
        let key = "age2ql3z7hjy54pw3hyww5ayyfg7zqgvc7w3j2elw8zmrj2kg5sfn9aqmcac8p";
        assert!(matches!(
            validate_public_key(key),
            Err(RecipientValidationError::InvalidPublicKeyPrefix)
        ));
    }

    #[test]
    fn test_invalid_length() {
        let key = "age1tooshort";
        assert!(matches!(
            validate_public_key(key),
            Err(RecipientValidationError::InvalidPublicKeyLength(_))
        ));
    }

    #[test]
    fn test_invalid_characters() {
        // Contains uppercase which is invalid in Bech32 payload
        let key = "age1QL3Z7HJY54PW3HYWW5AYYFG7ZQGVC7W3J2ELW8ZMRJ2KG5SFN9AQMCAC8P";
        assert!(matches!(
            validate_public_key(key),
            Err(RecipientValidationError::InvalidPublicKeyCharacters)
        ));
    }

    #[test]
    fn test_valid_label() {
        assert_eq!(validate_label("  Alice  ").unwrap(), "Alice");
        assert_eq!(validate_label("Work Team Key").unwrap(), "Work Team Key");
        assert_eq!(
            validate_label("bob@company.com").unwrap(),
            "bob@company.com"
        );
    }

    #[test]
    fn test_empty_label() {
        assert!(matches!(
            validate_label(""),
            Err(RecipientValidationError::LabelEmpty)
        ));
        assert!(matches!(
            validate_label("   "),
            Err(RecipientValidationError::LabelEmpty)
        ));
    }

    #[test]
    fn test_label_too_long() {
        let long_label = "a".repeat(MAX_LABEL_LENGTH + 1);
        assert!(matches!(
            validate_label(&long_label),
            Err(RecipientValidationError::LabelTooLong)
        ));
    }

    #[test]
    fn test_label_invalid_chars() {
        assert!(matches!(
            validate_label("path/separator"),
            Err(RecipientValidationError::LabelInvalidCharacters)
        ));
        assert!(matches!(
            validate_label("has\nnewline"),
            Err(RecipientValidationError::LabelInvalidCharacters)
        ));
    }
}
