use super::super::errors::{VaultError, VaultResult};

/// Business rules for vault operations
pub struct VaultRules;

impl VaultRules {
    /// Maximum number of keys allowed per vault
    pub const MAX_KEYS_PER_VAULT: usize = 10;

    /// Maximum number of YubiKeys per vault (from UI constraint)
    pub const MAX_YUBIKEY_KEYS_PER_VAULT: usize = 3;

    /// Maximum number of passphrase keys per vault
    pub const MAX_PASSPHRASE_KEYS_PER_VAULT: usize = 1;

    /// Validate vault name according to business rules
    pub fn validate_vault_name(name: &str) -> VaultResult<()> {
        let trimmed = name.trim();

        if trimmed.is_empty() {
            return Err(VaultError::InvalidName("Vault name cannot be empty".to_string()));
        }

        if trimmed.len() > 100 {
            return Err(VaultError::InvalidName("Vault name must be less than 100 characters".to_string()));
        }

        // Check for invalid characters that might cause file system issues
        if trimmed.contains(['/', '\\', ':', '*', '?', '"', '<', '>', '|']) {
            return Err(VaultError::InvalidName("Vault name contains invalid characters".to_string()));
        }

        Ok(())
    }

    /// Validate if vault can accept a new key
    pub fn can_add_key(current_key_count: usize, key_type: &str) -> VaultResult<()> {
        if current_key_count >= Self::MAX_KEYS_PER_VAULT {
            return Err(VaultError::KeyLimitExceeded(
                format!("Vault already has maximum of {} keys", Self::MAX_KEYS_PER_VAULT)
            ));
        }

        // Additional key-type specific validation can be added here
        match key_type {
            "passphrase" => {
                // Passphrase key validation is handled elsewhere
                Ok(())
            }
            "yubikey" => {
                // YubiKey validation is handled elsewhere
                Ok(())
            }
            _ => Err(VaultError::InvalidOperation(
                format!("Unknown key type: {}", key_type)
            ))
        }
    }

    /// Validate if key can be removed from vault
    pub fn can_remove_key(current_key_count: usize) -> VaultResult<()> {
        if current_key_count <= 1 {
            return Err(VaultError::InvalidOperation(
                "Cannot remove the last key from a vault".to_string()
            ));
        }
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_validate_vault_name_empty() {
        assert!(VaultRules::validate_vault_name("").is_err());
        assert!(VaultRules::validate_vault_name("   ").is_err());
    }

    #[test]
    fn test_validate_vault_name_valid() {
        assert!(VaultRules::validate_vault_name("My Vault").is_ok());
        assert!(VaultRules::validate_vault_name("Test-Vault_123").is_ok());
    }

    #[test]
    fn test_validate_vault_name_invalid_chars() {
        assert!(VaultRules::validate_vault_name("My/Vault").is_err());
        assert!(VaultRules::validate_vault_name("Vault*Name").is_err());
    }

    #[test]
    fn test_can_add_key_limits() {
        assert!(VaultRules::can_add_key(5, "passphrase").is_ok());
        assert!(VaultRules::can_add_key(VaultRules::MAX_KEYS_PER_VAULT, "passphrase").is_err());
    }

    #[test]
    fn test_can_remove_key_limits() {
        assert!(VaultRules::can_remove_key(2).is_ok());
        assert!(VaultRules::can_remove_key(1).is_err());
    }
}