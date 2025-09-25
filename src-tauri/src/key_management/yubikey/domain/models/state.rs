//! YubiKey state domain object and state machine
//!
//! Centralizes YubiKey state definitions to eliminate duplicate enums
//! that caused the identity tag bug. This is the single source of truth.

use serde::{Deserialize, Serialize};
use std::fmt;

/// YubiKey state - the single source of truth
///
/// This replaces the duplicate YubiKeyState enums found in:
/// - commands/yubikey_commands/streamlined.rs:24
/// - crypto/yubikey/age_plugin.rs:33
#[derive(Debug, Clone, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[cfg_attr(feature = "generate-types", derive(specta::Type))]
#[serde(rename_all = "lowercase")]
pub enum YubiKeyState {
    /// Brand new YubiKey with default PIN (123456)
    /// - PIN: Default (123456)
    /// - Age identity: None
    /// - Manifest entry: None
    /// - Action needed: Initialize with custom PIN and generate age identity
    New,

    /// YubiKey with custom PIN but no age identity registered
    /// - PIN: Custom (changed from default)
    /// - Age identity: None
    /// - Manifest entry: None
    /// - Action needed: Generate age identity for Barqly
    Reused,

    /// YubiKey with age identity already registered and ready to use
    /// - PIN: Custom
    /// - Age identity: Present and valid
    /// - Manifest entry: Present and valid
    /// - Action needed: None (ready for operations)
    Registered,

    /// YubiKey has age identity but no manifest entry (needs recovery)
    /// - PIN: Custom
    /// - Age identity: Present
    /// - Manifest entry: Missing or invalid
    /// - Action needed: Recover manifest entry or re-register
    Orphaned,
}

impl YubiKeyState {
    /// Check if YubiKey is ready for cryptographic operations
    pub fn is_ready_for_operations(&self) -> bool {
        matches!(self, YubiKeyState::Registered)
    }

    /// Check if YubiKey needs PIN setup
    pub fn needs_pin_setup(&self) -> bool {
        matches!(self, YubiKeyState::New)
    }

    /// Check if YubiKey needs age identity generation
    pub fn needs_age_identity(&self) -> bool {
        matches!(self, YubiKeyState::New | YubiKeyState::Reused)
    }

    /// Check if YubiKey needs registry recovery
    pub fn needs_registry_recovery(&self) -> bool {
        matches!(self, YubiKeyState::Orphaned)
    }

    /// Check if YubiKey has a custom PIN (not default)
    pub fn has_custom_pin(&self) -> bool {
        !matches!(self, YubiKeyState::New)
    }

    /// Check if YubiKey has age identity
    pub fn has_age_identity(&self) -> bool {
        matches!(self, YubiKeyState::Registered | YubiKeyState::Orphaned)
    }

    /// Get the next logical state after successful operation
    pub fn next_state_after_pin_setup(&self) -> Result<YubiKeyState, StateTransitionError> {
        match self {
            YubiKeyState::New => Ok(YubiKeyState::Reused),
            _ => Err(StateTransitionError::InvalidTransition {
                from: self.clone(),
                operation: "PIN setup".to_string(),
                reason: "PIN already set up".to_string(),
            }),
        }
    }

    /// Get the next state after age identity generation
    pub fn next_state_after_identity_generation(
        &self,
    ) -> Result<YubiKeyState, StateTransitionError> {
        match self {
            YubiKeyState::Reused => Ok(YubiKeyState::Registered),
            YubiKeyState::New => Err(StateTransitionError::InvalidTransition {
                from: self.clone(),
                operation: "identity generation".to_string(),
                reason: "PIN must be set up first".to_string(),
            }),
            YubiKeyState::Registered => Err(StateTransitionError::InvalidTransition {
                from: self.clone(),
                operation: "identity generation".to_string(),
                reason: "identity already exists".to_string(),
            }),
            YubiKeyState::Orphaned => Ok(YubiKeyState::Registered), // Recovery case
        }
    }

    /// Get the next state after registry recovery
    pub fn next_state_after_registry_recovery(&self) -> Result<YubiKeyState, StateTransitionError> {
        match self {
            YubiKeyState::Orphaned => Ok(YubiKeyState::Registered),
            _ => Err(StateTransitionError::InvalidTransition {
                from: self.clone(),
                operation: "registry recovery".to_string(),
                reason: "not in orphaned state".to_string(),
            }),
        }
    }

    /// Get available operations for this state
    pub fn available_operations(&self) -> Vec<YubiKeyOperation> {
        match self {
            YubiKeyState::New => vec![YubiKeyOperation::SetupPin, YubiKeyOperation::CheckStatus],
            YubiKeyState::Reused => vec![
                YubiKeyOperation::GenerateIdentity,
                YubiKeyOperation::CheckStatus,
            ],
            YubiKeyState::Registered => vec![
                YubiKeyOperation::Encrypt,
                YubiKeyOperation::Decrypt,
                YubiKeyOperation::CheckStatus,
                YubiKeyOperation::GetIdentity,
            ],
            YubiKeyState::Orphaned => vec![
                YubiKeyOperation::RecoverRegistry,
                YubiKeyOperation::CheckStatus,
                YubiKeyOperation::GetIdentity,
            ],
        }
    }

    /// Get user-friendly description of current state
    pub fn description(&self) -> &'static str {
        match self {
            YubiKeyState::New => "YubiKey is new and needs initial setup",
            YubiKeyState::Reused => "YubiKey has custom PIN but needs age identity setup",
            YubiKeyState::Registered => "YubiKey is fully configured and ready to use",
            YubiKeyState::Orphaned => "YubiKey has identity but needs registry recovery",
        }
    }

    /// Get next steps for user
    pub fn next_steps(&self) -> Vec<&'static str> {
        match self {
            YubiKeyState::New => vec![
                "Set up a custom PIN (6-8 digits)",
                "Generate age identity for encryption",
            ],
            YubiKeyState::Reused => vec!["Generate age identity for Barqly encryption"],
            YubiKeyState::Registered => {
                vec!["YubiKey is ready - you can encrypt and decrypt files"]
            }
            YubiKeyState::Orphaned => vec![
                "Recover registry entry to restore full functionality",
                "Or re-register the YubiKey with the system",
            ],
        }
    }
}

impl fmt::Display for YubiKeyState {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            YubiKeyState::New => write!(f, "New"),
            YubiKeyState::Reused => write!(f, "Reused"),
            YubiKeyState::Registered => write!(f, "Registered"),
            YubiKeyState::Orphaned => write!(f, "Orphaned"),
        }
    }
}

/// Available operations on a YubiKey
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub enum YubiKeyOperation {
    SetupPin,
    GenerateIdentity,
    RecoverRegistry,
    Encrypt,
    Decrypt,
    CheckStatus,
    GetIdentity,
}

impl fmt::Display for YubiKeyOperation {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            YubiKeyOperation::SetupPin => write!(f, "Set up PIN"),
            YubiKeyOperation::GenerateIdentity => write!(f, "Generate Identity"),
            YubiKeyOperation::RecoverRegistry => write!(f, "Recover Registry"),
            YubiKeyOperation::Encrypt => write!(f, "Encrypt"),
            YubiKeyOperation::Decrypt => write!(f, "Decrypt"),
            YubiKeyOperation::CheckStatus => write!(f, "Check Status"),
            YubiKeyOperation::GetIdentity => write!(f, "Get Identity"),
        }
    }
}

/// PIN status for YubiKey
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[cfg_attr(feature = "generate-types", derive(specta::Type))]
#[serde(rename_all = "lowercase")]
pub enum PinStatus {
    Default,
    Custom,
    Blocked,
    Unknown,
}

impl fmt::Display for PinStatus {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            PinStatus::Default => write!(f, "Default"),
            PinStatus::Custom => write!(f, "Custom"),
            PinStatus::Blocked => write!(f, "Blocked"),
            PinStatus::Unknown => write!(f, "Unknown"),
        }
    }
}

/// State transition errors
#[derive(Debug, thiserror::Error)]
pub enum StateTransitionError {
    #[error("Invalid transition from {from} during {operation}: {reason}")]
    InvalidTransition {
        from: YubiKeyState,
        operation: String,
        reason: String,
    },

    #[error("Operation {operation} not available in state {current_state}")]
    OperationNotAvailable {
        operation: String,
        current_state: YubiKeyState,
    },
}

/// State machine for managing YubiKey state transitions
#[derive(Debug)]
pub struct YubiKeyStateMachine {
    current_state: YubiKeyState,
    history: Vec<StateTransition>,
}

impl YubiKeyStateMachine {
    /// Create new state machine
    pub fn new(initial_state: YubiKeyState) -> Self {
        Self {
            current_state: initial_state,
            history: Vec::new(),
        }
    }

    /// Get current state
    pub fn current_state(&self) -> &YubiKeyState {
        &self.current_state
    }

    /// Attempt state transition
    pub fn transition(&mut self, operation: YubiKeyOperation) -> Result<(), StateTransitionError> {
        let new_state = match operation {
            YubiKeyOperation::SetupPin => self.current_state.next_state_after_pin_setup()?,
            YubiKeyOperation::GenerateIdentity => {
                self.current_state.next_state_after_identity_generation()?
            }
            YubiKeyOperation::RecoverRegistry => {
                self.current_state.next_state_after_registry_recovery()?
            }
            _ => {
                // Operations that don't change state
                if !self
                    .current_state
                    .available_operations()
                    .contains(&operation)
                {
                    return Err(StateTransitionError::OperationNotAvailable {
                        operation: operation.to_string(),
                        current_state: self.current_state.clone(),
                    });
                }
                return Ok(());
            }
        };

        // Record transition
        let transition = StateTransition {
            from: self.current_state.clone(),
            to: new_state.clone(),
            operation,
            timestamp: chrono::Utc::now(),
        };

        self.history.push(transition);
        self.current_state = new_state;

        Ok(())
    }

    /// Get transition history
    pub fn history(&self) -> &[StateTransition] {
        &self.history
    }
}

/// Record of a state transition
#[derive(Debug, Clone)]
pub struct StateTransition {
    pub from: YubiKeyState,
    pub to: YubiKeyState,
    pub operation: YubiKeyOperation,
    pub timestamp: chrono::DateTime<chrono::Utc>,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_state_properties() {
        assert!(YubiKeyState::New.needs_pin_setup());
        assert!(YubiKeyState::New.needs_age_identity());
        assert!(!YubiKeyState::New.has_custom_pin());
        assert!(!YubiKeyState::New.has_age_identity());
        assert!(!YubiKeyState::New.is_ready_for_operations());

        assert!(!YubiKeyState::Reused.needs_pin_setup());
        assert!(YubiKeyState::Reused.needs_age_identity());
        assert!(YubiKeyState::Reused.has_custom_pin());
        assert!(!YubiKeyState::Reused.has_age_identity());
        assert!(!YubiKeyState::Reused.is_ready_for_operations());

        assert!(!YubiKeyState::Registered.needs_pin_setup());
        assert!(!YubiKeyState::Registered.needs_age_identity());
        assert!(YubiKeyState::Registered.has_custom_pin());
        assert!(YubiKeyState::Registered.has_age_identity());
        assert!(YubiKeyState::Registered.is_ready_for_operations());

        assert!(!YubiKeyState::Orphaned.needs_pin_setup());
        assert!(!YubiKeyState::Orphaned.needs_age_identity());
        assert!(YubiKeyState::Orphaned.has_custom_pin());
        assert!(YubiKeyState::Orphaned.has_age_identity());
        assert!(YubiKeyState::Orphaned.needs_registry_recovery());
        assert!(!YubiKeyState::Orphaned.is_ready_for_operations());
    }

    #[test]
    fn test_valid_state_transitions() {
        // New -> Reused (PIN setup)
        let new_state = YubiKeyState::New;
        let after_pin = new_state.next_state_after_pin_setup().unwrap();
        assert_eq!(after_pin, YubiKeyState::Reused);

        // Reused -> Registered (identity generation)
        let reused_state = YubiKeyState::Reused;
        let after_identity = reused_state.next_state_after_identity_generation().unwrap();
        assert_eq!(after_identity, YubiKeyState::Registered);

        // Orphaned -> Registered (registry recovery)
        let orphaned_state = YubiKeyState::Orphaned;
        let after_recovery = orphaned_state.next_state_after_registry_recovery().unwrap();
        assert_eq!(after_recovery, YubiKeyState::Registered);

        // Orphaned -> Registered (identity regeneration)
        let after_identity = orphaned_state
            .next_state_after_identity_generation()
            .unwrap();
        assert_eq!(after_identity, YubiKeyState::Registered);
    }

    #[test]
    fn test_invalid_state_transitions() {
        // Can't set up PIN when already set up
        let reused_state = YubiKeyState::Reused;
        assert!(reused_state.next_state_after_pin_setup().is_err());

        // Can't generate identity without PIN setup
        let new_state = YubiKeyState::New;
        assert!(new_state.next_state_after_identity_generation().is_err());

        // Can't recover registry when not orphaned
        let registered_state = YubiKeyState::Registered;
        assert!(
            registered_state
                .next_state_after_registry_recovery()
                .is_err()
        );
    }

    #[test]
    fn test_available_operations() {
        let new_ops = YubiKeyState::New.available_operations();
        assert!(new_ops.contains(&YubiKeyOperation::SetupPin));
        assert!(new_ops.contains(&YubiKeyOperation::CheckStatus));
        assert!(!new_ops.contains(&YubiKeyOperation::Encrypt));

        let registered_ops = YubiKeyState::Registered.available_operations();
        assert!(registered_ops.contains(&YubiKeyOperation::Encrypt));
        assert!(registered_ops.contains(&YubiKeyOperation::Decrypt));
        assert!(!registered_ops.contains(&YubiKeyOperation::SetupPin));

        let orphaned_ops = YubiKeyState::Orphaned.available_operations();
        assert!(orphaned_ops.contains(&YubiKeyOperation::RecoverRegistry));
        assert!(!orphaned_ops.contains(&YubiKeyOperation::Encrypt));
    }

    #[test]
    fn test_state_machine() {
        let mut machine = YubiKeyStateMachine::new(YubiKeyState::New);
        assert_eq!(machine.current_state(), &YubiKeyState::New);

        // PIN setup: New -> Reused
        machine.transition(YubiKeyOperation::SetupPin).unwrap();
        assert_eq!(machine.current_state(), &YubiKeyState::Reused);

        // Identity generation: Reused -> Registered
        machine
            .transition(YubiKeyOperation::GenerateIdentity)
            .unwrap();
        assert_eq!(machine.current_state(), &YubiKeyState::Registered);

        // Operations that don't change state
        machine.transition(YubiKeyOperation::CheckStatus).unwrap();
        assert_eq!(machine.current_state(), &YubiKeyState::Registered);

        // Check history
        assert_eq!(machine.history().len(), 2); // PIN setup + identity generation
    }

    #[test]
    fn test_state_machine_invalid_operations() {
        let mut machine = YubiKeyStateMachine::new(YubiKeyState::New);

        // Can't encrypt in new state
        let result = machine.transition(YubiKeyOperation::Encrypt);
        assert!(result.is_err());
        assert!(matches!(
            result.unwrap_err(),
            StateTransitionError::OperationNotAvailable { .. }
        ));
    }

    #[test]
    fn test_display() {
        assert_eq!(YubiKeyState::New.to_string(), "New");
        assert_eq!(YubiKeyState::Registered.to_string(), "Registered");
        assert_eq!(PinStatus::Custom.to_string(), "Custom");
        assert_eq!(YubiKeyOperation::SetupPin.to_string(), "Set up PIN");
    }

    #[test]
    fn test_descriptions() {
        assert!(!YubiKeyState::New.description().is_empty());
        assert!(!YubiKeyState::Registered.next_steps().is_empty());
    }

    #[test]
    fn test_serialization() {
        let state = YubiKeyState::Registered;
        let json = serde_json::to_string(&state).unwrap();
        let deserialized: YubiKeyState = serde_json::from_str(&json).unwrap();
        assert_eq!(state, deserialized);

        let pin_status = PinStatus::Custom;
        let json = serde_json::to_string(&pin_status).unwrap();
        let deserialized: PinStatus = serde_json::from_str(&json).unwrap();
        assert_eq!(pin_status, deserialized);
    }
}
