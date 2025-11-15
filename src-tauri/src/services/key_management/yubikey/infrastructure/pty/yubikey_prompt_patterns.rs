/// YubiKey Prompt Pattern Detection
///
/// Common prompt detection patterns for age CLI and age-plugin-yubikey operations.
/// Used across all PTY-based YubiKey operations (key generation, decryption, etc.)
/// to ensure consistent behavior across platforms.
/// Check if output line indicates a PIN prompt
///
/// Detects various PIN prompt formats from age-plugin-yubikey and age CLI.
/// Patterns are platform-agnostic and work on macOS, Linux, and Windows.
pub fn is_pin_prompt(line: &str) -> bool {
    line.contains("Enter PIN") || line.contains("PIN:") || line.contains("PIN for")
}

/// Check if output line indicates a touch/tap prompt
///
/// Detects touch prompts with platform-specific variations:
/// - macOS/Linux: "Touch your", "Please touch", emoji
/// - Windows: "waiting on yubikey plugin" (age CLI specific message)
pub fn is_touch_prompt(line: &str) -> bool {
    // macOS/Linux patterns:
    line.contains("Please touch")
        || line.contains("Touch your")
        || line.contains("👆")
        || line.contains("touch")
        // Windows-specific pattern (age CLI):
        || line.contains("waiting on") // "age: waiting on yubikey plugin..."
}

/// Check if output line indicates an error condition
///
/// Detects errors from age CLI, age-plugin-yubikey, or ykman.
/// Case-insensitive patterns cover various error formats.
pub fn is_error_output(line: &str) -> bool {
    line.contains("error")
        || line.contains("failed")
        || line.contains("Error")
        || line.contains("Failed")
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_pin_prompt_detection() {
        assert!(is_pin_prompt("Enter PIN for YubiKey"));
        assert!(is_pin_prompt("PIN: "));
        assert!(is_pin_prompt("PIN for slot 1"));
        assert!(!is_pin_prompt("Some other message"));
    }

    #[test]
    fn test_touch_prompt_detection() {
        // macOS/Linux patterns
        assert!(is_touch_prompt("Please touch your YubiKey"));
        assert!(is_touch_prompt("Touch your YubiKey"));
        assert!(is_touch_prompt("👆 Tap your device"));
        assert!(is_touch_prompt("Please touch the device"));

        // Windows pattern
        assert!(is_touch_prompt("age: waiting on yubikey plugin..."));
        assert!(is_touch_prompt("waiting on yubikey"));

        // Should not match
        assert!(!is_touch_prompt("Some other message"));
    }

    #[test]
    fn test_error_detection() {
        assert!(is_error_output("error: something went wrong"));
        assert!(is_error_output("Operation failed"));
        assert!(is_error_output("Error: invalid input"));
        assert!(is_error_output("Failed to connect"));
        assert!(!is_error_output("Successfully completed"));
    }
}
