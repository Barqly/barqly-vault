//! Progress tracking types for long-running operations
//!
//! This module defines types for reporting progress updates during operations.

use serde::{Deserialize, Serialize};

/// Progress update for streaming operations with detailed information
///
/// This struct provides comprehensive progress information for long-running operations.
/// The frontend can use this to display progress bars, status messages, and estimated completion times.
///
/// # TypeScript Equivalent
/// ```typescript
/// interface ProgressUpdate {
///   operation_id: string;
///   progress: number; // 0.0 to 1.0
///   message: string;
///   details?: ProgressDetails;
///   timestamp: string; // ISO 8601
///   estimated_time_remaining?: number; // seconds
/// }
/// ```
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ProgressUpdate {
    /// Unique identifier for the operation
    pub operation_id: String,
    /// Progress percentage from 0.0 to 1.0
    pub progress: f32,
    /// Human-readable status message
    pub message: String,
    /// Optional operation-specific progress details
    pub details: Option<ProgressDetails>,
    /// Timestamp of the progress update
    pub timestamp: chrono::DateTime<chrono::Utc>,
    /// Estimated time remaining in seconds
    pub estimated_time_remaining: Option<u64>,
}

/// Operation-specific progress details for different command types
///
/// This enum provides detailed progress information specific to different operation types.
/// The frontend can use this to display operation-specific progress indicators.
///
/// # TypeScript Equivalent
/// ```typescript
/// type ProgressDetails =
///   | { type: 'FileOperation'; current_file: string; total_files: number; current_file_progress: number; current_file_size: number; total_size: number }
///   | { type: 'Encryption'; bytes_processed: number; total_bytes: number; encryption_rate?: number }
///   | { type: 'Decryption'; bytes_processed: number; total_bytes: number; decryption_rate?: number }
///   | { type: 'ArchiveOperation'; files_processed: number; total_files: number; bytes_processed: number; total_bytes: number; compression_ratio?: number }
///   | { type: 'ManifestOperation'; files_verified: number; total_files: number; current_file: string };
/// ```
#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(tag = "type")]
pub enum ProgressDetails {
    /// File operation progress (copying, moving, etc.)
    FileOperation {
        /// Current file being processed
        current_file: String,
        /// Total number of files to process
        total_files: usize,
        /// Progress within current file (0.0 to 1.0)
        current_file_progress: f32,
        /// Size of current file in bytes
        current_file_size: u64,
        /// Total size of all files in bytes
        total_size: u64,
    },
    /// Encryption operation progress
    Encryption {
        /// Bytes processed so far
        bytes_processed: u64,
        /// Total bytes to process
        total_bytes: u64,
        /// Encryption rate in bytes per second
        encryption_rate: Option<f64>,
    },
    /// Decryption operation progress
    Decryption {
        /// Bytes processed so far
        bytes_processed: u64,
        /// Total bytes to process
        total_bytes: u64,
        /// Decryption rate in bytes per second
        decryption_rate: Option<f64>,
    },
    /// Archive operation progress (compression, extraction)
    ArchiveOperation {
        /// Files processed so far
        files_processed: usize,
        /// Total files to process
        total_files: usize,
        /// Bytes processed so far
        bytes_processed: u64,
        /// Total bytes to process
        total_bytes: u64,
        /// Compression ratio achieved
        compression_ratio: Option<f32>,
    },
    /// Manifest operation progress (verification, generation)
    ManifestOperation {
        /// Files verified so far
        files_verified: usize,
        /// Total files to verify
        total_files: usize,
        /// Current file being verified
        current_file: String,
    },
    /// YubiKey operation progress
    YubiKeyOperation {
        /// Type of YubiKey operation
        operation: YubiKeyOperationType,
        /// Current phase of the operation
        phase: YubiKeyPhase,
        /// Whether user interaction is required
        requires_interaction: bool,
        /// Additional context information
        context: Option<String>,
    },
}

/// Types of YubiKey operations
#[derive(Debug, Serialize, Deserialize, Clone)]
pub enum YubiKeyOperationType {
    Detection,
    Initialization,
    Authentication,
    KeyGeneration,
    Encryption,
    Decryption,
    PluginDeployment,
}

/// Phases of YubiKey operations
#[derive(Debug, Serialize, Deserialize, Clone)]
pub enum YubiKeyPhase {
    Starting,
    InProgress { percentage: Option<u8> },
    WaitingForPin,
    WaitingForTouch,
    Completing,
    Completed,
    Failed { error: String },
}
