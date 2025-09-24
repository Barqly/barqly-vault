//! YubiKey Application Layer
//!
//! Contains application services, orchestration logic, state management,
//! and event handling. This layer coordinates domain objects and infrastructure.

pub mod services;
pub mod manager;
pub mod factory;
pub mod events;
pub mod state;

// Re-export key application types
pub use manager::{YubiKeyManager, YubiKeyManagerConfig};
pub use factory::YubiKeyFactory;
pub use events::*;
pub use state::*;