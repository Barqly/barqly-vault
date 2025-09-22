//! Example of secure logging practices
//!
//! This file demonstrates how to properly log sensitive information

use crate::prelude::*;
use zeroize::Zeroize;

/// Example function showing secure PIN handling
pub fn example_pin_logging(pin: &str) {
    // BAD: Never log raw PINs or passwords
    // DON'T DO THIS:
    // debug!("User PIN: {}", pin);

    // GOOD: Use redaction utilities
    debug!(
        pin_redacted = %redact_pin(pin),
        "PIN validation started"
    );

    // GOOD: Use Sensitive wrapper for automatic redaction
    let sensitive_pin = Sensitive::new(pin);
    debug!(
        pin = ?sensitive_pin,
        "Processing authentication"
    );

    // GOOD: Development-only logging (removed in release builds)
    log_sensitive!(dev_only: {
        debug!("Development PIN check: {}", redact_pin(pin));
    });
}

/// Example with secure memory handling
pub fn example_secure_memory() {
    let mut secret_key = String::from("AGE-SECRET-KEY-1234567890");

    // Log redacted version
    info!(
        key = %redact_key(&secret_key),
        "Key loaded"
    );

    // Use the key...
    process_key(&secret_key);

    // IMPORTANT: Zeroize sensitive data when done
    secret_key.zeroize();
    // After zeroize, the memory is overwritten with zeros
}

/// Example showing conditional compilation for sensitive logs
pub fn example_conditional_logging(yubikey_serial: &str) {
    // This provides different output in debug vs release
    #[cfg(debug_assertions)]
    {
        debug!(
            serial = %redact_serial(yubikey_serial),
            "YubiKey detected in debug mode"
        );
    }

    #[cfg(not(debug_assertions))]
    {
        info!("YubiKey detected");
        // No serial logged in production
    }
}

/// Example of structured logging with sensitive fields
pub fn example_structured_logging(user_id: &str, api_key: &str) {
    // Use structured fields with redaction
    info!(
        user_id = %user_id,  // User ID is usually safe to log
        api_key = %Sensitive::new(api_key),  // API keys should always be redacted
        request_id = %uuid::Uuid::new_v4(),
        "API request initiated"
    );
}

fn process_key(_key: &str) {
    // Process the key...
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_redaction() {
        // In tests, we can verify redaction works
        let pin = "123456";
        let redacted = redact_pin(pin);

        #[cfg(debug_assertions)]
        assert_eq!(redacted, "DEFAULT_PIN");

        #[cfg(not(debug_assertions))]
        assert_eq!(redacted, "[REDACTED]");
    }

    #[test]
    fn test_sensitive_wrapper() {
        let secret = Sensitive::new("my-secret-value");
        let formatted = format!("{:?}", secret);
        assert!(!formatted.contains("my-secret-value"));
        assert!(formatted.contains("SENSITIVE") || formatted.contains("REDACTED"));
    }
}