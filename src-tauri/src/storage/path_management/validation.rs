//! Path and label validation utilities
//!
//! This module provides security validation for paths and labels to prevent
//! path traversal attacks and other file system security issues.

use crate::constants::MAX_KEY_LABEL_LENGTH;
use std::path::Path;

/// Validate that a path is safe for file operations
///
/// Checks for path traversal attempts and other security issues.
///
/// # Arguments
/// * `path` - The path to validate
///
/// # Returns
/// `true` if the path is safe, `false` otherwise
pub fn is_safe_path(path: &Path) -> bool {
    let path_str = path.to_string_lossy();

    // Check for path traversal attempts
    if path_str.contains("..") || path_str.contains("\\") || path_str.contains("//") {
        return false;
    }

    // Check for absolute paths (relative to current directory)
    if path.is_absolute() {
        return false;
    }

    // Check for null bytes or other dangerous characters
    if path_str.contains('\0') {
        return false;
    }

    true
}

/// Check if a label is safe for file operations
///
/// # Arguments
/// * `label` - The label to validate
///
/// # Returns
/// `true` if the label is safe, `false` otherwise
pub(super) fn is_safe_label(label: &str) -> bool {
    // Check for path separators
    if label.contains('/') || label.contains('\\') {
        return false;
    }

    // Check for path traversal
    if label.contains("..") {
        return false;
    }

    // Check for null bytes
    if label.contains('\0') {
        return false;
    }

    // Check for other potentially dangerous characters
    if label.contains('*') || label.contains('?') || label.contains('"') {
        return false;
    }

    // Check length (reasonable limit)
    if label.len() > MAX_KEY_LABEL_LENGTH {
        return false;
    }

    // Check if it's not empty
    if label.trim().is_empty() {
        return false;
    }

    true
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_safe_label_validation() {
        assert!(is_safe_label("normal-key"));
        assert!(is_safe_label("my_key_123"));
        assert!(is_safe_label("key-with-dashes"));

        // Unsafe labels
        assert!(!is_safe_label("key/with/slashes"));
        assert!(!is_safe_label("key\\with\\backslashes"));
        assert!(!is_safe_label("key..with..dots"));
        assert!(!is_safe_label(""));
        assert!(!is_safe_label("   "));
    }
}
