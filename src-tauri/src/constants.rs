//! Constants used throughout the Barqly Vault application
//!
//! This module centralizes all magic numbers and constant values used across
//! the codebase to improve maintainability and make configuration changes easier.

// ============================================================================
// Crypto Constants
// ============================================================================
/// Minimum required passphrase length for security
pub const MIN_PASSPHRASE_LENGTH: usize = 12;

/// Minimum passphrase length for basic validation (used in input validation)
pub const MIN_PASSPHRASE_LENGTH_BASIC: usize = 8;

/// Minimum length to check for sequential characters in passphrase
pub const MIN_LENGTH_FOR_SEQUENCE_CHECK: usize = 3;

/// Buffer size for I/O operations (256KB - optimized for modern SSDs)
pub const IO_BUFFER_SIZE: usize = 256 * 1024;

// ============================================================================
// File Size Constants
// ============================================================================

/// Maximum allowed file size for encryption (100MB)
pub const MAX_FILE_SIZE: u64 = 100 * 1024 * 1024;

/// Maximum allowed archive size (100MB)
pub const MAX_ARCHIVE_SIZE: u64 = 100 * 1024 * 1024;

/// Maximum total archive size for file operations (1GB)
pub const MAX_TOTAL_ARCHIVE_SIZE: u64 = 1024 * 1024 * 1024;

/// Bytes per megabyte for size calculations
pub const BYTES_PER_MB: u64 = 1024 * 1024;

/// Bytes per megabyte as float for display formatting
pub const BYTES_PER_MB_F64: f64 = 1024.0 * 1024.0;

// ============================================================================
// Validation Constants
// ============================================================================

/// Maximum number of files allowed in a single encryption operation
pub const MAX_FILES_PER_OPERATION: usize = 1000;

/// Maximum length for operation ID
pub const MAX_OPERATION_ID_LENGTH: usize = 100;

/// Maximum length for key label
pub const MAX_KEY_LABEL_LENGTH: usize = 100;

// ============================================================================
// Progress Constants
// ============================================================================

/// Total progress work units for progress tracking
pub const PROGRESS_TOTAL_WORK: u64 = 100;

/// Progress percentage multiplier
pub const PROGRESS_PERCENTAGE_MULTIPLIER: f32 = 100.0;

// Progress milestones for encryption operations
pub const PROGRESS_ENCRYPT_INIT: f32 = 0.05;
pub const PROGRESS_ENCRYPT_KEY_RETRIEVAL: f32 = 0.10;
pub const PROGRESS_ENCRYPT_FILE_VALIDATION: f32 = 0.15;
pub const PROGRESS_ENCRYPT_ARCHIVE_START: f32 = 0.20;
pub const PROGRESS_ENCRYPT_ARCHIVE_COMPLETE: f32 = 0.60;
pub const PROGRESS_ENCRYPT_READ_ARCHIVE: f32 = 0.70;
pub const PROGRESS_ENCRYPT_ENCRYPTING: f32 = 0.80;
pub const PROGRESS_ENCRYPT_WRITING: f32 = 0.90;
pub const PROGRESS_ENCRYPT_CLEANUP: f32 = 0.95;

// Progress milestones for decryption operations
pub const PROGRESS_DECRYPT_INIT: f32 = 0.05;
pub const PROGRESS_DECRYPT_KEY_LOAD: f32 = 0.10;
pub const PROGRESS_DECRYPT_KEY_DECRYPT: f32 = 0.20;
pub const PROGRESS_DECRYPT_READ_FILE: f32 = 0.30;
pub const PROGRESS_DECRYPT_DECRYPTING: f32 = 0.50;
pub const PROGRESS_DECRYPT_EXTRACT: f32 = 0.70;
pub const PROGRESS_DECRYPT_CLEANUP: f32 = 0.90;
pub const PROGRESS_DECRYPT_VERIFY: f32 = 0.95;

// Progress milestones for manifest verification
pub const PROGRESS_VERIFY_INIT: f32 = 0.10;
pub const PROGRESS_VERIFY_LOAD: f32 = 0.30;
pub const PROGRESS_VERIFY_SCAN: f32 = 0.50;
pub const PROGRESS_VERIFY_CHECK: f32 = 0.70;

// ============================================================================
// Logging Constants
// ============================================================================

/// Number of random suffix characters for log files
pub const LOG_FILE_SUFFIX_LENGTH: usize = 12;

// ============================================================================
// Hash Constants
// ============================================================================

/// SHA-256 is used for file integrity checking
pub const HASH_ALGORITHM: &str = "SHA-256";

// ============================================================================
// Cache Constants
// ============================================================================

/// Default size for LRU caches (number of entries)
pub const DEFAULT_CACHE_SIZE: usize = 100;

/// Cache TTL in seconds for key listing operations
pub const KEY_CACHE_TTL_SECONDS: u64 = 300; // 5 minutes

/// Cache TTL in seconds for directory metadata
pub const DIRECTORY_CACHE_TTL_SECONDS: u64 = 60; // 1 minute

// ============================================================================
// Progress Debouncing Constants
// ============================================================================

/// Progress update debounce interval in milliseconds
pub const PROGRESS_DEBOUNCE_INTERVAL_MS: u64 = 100;

/// Minimum progress change to force immediate emission (10%)
pub const PROGRESS_FORCE_EMIT_THRESHOLD: f32 = 0.1;

/// Progress values that should never be debounced (start/end)
pub const PROGRESS_IMMEDIATE_EMIT_VALUES: &[f32] = &[0.0, 1.0];
