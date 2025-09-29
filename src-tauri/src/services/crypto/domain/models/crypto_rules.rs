use super::super::errors::{CryptoError, CryptoResult};
use crate::constants::*;

/// Business rules for crypto operations
pub struct CryptoRules;

impl CryptoRules {
    /// Validate encryption input parameters
    pub fn validate_encryption_input(
        key_id: &str,
        file_paths: &[String],
        output_name: Option<&str>,
    ) -> CryptoResult<()> {
        // Validate key ID
        if key_id.trim().is_empty() {
            return Err(CryptoError::InvalidKey(
                "Key ID cannot be empty".to_string(),
            ));
        }

        // Validate file paths
        if file_paths.is_empty() {
            return Err(CryptoError::InvalidInput(
                "No files provided for encryption".to_string(),
            ));
        }

        if file_paths.len() > MAX_FILES_PER_OPERATION {
            return Err(CryptoError::InvalidInput(format!(
                "Cannot encrypt more than {} files",
                MAX_FILES_PER_OPERATION
            )));
        }

        // Validate output name if provided
        if let Some(name) = output_name
            && name.trim().is_empty()
        {
            return Err(CryptoError::InvalidInput(
                "Output name cannot be empty".to_string(),
            ));
        }

        Ok(())
    }

    /// Validate decryption input parameters
    pub fn validate_decryption_input(
        encrypted_file: &str,
        key_id: &str,
        output_dir: &str,
    ) -> CryptoResult<()> {
        // Validate encrypted file
        if encrypted_file.trim().is_empty() {
            return Err(CryptoError::InvalidInput(
                "Encrypted file path cannot be empty".to_string(),
            ));
        }

        // Validate key ID
        if key_id.trim().is_empty() {
            return Err(CryptoError::InvalidKey(
                "Key ID cannot be empty".to_string(),
            ));
        }

        // Validate output directory
        if output_dir.trim().is_empty() {
            return Err(CryptoError::InvalidInput(
                "Output directory cannot be empty".to_string(),
            ));
        }

        Ok(())
    }

    /// Check if operation can proceed (no concurrent operations)
    pub fn can_start_operation() -> CryptoResult<()> {
        // This would check global state for concurrent operations
        // For now, always allow (the actual implementation handles this)
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_validate_encryption_empty_key() {
        assert!(
            CryptoRules::validate_encryption_input("", &["file.txt".to_string()], None).is_err()
        );
    }

    #[test]
    fn test_validate_encryption_empty_files() {
        assert!(CryptoRules::validate_encryption_input("key1", &[], None).is_err());
    }

    #[test]
    fn test_validate_encryption_valid() {
        assert!(
            CryptoRules::validate_encryption_input(
                "key1",
                &["file.txt".to_string()],
                Some("output")
            )
            .is_ok()
        );
    }

    #[test]
    fn test_validate_decryption_empty_inputs() {
        assert!(CryptoRules::validate_decryption_input("", "key1", "output").is_err());
        assert!(CryptoRules::validate_decryption_input("file.age", "", "output").is_err());
        assert!(CryptoRules::validate_decryption_input("file.age", "key1", "").is_err());
    }
}
