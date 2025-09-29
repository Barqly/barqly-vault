//! YubiKey identity domain object with validation
//!
//! Represents a YubiKey identity (public key recipient) with proper validation.
//! This fixes the critical identity tag bug by centralizing identity operations.

use crate::services::key_management::yubikey::domain::models::serial::Serial;
use serde::{Deserialize, Serialize};
use std::fmt;

/// YubiKey identity with validation and standardized format
#[derive(Debug, Clone, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub struct YubiKeyIdentity {
    /// The age-plugin identity tag (e.g., "AGE-PLUGIN-YUBIKEY-...")
    identity_tag: String,
    /// Associated YubiKey serial number
    serial: Serial,
    /// Age recipient (public key) for encryption (e.g., "age1yubikey1...")
    recipient: String,
    /// Public key (if available)
    public_key: Option<String>,
    /// Slot where the key is stored
    slot: Option<String>,
    /// Algorithm used for the key
    algorithm: Option<String>,
    /// When this identity was created/detected
    created_at: chrono::DateTime<chrono::Utc>,
}

impl YubiKeyIdentity {
    /// Create a new identity with validation
    pub fn new(
        identity_tag: String,
        serial: Serial,
        recipient: String,
    ) -> Result<Self, IdentityValidationError> {
        if identity_tag.is_empty() {
            return Err(IdentityValidationError::EmptyTag);
        }

        if !identity_tag.starts_with("AGE-PLUGIN-YUBIKEY-") {
            return Err(IdentityValidationError::InvalidTagFormat {
                tag: identity_tag.clone(),
                expected: "AGE-PLUGIN-YUBIKEY-...".to_string(),
            });
        }

        // Basic length validation for age identity
        if identity_tag.len() < 20 {
            return Err(IdentityValidationError::TagTooShort {
                actual: identity_tag.len(),
                minimum: 20,
            });
        }

        Ok(Self {
            identity_tag,
            serial,
            recipient,
            public_key: None,
            slot: None,
            algorithm: None,
            created_at: chrono::Utc::now(),
        })
    }

    /// Create from age-plugin-yubikey output
    pub fn from_age_plugin_output(
        identity_tag: String,
        serial: Serial,
        recipient: String,
        slot: Option<String>,
    ) -> Result<Self, IdentityValidationError> {
        let mut identity = Self::new(identity_tag, serial, recipient)?;
        identity.slot = slot;
        Ok(identity)
    }

    /// Create builder for step-by-step construction
    pub fn builder(identity_tag: String, serial: Serial) -> IdentityBuilder {
        IdentityBuilder::new(identity_tag, serial)
    }

    /// Get the identity tag
    pub fn identity_tag(&self) -> &str {
        &self.identity_tag
    }

    /// Get the associated serial number
    pub fn serial(&self) -> &Serial {
        &self.serial
    }

    /// Get redacted serial for logging
    pub fn serial_redacted(&self) -> String {
        self.serial.redacted()
    }

    /// Get public key if available
    pub fn public_key(&self) -> Option<&str> {
        self.public_key.as_deref()
    }

    /// Get slot information
    pub fn slot(&self) -> Option<&str> {
        self.slot.as_deref()
    }

    /// Get algorithm information
    pub fn algorithm(&self) -> Option<&str> {
        self.algorithm.as_deref()
    }

    /// When this identity was created
    pub fn created_at(&self) -> chrono::DateTime<chrono::Utc> {
        self.created_at
    }

    /// Update public key
    pub fn set_public_key(&mut self, public_key: String) {
        self.public_key = Some(public_key);
    }

    /// Update slot information
    pub fn set_slot(&mut self, slot: String) {
        self.slot = Some(slot);
    }

    /// Update algorithm information
    pub fn set_algorithm(&mut self, algorithm: String) {
        self.algorithm = Some(algorithm);
    }

    /// Check if identity matches a serial number
    pub fn matches_serial(&self, serial: &Serial) -> bool {
        self.serial == *serial
    }

    /// Check if identity matches a pattern
    pub fn matches_pattern(&self, pattern: &str) -> bool {
        self.identity_tag.contains(pattern) || self.serial.matches_pattern(pattern)
    }

    /// Extract recipient string for age encryption
    /// Note: Identity tags (AGE-PLUGIN-YUBIKEY-...) are different from recipients (age1yubikey1...)
    /// This method returns the proper recipient format for encryption operations
    pub fn to_recipient(&self) -> String {
        self.recipient.clone()
    }

    /// Create a redacted version for logging
    pub fn redacted(&self) -> RedactedIdentity {
        RedactedIdentity {
            identity_tag_prefix: self.identity_tag.chars().take(15).collect(),
            serial_redacted: self.serial.redacted(),
            slot: self.slot.clone(),
            algorithm: self.algorithm.clone(),
            created_at: self.created_at,
        }
    }

    /// Validate that the identity tag matches expected format
    pub fn validate_format(&self) -> Result<(), IdentityValidationError> {
        if !self.identity_tag.starts_with("AGE-PLUGIN-YUBIKEY-") {
            return Err(IdentityValidationError::InvalidTagFormat {
                tag: self.identity_tag.clone(),
                expected: "AGE-PLUGIN-YUBIKEY-...".to_string(),
            });
        }

        if self.identity_tag.len() < 20 {
            return Err(IdentityValidationError::TagTooShort {
                actual: self.identity_tag.len(),
                minimum: 20,
            });
        }

        Ok(())
    }

    /// Get a unique identifier for this identity
    pub fn unique_id(&self) -> String {
        // Use full identity tag to ensure uniqueness
        format!("{}:{}", self.serial.value(), self.identity_tag)
    }
}

impl fmt::Display for YubiKeyIdentity {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(
            f,
            "YubiKey Identity {} (Serial: {})",
            &self.identity_tag[..15.min(self.identity_tag.len())],
            self.serial.redacted()
        )
    }
}

/// Builder for constructing YubiKey identities
pub struct IdentityBuilder {
    identity_tag: String,
    serial: Serial,
    recipient: Option<String>,
    public_key: Option<String>,
    slot: Option<String>,
    algorithm: Option<String>,
}

impl IdentityBuilder {
    /// Create new builder
    pub fn new(identity_tag: String, serial: Serial) -> Self {
        Self {
            identity_tag,
            serial,
            recipient: None,
            public_key: None,
            slot: None,
            algorithm: None,
        }
    }

    /// Set recipient
    pub fn recipient(mut self, recipient: String) -> Self {
        self.recipient = Some(recipient);
        self
    }

    /// Set public key
    pub fn public_key(mut self, public_key: String) -> Self {
        self.public_key = Some(public_key);
        self
    }

    /// Set slot
    pub fn slot(mut self, slot: String) -> Self {
        self.slot = Some(slot);
        self
    }

    /// Set algorithm
    pub fn algorithm(mut self, algorithm: String) -> Self {
        self.algorithm = Some(algorithm);
        self
    }

    /// Build the identity
    pub fn build(self) -> Result<YubiKeyIdentity, IdentityValidationError> {
        let recipient = self
            .recipient
            .ok_or(IdentityValidationError::InvalidTagFormat {
                tag: "missing recipient".to_string(),
                expected: "recipient must be set on builder".to_string(),
            })?;
        let mut identity = YubiKeyIdentity::new(self.identity_tag, self.serial, recipient)?;
        identity.public_key = self.public_key;
        identity.slot = self.slot;
        identity.algorithm = self.algorithm;
        Ok(identity)
    }
}

/// Redacted identity for safe logging
#[derive(Debug, Clone, Serialize)]
pub struct RedactedIdentity {
    pub identity_tag_prefix: String,
    pub serial_redacted: String,
    pub slot: Option<String>,
    pub algorithm: Option<String>,
    pub created_at: chrono::DateTime<chrono::Utc>,
}

/// Identity validation errors
#[derive(Debug, thiserror::Error)]
pub enum IdentityValidationError {
    #[error("Identity tag cannot be empty")]
    EmptyTag,

    #[error("Invalid identity tag format: '{tag}' (expected {expected})")]
    InvalidTagFormat { tag: String, expected: String },

    #[error("Identity tag too short: {actual} characters (minimum {minimum})")]
    TagTooShort { actual: usize, minimum: usize },

    #[error("Serial number validation failed: {source}")]
    SerialValidation {
        #[from]
        source:
            crate::services::key_management::yubikey::domain::models::serial::SerialValidationError,
    },
}

/// Utility functions for identity operations
pub mod identity_utils {
    use super::*;

    /// Extract serial from age identity tag if possible
    pub fn extract_serial_from_tag(_tag: &str) -> Option<String> {
        // This is a placeholder - actual implementation would need to
        // understand the age1yubikey format to extract embedded serial
        // For now, this would require external tooling
        None
    }

    /// Validate multiple identities for uniqueness
    pub fn validate_unique_identities(identities: &[YubiKeyIdentity]) -> Result<(), String> {
        let mut seen_ids = std::collections::HashSet::new();

        for identity in identities {
            let unique_id = identity.unique_id();
            if seen_ids.contains(&unique_id) {
                return Err(format!("Duplicate identity found: {}", unique_id));
            }
            seen_ids.insert(unique_id);
        }

        Ok(())
    }

    /// Filter identities by serial
    pub fn filter_by_serial<'a>(
        identities: &'a [YubiKeyIdentity],
        serial: &Serial,
    ) -> Vec<&'a YubiKeyIdentity> {
        identities
            .iter()
            .filter(|identity| identity.matches_serial(serial))
            .collect()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::services::key_management::yubikey::domain::models::serial::Serial;

    fn create_test_serial() -> Serial {
        Serial::new("12345678".to_string()).unwrap()
    }

    fn create_test_identity_tag() -> String {
        "AGE-PLUGIN-YUBIKEY-1UW4LYQYZ4MY7A9QE49USK".to_string()
    }

    #[test]
    fn test_identity_creation() {
        let serial = create_test_serial();
        let tag = create_test_identity_tag();

        let identity = YubiKeyIdentity::new(
            tag.clone(),
            serial.clone(),
            "age1yubikey1test123".to_string(),
        )
        .unwrap();

        assert_eq!(identity.identity_tag(), &tag);
        assert_eq!(identity.serial(), &serial);
        assert!(identity.public_key().is_none());
        assert!(identity.slot().is_none());
    }

    #[test]
    fn test_identity_validation() {
        let serial = create_test_serial();

        // Empty tag
        assert!(matches!(
            YubiKeyIdentity::new(
                "".to_string(),
                serial.clone(),
                "age1yubikey1test123".to_string()
            ),
            Err(IdentityValidationError::EmptyTag)
        ));

        // Wrong prefix
        assert!(matches!(
            YubiKeyIdentity::new(
                "invalid_prefix123".to_string(),
                serial.clone(),
                "age1yubikey1test123".to_string()
            ),
            Err(IdentityValidationError::InvalidTagFormat { .. })
        ));

        // Too short
        assert!(matches!(
            YubiKeyIdentity::new(
                "AGE-PLUGIN-YUBIKEY-".to_string(),
                serial.clone(),
                "age1yubikey1test123".to_string()
            ),
            Err(IdentityValidationError::TagTooShort { .. })
        ));

        // Valid
        let tag = create_test_identity_tag();
        assert!(YubiKeyIdentity::new(tag, serial, "age1yubikey1test123".to_string()).is_ok());
    }

    #[test]
    fn test_from_age_plugin_output() {
        let serial = create_test_serial();
        let tag = create_test_identity_tag();

        let identity = YubiKeyIdentity::from_age_plugin_output(
            tag.clone(),
            serial.clone(),
            "age1yubikey1test123".to_string(),
            Some("9a".to_string()),
        )
        .unwrap();

        assert_eq!(identity.identity_tag(), &tag);
        assert_eq!(identity.slot(), Some("9a"));
    }

    #[test]
    fn test_identity_builder() {
        let serial = create_test_serial();
        let tag = create_test_identity_tag();

        let identity = YubiKeyIdentity::builder(tag.clone(), serial.clone())
            .recipient("age1yubikey1test123".to_string())
            .public_key("public_key_data".to_string())
            .slot("9a".to_string())
            .algorithm("ECCP256".to_string())
            .build()
            .unwrap();

        assert_eq!(identity.identity_tag(), &tag);
        assert_eq!(identity.public_key(), Some("public_key_data"));
        assert_eq!(identity.slot(), Some("9a"));
        assert_eq!(identity.algorithm(), Some("ECCP256"));
    }

    #[test]
    fn test_identity_matching() {
        let serial1 = create_test_serial();
        let serial2 = Serial::new("87654321".to_string()).unwrap();
        let tag = create_test_identity_tag();

        let identity =
            YubiKeyIdentity::new(tag, serial1.clone(), "age1yubikey1test123".to_string()).unwrap();

        assert!(identity.matches_serial(&serial1));
        assert!(!identity.matches_serial(&serial2));

        assert!(identity.matches_pattern("AGE-PLUGIN-YUBIKEY"));
        assert!(identity.matches_pattern("1234")); // Matches serial
        assert!(!identity.matches_pattern("nonexistent"));
    }

    #[test]
    fn test_to_recipient() {
        let serial = create_test_serial();
        let tag = create_test_identity_tag();

        let identity =
            YubiKeyIdentity::new(tag.clone(), serial, "age1yubikey1test123".to_string()).unwrap();

        // to_recipient returns the recipient field (the age1yubikey... string)
        assert_eq!(identity.to_recipient(), "age1yubikey1test123");
    }

    #[test]
    fn test_redacted_identity() {
        let serial = create_test_serial();
        let tag = create_test_identity_tag();

        let identity =
            YubiKeyIdentity::new(tag.clone(), serial, "age1yubikey1test456".to_string()).unwrap();
        let redacted = identity.redacted();

        assert_eq!(redacted.identity_tag_prefix, "AGE-PLUGIN-YUBI");
        assert!(redacted.serial_redacted.contains("***"));
        assert!(!redacted.serial_redacted.contains("12345678"));
    }

    #[test]
    fn test_unique_id() {
        let serial = create_test_serial();
        let tag1 = "AGE-PLUGIN-YUBIKEY-1UW4LYQYZ4MY7A9QE49USK1".to_string();
        let tag2 = "AGE-PLUGIN-YUBIKEY-1UW4LYQYZ4MY7A9QE49USK2".to_string();

        let identity1 =
            YubiKeyIdentity::new(tag1, serial.clone(), "age1yubikey1test123".to_string()).unwrap();
        let identity2 =
            YubiKeyIdentity::new(tag2, serial.clone(), "age1yubikey1test456".to_string()).unwrap();

        // Different tags with same serial should have same unique_id prefix
        let id1 = identity1.unique_id();
        let id2 = identity2.unique_id();

        assert!(id1.starts_with("12345678:"));
        assert!(id2.starts_with("12345678:"));
        assert_ne!(id1, id2); // But should be different due to tag difference
    }

    #[test]
    fn test_display() {
        let serial = create_test_serial();
        let tag = create_test_identity_tag();

        let identity =
            YubiKeyIdentity::new(tag, serial, "age1yubikey1test789".to_string()).unwrap();
        let display_str = format!("{}", identity);

        assert!(display_str.contains("YubiKey Identity"));
        assert!(display_str.contains("AGE-PLUGIN-YUBI"));
        assert!(display_str.contains("***"));
    }

    #[test]
    fn test_identity_utils() {
        let serial1 = create_test_serial();
        let serial2 = Serial::new("87654321".to_string()).unwrap();
        let tag1 = create_test_identity_tag();
        let tag2 = "AGE-PLUGIN-YUBIKEY-DIFFERENT_TAG_HERE_ABC".to_string();

        let identity1 =
            YubiKeyIdentity::new(tag1, serial1.clone(), "age1yubikey1test123".to_string()).unwrap();
        let identity2 =
            YubiKeyIdentity::new(tag2, serial2.clone(), "age1yubikey1test456".to_string()).unwrap();

        let identities = vec![identity1.clone(), identity2.clone()];

        // Test uniqueness validation
        assert!(identity_utils::validate_unique_identities(&identities).is_ok());

        // Test filtering by serial
        let filtered = identity_utils::filter_by_serial(&identities, &serial1);
        assert_eq!(filtered.len(), 1);
        assert_eq!(filtered[0], &identity1);

        let filtered = identity_utils::filter_by_serial(&identities, &serial2);
        assert_eq!(filtered.len(), 1);
        assert_eq!(filtered[0], &identity2);
    }

    #[test]
    fn test_serialization() {
        let serial = create_test_serial();
        let tag = create_test_identity_tag();

        let identity = YubiKeyIdentity::builder(tag, serial)
            .recipient("age1yubikey1test123".to_string())
            .public_key("test_key".to_string())
            .slot("9a".to_string())
            .build()
            .unwrap();

        let json = serde_json::to_string(&identity).unwrap();
        let deserialized: YubiKeyIdentity = serde_json::from_str(&json).unwrap();

        assert_eq!(identity.identity_tag(), deserialized.identity_tag());
        assert_eq!(identity.serial(), deserialized.serial());
        assert_eq!(identity.public_key(), deserialized.public_key());
        assert_eq!(identity.slot(), deserialized.slot());
    }
}
