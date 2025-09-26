use crate::commands::types::{
    CommandError, CommandResponse, ErrorCode, ErrorHandler, ValidateInput, ValidationHelper,
};
use crate::key_management::passphrase::PassphraseManager;
use crate::prelude::*;
use crate::storage;
use serde::{Deserialize, Serialize};

#[derive(Debug, Deserialize, specta::Type)]
pub struct GenerateKeyInput {
    pub label: String,
    pub passphrase: String,
}

#[derive(Debug, Serialize, specta::Type)]
pub struct GenerateKeyResponse {
    pub public_key: String,
    pub key_id: String,
    pub saved_path: String,
}

impl ValidateInput for GenerateKeyInput {
    fn validate(&self) -> Result<(), Box<CommandError>> {
        ValidationHelper::validate_not_empty(&self.label, "Key label")?;
        ValidationHelper::validate_key_label(&self.label)?;
        ValidationHelper::validate_passphrase_strength(&self.passphrase)?;
        Ok(())
    }
}

#[tauri::command]
#[specta::specta]
#[instrument(skip(input), fields(label = %input.label))]
pub async fn generate_key(input: GenerateKeyInput) -> CommandResponse<GenerateKeyResponse> {
    let error_handler = ErrorHandler::new();

    input
        .validate()
        .map_err(|e| error_handler.handle_validation_error("input", &e.message))?;

    info!(
        label = %input.label,
        "Starting key generation via PassphraseManager"
    );

    let existing_keys = error_handler.handle_operation_error(
        storage::list_keys(),
        "list_keys",
        ErrorCode::StorageFailed,
    )?;

    if existing_keys.iter().any(|k| k.label == input.label) {
        return Err(error_handler.handle_validation_error(
            "label",
            &format!("A key with label '{}' already exists. Please choose a different label or use the existing key.", input.label),
        ));
    }

    let manager = PassphraseManager::new();
    let generated = manager
        .generate_key(&input.label, &input.passphrase)
        .map_err(|e| {
            Box::new(CommandError::operation(
                ErrorCode::EncryptionFailed,
                format!("Key generation failed: {}", e),
            ))
        })?;

    info!(
        label = %input.label,
        saved_path = %generated.saved_path.display(),
        "Keypair generated and saved successfully"
    );

    Ok(GenerateKeyResponse {
        public_key: generated.public_key,
        key_id: generated.key_id,
        saved_path: generated.saved_path.to_string_lossy().to_string(),
    })
}
