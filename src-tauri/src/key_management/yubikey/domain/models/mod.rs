//! YubiKey domain models
//!
//! This module contains all YubiKey-related domain objects that replace
//! primitive obsession and provide proper domain modeling.
//!
//! ## Architecture
//!
//! These domain objects are the foundation of the new YubiKey architecture:
//! - Replace primitive strings with validated domain objects
//! - Eliminate duplicate implementations across the codebase
//! - Provide single source of truth for all YubiKey concepts
//!
//! ## Domain Objects
//!
//! - `Serial`: YubiKey serial number with validation (8-12 digits)
//! - `Pin`: YubiKey PIN with security validation and complexity scoring
//! - `YubiKeyDevice`: Physical device representation with capabilities
//! - `YubiKeyIdentity`: Age-plugin identity with validation
//! - `YubiKeyState`: Single enum for all state management (eliminates duplicates)

pub mod device;
pub mod identity;
pub mod initialization;
pub mod pin;
pub mod serial;
pub mod state;

// Re-export all domain objects for easy import
pub use device::{
    Capability, ConnectionState, DeviceCapabilities, DeviceHealth, DeviceSummary, FormFactor,
    Interface, SlotInfo, SlotType, YubiKeyDevice,
};
pub use identity::{
    IdentityBuilder, IdentityValidationError, RedactedIdentity, YubiKeyIdentity, identity_utils,
};
pub use initialization::{
    InitializationResult, PinPolicy, ProtectionMode, TouchPolicy, UnlockCredentials, UnlockMethod,
    policy_config,
};
pub use pin::{Pin, PinValidationError};
pub use serial::{Serial, SerialValidationError};
pub use state::{
    PinStatus, StateTransition, StateTransitionError, YubiKeyOperation, YubiKeyState,
    YubiKeyStateMachine,
};

/// Commonly used type aliases
pub type YubiKeySerial = Serial;
pub type YubiKeyPin = Pin;

/// Domain validation results
pub type SerialResult<T> = Result<T, SerialValidationError>;
pub type PinResult<T> = Result<T, PinValidationError>;
pub type IdentityResult<T> = Result<T, IdentityValidationError>;
pub type StateResult<T> = Result<T, StateTransitionError>;

#[cfg(test)]
mod integration_tests {
    use super::*;

    #[test]
    fn test_domain_objects_work_together() {
        // Create a serial
        let serial = Serial::new("12345678".to_string()).unwrap();

        // Create a PIN
        let _pin = Pin::new("194763".to_string()).unwrap();

        // Create a device
        let device = YubiKeyDevice::from_detected_device(
            serial.clone(),
            "YubiKey 5 NFC".to_string(),
            FormFactor::UsbA,
            vec![Interface::USB, Interface::NFC],
            Some("5.4.3".to_string()),
        );

        // Create an identity
        let identity_tag = "AGE-PLUGIN-YUBIKEY-TEST123INTEGRATION".to_string();
        let identity = YubiKeyIdentity::new(identity_tag, serial.clone()).unwrap();

        // Create state machine
        let mut state_machine = YubiKeyStateMachine::new(YubiKeyState::New);

        // Verify they work together
        assert_eq!(device.serial(), &serial);
        assert!(identity.matches_serial(&serial));
        assert_eq!(state_machine.current_state(), &YubiKeyState::New);

        // Test state transitions
        state_machine
            .transition(YubiKeyOperation::SetupPin)
            .unwrap();
        assert_eq!(state_machine.current_state(), &YubiKeyState::Reused);

        state_machine
            .transition(YubiKeyOperation::GenerateIdentity)
            .unwrap();
        assert_eq!(state_machine.current_state(), &YubiKeyState::Registered);

        // Verify final state
        assert!(state_machine.current_state().is_ready_for_operations());
    }

    #[test]
    fn test_redaction_for_security() {
        let serial = Serial::new("12345678".to_string()).unwrap();
        let pin = Pin::new("194763".to_string()).unwrap();
        let identity_tag = "AGE-PLUGIN-YUBIKEY-REDACTION123TEST".to_string();
        let identity = YubiKeyIdentity::new(identity_tag, serial.clone()).unwrap();

        // All domain objects should provide redacted versions for logging
        let serial_redacted = serial.redacted();
        let pin_masked = pin.masked();
        let identity_redacted = identity.redacted();

        // Verify no sensitive data is exposed
        assert!(serial_redacted.contains("***"));
        assert!(!serial_redacted.contains("12345678"));

        assert!(pin_masked.contains("PIN("));
        assert!(!pin_masked.contains("194763"));

        assert!(!identity_redacted.serial_redacted.contains("12345678"));
    }

    #[test]
    fn test_validation_comprehensive() {
        // Test all validation errors can occur

        // Serial validation
        assert!(Serial::new("".to_string()).is_err());
        assert!(Serial::new("12345".to_string()).is_err());
        assert!(Serial::new("1234567890123".to_string()).is_err());
        assert!(Serial::new("1234abcd".to_string()).is_err());

        // PIN validation
        assert!(Pin::new("".to_string()).is_err());
        assert!(Pin::new("12345".to_string()).is_err());
        assert!(Pin::new("123456789".to_string()).is_err());
        assert!(Pin::new("123abc".to_string()).is_err());
        assert!(Pin::new("123456".to_string()).is_err()); // Weak PIN

        // Identity validation
        let serial = Serial::new("12345678".to_string()).unwrap();
        assert!(YubiKeyIdentity::new("".to_string(), serial.clone()).is_err());
        assert!(YubiKeyIdentity::new("invalid".to_string(), serial.clone()).is_err());
        assert!(YubiKeyIdentity::new("AGE-PLUGIN-YUBIKEY-".to_string(), serial).is_err());
    }

    #[test]
    fn test_state_machine_comprehensive() {
        let mut machine = YubiKeyStateMachine::new(YubiKeyState::New);

        // Test full workflow: New -> Reused -> Registered
        assert!(machine.current_state().needs_pin_setup());
        machine.transition(YubiKeyOperation::SetupPin).unwrap();

        assert!(machine.current_state().needs_age_identity());
        machine
            .transition(YubiKeyOperation::GenerateIdentity)
            .unwrap();

        assert!(machine.current_state().is_ready_for_operations());

        // Test invalid transitions are caught
        assert!(machine.transition(YubiKeyOperation::SetupPin).is_err());

        // Test orphaned recovery
        let mut orphaned_machine = YubiKeyStateMachine::new(YubiKeyState::Orphaned);
        assert!(orphaned_machine.current_state().needs_registry_recovery());
        orphaned_machine
            .transition(YubiKeyOperation::RecoverRegistry)
            .unwrap();
        assert!(orphaned_machine.current_state().is_ready_for_operations());
    }
}
