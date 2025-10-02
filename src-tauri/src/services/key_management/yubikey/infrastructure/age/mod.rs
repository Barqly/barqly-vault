//! age-plugin-yubikey integration modules
//!
//! This module provides both standard and PTY-based implementations
//! for YubiKey operations via age-plugin-yubikey.

pub mod provider;
pub mod provider_pty;
pub mod pty_helpers;

pub use provider::AgePluginProvider;
pub use provider_pty::AgePluginPtyProvider;
