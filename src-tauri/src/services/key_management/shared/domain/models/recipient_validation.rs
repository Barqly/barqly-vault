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

/// Age public key prefix (all age keys start with this)
const AGE_PUBLIC_KEY_PREFIX: &str = "age1";

/// Minimum length of an age public key (standard X25519: age1 + 58 chars = 62)
const AGE_PUBLIC_KEY_MIN_LENGTH: usize = 62;

/// Maximum reasonable length for age public keys (plugin keys like age1yubikey1 are 71 chars)
const AGE_PUBLIC_KEY_MAX_LENGTH: usize = 128;

/// Validation errors for recipient entries
#[derive(Debug, Error)]
pub enum RecipientValidationError {
    #[error("Invalid public key format: must start with 'age1'")]
    InvalidPublicKeyPrefix,

    #[error("Invalid public key length: expected 62-128 characters, got {0}")]
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
/// - Standard X25519 keys are 62 characters (age1 + 58 Bech32 chars)
/// - Plugin keys vary: age1yubikey1... is 71 chars, other plugins may differ
/// - Use Bech32 encoding (lowercase alphanumeric, specific charset)
///
/// Supports:
/// - Standard: `age1...` (62 chars)
/// - YubiKey: `age1yubikey1...` (71 chars)
/// - Other plugins: `age1<plugin>1...` (varies)
pub fn validate_public_key(key: &str) -> Result<(), RecipientValidationError> {
    let key = key.trim();

    // Check prefix - all age keys start with "age1"
    if !key.starts_with(AGE_PUBLIC_KEY_PREFIX) {
        return Err(RecipientValidationError::InvalidPublicKeyPrefix);
    }

    // Check length bounds (62 for standard, 71 for YubiKey, allow up to 128 for other plugins)
    if key.len() < AGE_PUBLIC_KEY_MIN_LENGTH || key.len() > AGE_PUBLIC_KEY_MAX_LENGTH {
        return Err(RecipientValidationError::InvalidPublicKeyLength(key.len()));
    }

    // Check characters - must be lowercase alphanumeric
    // Plugin HRPs (like "yubikey") contain letters not in strict Bech32 data charset,
    // so we allow all lowercase letters, digits, and '1' (separator)
    let payload = &key[AGE_PUBLIC_KEY_PREFIX.len()..];
    if !payload
        .chars()
        .all(|c| c.is_ascii_lowercase() || c.is_ascii_digit())
    {
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
    fn test_valid_public_key_standard() {
        // Valid standard age public key (62 chars)
        let key = "age1ql3z7hjy54pw3hyww5ayyfg7zqgvc7w3j2elw8zmrj2kg5sfn9aqmcac8p";
        assert_eq!(key.len(), 62);
        assert!(validate_public_key(key).is_ok());
    }

    #[test]
    fn test_valid_public_key_yubikey() {
        // Valid YubiKey age public key (71 chars)
        let key = "age1yubikey1qgyl9efw5cexsg8ee66jpxglnvfaswhd4zjhntqawagp4zgh064puht4g9l";
        assert_eq!(key.len(), 71);
        assert!(validate_public_key(key).is_ok());
    }

    #[test]
    fn test_valid_public_key_with_whitespace() {
        // Should trim whitespace
        let key = "  age1ql3z7hjy54pw3hyww5ayyfg7zqgvc7w3j2elw8zmrj2kg5sfn9aqmcac8p  ";
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
    fn test_invalid_length_too_short() {
        let key = "age1tooshort";
        assert!(matches!(
            validate_public_key(key),
            Err(RecipientValidationError::InvalidPublicKeyLength(_))
        ));
    }

    #[test]
    fn test_invalid_length_too_long() {
        // 129 chars (over max 128)
        let key = format!("age1{}", "q".repeat(125));
        assert_eq!(key.len(), 129);
        assert!(matches!(
            validate_public_key(&key),
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
