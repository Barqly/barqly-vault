//! Error recovery guidance
//!
//! This module provides user-friendly recovery guidance for different error codes.

use super::ErrorCode;

/// Get recovery guidance and user actionable flag for an error code
pub fn get_recovery_guidance(code: &ErrorCode) -> (Option<String>, bool) {
    match code {
        // Validation errors - user actionable
        ErrorCode::InvalidInput => (
            Some("Double-check the format and content of your input, then try again".to_string()),
            true,
        ),
        ErrorCode::MissingParameter => (
            Some("Fill in all required fields before proceeding".to_string()),
            true,
        ),
        ErrorCode::InvalidPath => (
            Some("Browse to select a valid file or folder, or check the path spelling".to_string()),
            true,
        ),
        ErrorCode::InvalidKeyLabel => (
            Some("Change the key label to use only letters (a-z, A-Z), numbers (0-9), and dashes (-)".to_string()),
            true,
        ),
        ErrorCode::WeakPassphrase => (
            Some("Create a stronger passphrase with at least 12 characters, including uppercase/lowercase letters, numbers, and special characters like !@#$%".to_string()),
            true,
        ),
        ErrorCode::InvalidFileFormat => {
            (Some("Select a supported file format or verify the file isn't corrupted".to_string()), true)
        }
        ErrorCode::FileTooLarge => (
            Some("Choose a smaller file, or split large files into smaller parts before encryption".to_string()),
            true,
        ),
        ErrorCode::TooManyFiles => (
            Some("Reduce the number of selected files, or encrypt them in smaller batches".to_string()),
            true,
        ),

        // Permission errors - user actionable
        ErrorCode::PermissionDenied => (
            Some("Right-click the file/folder and check permissions, or try running as administrator/sudo".to_string()),
            true,
        ),
        ErrorCode::PathNotAllowed => (
            Some("Choose a file from your Documents, Desktop, or other user-accessible folders".to_string()),
            true,
        ),
        ErrorCode::InsufficientPermissions => (
            Some("Close and restart the application as administrator (Windows) or with sudo (macOS/Linux)".to_string()),
            true,
        ),
        ErrorCode::ReadOnlyFileSystem => (
            Some("The destination is read-only. Choose a writable location like Documents or Desktop".to_string()),
            true,
        ),

        // Not found errors - user actionable
        ErrorCode::KeyNotFound => (
            Some("Generate a new key in the Setup tab, or check if the key file was moved or deleted".to_string()),
            true,
        ),
        ErrorCode::FileNotFound => (
            Some("Verify the file still exists at the specified location, or browse to select it again".to_string()),
            true,
        ),
        ErrorCode::DirectoryNotFound => (
            Some("Check if the folder exists and you have access to it, or create the folder first".to_string()),
            true,
        ),
        ErrorCode::OperationNotFound => (
            Some("The requested operation is not available. Restart the application and try again".to_string()),
            true,
        ),

        // Operation errors - some user actionable
        ErrorCode::EncryptionFailed => (
            Some("Verify the selected key is correct and files are accessible. If files are open in another program, close them first".to_string()),
            true,
        ),
        ErrorCode::DecryptionFailed => (
            Some("Ensure you're using the correct key that was used for encryption, and double-check your passphrase".to_string()),
            true,
        ),
        ErrorCode::StorageFailed => (
            Some("Free up disk space (need at least 2x the file size), or choose a different destination with more space".to_string()),
            true,
        ),
        ErrorCode::ArchiveCorrupted => (
            Some("The encrypted file may be damaged. Try using a backup copy, or re-encrypt the original files".to_string()),
            true,
        ),
        ErrorCode::ManifestInvalid => (
            Some("The file list inside the archive is corrupted. Use a backup copy or re-encrypt the original files".to_string()),
            true,
        ),
        ErrorCode::IntegrityCheckFailed => (
            Some("File verification failed - the archive may be tampered with or corrupted. Use a trusted backup copy".to_string()),
            true,
        ),
        ErrorCode::ConcurrentOperation => (
            Some("Wait for the current operation to complete (check progress indicator), then try again".to_string()),
            true,
        ),

        // Resource errors - some user actionable
        ErrorCode::DiskSpaceInsufficient => (
            Some("Free up disk space by deleting temporary files, emptying trash, or choosing a different drive with more space".to_string()),
            true,
        ),
        ErrorCode::MemoryInsufficient => (
            Some("Close other applications to free up memory, or try encrypting smaller files in batches".to_string()),
            true,
        ),
        ErrorCode::FileSystemError => (
            Some("Check disk health with system utilities, restart the application, or try a different drive".to_string()),
            true,
        ),
        ErrorCode::NetworkError => (
            Some("This shouldn't happen as Barqly Vault works offline. Restart the application if this persists".to_string()),
            true,
        ),

        // Security errors - user actionable
        ErrorCode::InvalidKey => (
            Some("Select the key that was originally used for encryption, or generate a new key if this is your first time".to_string()),
            true,
        ),
        ErrorCode::WrongPassphrase => {
            (Some("Re-enter your passphrase carefully. Check for Caps Lock and try typing it in a text editor first to verify".to_string()), true)
        }
        ErrorCode::TamperedData => (
            Some("The encrypted data has been modified. Use a backup copy from a trusted source".to_string()),
            true,
        ),
        ErrorCode::UnauthorizedAccess => (
            Some("Make sure you have permission to access this file/folder, or contact your system administrator".to_string()),
            true,
        ),

        // Internal errors - not user actionable
        ErrorCode::InternalError => (
            Some("An internal error occurred. Restart the application, and if the problem persists, report this issue on GitHub".to_string()),
            false,
        ),
        ErrorCode::UnexpectedError => (
            Some("An unexpected error occurred. Restart the application, and if it continues, try reinstalling".to_string()),
            false,
        ),
        ErrorCode::ConfigurationError => (
            Some("Configuration is corrupted. Try reinstalling the application or delete the config folder and restart".to_string()),
            false,
        ),
    }
}
