//! Archive operations module
//!
//! This module provides functionality for creating and extracting TAR.GZ archives.
//! It handles file compression, decompression, and archive integrity.

pub mod creation;
pub mod extraction;

// Re-export main functions for backward compatibility
pub use creation::{create_archive, create_archive_with_progress};
pub use extraction::extract_archive;
