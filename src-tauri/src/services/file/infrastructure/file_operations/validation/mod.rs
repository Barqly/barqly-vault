//! Validation module for file operations

pub mod content_validation;
pub mod path_validation;
pub mod size_validation;

// Re-export commonly used functions
pub use path_validation::{
    contains_traversal_attempt, get_relative_path, normalize_path,
    validate_and_create_output_directory, validate_archive_path, validate_paths,
    validate_single_path,
};
pub use size_validation::validate_file_size;
