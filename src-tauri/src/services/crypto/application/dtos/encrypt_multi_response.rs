//! Multi-key encryption response DTO

use serde::Serialize;

/// Response from multi-key encryption command
#[derive(Debug, Serialize, specta::Type)]
pub struct EncryptFilesMultiResponse {
    /// Path to the backup bundle (for self-recovery)
    pub encrypted_file_path: String,
    /// Path to the shared bundle (for recipients) - present when Recipients exist
    pub shared_file_path: Option<String>,
    pub manifest_file_path: String,
    pub file_exists_warning: bool,
    pub keys_used: Vec<String>,
}
