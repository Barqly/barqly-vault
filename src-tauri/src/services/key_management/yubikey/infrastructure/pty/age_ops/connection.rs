/// YubiKey connection testing operations
/// Handles connection verification and testing
use super::super::core::Result;
use super::identity::list_yubikey_identities;
use crate::prelude::*;

/// Test YubiKey connection by listing identities
#[instrument]
pub fn test_yubikey_connection() -> Result<bool> {
    match list_yubikey_identities() {
        Ok(identities) => Ok(!identities.is_empty()),
        Err(_) => Ok(false),
    }
}
