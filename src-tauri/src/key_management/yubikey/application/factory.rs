//! YubiKey Factory (Factory Pattern)
//!
//! Placeholder implementation - will be fully implemented in Week 2-3

/// YubiKey Factory - Creates and configures YubiKey objects
#[derive(Debug)]
pub struct YubiKeyFactory {
    // Will be implemented
}

impl Default for YubiKeyFactory {
    fn default() -> Self {
        Self::new()
    }
}

impl YubiKeyFactory {
    /// Create new factory (placeholder)
    pub fn new() -> Self {
        Self {}
    }
}
