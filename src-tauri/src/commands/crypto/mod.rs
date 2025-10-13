//! Crypto commands module
//!
//! This module provides cryptographic operations for encryption, decryption,
//! manifest verification, and vault analysis. For passphrase key operations, see commands::passphrase.

pub mod decryption;
pub mod encryption;
pub mod manifest;
pub mod progress;
pub mod vault_analysis;

pub use decryption::{DecryptDataInput, DecryptionResult, decrypt_data};
pub use encryption::{
    EncryptDataInput, EncryptFilesMultiInput, EncryptFilesMultiResponse, encrypt_files,
    encrypt_files_multi,
};
pub use manifest::{VerifyManifestInput, VerifyManifestResponse, verify_manifest};
pub use progress::{
    EncryptionStatus, EncryptionStatusResponse, GetEncryptionStatusInput, GetProgressInput,
    GetProgressResponse, get_encryption_status, get_progress,
};
pub use vault_analysis::{
    AnalyzeEncryptedVaultRequest, AnalyzeEncryptedVaultResponse, analyze_encrypted_vault,
};

// Re-export global progress functions from infrastructure layer
// Commands can still access these for backward compatibility
pub(crate) use crate::services::shared::infrastructure::progress::{
    get_global_progress, update_global_progress,
};
