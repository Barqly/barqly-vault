//! Label Sanitization
//!
//! Provides consistent label sanitization for vaults and keys.
//! Ensures filesystem-safe names while preserving user's original input for display.

use crate::error::StorageError;
use serde::{Deserialize, Serialize};

/// Sanitized label containing both filesystem-safe and display versions
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct SanitizedLabel {
    /// Filesystem-safe name (sanitized)
    pub sanitized: String,
    /// Original display name (preserved for UI)
    pub display: String,
}

/// Sanitize a label for filesystem and cross-platform compatibility
///
/// Converts user input like "My Family Vault! 🎉" into filesystem-safe
/// "My-Family-Vault" while preserving original for display.
///
/// # Rules:
/// 1. Remove emojis and non-ASCII characters
/// 2. Replace invalid filesystem chars (`/\:*?"<>|`) with hyphens
/// 3. Replace spaces with hyphens
/// 4. Collapse multiple hyphens into single hyphen
/// 5. Trim leading/trailing hyphens
/// 6. Limit to 200 characters
/// 7. Prevent leading dot (Unix hidden files)
/// 8. Check Windows reserved names
///
/// # Arguments
/// * `input` - User-provided label (vault name or key label)
///
/// # Returns
/// * `Ok(SanitizedLabel)` with both sanitized and display versions
/// * `Err(StorageError)` if label is empty or invalid after sanitization
///
/// # Examples
/// ```ignore
/// let result = sanitize_label("My Family Photos! 🎉 / Test");
/// // sanitized: "My-Family-Photos-Test"
/// // display:   "My Family Photos! 🎉 / Test"
/// ```
pub fn sanitize_label(input: &str) -> Result<SanitizedLabel, StorageError> {
    let display = input.to_string();
    let trimmed = input.trim();

    if trimmed.is_empty() {
        return Err(StorageError::InvalidVaultName(
            "Label cannot be empty".to_string(),
        ));
    }

    // Step 1: Remove emojis and non-ASCII characters
    let ascii_only: String = trimmed
        .chars()
        .filter(|c| c.is_ascii() || c.is_ascii_whitespace())
        .collect();

    // Step 2: Replace invalid filesystem characters and spaces with hyphens
    let invalid_chars = ['/', '\\', ':', '*', '?', '"', '<', '>', '|'];
    let replaced: String = ascii_only
        .chars()
        .map(|c| {
            if invalid_chars.contains(&c) || c == ' ' {
                '-'
            } else {
                c
            }
        })
        .collect();

    // Step 3: Collapse multiple hyphens into single hyphen
    let collapsed = collapse_separators(&replaced);

    // Step 4: Trim leading/trailing hyphens and spaces
    let trimmed_result = collapsed.trim_matches(|c: char| c == '-' || c.is_whitespace());

    // Check if empty after sanitization
    if trimmed_result.is_empty() {
        return Err(StorageError::InvalidVaultName(
            "Label contains only invalid characters".to_string(),
        ));
    }

    // Step 5: Enforce max 200 characters
    let sanitized = if trimmed_result.len() > 200 {
        trimmed_result[..200].to_string()
    } else {
        trimmed_result.to_string()
    };

    // Step 6: Prevent leading dot (Unix hidden files)
    let sanitized = if let Some(stripped) = sanitized.strip_prefix('.') {
        format!("vault-{}", stripped)
    } else {
        sanitized
    };

    // Step 7: Check for Windows reserved names
    check_reserved_names(&sanitized)?;

    Ok(SanitizedLabel { sanitized, display })
}

/// Collapse multiple consecutive hyphens and spaces into single hyphens
fn collapse_separators(s: &str) -> String {
    let mut result = String::with_capacity(s.len());
    let mut last_was_separator = false;

    for c in s.chars() {
        let is_separator = c == '-' || c == ' ';

        if is_separator {
            if !last_was_separator {
                result.push('-');
                last_was_separator = true;
            }
        } else {
            result.push(c);
            last_was_separator = false;
        }
    }

    result
}

/// Check if name is a Windows reserved name
fn check_reserved_names(_name: &str) -> Result<(), StorageError> {
    #[cfg(target_os = "windows")]
    {
        let reserved = [
            "CON", "PRN", "AUX", "NUL", "COM1", "COM2", "COM3", "COM4", "COM5", "COM6", "COM7",
            "COM8", "COM9", "LPT1", "LPT2", "LPT3", "LPT4", "LPT5", "LPT6", "LPT7", "LPT8", "LPT9",
        ];

        if reserved.contains(&_name.to_uppercase().as_str()) {
            return Err(StorageError::InvalidVaultName(format!(
                "'{_name}' is a reserved name on Windows"
            )));
        }
    }

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_basic_sanitization() {
        let result = sanitize_label("My Family Vault").unwrap();
        assert_eq!(result.sanitized, "My-Family-Vault");
        assert_eq!(result.display, "My Family Vault");
    }

    #[test]
    fn test_preserves_hyphens() {
        let result = sanitize_label("ABC-XYZ").unwrap();
        assert_eq!(result.sanitized, "ABC-XYZ");
        assert_eq!(result.display, "ABC-XYZ");
    }

    #[test]
    fn test_preserves_underscores() {
        let result = sanitize_label("test_vault").unwrap();
        assert_eq!(result.sanitized, "test_vault");
        assert_eq!(result.display, "test_vault");
    }

    #[test]
    fn test_collapses_multiple_hyphens() {
        let result = sanitize_label("ABC  -  XYZ").unwrap();
        assert_eq!(result.sanitized, "ABC-XYZ");
    }

    #[test]
    fn test_removes_emojis() {
        let result = sanitize_label("My Photos! 🎉").unwrap();
        assert_eq!(result.sanitized, "My-Photos!"); // ! is valid, only emoji removed
    }

    #[test]
    fn test_empty_label_fails() {
        assert!(sanitize_label("").is_err());
        assert!(sanitize_label("   ").is_err());
    }
}
