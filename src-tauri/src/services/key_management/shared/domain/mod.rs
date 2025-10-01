pub mod models;
pub mod registry;
pub mod traits;

// Re-export models
pub use models::*;

// Re-export registry (concrete struct takes precedence over trait)
pub use registry::{DeviceRegistry, RegistryStatistics};

// Re-export traits (all except DeviceRegistry trait which conflicts with struct)
pub use traits::{
    CryptoProvider, DeviceCapability, DeviceConfig, DeviceCredential, DeviceEvent,
    DeviceEventHandler, DeviceFactory, DeviceId, DeviceIdentity, DeviceInfo, DeviceInitConfig,
    DeviceResult, HardwareSecurityDevice, IdentityManager, PinPolicy, SigningProvider, TouchPolicy,
};
