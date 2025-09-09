//! Error codes for command error handling
//!
//! This module defines error codes that enable client-side error handling
//! and internationalization.

use serde::{Deserialize, Serialize};

/// Error codes for client-side handling and internationalization
///
/// These codes enable the frontend to:
/// - Display appropriate error messages
/// - Implement error-specific recovery flows
/// - Provide localized error messages
/// - Handle errors programmatically
///
/// # TypeScript Equivalent
/// ```typescript
/// enum ErrorCode {
///   // Validation errors
///   INVALID_INPUT = 'INVALID_INPUT',
///   MISSING_PARAMETER = 'MISSING_PARAMETER',
///   // ... etc
/// }
/// ```
#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum ErrorCode {
    // Validation errors
    InvalidInput,
    MissingParameter,
    InvalidPath,
    InvalidKeyLabel,
    WeakPassphrase,
    InvalidFileFormat,
    FileTooLarge,
    TooManyFiles,

    // Permission errors
    PermissionDenied,
    PathNotAllowed,
    InsufficientPermissions,
    ReadOnlyFileSystem,

    // Not found errors
    KeyNotFound,
    FileNotFound,
    DirectoryNotFound,
    OperationNotFound,

    // Operation errors
    EncryptionFailed,
    DecryptionFailed,
    StorageFailed,
    ArchiveCorrupted,
    ManifestInvalid,
    IntegrityCheckFailed,
    ConcurrentOperation,

    // Resource errors
    DiskSpaceInsufficient,
    MemoryInsufficient,
    FileSystemError,
    NetworkError,

    // Security errors
    InvalidKey,
    WrongPassphrase,
    TamperedData,
    UnauthorizedAccess,

    // YubiKey Hardware Errors
    YubiKeyNotFound,
    YubiKeyPinRequired,
    YubiKeyPinBlocked,
    YubiKeyTouchRequired,
    YubiKeyTouchTimeout,
    WrongYubiKey,
    YubiKeySlotInUse,
    YubiKeyInitializationFailed,
    YubiKeyCommunicationError,

    // Plugin Errors
    PluginNotFound,
    PluginVersionMismatch,
    PluginExecutionFailed,
    PluginDeploymentFailed,

    // Multi-recipient Errors
    NoUnlockMethodAvailable,
    RecipientMismatch,
    MultiRecipientSetupFailed,

    // Internal errors
    InternalError,
    UnexpectedError,
    ConfigurationError,
}
