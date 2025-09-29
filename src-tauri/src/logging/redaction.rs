//! Sensitive data redaction for logging
//!
//! This module provides utilities to automatically redact sensitive information
//! from logs to prevent accidental exposure of secrets.

use serde::{Serialize, Serializer};
use std::fmt;

/// Wrapper type for sensitive strings that should be redacted in logs
#[derive(Clone)]
pub struct Sensitive<T>(pub T);

impl<T> Sensitive<T> {
    pub fn new(value: T) -> Self {
        Sensitive(value)
    }

    /// Get the inner value (use with caution)
    pub fn inner(&self) -> &T {
        &self.0
    }

    /// Consume and return the inner value
    pub fn into_inner(self) -> T {
        self.0
    }
}

impl<T> fmt::Debug for Sensitive<T> {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        #[cfg(debug_assertions)]
        {
            // In debug mode, show partial value for debugging
            write!(f, "[SENSITIVE:***]")
        }
        #[cfg(not(debug_assertions))]
        {
            // In release mode, fully redact
            write!(f, "[REDACTED]")
        }
    }
}

impl<T> fmt::Display for Sensitive<T> {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "[REDACTED]")
    }
}

impl<T: Serialize> Serialize for Sensitive<T> {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: Serializer,
    {
        serializer.serialize_str("[REDACTED]")
    }
}

/// Macro to log sensitive data safely
#[macro_export]
macro_rules! log_sensitive {
    // Development-only logging that will be compile-time removed in release
    (dev_only: $($arg:tt)*) => {
        #[cfg(debug_assertions)]
        {
            $($arg)*
        }
    };

    // Redacted logging that shows in both dev and release
    (redacted: $field:expr) => {
        $crate::tracing_setup::redaction::Sensitive::new($field)
    };
}

/// Helper function to redact PINs
pub fn redact_pin(pin: &str) -> String {
    #[cfg(debug_assertions)]
    {
        if pin == "123456" {
            "DEFAULT_PIN".to_string()
        } else {
            format!("CUSTOM_PIN[len={}]", pin.len())
        }
    }
    #[cfg(not(debug_assertions))]
    {
        "[REDACTED]".to_string()
    }
}

/// Helper function to redact keys
pub fn redact_key(key: &str) -> String {
    #[cfg(debug_assertions)]
    {
        if key.len() > 8 {
            format!("{}...{}", &key[..4], &key[key.len() - 4..])
        } else {
            "[KEY]".to_string()
        }
    }
    #[cfg(not(debug_assertions))]
    {
        "[REDACTED]".to_string()
    }
}

/// Helper to partially show serials for debugging
pub fn redact_serial(serial: &str) -> String {
    #[cfg(debug_assertions)]
    {
        if serial.len() > 4 {
            format!("***{}", &serial[serial.len() - 4..])
        } else {
            "***".to_string()
        }
    }
    #[cfg(not(debug_assertions))]
    {
        "[REDACTED]".to_string()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_sensitive_debug() {
        let sensitive = Sensitive::new("secret_password");
        let debug_str = format!("{sensitive:?}");
        assert!(debug_str.contains("SENSITIVE") || debug_str.contains("REDACTED"));
    }

    #[test]
    fn test_sensitive_display() {
        let sensitive = Sensitive::new("secret_password");
        let display_str = format!("{sensitive}");
        assert_eq!(display_str, "[REDACTED]");
    }

    #[test]
    fn test_redact_pin() {
        let default = redact_pin("123456");
        let custom = redact_pin("999999");

        #[cfg(debug_assertions)]
        {
            assert_eq!(default, "DEFAULT_PIN");
            assert_eq!(custom, "CUSTOM_PIN[len=6]");
        }
        #[cfg(not(debug_assertions))]
        {
            assert_eq!(default, "[REDACTED]");
            assert_eq!(custom, "[REDACTED]");
        }
    }
}
