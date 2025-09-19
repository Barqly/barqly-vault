#[cfg(test)]
mod tests {
    use super::super::*;

    #[tokio::test]
    async fn test_validate_strong_passphrase() {
        let result = validate_passphrase_strength("MySecureP@ssw0rd2024!".to_string()).await;

        assert!(result.success);
        let data = result.data.unwrap();
        assert!(data.is_valid);
        assert_eq!(data.strength, "strong");
        assert!(data.score >= 75);
        assert!(data.feedback.is_empty() || data.feedback.len() <= 1);
    }

    #[tokio::test]
    async fn test_validate_weak_passphrase() {
        let result = validate_passphrase_strength("password".to_string()).await;

        assert!(result.success);
        let data = result.data.unwrap();
        assert!(!data.is_valid);
        assert_eq!(data.strength, "weak");
        assert!(data.score < 40);
        assert!(!data.feedback.is_empty());
        assert!(data.feedback.iter().any(|f| f.contains("common")));
    }

    #[tokio::test]
    async fn test_validate_fair_passphrase() {
        let result = validate_passphrase_strength("hello123world".to_string()).await;

        assert!(result.success);
        let data = result.data.unwrap();
        assert!(data.is_valid); // 13 chars, meets minimum
        assert_eq!(data.strength, "fair");
        assert!(data.score >= 40 && data.score < 60);
        assert!(!data.feedback.is_empty());
    }

    #[tokio::test]
    async fn test_validate_good_passphrase() {
        let result = validate_passphrase_strength("MyGoodPass2024".to_string()).await;

        assert!(result.success);
        let data = result.data.unwrap();
        assert!(data.is_valid);
        assert_eq!(data.strength, "good");
        assert!(data.score >= 60 && data.score < 75);
    }

    #[tokio::test]
    async fn test_validate_sequential_pattern() {
        let result = validate_passphrase_strength("abcdef123456".to_string()).await;

        assert!(result.success);
        let data = result.data.unwrap();
        assert!(!data.is_valid);
        assert!(data.feedback.iter().any(|f| f.contains("sequential")));
    }

    #[tokio::test]
    async fn test_validate_keyboard_pattern() {
        let result = validate_passphrase_strength("qwertyuiop12".to_string()).await;

        assert!(result.success);
        let data = result.data.unwrap();
        assert!(!data.is_valid);
        assert!(data.feedback.iter().any(|f| f.contains("keyboard")));
    }

    #[tokio::test]
    async fn test_validate_empty_passphrase() {
        let result = validate_passphrase_strength("".to_string()).await;

        assert!(result.success);
        let data = result.data.unwrap();
        assert!(!data.is_valid);
        assert_eq!(data.strength, "weak");
        assert_eq!(data.score, 0);
        assert!(data.feedback.iter().any(|f| f.contains("12 characters")));
    }

    #[tokio::test]
    async fn test_validate_unicode_passphrase() {
        let result = validate_passphrase_strength("パスワード123!@#".to_string()).await;

        assert!(result.success);
        let data = result.data.unwrap();
        // Unicode counts as special chars
        assert!(data.score > 60);
    }

    #[tokio::test]
    async fn test_validate_score_boundaries() {
        // Test score boundaries
        let weak = validate_passphrase_strength("abc".to_string()).await;
        assert!(weak.data.unwrap().score < 40);

        let fair = validate_passphrase_strength("hello123world".to_string()).await;
        let fair_score = fair.data.unwrap().score;
        assert!(fair_score >= 40 && fair_score < 60);

        let good = validate_passphrase_strength("GoodPass123!".to_string()).await;
        let good_score = good.data.unwrap().score;
        assert!(good_score >= 60 && good_score < 75);

        let strong = validate_passphrase_strength("V3ryStr0ng!P@ssw0rd#2024$".to_string()).await;
        assert!(strong.data.unwrap().score >= 75);
    }

    #[tokio::test]
    async fn test_validate_minimum_requirements() {
        // Just below minimum (11 chars)
        let below = validate_passphrase_strength("GoodPass11!".to_string()).await;
        assert!(!below.data.unwrap().is_valid);

        // Exactly minimum (12 chars)
        let exact = validate_passphrase_strength("GoodPass123!".to_string()).await;
        assert!(exact.data.unwrap().is_valid);

        // Above minimum
        let above = validate_passphrase_strength("GoodPassword123!".to_string()).await;
        assert!(above.data.unwrap().is_valid);
    }
}