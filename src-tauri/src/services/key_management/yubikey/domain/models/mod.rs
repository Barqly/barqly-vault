//! YubiKey domain models

pub mod available_yubikey;
pub mod device;
pub mod identity;
pub mod initialization;
pub mod pin;
pub mod serial;
pub mod state;
pub mod yubikey_state_info;

// Re-export all domain objects for easy import
pub use available_yubikey::AvailableYubiKey;
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
pub use yubikey_state_info::YubiKeyStateInfo;
