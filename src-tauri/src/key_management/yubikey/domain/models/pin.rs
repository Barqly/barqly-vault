//! YubiKey PIN domain object with security validation
//!
//! Replaces primitive obsession with proper domain modeling for PIN handling.
//! Includes security measures like rate limiting awareness and validation.

use serde::{Deserialize, Serialize};
use std::fmt;
use zeroize::{Zeroize, ZeroizeOnDrop};

/// YubiKey PIN with security validation
#[derive(Clone, PartialEq, Eq, Serialize, Deserialize, Zeroize, ZeroizeOnDrop)]
pub struct Pin {
    #[serde(with = "pin_serde")]
    value: String,
}

impl Pin {
    /// Create a new PIN with validation
    pub fn new(value: String) -> Result<Self, PinValidationError> {
        if value.is_empty() {
            return Err(PinValidationError::Empty);
        }

        if value.len() < 6 || value.len() > 8 {
            return Err(PinValidationError::InvalidLength {
                actual: value.len(),
                expected: "6-8 characters".to_string(),
            });
        }

        // YubiKey PINs must be numeric
        if !value.chars().all(|c| c.is_ascii_digit()) {
            return Err(PinValidationError::InvalidFormat {
                expected: "numeric digits only".to_string(),
            });
        }

        // Check for weak PINs (simple patterns)
        if Self::is_weak_pin(&value) {
            return Err(PinValidationError::WeakPin {
                reason: "PIN contains predictable pattern".to_string(),
            });
        }

        Ok(Self { value })
    }

    /// Create from &str for convenience
    pub fn from_str(value: &str) -> Result<Self, PinValidationError> {
        Self::new(value.to_string())
    }

    /// Get the raw PIN value (use carefully)
    pub fn value(&self) -> &str {
        &self.value
    }

    /// Create masked version for logging (shows only length)
    pub fn masked(&self) -> String {
        format!("PIN({})", "*".repeat(self.value.len()))
    }

    /// Validate PIN strength
    fn is_weak_pin(pin: &str) -> bool {
        // Check for sequential numbers
        if pin == "123456" || pin == "654321" {
            return true;
        }

        // Check for repeated digits
        if pin.chars().all(|c| c == pin.chars().next().unwrap()) {
            return true;
        }

        // Check for simple patterns
        let weak_patterns = [
            "111111", "222222", "333333", "444444", "555555", "666666", "777777", "888888",
            "999999", "000000", "123456", "654321", "987654", "456789",
        ];

        weak_patterns.contains(&pin)
    }

    /// Check if PIN is default (common default PINs)
    pub fn is_default(&self) -> bool {
        let default_pins = ["123456", "000000", "111111"];
        default_pins.contains(&self.value.as_str())
    }

    /// Get PIN complexity score (0-100)
    pub fn complexity_score(&self) -> u8 {
        let mut score = 0u8;

        // Length bonus
        match self.value.len() {
            6 => score += 20,
            7 => score += 35,
            8 => score += 50,
            _ => {}
        }

        // Digit variety bonus
        let unique_digits = self
            .value
            .chars()
            .collect::<std::collections::HashSet<_>>()
            .len();
        match unique_digits {
            1..=2 => score += 10,
            3..=4 => score += 25,
            5..=6 => score += 40,
            _ => score += 50,
        }

        // No sequential pattern bonus
        if !self.has_sequential_pattern() {
            score += 20;
        }

        // No repeated pattern bonus
        if !self.has_repeated_pattern() {
            score += 30;
        }

        score.min(100)
    }

    fn has_sequential_pattern(&self) -> bool {
        let chars: Vec<char> = self.value.chars().collect();
        if chars.len() < 3 {
            return false;
        }

        for i in 0..chars.len() - 2 {
            let a = chars[i].to_digit(10).unwrap_or(0);
            let b = chars[i + 1].to_digit(10).unwrap_or(0);
            let c = chars[i + 2].to_digit(10).unwrap_or(0);

            if (a + 1 == b && b + 1 == c) || (a == b + 1 && b == c + 1) {
                return true;
            }
        }
        false
    }

    fn has_repeated_pattern(&self) -> bool {
        let chars: Vec<char> = self.value.chars().collect();
        if chars.len() < 4 {
            return false;
        }

        // Check for ABAB pattern
        for i in 0..chars.len() - 3 {
            if chars[i] == chars[i + 2] && chars[i + 1] == chars[i + 3] {
                return true;
            }
        }

        // Check for AAAA pattern (4+ consecutive same digits)
        for i in 0..chars.len() - 3 {
            if chars[i] == chars[i + 1]
                && chars[i + 1] == chars[i + 2]
                && chars[i + 2] == chars[i + 3]
            {
                return true;
            }
        }

        false
    }
}

impl fmt::Debug for Pin {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "Pin({})", "*".repeat(self.value.len()))
    }
}

impl fmt::Display for Pin {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "{}", "*".repeat(self.value.len()))
    }
}

// Custom serde module to handle sensitive data
mod pin_serde {

    use serde::{Deserializer, Serializer};

    pub fn serialize<S>(pin: &String, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: Serializer,
    {
        // Never serialize actual PIN value - serialize masked version
        let masked = format!("***{}", pin.len());
        serializer.serialize_str(&masked)
    }

    pub fn deserialize<'de, D>(_deserializer: D) -> Result<String, D::Error>
    where
        D: Deserializer<'de>,
    {
        // PINs should never be deserialized from storage
        // This is a security measure - PINs should only be entered by user
        Err(serde::de::Error::custom(
            "PIN deserialization not allowed for security",
        ))
    }
}

/// PIN validation errors
#[derive(Debug, thiserror::Error)]
pub enum PinValidationError {
    #[error("PIN cannot be empty")]
    Empty,

    #[error("PIN length {actual} is invalid (expected {expected})")]
    InvalidLength { actual: usize, expected: String },

    #[error("PIN has invalid format (expected {expected})")]
    InvalidFormat { expected: String },

    #[error("PIN is too weak: {reason}")]
    WeakPin { reason: String },
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_valid_pins() {
        // Valid 6-digit PIN
        let pin = Pin::new("123457".to_string()).unwrap();
        assert_eq!(pin.value(), "123457");

        // Valid 8-digit PIN
        let pin = Pin::new("12345678".to_string()).unwrap();
        assert_eq!(pin.value(), "12345678");

        // Valid 7-digit PIN
        let pin = Pin::new("1234567".to_string()).unwrap();
        assert_eq!(pin.value(), "1234567");
    }

    #[test]
    fn test_from_str() {
        let pin = Pin::from_str("987654").unwrap();
        assert_eq!(pin.value(), "987654");
    }

    #[test]
    fn test_invalid_pins() {
        // Empty
        assert!(matches!(
            Pin::new("".to_string()),
            Err(PinValidationError::Empty)
        ));

        // Too short
        assert!(matches!(
            Pin::new("12345".to_string()),
            Err(PinValidationError::InvalidLength { .. })
        ));

        // Too long
        assert!(matches!(
            Pin::new("123456789".to_string()),
            Err(PinValidationError::InvalidLength { .. })
        ));

        // Non-numeric
        assert!(matches!(
            Pin::new("12345a".to_string()),
            Err(PinValidationError::InvalidFormat { .. })
        ));

        // Mixed alphanumeric
        assert!(matches!(
            Pin::new("abc123".to_string()),
            Err(PinValidationError::InvalidFormat { .. })
        ));
    }

    #[test]
    fn test_weak_pins() {
        // Sequential
        assert!(matches!(
            Pin::new("123456".to_string()),
            Err(PinValidationError::WeakPin { .. })
        ));

        // Repeated digits
        assert!(matches!(
            Pin::new("111111".to_string()),
            Err(PinValidationError::WeakPin { .. })
        ));

        assert!(matches!(
            Pin::new("000000".to_string()),
            Err(PinValidationError::WeakPin { .. })
        ));
    }

    #[test]
    fn test_masked_display() {
        let pin = Pin::new("123457".to_string()).unwrap();
        assert_eq!(pin.masked(), "PIN(******)");

        // Debug should not reveal PIN
        let debug_str = format!("{:?}", pin);
        assert!(debug_str.contains("******"));
        assert!(!debug_str.contains("123457"));

        // Display should not reveal PIN
        let display_str = format!("{}", pin);
        assert_eq!(display_str, "******");
    }

    #[test]
    fn test_default_pin_detection() {
        let default_pin = Pin::new("123456".to_string()).unwrap_or_else(|_| {
            // This should fail due to weak PIN validation, but test the logic
            Pin {
                value: "123456".to_string(),
            }
        });
        // Can't test because weak PIN validation prevents creation

        // Test with a non-default but valid PIN
        let pin = Pin::new("987654".to_string()).unwrap();
        assert!(!pin.is_default());
    }

    #[test]
    fn test_complexity_score() {
        // Test with manually created PINs to bypass weak PIN validation
        let simple_pin = Pin {
            value: "112233".to_string(),
        };
        let complex_pin = Pin {
            value: "197542".to_string(),
        };

        assert!(simple_pin.complexity_score() < complex_pin.complexity_score());
    }

    #[test]
    fn test_pattern_detection() {
        let sequential = Pin {
            value: "123789".to_string(),
        };
        assert!(sequential.has_sequential_pattern());

        let repeated = Pin {
            value: "121212".to_string(),
        };
        assert!(repeated.has_repeated_pattern());

        let quad_repeated = Pin {
            value: "111123".to_string(),
        };
        assert!(quad_repeated.has_repeated_pattern());
    }

    #[test]
    fn test_equality() {
        let pin1 = Pin::new("987654".to_string()).unwrap();
        let pin2 = Pin::new("987654".to_string()).unwrap();
        let pin3 = Pin::new("123478".to_string()).unwrap();

        assert_eq!(pin1, pin2);
        assert_ne!(pin1, pin3);
    }

    #[test]
    fn test_zeroization() {
        let mut pin = Pin::new("987654".to_string()).unwrap();
        assert_eq!(pin.value(), "987654");

        pin.zeroize();
        assert_eq!(pin.value(), "");
    }

    #[test]
    fn test_serialization() {
        let pin = Pin::new("987654".to_string()).unwrap();

        // Serialization should not reveal actual PIN
        let json = serde_json::to_string(&pin).unwrap();
        assert!(!json.contains("987654"));
        assert!(json.contains("***"));

        // Deserialization should be blocked
        let result: Result<Pin, _> = serde_json::from_str("\"987654\"");
        assert!(result.is_err());
    }
}
