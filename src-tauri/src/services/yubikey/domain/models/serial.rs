//! YubiKey serial number domain object with validation
//!
//! Replaces primitive obsession with proper domain modeling.

use serde::{Deserialize, Serialize};
use std::fmt;

/// YubiKey serial number with validation
#[derive(Debug, Clone, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub struct Serial(String);

impl Serial {
    /// Create a new serial number with validation
    pub fn new(value: String) -> Result<Self, SerialValidationError> {
        if value.is_empty() {
            return Err(SerialValidationError::Empty);
        }

        if value.len() < 8 || value.len() > 12 {
            return Err(SerialValidationError::InvalidLength {
                actual: value.len(),
                expected: "8-12 characters".to_string(),
            });
        }

        if !value.chars().all(|c| c.is_ascii_digit()) {
            return Err(SerialValidationError::InvalidFormat {
                value: value.clone(),
                expected: "numeric digits only".to_string(),
            });
        }

        Ok(Self(value))
    }

    /// Create from &str for convenience
    #[allow(clippy::should_implement_trait)]
    pub fn from_str(value: &str) -> Result<Self, SerialValidationError> {
        Self::new(value.to_string())
    }

    /// Get the raw serial value
    pub fn value(&self) -> &str {
        &self.0
    }

    /// Create redacted version for logging (shows only last 4 digits)
    pub fn redacted(&self) -> String {
        let len = self.0.len();
        if len <= 4 {
            "*".repeat(len)
        } else {
            format!("***{}", &self.0[len.saturating_sub(4)..])
        }
    }

    /// Check if serial matches pattern (for testing)
    pub fn matches_pattern(&self, pattern: &str) -> bool {
        // Simple pattern matching for now
        self.0.contains(pattern)
    }
}

impl fmt::Display for Serial {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "{}", self.0)
    }
}

impl From<Serial> for String {
    fn from(serial: Serial) -> Self {
        serial.0
    }
}

/// Serial number validation errors
#[derive(Debug, thiserror::Error)]
pub enum SerialValidationError {
    #[error("Serial number cannot be empty")]
    Empty,

    #[error("Serial number length {actual} is invalid (expected {expected})")]
    InvalidLength { actual: usize, expected: String },

    #[error("Serial number '{value}' has invalid format (expected {expected})")]
    InvalidFormat { value: String, expected: String },
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_valid_serials() {
        // Valid 8-digit serial
        let serial = Serial::new("12345678".to_string()).unwrap();
        assert_eq!(serial.value(), "12345678");
        assert_eq!(serial.to_string(), "12345678");

        // Valid 10-digit serial (common length)
        let serial = Serial::new("1234567890".to_string()).unwrap();
        assert_eq!(serial.value(), "1234567890");

        // Valid 12-digit serial (max length)
        let serial = Serial::new("123456789012".to_string()).unwrap();
        assert_eq!(serial.value(), "123456789012");
    }

    #[test]
    fn test_from_str() {
        let serial = Serial::from_str("31310420").unwrap();
        assert_eq!(serial.value(), "31310420");
    }

    #[test]
    fn test_invalid_serials() {
        // Empty
        assert!(matches!(
            Serial::new("".to_string()),
            Err(SerialValidationError::Empty)
        ));

        // Too short
        assert!(matches!(
            Serial::new("1234567".to_string()),
            Err(SerialValidationError::InvalidLength { .. })
        ));

        // Too long
        assert!(matches!(
            Serial::new("1234567890123".to_string()),
            Err(SerialValidationError::InvalidLength { .. })
        ));

        // Non-numeric
        assert!(matches!(
            Serial::new("1234abcd".to_string()),
            Err(SerialValidationError::InvalidFormat { .. })
        ));

        // Mixed alphanumeric
        assert!(matches!(
            Serial::new("12345abc".to_string()),
            Err(SerialValidationError::InvalidFormat { .. })
        ));
    }

    #[test]
    fn test_redacted() {
        // Short serial (all redacted)
        let serial = Serial::new("12345678".to_string()).unwrap();
        assert_eq!(serial.redacted(), "***5678");

        // Long serial (shows last 4)
        let serial = Serial::new("1234567890".to_string()).unwrap();
        assert_eq!(serial.redacted(), "***7890");

        // Very short (all stars)
        let _serial = Serial::new("1234".to_string());
        // This would fail validation, but if it existed:
        // assert_eq!(serial.redacted(), "****");
    }

    #[test]
    fn test_equality_and_hash() {
        let serial1 = Serial::new("31310420".to_string()).unwrap();
        let serial2 = Serial::new("31310420".to_string()).unwrap();
        let serial3 = Serial::new("12345678".to_string()).unwrap();

        assert_eq!(serial1, serial2);
        assert_ne!(serial1, serial3);

        // Can be used as HashMap key
        use std::collections::HashMap;
        let mut map = HashMap::new();
        map.insert(serial1.clone(), "YubiKey 1");
        assert_eq!(map.get(&serial2), Some(&"YubiKey 1"));
    }

    #[test]
    fn test_pattern_matching() {
        let serial = Serial::new("31310420".to_string()).unwrap();

        assert!(serial.matches_pattern("3131"));
        assert!(serial.matches_pattern("0420"));
        assert!(!serial.matches_pattern("9999"));
    }

    #[test]
    fn test_serialization() {
        let serial = Serial::new("31310420".to_string()).unwrap();

        // Test JSON serialization
        let json = serde_json::to_string(&serial).unwrap();
        assert_eq!(json, "\"31310420\"");

        let deserialized: Serial = serde_json::from_str(&json).unwrap();
        assert_eq!(serial, deserialized);
    }

    #[test]
    fn test_conversion() {
        let serial = Serial::new("31310420".to_string()).unwrap();
        let string_value: String = serial.into();
        assert_eq!(string_value, "31310420");
    }
}
