use std::fmt;

#[derive(Debug, Clone, PartialEq)]
pub enum PassphraseError {
    WeakPassphrase { feedback: Vec<String>, score: u8 },
    InvalidKeyFormat(String),
    EncryptionFailed(String),
    DecryptionFailed(String),
    WrongPassphrase,
    StorageFailed(String),
    KeyNotFound(String),
    InvalidInput(String),
}

impl fmt::Display for PassphraseError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::WeakPassphrase { feedback, score } => {
                write!(
                    f,
                    "Passphrase strength insufficient (score: {}): {}",
                    score,
                    feedback.join(", ")
                )
            }
            Self::InvalidKeyFormat(msg) => write!(f, "Invalid key format: {}", msg),
            Self::EncryptionFailed(msg) => write!(f, "Encryption failed: {}", msg),
            Self::DecryptionFailed(msg) => write!(f, "Decryption failed: {}", msg),
            Self::WrongPassphrase => write!(f, "Incorrect passphrase"),
            Self::StorageFailed(msg) => write!(f, "Storage operation failed: {}", msg),
            Self::KeyNotFound(key_id) => write!(f, "Key '{}' not found", key_id),
            Self::InvalidInput(msg) => write!(f, "Invalid input: {}", msg),
        }
    }
}

impl std::error::Error for PassphraseError {}

impl PassphraseError {
    pub fn is_recoverable(&self) -> bool {
        matches!(
            self,
            Self::WeakPassphrase { .. } | Self::WrongPassphrase | Self::InvalidInput(_)
        )
    }

    pub fn recovery_guidance(&self) -> Option<&'static str> {
        match self {
            Self::WeakPassphrase { .. } => {
                Some("Choose a stronger passphrase with more length and character variety")
            }
            Self::WrongPassphrase => Some("Check your passphrase and try again"),
            Self::InvalidInput(_) => Some("Please provide valid input"),
            Self::KeyNotFound(_) => Some("Verify the key exists in the registry"),
            Self::StorageFailed(_) => Some("Check file permissions and disk space"),
            _ => None,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_weak_passphrase_display() {
        let error = PassphraseError::WeakPassphrase {
            feedback: vec!["Too short".to_string(), "Add numbers".to_string()],
            score: 25,
        };
        let display = format!("{}", error);
        assert!(display.contains("25"));
        assert!(display.contains("Too short"));
    }

    #[test]
    fn test_wrong_passphrase_display() {
        let error = PassphraseError::WrongPassphrase;
        let display = format!("{}", error);
        assert!(display.contains("Incorrect passphrase"));
    }

    #[test]
    fn test_is_recoverable() {
        assert!(
            PassphraseError::WeakPassphrase {
                feedback: vec![],
                score: 0
            }
            .is_recoverable()
        );
        assert!(PassphraseError::WrongPassphrase.is_recoverable());
        assert!(PassphraseError::InvalidInput("test".to_string()).is_recoverable());

        assert!(!PassphraseError::EncryptionFailed("test".to_string()).is_recoverable());
        assert!(!PassphraseError::InvalidKeyFormat("test".to_string()).is_recoverable());
    }

    #[test]
    fn test_recovery_guidance() {
        let error = PassphraseError::WeakPassphrase {
            feedback: vec![],
            score: 0,
        };
        assert!(error.recovery_guidance().is_some());
        assert!(
            error
                .recovery_guidance()
                .unwrap()
                .contains("stronger passphrase")
        );

        let error = PassphraseError::WrongPassphrase;
        assert!(error.recovery_guidance().is_some());

        let error = PassphraseError::EncryptionFailed("test".to_string());
        assert!(error.recovery_guidance().is_none());
    }
}
