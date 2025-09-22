//! Passphrase strength validation command
//!
//! This module provides the Tauri command for validating passphrase strength
//! with detailed scoring and feedback for user guidance.

use crate::commands::types::CommandResponse;
use serde::{Deserialize, Serialize};
use tauri::command;

/// Passphrase strength levels
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, specta::Type)]
#[serde(rename_all = "lowercase")]
pub enum PassphraseStrength {
    Weak,
    Fair,
    Good,
    Strong,
}

/// Passphrase validation result
#[derive(Debug, Serialize, specta::Type)]
pub struct PassphraseValidationResult {
    pub is_valid: bool,
    pub strength: PassphraseStrength,
    pub feedback: Vec<String>,
    pub score: u8, // 0-100
}

/// Validate passphrase strength with detailed feedback
#[command]
#[specta::specta]
pub async fn validate_passphrase_strength(
    passphrase: String,
) -> CommandResponse<PassphraseValidationResult> {
    let mut feedback = Vec::new();
    let mut score = 0u8;

    // Length scoring (0-40 points)
    let length = passphrase.len();
    if length < 8 {
        feedback.push("Passphrase is too short (minimum 8 characters)".to_string());
        return Ok(PassphraseValidationResult {
            is_valid: false,
            strength: PassphraseStrength::Weak,
            feedback,
            score: 0,
        });
    } else if length < 12 {
        score += 10;
        feedback
            .push("Consider using a longer passphrase (12+ characters recommended)".to_string());
    } else if length < 16 {
        score += 20;
    } else if length < 20 {
        score += 30;
    } else {
        score += 40;
    }

    // Character variety scoring (0-30 points)
    let has_lowercase = passphrase.chars().any(|c| c.is_ascii_lowercase());
    let has_uppercase = passphrase.chars().any(|c| c.is_ascii_uppercase());
    let has_digit = passphrase.chars().any(|c| c.is_ascii_digit());
    let has_special = passphrase
        .chars()
        .any(|c| !c.is_alphanumeric() && c.is_ascii());

    let variety_count = [has_lowercase, has_uppercase, has_digit, has_special]
        .iter()
        .filter(|&&x| x)
        .count();

    match variety_count {
        0 | 1 => {
            feedback.push("Add a mix of uppercase, lowercase, numbers, and symbols".to_string());
        }
        2 => {
            score += 10;
            feedback.push("Good variety, but consider adding more character types".to_string());
        }
        3 => {
            score += 20;
            if !has_special {
                feedback.push("Consider adding special characters (!@#$%^&*)".to_string());
            }
        }
        4 => {
            score += 30;
        }
        _ => {}
    }

    // Pattern detection (0-20 points)
    let mut pattern_score = 20;

    // Check for common patterns
    if contains_sequential_chars(&passphrase) {
        pattern_score -= 5;
        feedback.push("Avoid sequential characters (abc, 123)".to_string());
    }

    if contains_repeated_chars(&passphrase) {
        pattern_score -= 5;
        feedback.push("Avoid repeated characters (aaa, 111)".to_string());
    }

    if contains_keyboard_pattern(&passphrase) {
        pattern_score -= 5;
        feedback.push("Avoid keyboard patterns (qwerty, asdf)".to_string());
    }

    if is_common_word(&passphrase) {
        pattern_score -= 5;
        feedback.push("Avoid common dictionary words".to_string());
    }

    score += pattern_score.max(0) as u8;

    // Entropy bonus (0-10 points)
    let entropy = calculate_entropy(&passphrase);
    if entropy > 50.0 {
        score += 10;
    } else if entropy > 40.0 {
        score += 7;
    } else if entropy > 30.0 {
        score += 5;
    }

    // Determine strength level
    let strength = match score {
        0..=25 => PassphraseStrength::Weak,
        26..=50 => PassphraseStrength::Fair,
        51..=75 => PassphraseStrength::Good,
        76..=100 => PassphraseStrength::Strong,
        _ => PassphraseStrength::Strong,
    };

    // Add positive feedback for strong passphrases
    if score > 75 {
        feedback.push("Excellent passphrase strength!".to_string());
    } else if score > 50 {
        feedback.push("Good passphrase, but there's room for improvement".to_string());
    }

    // Ensure minimum requirements for validity
    let is_valid = length >= 12 && has_digit && (has_lowercase || has_uppercase);

    if !is_valid && length >= 12 {
        if !has_digit {
            feedback.push("Must include at least one number".to_string());
        }
        if !has_lowercase && !has_uppercase {
            feedback.push("Must include at least one letter".to_string());
        }
    }

    Ok(PassphraseValidationResult {
        is_valid,
        strength,
        feedback,
        score: score.min(100),
    })
}

// Helper functions

fn contains_sequential_chars(s: &str) -> bool {
    let chars: Vec<char> = s.to_lowercase().chars().collect();
    for i in 0..chars.len().saturating_sub(2) {
        if let (Some(a), Some(b), Some(c)) = (
            chars[i].to_digit(36),
            chars[i + 1].to_digit(36),
            chars[i + 2].to_digit(36),
        ) {
            if b == a + 1 && c == b + 1 {
                return true;
            }
            if b == a.saturating_sub(1) && c == b.saturating_sub(1) {
                return true;
            }
        }
    }
    false
}

fn contains_repeated_chars(s: &str) -> bool {
    let chars: Vec<char> = s.chars().collect();
    for i in 0..chars.len().saturating_sub(2) {
        if chars[i] == chars[i + 1] && chars[i] == chars[i + 2] {
            return true;
        }
    }
    false
}

fn contains_keyboard_pattern(s: &str) -> bool {
    let patterns = [
        "qwerty",
        "asdf",
        "zxcv",
        "qwertyuiop",
        "asdfghjkl",
        "zxcvbnm",
        "12345",
        "123456",
        "qazwsx",
        "qweasd",
        "1qaz2wsx",
    ];
    let lower = s.to_lowercase();
    patterns.iter().any(|&p| lower.contains(p))
}

fn is_common_word(s: &str) -> bool {
    let common_passwords = [
        "password", "admin", "letmein", "welcome", "monkey", "dragon", "master", "bitcoin",
        "crypto", "wallet", "secret", "private",
    ];
    let lower = s.to_lowercase();
    common_passwords.iter().any(|&p| lower.contains(p))
}

fn calculate_entropy(s: &str) -> f64 {
    let charset_size = {
        let mut size = 0;
        if s.chars().any(|c| c.is_ascii_lowercase()) {
            size += 26;
        }
        if s.chars().any(|c| c.is_ascii_uppercase()) {
            size += 26;
        }
        if s.chars().any(|c| c.is_ascii_digit()) {
            size += 10;
        }
        if s.chars().any(|c| !c.is_alphanumeric() && c.is_ascii()) {
            size += 32;
        }
        size.max(1)
    };

    s.len() as f64 * (charset_size as f64).log2()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_weak_passphrase() {
        let result = validate_passphrase_strength("abc123".to_string())
            .await
            .unwrap();
        assert!(!result.is_valid);
        assert_eq!(result.strength, PassphraseStrength::Weak);
        assert!(result.score < 30);
    }

    #[tokio::test]
    async fn test_strong_passphrase() {
        let result = validate_passphrase_strength("MySecure#Passphrase2024!".to_string())
            .await
            .unwrap();
        assert!(result.is_valid);
        assert_eq!(result.strength, PassphraseStrength::Strong);
        assert!(result.score > 70);
    }

    #[tokio::test]
    async fn test_sequential_detection() {
        let result = validate_passphrase_strength("abcd1234EFGH!".to_string())
            .await
            .unwrap();
        assert!(result.feedback.iter().any(|f| f.contains("sequential")));
    }

    #[tokio::test]
    async fn test_common_word_detection() {
        let result = validate_passphrase_strength("Password123!@#".to_string())
            .await
            .unwrap();
        assert!(result.feedback.iter().any(|f| f.contains("dictionary")));
    }
}
