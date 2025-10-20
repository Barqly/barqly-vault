//! NIST-Aligned Key Lifecycle Management
//!
//! This module implements a unified key lifecycle management system following
//! NIST SP 800-57 guidelines. It provides a single source of truth for all
//! key types (passphrase, YubiKey, and future hardware tokens).

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use std::fmt;

/// NIST-aligned lifecycle states for encryption keys
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, specta::Type)]
#[serde(rename_all = "snake_case")]
pub enum KeyLifecycleStatus {
    /// Key generated but never used
    PreActivation,

    /// Currently attached to vault(s) and available for operations
    Active,

    /// Temporarily disabled but can be reactivated
    Suspended,

    /// Permanently disabled, cannot be reactivated
    Deactivated,

    /// Cryptographically destroyed, only metadata remains
    Destroyed,

    /// Security breach detected, immediate deactivation required
    Compromised,
}

impl KeyLifecycleStatus {
    /// Check if a transition from current state to target state is valid
    pub fn can_transition_to(&self, target: KeyLifecycleStatus) -> bool {
        match (*self, target) {
            // PreActivation transitions
            (KeyLifecycleStatus::PreActivation, KeyLifecycleStatus::Active) => true,
            (KeyLifecycleStatus::PreActivation, KeyLifecycleStatus::Destroyed) => true,

            // Active transitions
            (KeyLifecycleStatus::Active, KeyLifecycleStatus::Suspended) => true,
            (KeyLifecycleStatus::Active, KeyLifecycleStatus::Deactivated) => true,
            (KeyLifecycleStatus::Active, KeyLifecycleStatus::Compromised) => true,

            // Suspended transitions
            (KeyLifecycleStatus::Suspended, KeyLifecycleStatus::Active) => true,
            (KeyLifecycleStatus::Suspended, KeyLifecycleStatus::Deactivated) => true,
            (KeyLifecycleStatus::Suspended, KeyLifecycleStatus::Compromised) => true,

            // Deactivated transitions
            (KeyLifecycleStatus::Deactivated, KeyLifecycleStatus::Destroyed) => true,

            // Compromised transitions
            (KeyLifecycleStatus::Compromised, KeyLifecycleStatus::Destroyed) => true,

            // All other transitions are invalid
            _ => false,
        }
    }

    /// Get human-readable description of the status
    pub fn description(&self) -> &str {
        match self {
            KeyLifecycleStatus::PreActivation => "Key generated but never used",
            KeyLifecycleStatus::Active => "Key is active and available for operations",
            KeyLifecycleStatus::Suspended => "Key is temporarily disabled",
            KeyLifecycleStatus::Deactivated => "Key is permanently disabled",
            KeyLifecycleStatus::Destroyed => "Key has been cryptographically destroyed",
            KeyLifecycleStatus::Compromised => "Key has been compromised and must not be used",
        }
    }

    /// Get user-friendly display text for UI
    pub fn display_text(&self) -> &str {
        match self {
            KeyLifecycleStatus::PreActivation => "New",
            KeyLifecycleStatus::Active => "Active",
            KeyLifecycleStatus::Suspended => "Suspended",
            KeyLifecycleStatus::Deactivated => "Deactivated",
            KeyLifecycleStatus::Destroyed => "Destroyed",
            KeyLifecycleStatus::Compromised => "Compromised",
        }
    }

    /// Check if key can be used for encryption/decryption operations
    pub fn is_operational(&self) -> bool {
        matches!(self, KeyLifecycleStatus::Active)
    }

    /// Check if key can be attached to a vault
    pub fn can_attach_to_vault(&self) -> bool {
        matches!(
            self,
            KeyLifecycleStatus::PreActivation
                | KeyLifecycleStatus::Active
                | KeyLifecycleStatus::Suspended
        )
    }

    /// Check if this is a terminal state (no further transitions possible except to Destroyed)
    pub fn is_terminal(&self) -> bool {
        matches!(self, KeyLifecycleStatus::Destroyed)
    }
}

impl fmt::Display for KeyLifecycleStatus {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "{}", self.display_text())
    }
}

/// Represents a single entry in the status history audit trail
#[derive(Debug, Clone, Serialize, Deserialize, specta::Type)]
pub struct StatusHistoryEntry {
    /// The status that was set
    pub status: KeyLifecycleStatus,

    /// When the status change occurred
    pub timestamp: DateTime<Utc>,

    /// Reason for the status change
    pub reason: String,

    /// Who or what initiated the change ("user", "system", "security")
    pub changed_by: String,

    /// Optional additional metadata about the change
    #[serde(skip_serializing_if = "Option::is_none")]
    #[specta(skip)] // Skip this field for TypeScript generation as it's not type-safe
    pub metadata: Option<serde_json::Value>,
}

impl StatusHistoryEntry {
    /// Create a new status history entry
    pub fn new(
        status: KeyLifecycleStatus,
        reason: impl Into<String>,
        changed_by: impl Into<String>,
    ) -> Self {
        Self {
            status,
            timestamp: Utc::now(),
            reason: reason.into(),
            changed_by: changed_by.into(),
            metadata: None,
        }
    }

    /// Create a new entry with metadata
    pub fn with_metadata(
        status: KeyLifecycleStatus,
        reason: impl Into<String>,
        changed_by: impl Into<String>,
        metadata: serde_json::Value,
    ) -> Self {
        Self {
            status,
            timestamp: Utc::now(),
            reason: reason.into(),
            changed_by: changed_by.into(),
            metadata: Some(metadata),
        }
    }
}

/// Migration helper to convert old state systems to new NIST states
pub mod migration {
    use super::*;

    /// Convert old KeyState enum to new KeyLifecycleStatus
    pub fn migrate_key_state(state: &str, has_usage_history: bool) -> KeyLifecycleStatus {
        match state {
            "active" => KeyLifecycleStatus::Active,
            "registered" => KeyLifecycleStatus::Active, // "registered" was confusing, it means active
            "orphaned" => {
                if has_usage_history {
                    KeyLifecycleStatus::Suspended
                } else {
                    KeyLifecycleStatus::PreActivation
                }
            }
            _ => KeyLifecycleStatus::PreActivation, // Default for unknown states
        }
    }

    /// Convert old YubiKeyState enum to new KeyLifecycleStatus
    pub fn migrate_yubikey_state(state: &str) -> KeyLifecycleStatus {
        match state {
            "new" => KeyLifecycleStatus::PreActivation,
            "reused" => KeyLifecycleStatus::PreActivation,
            "registered" => KeyLifecycleStatus::Active,
            "orphaned" => KeyLifecycleStatus::Suspended,
            _ => KeyLifecycleStatus::PreActivation, // Default for unknown states
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_valid_transitions() {
        // PreActivation transitions
        assert!(KeyLifecycleStatus::PreActivation.can_transition_to(KeyLifecycleStatus::Active));
        assert!(KeyLifecycleStatus::PreActivation.can_transition_to(KeyLifecycleStatus::Destroyed));

        // Active transitions
        assert!(KeyLifecycleStatus::Active.can_transition_to(KeyLifecycleStatus::Suspended));
        assert!(KeyLifecycleStatus::Active.can_transition_to(KeyLifecycleStatus::Deactivated));
        assert!(KeyLifecycleStatus::Active.can_transition_to(KeyLifecycleStatus::Compromised));

        // Suspended transitions
        assert!(KeyLifecycleStatus::Suspended.can_transition_to(KeyLifecycleStatus::Active));
        assert!(KeyLifecycleStatus::Suspended.can_transition_to(KeyLifecycleStatus::Deactivated));
        assert!(KeyLifecycleStatus::Suspended.can_transition_to(KeyLifecycleStatus::Compromised));

        // Deactivated transitions
        assert!(KeyLifecycleStatus::Deactivated.can_transition_to(KeyLifecycleStatus::Destroyed));

        // Compromised transitions
        assert!(KeyLifecycleStatus::Compromised.can_transition_to(KeyLifecycleStatus::Destroyed));
    }

    #[test]
    fn test_invalid_transitions() {
        // Cannot go backward (except Suspended -> Active)
        assert!(!KeyLifecycleStatus::Active.can_transition_to(KeyLifecycleStatus::PreActivation));
        assert!(!KeyLifecycleStatus::Deactivated.can_transition_to(KeyLifecycleStatus::Active));
        assert!(!KeyLifecycleStatus::Deactivated.can_transition_to(KeyLifecycleStatus::Suspended));

        // Cannot skip states
        assert!(
            !KeyLifecycleStatus::PreActivation.can_transition_to(KeyLifecycleStatus::Suspended)
        );
        assert!(
            !KeyLifecycleStatus::PreActivation.can_transition_to(KeyLifecycleStatus::Deactivated)
        );
        assert!(
            !KeyLifecycleStatus::PreActivation.can_transition_to(KeyLifecycleStatus::Compromised)
        );

        // Destroyed is final
        assert!(!KeyLifecycleStatus::Destroyed.can_transition_to(KeyLifecycleStatus::Active));
        assert!(
            !KeyLifecycleStatus::Destroyed.can_transition_to(KeyLifecycleStatus::PreActivation)
        );
        assert!(!KeyLifecycleStatus::Destroyed.can_transition_to(KeyLifecycleStatus::Suspended));

        // Cannot transition to self (not needed but good to verify)
        assert!(!KeyLifecycleStatus::Active.can_transition_to(KeyLifecycleStatus::Active));
        assert!(!KeyLifecycleStatus::Destroyed.can_transition_to(KeyLifecycleStatus::Destroyed));
    }

    #[test]
    fn test_operational_status() {
        assert!(!KeyLifecycleStatus::PreActivation.is_operational());
        assert!(KeyLifecycleStatus::Active.is_operational());
        assert!(!KeyLifecycleStatus::Suspended.is_operational());
        assert!(!KeyLifecycleStatus::Deactivated.is_operational());
        assert!(!KeyLifecycleStatus::Destroyed.is_operational());
        assert!(!KeyLifecycleStatus::Compromised.is_operational());
    }

    #[test]
    fn test_vault_attachment_eligibility() {
        assert!(KeyLifecycleStatus::PreActivation.can_attach_to_vault());
        assert!(KeyLifecycleStatus::Active.can_attach_to_vault());
        assert!(KeyLifecycleStatus::Suspended.can_attach_to_vault()); // Fixed: Suspended can be reactivated via attachment
        assert!(!KeyLifecycleStatus::Deactivated.can_attach_to_vault());
        assert!(!KeyLifecycleStatus::Destroyed.can_attach_to_vault());
        assert!(!KeyLifecycleStatus::Compromised.can_attach_to_vault());
    }

    #[test]
    fn test_terminal_states() {
        assert!(!KeyLifecycleStatus::PreActivation.is_terminal());
        assert!(!KeyLifecycleStatus::Active.is_terminal());
        assert!(!KeyLifecycleStatus::Suspended.is_terminal());
        assert!(!KeyLifecycleStatus::Deactivated.is_terminal());
        assert!(KeyLifecycleStatus::Destroyed.is_terminal());
        assert!(!KeyLifecycleStatus::Compromised.is_terminal());
    }

    #[test]
    fn test_status_history_entry_creation() {
        let entry =
            StatusHistoryEntry::new(KeyLifecycleStatus::Active, "Key attached to vault", "user");

        assert_eq!(entry.status, KeyLifecycleStatus::Active);
        assert_eq!(entry.reason, "Key attached to vault");
        assert_eq!(entry.changed_by, "user");
        assert!(entry.metadata.is_none());
    }

    #[test]
    fn test_status_history_with_metadata() {
        let metadata = serde_json::json!({
            "vault_id": "vault-123",
            "action": "attach"
        });

        let entry = StatusHistoryEntry::with_metadata(
            KeyLifecycleStatus::Active,
            "Key attached to vault",
            "system",
            metadata.clone(),
        );

        assert_eq!(entry.status, KeyLifecycleStatus::Active);
        assert_eq!(entry.metadata, Some(metadata));
    }

    #[test]
    fn test_key_state_migration() {
        use migration::*;

        // Test KeyState migrations
        assert_eq!(
            migrate_key_state("active", false),
            KeyLifecycleStatus::Active
        );
        assert_eq!(
            migrate_key_state("registered", false),
            KeyLifecycleStatus::Active
        );
        assert_eq!(
            migrate_key_state("orphaned", false),
            KeyLifecycleStatus::PreActivation
        );
        assert_eq!(
            migrate_key_state("orphaned", true),
            KeyLifecycleStatus::Suspended
        );
        assert_eq!(
            migrate_key_state("unknown", false),
            KeyLifecycleStatus::PreActivation
        );
    }

    #[test]
    fn test_yubikey_state_migration() {
        use migration::*;

        // Test YubiKeyState migrations
        assert_eq!(
            migrate_yubikey_state("new"),
            KeyLifecycleStatus::PreActivation
        );
        assert_eq!(
            migrate_yubikey_state("reused"),
            KeyLifecycleStatus::PreActivation
        );
        assert_eq!(
            migrate_yubikey_state("registered"),
            KeyLifecycleStatus::Active
        );
        assert_eq!(
            migrate_yubikey_state("orphaned"),
            KeyLifecycleStatus::Suspended
        );
        assert_eq!(
            migrate_yubikey_state("unknown"),
            KeyLifecycleStatus::PreActivation
        );
    }

    #[test]
    fn test_display_formatting() {
        assert_eq!(KeyLifecycleStatus::Active.to_string(), "Active");
        assert_eq!(KeyLifecycleStatus::PreActivation.display_text(), "New");
        assert_eq!(
            KeyLifecycleStatus::Active.description(),
            "Key is active and available for operations"
        );
    }
}
