/// Age operations module organization
/// Re-exports all age-related operations for YubiKey
pub mod connection;
pub mod decryption;
pub mod encryption;
pub mod identity;

// Re-export for backward compatibility
pub use connection::*;
pub use decryption::*;
pub use encryption::*;
pub use identity::*;
