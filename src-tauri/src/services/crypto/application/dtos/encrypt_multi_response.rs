//! Multi-key encryption response DTO

use serde::Serialize;

/// Response from multi-key encryption command
#[derive(Debug, Serialize, specta::Type)]
pub struct EncryptFilesMultiResponse {
    pub encrypted_file_path: String,
    pub manifest_file_path: String,
    pub file_exists_warning: bool,
    pub keys_used: Vec<String>,
}
