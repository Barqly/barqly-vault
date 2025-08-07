//! Crypto commands module - maintains backward compatibility
//!
//! This module provides all cryptographic operations for the Barqly Vault application,
//! including key generation, encryption, decryption, and manifest verification.

pub mod decryption;
pub mod encryption;
pub mod file_helpers;
pub mod key_generation;
pub mod manifest;
pub mod progress;
pub mod validation;

// Re-export all commands and types to maintain existing interface
pub use decryption::{decrypt_data, DecryptDataInput, DecryptionResult};
pub use encryption::{encrypt_files, EncryptDataInput};
pub use key_generation::{generate_key, GenerateKeyInput, GenerateKeyResponse};
pub use manifest::{verify_manifest, VerifyManifestInput, VerifyManifestResponse};
pub use progress::{
    get_encryption_status, get_progress, EncryptionStatus, EncryptionStatusResponse,
    GetEncryptionStatusInput, GetProgressInput, GetProgressResponse,
};
pub use validation::{validate_passphrase, ValidatePassphraseInput, ValidatePassphraseResponse};

// Shared state management
use std::collections::HashMap;
use std::sync::atomic::AtomicBool;
use std::sync::Mutex;

/// Global operation state to prevent race conditions
pub(crate) static ENCRYPTION_IN_PROGRESS: AtomicBool = AtomicBool::new(false);

/// Global progress tracking
pub(crate) static PROGRESS_TRACKER: once_cell::sync::Lazy<
    Mutex<HashMap<String, crate::commands::types::ProgressUpdate>>,
> = once_cell::sync::Lazy::new(|| Mutex::new(HashMap::new()));

/// Update global progress for an operation
pub(crate) fn update_global_progress(
    operation_id: &str,
    progress: crate::commands::types::ProgressUpdate,
) {
    if let Ok(mut tracker) = PROGRESS_TRACKER.lock() {
        tracker.insert(operation_id.to_string(), progress);
    }
}

/// Get global progress for an operation
pub(crate) fn get_global_progress(
    operation_id: &str,
) -> Option<crate::commands::types::ProgressUpdate> {
    if let Ok(tracker) = PROGRESS_TRACKER.lock() {
        tracker.get(operation_id).cloned()
    } else {
        None
    }
}
