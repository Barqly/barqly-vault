use crate::commands::types::{CommandError, CommandResponse, ErrorCode, ValidateInput};
use crate::constants::MIN_PASSPHRASE_LENGTH;
use crate::key_management::passphrase::{PassphraseManager, PassphraseStrength};
use crate::prelude::*;
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

#[derive(Debug, Deserialize, specta::Type)]
pub struct ValidatePassphraseInput {
    pub passphrase: String,
}

#[derive(Debug, Serialize, specta::Type)]
pub struct ValidatePassphraseResponse {
    pub is_valid: bool,
    pub message: String,
}

impl ValidateInput for ValidatePassphraseInput {
    fn validate(&self) -> Result<(), Box<CommandError>> {
        if self.passphrase.is_empty() {
            return Err(Box::new(CommandError::validation(
                "Passphrase cannot be empty",
            )));
        }
        Ok(())
    }
}

#[tauri::command]
#[specta::specta]
pub async fn validate_passphrase(
    input: ValidatePassphraseInput,
) -> CommandResponse<ValidatePassphraseResponse> {
    let passphrase = &input.passphrase;

    if passphrase.len() < MIN_PASSPHRASE_LENGTH {
        return Ok(ValidatePassphraseResponse {
            is_valid: false,
            message: format!(
                "Passphrase must be at least {} characters long",
                MIN_PASSPHRASE_LENGTH
            ),
        });
    }

    let has_uppercase = passphrase.chars().any(|c| c.is_uppercase());
    let has_lowercase = passphrase.chars().any(|c| c.is_lowercase());
    let has_digit = passphrase.chars().any(|c| c.is_numeric());
    let has_special = passphrase.chars().any(|c| !c.is_alphanumeric());

    let complexity_score = [has_uppercase, has_lowercase, has_digit, has_special]
        .iter()
        .filter(|&&x| x)
        .count();

    if complexity_score < 3 {
        return Ok(ValidatePassphraseResponse {
            is_valid: false,
            message: "Passphrase must contain at least 3 of: uppercase letters, lowercase letters, numbers, and special characters".to_string(),
        });
    }

    Ok(ValidatePassphraseResponse {
        is_valid: true,
        message: "Passphrase meets security requirements".to_string(),
    })
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
