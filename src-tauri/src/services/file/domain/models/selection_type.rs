//! File selection type enum

use serde::Deserialize;

/// File selection type
#[derive(Debug, Deserialize, specta::Type)]
pub enum SelectionType {
    Files,
    Folder,
}
