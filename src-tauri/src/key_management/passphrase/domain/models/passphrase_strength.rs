use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, specta::Type)]
#[serde(rename_all = "lowercase")]
pub enum PassphraseStrength {
    Weak,
    Fair,
    Good,
    Strong,
}

impl PassphraseStrength {
    pub fn from_score(score: u8) -> Self {
        match score {
            0..=25 => Self::Weak,
            26..=50 => Self::Fair,
            51..=75 => Self::Good,
            76..=100 => Self::Strong,
            _ => Self::Strong,
        }
    }

    pub fn is_acceptable(&self) -> bool {
        !matches!(self, Self::Weak)
    }

    pub fn description(&self) -> &'static str {
        match self {
            Self::Weak => "Weak - Not recommended for protecting sensitive data",
            Self::Fair => "Fair - Meets minimum requirements but could be stronger",
            Self::Good => "Good - Suitable for most use cases",
            Self::Strong => "Strong - Excellent protection for sensitive data",
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_from_score() {
        assert_eq!(PassphraseStrength::from_score(0), PassphraseStrength::Weak);
        assert_eq!(PassphraseStrength::from_score(25), PassphraseStrength::Weak);
        assert_eq!(PassphraseStrength::from_score(26), PassphraseStrength::Fair);
        assert_eq!(PassphraseStrength::from_score(50), PassphraseStrength::Fair);
        assert_eq!(PassphraseStrength::from_score(51), PassphraseStrength::Good);
        assert_eq!(PassphraseStrength::from_score(75), PassphraseStrength::Good);
        assert_eq!(
            PassphraseStrength::from_score(76),
            PassphraseStrength::Strong
        );
        assert_eq!(
            PassphraseStrength::from_score(100),
            PassphraseStrength::Strong
        );
    }

    #[test]
    fn test_is_acceptable() {
        assert!(!PassphraseStrength::Weak.is_acceptable());
        assert!(PassphraseStrength::Fair.is_acceptable());
        assert!(PassphraseStrength::Good.is_acceptable());
        assert!(PassphraseStrength::Strong.is_acceptable());
    }

    #[test]
    fn test_description() {
        assert!(PassphraseStrength::Weak.description().contains("Weak"));
        assert!(PassphraseStrength::Fair.description().contains("Fair"));
        assert!(PassphraseStrength::Good.description().contains("Good"));
        assert!(PassphraseStrength::Strong.description().contains("Strong"));
    }
}
