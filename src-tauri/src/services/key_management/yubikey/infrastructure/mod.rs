//! YubiKey Infrastructure Components
//!
//! This module contains the low-level infrastructure components that were
//! consolidated from crypto/yubikey/ to maintain cohesion within the
//! YubiKey management architecture.

pub mod age;
pub mod providers;
pub mod pty;

// Re-export key infrastructure types from age module
pub use age::{AgePluginProvider, AgePluginPtyProvider};
// Re-export all types from providers module
pub use providers::*;
