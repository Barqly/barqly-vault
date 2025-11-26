//! Add Recipient Commands
//!
//! Commands for adding recipient (public-key-only) entries to the registry.
//! Recipients are public keys belonging to OTHER people that the user
//! wants to encrypt data FOR (R2.2 feature).

use crate::services::key_management::shared::application::services::KeyRegistryService;
use crate::services::key_management::shared::domain::models::key_lifecycle::{
    KeyLifecycleStatus, StatusHistoryEntry,
};
use crate::services::key_management::shared::domain::models::key_reference::{KeyType, VaultKey};
use crate::services::key_management::shared::domain::models::recipient_validation::{
    RecipientValidationError, validate_label, validate_public_key,
};
use crate::services::key_management::shared::infrastructure::KeyEntry;
use crate::types::{CommandError, CommandResponse, ErrorCode};
use chrono::Utc;
use serde::{Deserialize, Serialize};
use tracing::{debug, error, info};

/// Request to add a recipient to the registry
#[derive(Debug, Clone, Serialize, Deserialize, specta::Type)]
pub struct AddRecipientRequest {
    /// User-friendly label for this recipient
    pub label: String,
    /// Age public key (age1... format)
    pub public_key: String,
}

/// Response from adding a recipient
#[derive(Debug, Clone, Serialize, Deserialize, specta::Type)]
pub struct AddRecipientResponse {
    /// Generated key ID for the new recipient
    pub key_id: String,
    /// The created recipient as a VaultKey for UI consumption
    pub key_reference: VaultKey,
}

/// Add a recipient (public-key-only entry) to the key registry
///
/// This creates a new registry entry for a public key belonging to someone else.
/// Recipients can only be used for encryption - the user cannot decrypt with them.
#[tauri::command]
#[specta::specta]
pub async fn add_recipient(request: AddRecipientRequest) -> CommandResponse<AddRecipientResponse> {
    debug!(
        label = %request.label,
        public_key_prefix = %request.public_key.chars().take(10).collect::<String>(),
        "Adding recipient to registry"
    );

    // Validate public key format
    let public_key = request.public_key.trim().to_string();
    if let Err(e) = validate_public_key(&public_key) {
        return Err(map_validation_error(e, "public_key"));
    }

    // Validate and sanitize label
    let label = match validate_label(&request.label) {
        Ok(l) => l,
        Err(e) => return Err(map_validation_error(e, "label")),
    };

    // Check for duplicates
    let registry_service = KeyRegistryService::new();
    if let Ok(Some(existing_id)) = registry_service.find_by_public_key(&public_key) {
        error!(
            existing_key_id = %existing_id,
            "Duplicate public key detected"
        );
        return Err(Box::new(CommandError {
            code: ErrorCode::KeyAlreadyExists,
            message: "A key with this public key already exists".to_string(),
            details: Some(format!("Existing key ID: {}", existing_id)),
            recovery_guidance: Some(
                "Use the existing key or provide a different public key".to_string(),
            ),
            user_actionable: true,
            trace_id: None,
            span_id: None,
        }));
    }

    // Generate key ID from label (sanitized)
    let key_id = generate_recipient_key_id(&label);

    // Create KeyEntry::Recipient
    let now = Utc::now();
    let entry = KeyEntry::Recipient {
        label: label.clone(),
        created_at: now,
        last_used: None,
        public_key: public_key.clone(),
        lifecycle_status: KeyLifecycleStatus::PreActivation, // Not yet attached to vault
        status_history: vec![StatusHistoryEntry::new(
            KeyLifecycleStatus::PreActivation,
            "Recipient added to registry",
            "user",
        )],
        vault_associations: vec![],
        deactivated_at: None,
        previous_lifecycle_status: None,
    };

    // Save to registry
    if let Err(e) = registry_service.register_key(key_id.clone(), entry) {
        error!(key_id = %key_id, error = %e, "Failed to save recipient to registry");
        return Err(Box::new(CommandError {
            code: ErrorCode::StorageFailed,
            message: format!("Failed to save recipient: {}", e),
            details: None,
            recovery_guidance: Some("Check storage permissions and try again".to_string()),
            user_actionable: true,
            trace_id: None,
            span_id: None,
        }));
    }

    info!(key_id = %key_id, label = %label, "Recipient added successfully");

    // Build response
    let key_reference = VaultKey {
        id: key_id.clone(),
        label,
        key_type: KeyType::Recipient,
        lifecycle_status: KeyLifecycleStatus::PreActivation,
        created_at: now,
        last_used: None,
    };

    Ok(AddRecipientResponse {
        key_id,
        key_reference,
    })
}

/// Generate a key ID from the label
fn generate_recipient_key_id(label: &str) -> String {
    // Sanitize label for use as key ID
    let sanitized: String = label
        .chars()
        .map(|c| {
            if c.is_alphanumeric() || c == '-' || c == '_' {
                c.to_ascii_lowercase()
            } else {
                '-'
            }
        })
        .collect();

    // Add timestamp suffix for uniqueness
    let timestamp = Utc::now().timestamp_millis();
    format!("recipient-{}-{}", sanitized.trim_matches('-'), timestamp)
}

/// Map validation errors to CommandError
fn map_validation_error(e: RecipientValidationError, field: &str) -> Box<CommandError> {
    let (code, recovery) = match &e {
        RecipientValidationError::InvalidPublicKeyPrefix => {
            (ErrorCode::InvalidInput, "Public key must start with 'age1'")
        }
        RecipientValidationError::InvalidPublicKeyLength(_) => (
            ErrorCode::InvalidInput,
            "Public key must be 62-128 characters (62 for standard, 71 for YubiKey)",
        ),
        RecipientValidationError::InvalidPublicKeyCharacters => (
            ErrorCode::InvalidInput,
            "Public key contains invalid characters",
        ),
        RecipientValidationError::LabelEmpty => (ErrorCode::InvalidInput, "Label cannot be empty"),
        RecipientValidationError::LabelTooLong => (
            ErrorCode::InvalidInput,
            "Label must be 128 characters or less",
        ),
        RecipientValidationError::LabelInvalidCharacters => {
            (ErrorCode::InvalidInput, "Label contains invalid characters")
        }
    };

    Box::new(CommandError {
        code,
        message: format!("Invalid {}: {}", field, e),
        details: None,
        recovery_guidance: Some(recovery.to_string()),
        user_actionable: true,
        trace_id: None,
        span_id: None,
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_generate_recipient_key_id() {
        let key_id = generate_recipient_key_id("Alice Work Key");
        assert!(key_id.starts_with("recipient-alice-work-key-"));
    }

    #[test]
    fn test_generate_recipient_key_id_special_chars() {
        let key_id = generate_recipient_key_id("Bob's Key @Work");
        assert!(key_id.starts_with("recipient-bob-s-key--work-"));
    }
}
