//! YubiKey Application Layer
//!
//! Contains application services, orchestration logic, state management,
//! and event handling. This layer coordinates domain objects and infrastructure.

pub mod events;
pub mod factory;
pub mod manager;
pub mod services;
pub mod state;

// Re-export key application types
pub use events::*;
pub use factory::YubiKeyFactory;
pub use manager::{YubiKeyManager, YubiKeyManagerConfig};
pub use state::*;
