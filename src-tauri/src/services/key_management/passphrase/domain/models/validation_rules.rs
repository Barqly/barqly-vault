use super::PassphraseStrength;

pub struct ValidationResult {
    pub is_valid: bool,
    pub strength: PassphraseStrength,
    pub feedback: Vec<String>,
    pub score: u8,
}

impl ValidationResult {
    pub fn new(score: u8, feedback: Vec<String>, is_valid: bool) -> Self {
        let strength = PassphraseStrength::from_score(score);
        Self {
            is_valid,
            strength,
            feedback,
            score: score.min(100),
        }
    }
}

pub fn calculate_strength_score(passphrase: &str) -> ValidationResult {
    let mut feedback = Vec::new();
    let mut score = 0u8;

    let length = passphrase.len();
    if length < 8 {
        feedback.push("Passphrase is too short (minimum 8 characters)".to_string());
        return ValidationResult::new(0, feedback, false);
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

    let mut pattern_score = 20;

    if contains_sequential_chars(passphrase) {
        pattern_score -= 5;
        feedback.push("Avoid sequential characters (abc, 123)".to_string());
    }

    if contains_repeated_chars(passphrase) {
        pattern_score -= 5;
        feedback.push("Avoid repeated characters (aaa, 111)".to_string());
    }

    if contains_keyboard_pattern(passphrase) {
        pattern_score -= 5;
        feedback.push("Avoid keyboard patterns (qwerty, asdf)".to_string());
    }

    if is_common_word(passphrase) {
        pattern_score -= 5;
        feedback.push("Avoid common dictionary words".to_string());
    }

    score += pattern_score.max(0) as u8;

    let entropy = calculate_entropy(passphrase);
    if entropy > 50.0 {
        score += 10;
    } else if entropy > 40.0 {
        score += 7;
    } else if entropy > 30.0 {
        score += 5;
    }

    if score > 75 {
        feedback.push("Excellent passphrase strength!".to_string());
    } else if score > 50 {
        feedback.push("Good passphrase, but there's room for improvement".to_string());
    }

    let is_valid = length >= 12 && has_digit && (has_lowercase || has_uppercase);

    if !is_valid && length >= 12 {
        if !has_digit {
            feedback.push("Must include at least one number".to_string());
        }
        if !has_lowercase && !has_uppercase {
            feedback.push("Must include at least one letter".to_string());
        }
    }

    ValidationResult::new(score, feedback, is_valid)
}

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

    #[test]
    fn test_weak_passphrase() {
        let result = calculate_strength_score("abc123");
        assert!(!result.is_valid);
        assert_eq!(result.strength, PassphraseStrength::Weak);
        assert!(result.score < 30);
    }

    #[test]
    fn test_strong_passphrase() {
        let result = calculate_strength_score("MySecure#Passphrase2024!");
        assert!(result.is_valid);
        assert_eq!(result.strength, PassphraseStrength::Strong);
        assert!(result.score > 70);
    }

    #[test]
    fn test_sequential_detection() {
        let result = calculate_strength_score("abcd1234EFGH!");
        assert!(result.feedback.iter().any(|f| f.contains("sequential")));
    }

    #[test]
    fn test_common_word_detection() {
        let result = calculate_strength_score("Password123!@#");
        assert!(result.feedback.iter().any(|f| f.contains("dictionary")));
    }

    #[test]
    fn test_contains_sequential_chars() {
        assert!(contains_sequential_chars("abc"));
        assert!(contains_sequential_chars("123"));
        assert!(contains_sequential_chars("xyz"));
        assert!(contains_sequential_chars("321"));
        assert!(contains_sequential_chars("cba"));
        assert!(!contains_sequential_chars("acb"));
        assert!(!contains_sequential_chars("135"));
    }

    #[test]
    fn test_contains_repeated_chars() {
        assert!(contains_repeated_chars("aaa"));
        assert!(contains_repeated_chars("111"));
        assert!(contains_repeated_chars("test aaa end"));
        assert!(!contains_repeated_chars("aa"));
        assert!(!contains_repeated_chars("aba"));
    }

    #[test]
    fn test_contains_keyboard_pattern() {
        assert!(contains_keyboard_pattern("qwerty123"));
        assert!(contains_keyboard_pattern("asdf"));
        assert!(contains_keyboard_pattern("12345"));
        assert!(!contains_keyboard_pattern("random"));
    }

    #[test]
    fn test_is_common_word() {
        assert!(is_common_word("password"));
        assert!(is_common_word("MyPassword123"));
        assert!(is_common_word("bitcoin_wallet"));
        assert!(!is_common_word("xkcd_correct_horse_battery"));
    }

    #[test]
    fn test_calculate_entropy() {
        let low = calculate_entropy("abc");
        let medium = calculate_entropy("Abc123");
        let high = calculate_entropy("Abc123!@#");

        assert!(low < medium);
        assert!(medium < high);
    }

    #[test]
    fn test_length_scoring() {
        let short = calculate_strength_score("Abc1234!");
        let medium = calculate_strength_score("Abc12345678!");
        let long = calculate_strength_score("Abc123456789012345!");

        assert!(short.score < medium.score);
        assert!(medium.score < long.score);
    }

    #[test]
    fn test_variety_scoring() {
        let lowercase_only = calculate_strength_score("abcdefghijkl");
        let lower_upper = calculate_strength_score("AbcDefGhiJkl");
        let lower_upper_digit = calculate_strength_score("AbcDef123456");
        let all_types = calculate_strength_score("AbcDef123!@#");

        assert!(lowercase_only.score < lower_upper.score);
        assert!(lower_upper.score < lower_upper_digit.score);
        assert!(lower_upper_digit.score < all_types.score);
    }
}
