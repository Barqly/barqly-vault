//! Encrypted vault file analysis command
//!
//! Analyzes encrypted .age files to extract metadata needed for decryption UI.
//! Handles vault name extraction, desanitization, manifest detection, and key discovery.

use crate::commands::types::{CommandError, CommandResponse, ErrorCode, ValidationHelper};
use crate::prelude::*;
use crate::services::key_management::shared::domain::models::VaultKey;
use crate::services::shared::infrastructure::label_sanitization::desanitize_vault_name;
use crate::services::vault::VaultManager;
use regex::Regex;
use std::path::Path;

/// Request to analyze an encrypted vault file
#[derive(Debug, Deserialize, specta::Type)]
pub struct AnalyzeEncryptedVaultRequest {
    /// Absolute path to the encrypted .age file
    pub encrypted_file_path: String,
}

/// Response containing vault analysis results
#[derive(Debug, Serialize, specta::Type)]
pub struct AnalyzeEncryptedVaultResponse {
    // Vault identification
    /// Desanitized vault name for display (e.g., "Sam Family Vault")
    pub vault_name: String,
    /// Sanitized vault name from filename (e.g., "Sam-Family-Vault")
    pub vault_name_sanitized: String,

    // Manifest detection
    /// Whether a vault manifest exists on this machine
    pub manifest_exists: bool,
    /// Vault ID if manifest was found, null otherwise
    pub vault_id: Option<String>,

    // Key information
    /// Associated keys from manifest (empty if recovery mode)
    pub associated_keys: Vec<VaultKey>,

    // Metadata from filename
    /// Creation date extracted from filename (e.g., "2025-01-13")
    pub creation_date: Option<String>,

    // Recovery mode indicators
    /// True if manifest is missing (disaster recovery scenario)
    pub is_recovery_mode: bool,
}

/// Analyze encrypted vault file and return metadata for UI display
///
/// This command extracts vault metadata from the encrypted file path without
/// performing actual decryption. It's used by the Decrypt page to:
/// - Display vault name in PageHeader
/// - Show appropriate keys in dropdown
/// - Detect recovery mode scenarios
#[tauri::command]
#[specta::specta]
#[instrument(skip(input), fields(file_path = %input.encrypted_file_path))]
pub async fn analyze_encrypted_vault(
    input: AnalyzeEncryptedVaultRequest,
) -> CommandResponse<AnalyzeEncryptedVaultResponse> {
    info!(
        encrypted_file_path = %input.encrypted_file_path,
        "Analyzing encrypted vault file"
    );

    // Validate input
    ValidationHelper::validate_not_empty(&input.encrypted_file_path, "Encrypted file path")
        .map_err(|e| {
            Box::new(CommandError {
                code: ErrorCode::InvalidInput,
                message: e.message.clone(),
                details: None,
                recovery_guidance: Some("Provide a valid file path".to_string()),
                user_actionable: true,
                trace_id: None,
                span_id: None,
            })
        })?;

    ValidationHelper::validate_path_exists(&input.encrypted_file_path, "Encrypted file").map_err(
        |e| {
            Box::new(CommandError {
                code: ErrorCode::FileNotFound,
                message: e.message.clone(),
                details: None,
                recovery_guidance: Some("Check that the file exists".to_string()),
                user_actionable: true,
                trace_id: None,
                span_id: None,
            })
        },
    )?;

    ValidationHelper::validate_is_file(&input.encrypted_file_path, "Encrypted file").map_err(
        |e| {
            Box::new(CommandError {
                code: ErrorCode::InvalidInput,
                message: e.message.clone(),
                details: None,
                recovery_guidance: Some("Path must point to a file, not a directory".to_string()),
                user_actionable: true,
                trace_id: None,
                span_id: None,
            })
        },
    )?;

    // Extract filename from path
    let file_path = Path::new(&input.encrypted_file_path);
    let filename = file_path
        .file_name()
        .and_then(|n| n.to_str())
        .ok_or_else(|| {
            Box::new(CommandError {
                code: ErrorCode::InvalidInput,
                message: "Could not extract filename from path".to_string(),
                details: None,
                recovery_guidance: Some("Ensure the path contains a valid filename".to_string()),
                user_actionable: true,
                trace_id: None,
                span_id: None,
            })
        })?;

    debug!(filename = %filename, "Extracted filename from path");

    // Parse vault name and date from filename
    // Expected format: "Sam-Family-Vault-2025-01-13.age" or "Sam-Family-Vault.age"
    // Also detects "-shared" suffix for shared bundles
    let (vault_name_sanitized, creation_date, is_shared_bundle) = parse_vault_filename(filename)?;

    debug!(
        vault_name_sanitized = %vault_name_sanitized,
        creation_date = ?creation_date,
        is_shared_bundle = is_shared_bundle,
        "Parsed filename components"
    );

    // Desanitize vault name for display
    let vault_name = desanitize_vault_name(&vault_name_sanitized);

    info!(
        vault_name_sanitized = %vault_name_sanitized,
        vault_name_display = %vault_name,
        is_shared_bundle = is_shared_bundle,
        "Desanitized vault name"
    );

    // For shared bundles, skip manifest lookup entirely
    // Recipients don't have the sender's manifest - that's expected behavior
    if is_shared_bundle {
        info!(
            vault_name = %vault_name,
            "Shared bundle detected - skipping manifest lookup, using global key registry"
        );

        return Ok(AnalyzeEncryptedVaultResponse {
            vault_name,
            vault_name_sanitized,
            manifest_exists: false,
            vault_id: None,
            associated_keys: vec![], // Will use global key list in UI
            creation_date,
            is_recovery_mode: false, // NOT recovery mode - normal decryption flow
        });
    }

    // Check if manifest exists and get vault info
    let vault_manager = VaultManager::new();
    let manifest_result = vault_manager
        .get_vault_by_sanitized_name(&vault_name_sanitized)
        .await;

    let (manifest_exists, vault_id, associated_keys, is_recovery_mode) = match manifest_result {
        Ok(Some(vault_metadata)) => {
            // Manifest found - normal mode
            let vault_id = vault_metadata.vault_id().to_string();
            let keys: Vec<VaultKey> = vault_metadata
                .recipients()
                .iter()
                .map(|recipient| VaultKey {
                    id: recipient.key_id.clone(),
                    label: recipient.label.clone(),
                    key_type: match &recipient.recipient_type {
                        crate::services::vault::infrastructure::persistence::metadata::RecipientType::Passphrase { key_filename } => {
                            crate::services::key_management::shared::domain::models::KeyType::Passphrase {
                                key_id: key_filename.clone(),
                            }
                        }
                        crate::services::vault::infrastructure::persistence::metadata::RecipientType::YubiKey { serial, firmware_version, .. } => {
                            crate::services::key_management::shared::domain::models::KeyType::YubiKey {
                                serial: serial.clone(),
                                firmware_version: firmware_version.clone(),
                            }
                        }
                        crate::services::vault::infrastructure::persistence::metadata::RecipientType::PublicKeyOnly => {
                            crate::services::key_management::shared::domain::models::KeyType::Recipient
                        }
                    },
                    lifecycle_status: crate::services::key_management::shared::domain::models::key_lifecycle::KeyLifecycleStatus::Active,
                    created_at: recipient.created_at,
                    last_used: None,
                })
                .collect();

            info!(
                vault_id = %vault_id,
                key_count = keys.len(),
                "Found vault manifest with associated keys"
            );

            (true, Some(vault_id), keys, false)
        }
        Ok(None) | Err(_) => {
            // Manifest not found - recovery mode
            warn!(
                vault_name_sanitized = %vault_name_sanitized,
                "Vault manifest not found - entering recovery mode"
            );

            (false, None, vec![], true)
        }
    };

    let response = AnalyzeEncryptedVaultResponse {
        vault_name,
        vault_name_sanitized,
        manifest_exists,
        vault_id,
        associated_keys,
        creation_date,
        is_recovery_mode,
    };

    info!(
        manifest_exists = response.manifest_exists,
        is_recovery_mode = response.is_recovery_mode,
        key_count = response.associated_keys.len(),
        "Vault analysis complete"
    );

    Ok(response)
}

/// Parse vault filename to extract sanitized name, optional date, and shared bundle flag
///
/// Expected formats:
/// - "Sam-Family-Vault-2025-01-13.age" → ("Sam-Family-Vault", Some("2025-01-13"), false)
/// - "Sam-Family-Vault.age" → ("Sam-Family-Vault", None, false)
/// - "Sam-Family-Vault-shared.age" → ("Sam-Family-Vault", None, true)
/// - "Sam-Family-Vault-2025-01-13-shared.age" → ("Sam-Family-Vault", Some("2025-01-13"), true)
fn parse_vault_filename(
    filename: &str,
) -> Result<(String, Option<String>, bool), Box<CommandError>> {
    // First, detect and strip "-shared" suffix BEFORE regex parsing
    // This ensures date extraction works correctly for shared bundles
    let (filename_to_parse, is_shared_bundle) =
        if let Some(stripped) = filename.strip_suffix("-shared.age") {
            (format!("{}.age", stripped), true)
        } else {
            (filename.to_string(), false)
        };

    // Regex pattern: capture vault name, optional date, then .age extension
    // Pattern: ^(vault-name)(?:-(\d{4}-\d{2}-\d{2}))?\.age$
    let pattern = r"^([^-]+(?:-[^-]+)*?)(?:-(\d{4}-\d{2}-\d{2}))?\.age$";
    let re = Regex::new(pattern).map_err(|e| {
        Box::new(CommandError {
            code: ErrorCode::InternalError,
            message: format!("Regex compilation failed: {}", e),
            details: None,
            recovery_guidance: None,
            user_actionable: false,
            trace_id: None,
            span_id: None,
        })
    })?;

    let captures = re.captures(&filename_to_parse).ok_or_else(|| {
        Box::new(CommandError {
            code: ErrorCode::InvalidInput,
            message: format!(
                "Filename does not match expected vault format: '{}'",
                filename
            ),
            details: Some(
                "Expected format: 'VaultName-YYYY-MM-DD.age' or 'VaultName.age'".to_string(),
            ),
            recovery_guidance: Some(
                "Ensure the encrypted file follows the standard naming convention".to_string(),
            ),
            user_actionable: true,
            trace_id: None,
            span_id: None,
        })
    })?;

    let vault_name = captures
        .get(1)
        .map(|m| m.as_str().to_string())
        .ok_or_else(|| {
            Box::new(CommandError {
                code: ErrorCode::InvalidInput,
                message: "Could not extract vault name from filename".to_string(),
                details: None,
                recovery_guidance: None,
                user_actionable: false,
                trace_id: None,
                span_id: None,
            })
        })?;

    let creation_date = captures.get(2).map(|m| m.as_str().to_string());

    Ok((vault_name, creation_date, is_shared_bundle))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_parse_filename_with_date() {
        let result = parse_vault_filename("Sam-Family-Vault-2025-01-13.age").unwrap();
        assert_eq!(result.0, "Sam-Family-Vault");
        assert_eq!(result.1, Some("2025-01-13".to_string()));
        assert!(!result.2, "Should not be a shared bundle");
    }

    #[test]
    fn test_parse_filename_without_date() {
        let result = parse_vault_filename("Sam-Family-Vault.age").unwrap();
        assert_eq!(result.0, "Sam-Family-Vault");
        assert_eq!(result.1, None);
        assert!(!result.2, "Should not be a shared bundle");
    }

    #[test]
    fn test_parse_filename_single_word() {
        let result = parse_vault_filename("Vault.age").unwrap();
        assert_eq!(result.0, "Vault");
        assert_eq!(result.1, None);
        assert!(!result.2, "Should not be a shared bundle");
    }

    #[test]
    fn test_parse_filename_multiple_hyphens() {
        let result = parse_vault_filename("AKAH-Family-Trust-2025-10-13.age").unwrap();
        assert_eq!(result.0, "AKAH-Family-Trust");
        assert_eq!(result.1, Some("2025-10-13".to_string()));
        assert!(!result.2, "Should not be a shared bundle");
    }

    #[test]
    fn test_parse_filename_invalid_extension() {
        let result = parse_vault_filename("Sam-Family-Vault.txt");
        assert!(result.is_err());
    }

    #[test]
    fn test_parse_filename_shared_bundle() {
        let result = parse_vault_filename("Sam-Family-Vault-shared.age").unwrap();
        assert_eq!(result.0, "Sam-Family-Vault");
        assert_eq!(result.1, None);
        assert!(result.2, "Should be detected as shared bundle");
    }

    #[test]
    fn test_parse_filename_shared_bundle_with_date() {
        let result = parse_vault_filename("TV01-2025-01-15-shared.age").unwrap();
        assert_eq!(result.0, "TV01");
        assert_eq!(result.1, Some("2025-01-15".to_string()));
        assert!(result.2, "Should be detected as shared bundle");
    }

    #[test]
    fn test_parse_filename_shared_single_word() {
        let result = parse_vault_filename("Vault-shared.age").unwrap();
        assert_eq!(result.0, "Vault");
        assert_eq!(result.1, None);
        assert!(result.2, "Should be detected as shared bundle");
    }

    #[test]
    fn test_parse_filename_invalid_date() {
        // If the date format doesn't match YYYY-MM-DD, it's treated as part of the vault name
        let result = parse_vault_filename("Sam-Family-Vault-invalid-date.age").unwrap();
        assert_eq!(result.0, "Sam-Family-Vault-invalid-date");
        assert_eq!(result.1, None); // No date captured
        assert!(!result.2, "Should not be a shared bundle");
    }
}
