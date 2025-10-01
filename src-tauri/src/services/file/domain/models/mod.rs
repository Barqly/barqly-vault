//! File domain models
//!
//! Data transfer objects and domain entities for file operations

pub mod file_info;
pub mod file_rules;
pub mod file_selection;
pub mod manifest;
pub mod selection_type;

// Re-export for convenience
pub use file_info::FileInfo;
pub use file_rules::*;
pub use file_selection::FileSelection;
pub use manifest::Manifest;
pub use selection_type::SelectionType;
