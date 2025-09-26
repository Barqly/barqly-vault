use crate::commands::types::{CommandError, CommandResponse, ErrorCode};
use crate::key_management::passphrase::{PassphraseManager, PassphraseStrength};
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, specta::Type)]
pub struct PassphraseValidationResult {
    pub is_valid: bool,
    pub strength: PassphraseStrength,
    pub feedback: Vec<String>,
    pub score: u8,
}

#[tauri::command]
#[specta::specta]
pub async fn validate_passphrase_strength(
    passphrase: String,
) -> CommandResponse<PassphraseValidationResult> {
    let manager = PassphraseManager::new();
    let result = manager.validate_strength(&passphrase);

    Ok(PassphraseValidationResult {
        is_valid: result.is_valid,
        strength: result.strength,
        feedback: result.feedback,
        score: result.score,
    })
}

#[derive(Debug, Deserialize, specta::Type)]
pub struct VerifyKeyPassphraseInput {
    pub key_id: String,
    pub passphrase: String,
}

#[derive(Debug, Serialize, specta::Type)]
pub struct VerifyKeyPassphraseResponse {
    pub is_valid: bool,
    pub message: String,
}

#[tauri::command]
#[specta::specta]
pub async fn verify_key_passphrase(
    input: VerifyKeyPassphraseInput,
) -> CommandResponse<VerifyKeyPassphraseResponse> {
    let manager = PassphraseManager::new();

    match manager.verify_key_passphrase(&input.key_id, &input.passphrase) {
        Ok(true) => Ok(VerifyKeyPassphraseResponse {
            is_valid: true,
            message: "Passphrase is correct".to_string(),
        }),
        Ok(false) => Ok(VerifyKeyPassphraseResponse {
            is_valid: false,
            message: "Incorrect passphrase".to_string(),
        }),
        Err(_) => Err(Box::new(CommandError::operation(
            ErrorCode::KeyNotFound,
            format!("Key '{}' not found", input.key_id),
        ))),
    }
}