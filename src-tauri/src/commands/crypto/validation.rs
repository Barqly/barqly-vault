//! Passphrase validation command
//!
//! This module provides the Tauri command for validating passphrase strength
//! and complexity according to security requirements.

use crate::commands::types::{
    CommandError, CommandResponse, ErrorHandler, ValidateInput, ValidationHelper,
};
use crate::constants::*;
use crate::logging::{log_operation, SpanContext};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use tracing::instrument;

/// Input for passphrase validation command
#[derive(Debug, Deserialize)]
pub struct ValidatePassphraseInput {
    pub passphrase: String,
}

/// Response from passphrase validation
#[derive(Debug, Serialize)]
pub struct ValidatePassphraseResponse {
    pub is_valid: bool,
    pub message: String,
}

impl ValidateInput for ValidatePassphraseInput {
    fn validate(&self) -> Result<(), Box<CommandError>> {
        ValidationHelper::validate_not_empty(&self.passphrase, "Passphrase")?;
        Ok(())
    }
}

/// Validate passphrase strength
#[tauri::command]
#[instrument(skip(input), fields(passphrase_length = input.passphrase.len()))]
pub async fn validate_passphrase(
    input: ValidatePassphraseInput,
) -> CommandResponse<ValidatePassphraseResponse> {
    // Create span context for operation tracing
    let span_context = SpanContext::new("validate_passphrase")
        .with_attribute("passphrase_length", input.passphrase.len().to_string());

    // Create error handler with span context
    let error_handler = ErrorHandler::new().with_span(span_context.clone());

    // Validate input
    input
        .validate()
        .map_err(|e| error_handler.handle_validation_error("input", &e.message))?;

    // Log operation start with structured context
    let mut attributes = HashMap::new();
    attributes.insert(
        "passphrase_length".to_string(),
        input.passphrase.len().to_string(),
    );
    log_operation(
        crate::logging::LogLevel::Info,
        "Starting passphrase validation",
        &span_context,
        attributes,
    );

    let passphrase = &input.passphrase;

    // Check minimum length as per security principles
    if passphrase.len() < MIN_PASSPHRASE_LENGTH {
        let mut failure_attributes = HashMap::new();
        failure_attributes.insert("reason".to_string(), "insufficient_length".to_string());
        failure_attributes.insert(
            "required_length".to_string(),
            MIN_PASSPHRASE_LENGTH.to_string(),
        );
        failure_attributes.insert("actual_length".to_string(), passphrase.len().to_string());
        log_operation(
            crate::logging::LogLevel::Warn,
            "Passphrase validation failed: insufficient length",
            &span_context,
            failure_attributes,
        );
        return Ok(ValidatePassphraseResponse {
            is_valid: false,
            message: format!("Passphrase must be at least {MIN_PASSPHRASE_LENGTH} characters long"),
        });
    }

    // Check for complexity requirements (at least 3 of 4 categories)
    let has_uppercase = passphrase.chars().any(|c| c.is_uppercase());
    let has_lowercase = passphrase.chars().any(|c| c.is_lowercase());
    let has_digit = passphrase.chars().any(|c| c.is_numeric());
    let has_special = passphrase.chars().any(|c| !c.is_alphanumeric());

    let complexity_score = [has_uppercase, has_lowercase, has_digit, has_special]
        .iter()
        .filter(|&&x| x)
        .count();

    if complexity_score < 3 {
        let mut failure_attributes = HashMap::new();
        failure_attributes.insert("reason".to_string(), "insufficient_complexity".to_string());
        failure_attributes.insert("complexity_score".to_string(), complexity_score.to_string());
        failure_attributes.insert("required_score".to_string(), "3".to_string());
        log_operation(
            crate::logging::LogLevel::Warn,
            "Passphrase validation failed: insufficient complexity",
            &span_context,
            failure_attributes,
        );
        return Ok(ValidatePassphraseResponse {
            is_valid: false,
            message: "Passphrase must contain at least 3 of: uppercase letters, lowercase letters, numbers, and special characters".to_string(),
        });
    }

    // Check for common weak patterns
    let common_patterns = [
        "password", "123456", "qwerty", "admin", "letmein", "welcome", "monkey", "dragon",
        "master", "football", "baseball", "shadow", "michael", "jennifer", "thomas", "jessica",
        "jordan", "hunter", "michelle", "charlie", "andrew", "daniel", "maggie", "summer",
    ];

    let passphrase_lower = passphrase.to_lowercase();
    for pattern in &common_patterns {
        if passphrase_lower.contains(pattern) {
            let mut failure_attributes = HashMap::new();
            failure_attributes.insert("reason".to_string(), "weak_pattern".to_string());
            failure_attributes.insert("pattern".to_string(), pattern.to_string());
            log_operation(
                crate::logging::LogLevel::Warn,
                "Passphrase validation failed: contains weak pattern",
                &span_context,
                failure_attributes,
            );
            return Ok(ValidatePassphraseResponse {
                is_valid: false,
                message: "Passphrase contains common weak patterns".to_string(),
            });
        }
    }

    // Check for sequential patterns
    if contains_sequential_pattern(passphrase) {
        let mut failure_attributes = HashMap::new();
        failure_attributes.insert("reason".to_string(), "sequential_pattern".to_string());
        log_operation(
            crate::logging::LogLevel::Warn,
            "Passphrase validation failed: contains sequential pattern",
            &span_context,
            failure_attributes,
        );
        return Ok(ValidatePassphraseResponse {
            is_valid: false,
            message: "Passphrase contains sequential patterns (like 123, abc)".to_string(),
        });
    }

    // Log successful validation
    let mut success_attributes = HashMap::new();
    success_attributes.insert("complexity_score".to_string(), complexity_score.to_string());
    log_operation(
        crate::logging::LogLevel::Info,
        "Passphrase validation successful",
        &span_context,
        success_attributes,
    );
    Ok(ValidatePassphraseResponse {
        is_valid: true,
        message: "Passphrase meets security requirements".to_string(),
    })
}

/// Check for sequential patterns in passphrase
pub(crate) fn contains_sequential_pattern(passphrase: &str) -> bool {
    if passphrase.len() < MIN_LENGTH_FOR_SEQUENCE_CHECK {
        return false;
    }

    let chars: Vec<char> = passphrase.chars().collect();

    for i in 0..chars.len() - 2 {
        let c1 = chars[i] as u32;
        let c2 = chars[i + 1] as u32;
        let c3 = chars[i + 2] as u32;

        // Check for sequential characters (like abc, 123)
        if c2 == c1 + 1 && c3 == c2 + 1 {
            return true;
        }

        // Check for reverse sequential characters (like cba, 321)
        if c2 == c1 - 1 && c3 == c2 - 1 {
            return true;
        }
    }

    false
}
