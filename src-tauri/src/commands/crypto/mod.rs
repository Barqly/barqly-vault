//! Crypto commands module - maintains backward compatibility
//!
//! This module provides all cryptographic operations for the Barqly Vault application,
//! including key generation, encryption, decryption, and manifest verification.

pub mod decryption;
pub mod encryption;
pub mod file_helpers;
pub mod key_generation_multi;
pub mod manifest;
pub mod progress;

// Re-export all commands and types to maintain existing interface
pub use decryption::{DecryptDataInput, DecryptionResult, decrypt_data};
pub use encryption::{
    EncryptDataInput, EncryptFilesMultiInput, EncryptFilesMultiResponse, encrypt_files,
    encrypt_files_multi,
};
pub use key_generation_multi::{
    GenerateKeyMultiInput, GenerateKeyMultiResponse, generate_key_multi,
};
pub use manifest::{VerifyManifestInput, VerifyManifestResponse, verify_manifest};
pub use progress::{
    EncryptionStatus, EncryptionStatusResponse, GetEncryptionStatusInput, GetProgressInput,
    GetProgressResponse, get_encryption_status, get_progress,
};

// Passphrase commands moved to commands::passphrase module
// Re-export for backward compatibility
pub use crate::commands::passphrase::{
    GenerateKeyInput, GenerateKeyResponse, PassphraseValidationResult, ValidatePassphraseInput,
    ValidatePassphraseResponse, VerifyKeyPassphraseInput, VerifyKeyPassphraseResponse,
    generate_key, validate_passphrase, validate_passphrase_strength, verify_key_passphrase,
};

// Shared state management
use std::collections::HashMap;
use std::sync::Mutex;
use std::sync::atomic::AtomicBool;

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
