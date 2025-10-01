//! File selection result model

use serde::Serialize;

/// File selection result
#[derive(Debug, Serialize, specta::Type)]
pub struct FileSelection {
    pub paths: Vec<String>,
    pub total_size: u64,
    pub file_count: usize,
    pub selection_type: String,
}
