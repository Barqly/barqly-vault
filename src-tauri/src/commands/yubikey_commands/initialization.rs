//! YubiKey initialization and setup commands using provider abstraction

use crate::commands::command_types::CommandError;
use crate::crypto::yubikey::{YubiIdentityProviderFactory, YubiKeyInitResult, YubiKeyManager};
use serde::{Deserialize, Serialize};
use tauri;

/// Initialize a YubiKey for use with Barqly Vault using age-plugin-yubikey
///
/// This command sets up a YubiKey for encryption using the mature age-plugin-yubikey
/// ecosystem for reliable hardware security operations.
///
/// # Arguments
/// * `serial` - The serial number of the YubiKey to initialize (optional, for logging)
/// * `pin` - The current PIN for the YubiKey (6-8 digits)
/// * `slot` - Optional specific slot to use (ignored, auto-selected by age-plugin-yubikey)
/// * `label` - Human-readable label for this YubiKey setup
///
/// # Returns
/// YubiKeyInitResult containing the public key and configuration
///
/// # Errors
/// - `YubiKeyNotFound` if no YubiKey device is connected
/// - `YubiKeyPinRequired` if PIN authentication fails
/// - `PluginExecutionFailed` if age-plugin-yubikey operation fails
/// - `YubiKeyInitializationFailed` if key generation fails
#[tauri::command]
#[specta::specta]
pub async fn yubikey_initialize(
    serial: String,
    pin: String,
    _slot: Option<u8>, // Ignored in new implementation
    label: String,
) -> Result<YubiKeyInitResult, CommandError> {
    crate::logging::log_info(&format!(
        "Initializing YubiKey {serial} with label '{label}' using age-plugin-yubikey"
    ));

    // Validate inputs
    if label.trim().is_empty() {
        return Err(CommandError::validation("YubiKey label cannot be empty"));
    }

    if label.len() > 50 {
        return Err(CommandError::validation(
            "YubiKey label must be 50 characters or less",
        ));
    }

    // Validate PIN format using legacy manager for consistency
    let manager = YubiKeyManager::new();
    manager.validate_pin(&pin).map_err(CommandError::from)?;

    // Create provider and register new identity
    let provider = YubiIdentityProviderFactory::create_default().map_err(CommandError::from)?;

    let recipient = provider
        .register(&label, Some(&pin))
        .await
        .map_err(CommandError::from)?;

    // Convert to initialization result format
    let init_result = YubiKeyInitResult {
        public_key: recipient.recipient.clone(), // age recipient format
        slot: recipient.slot,
        touch_required: true, // age-plugin-yubikey typically requires touch
        pin_policy: crate::crypto::yubikey::management::policy_config::DEFAULT_PIN_POLICY,
    };

    crate::logging::log_info(&format!(
        "YubiKey {} successfully initialized with label '{}' (recipient: {})",
        recipient.serial, label, recipient.recipient
    ));

    Ok(init_result)
}

/// Get YubiKey setup recommendations using age-plugin-yubikey
///
/// Provides general recommendations for YubiKey setup with age-plugin-yubikey,
/// including security policies and compatibility notes.
///
/// # Arguments
/// * `serial` - The serial number of the YubiKey to analyze (optional)
///
/// # Returns
/// YubiKeySetupRecommendations with suggested configuration
#[tauri::command]
#[specta::specta]
pub async fn yubikey_get_setup_recommendations(
    serial: String,
) -> Result<YubiKeySetupRecommendations, CommandError> {
    // Test provider connectivity
    let provider = YubiIdentityProviderFactory::create_default().map_err(CommandError::from)?;

    provider
        .test_connectivity()
        .await
        .map_err(CommandError::from)?;

    let recommendations = YubiKeySetupRecommendations {
        serial: serial.clone(),
        model: "YubiKey (age-plugin-yubikey)".to_string(),
        recommended_slot: None,  // age-plugin-yubikey handles slot selection
        available_slots: vec![], // Not applicable with plugin approach
        security_recommendations: get_security_recommendations_for_plugin(),
        compatibility_notes: get_compatibility_notes_for_plugin(),
    };

    Ok(recommendations)
}

/// Validate YubiKey PIN format
///
/// Checks if a PIN meets YubiKey requirements without attempting authentication.
///
/// # Arguments
/// * `pin` - The PIN to validate
///
/// # Returns
/// PinValidationResult with validation status and guidance
#[tauri::command]
#[specta::specta]
pub async fn yubikey_validate_pin(pin: String) -> Result<PinValidationResult, CommandError> {
    let manager = YubiKeyManager::new();

    let validation_result = match manager.validate_pin(&pin) {
        Ok(_) => PinValidationResult {
            valid: true,
            message: "PIN format is valid".to_string(),
            requirements: get_pin_requirements(),
        },
        Err(err) => PinValidationResult {
            valid: false,
            message: err.to_string(),
            requirements: get_pin_requirements(),
        },
    };

    Ok(validation_result)
}

/// Check YubiKey setup status using age-plugin-yubikey
///
/// Determines if YubiKey identities are available by listing recipients
/// from the age-plugin-yubikey system.
///
/// # Arguments
/// * `serial` - The serial number of the YubiKey to check (optional)
///
/// # Returns
/// YubiKeySetupStatus indicating current setup state
#[tauri::command]
#[specta::specta]
pub async fn yubikey_check_setup_status(
    serial: String,
) -> Result<YubiKeySetupStatus, CommandError> {
    let provider = YubiIdentityProviderFactory::create_default().map_err(CommandError::from)?;

    match provider.list_recipients().await {
        Ok(recipients) => {
            // Check if we have recipients for the specified serial
            let matching_recipients: Vec<_> = recipients
                .iter()
                .filter(|r| r.serial == serial || serial.is_empty())
                .collect();

            if matching_recipients.is_empty() {
                Ok(YubiKeySetupStatus::NeedsInitialization { available_slots: 1 })
            } else {
                Ok(YubiKeySetupStatus::AlreadySetup {
                    note: format!("Found {} existing recipients", matching_recipients.len()),
                })
            }
        }
        Err(_) => {
            // Unable to list recipients, assume needs initialization
            Ok(YubiKeySetupStatus::NeedsInitialization { available_slots: 1 })
        }
    }
}

// Supporting data structures

/// YubiKey setup recommendations
#[derive(Debug, Serialize, Deserialize, specta::Type)]
pub struct YubiKeySetupRecommendations {
    pub serial: String,
    pub model: String,
    pub recommended_slot: Option<u8>,
    pub available_slots: Vec<u8>,
    pub security_recommendations: Vec<String>,
    pub compatibility_notes: Vec<String>,
}

/// PIN validation result
#[derive(Debug, Serialize, Deserialize, specta::Type)]
pub struct PinValidationResult {
    pub valid: bool,
    pub message: String,
    pub requirements: Vec<String>,
}

/// YubiKey setup status
#[derive(Debug, Serialize, Deserialize, specta::Type)]
pub enum YubiKeySetupStatus {
    NeedsInitialization { available_slots: usize },
    AlreadySetup { note: String },
}

// Helper functions

fn get_security_recommendations_for_plugin() -> Vec<String> {
    vec![
        "Use a strong, memorable PIN (6-8 digits)".to_string(),
        "Touch requirement is automatically enabled by age-plugin-yubikey".to_string(),
        "Keep your YubiKey in a secure location".to_string(),
        "age-plugin-yubikey provides mature, interoperable security".to_string(),
        "Recipients work across the entire age ecosystem".to_string(),
    ]
}

fn get_compatibility_notes_for_plugin() -> Vec<String> {
    vec![
        "age-plugin-yubikey supports YubiKey 4 and 5 series".to_string(),
        "Compatible with all major age encryption tools".to_string(),
        "Automatic slot management reduces configuration complexity".to_string(),
        "Cross-platform compatibility (Windows, macOS, Linux)".to_string(),
        "Mature implementation with proven security track record".to_string(),
        "Ensure your YubiKey is genuine by purchasing from authorized dealers".to_string(),
    ]
}

// Legacy helper functions (kept for backward compatibility)
#[allow(dead_code)]
fn get_security_recommendations(model: &str) -> Vec<String> {
    let mut recommendations = vec![
        "Use a strong, memorable PIN (6-8 digits)".to_string(),
        "Enable touch requirement for maximum security".to_string(),
        "Keep your YubiKey in a secure location".to_string(),
    ];

    if model.contains("5") {
        recommendations.push("YubiKey 5 series supports FIDO2 for additional security".to_string());
    }

    recommendations
}

#[allow(dead_code)]
fn get_compatibility_notes(model: &str, version: &str) -> Vec<String> {
    let mut notes = vec![];

    if model.contains("4") {
        notes.push("YubiKey 4 series has excellent compatibility with all platforms".to_string());
    }

    if model.contains("5") {
        notes.push("YubiKey 5 series offers the latest security features".to_string());
        if version.starts_with("5.2") || version.starts_with("5.4") {
            notes.push("This firmware version has optimal PIV support".to_string());
        }
    }

    notes.push("Ensure your YubiKey is genuine by purchasing from authorized dealers".to_string());

    notes
}

fn get_pin_requirements() -> Vec<String> {
    vec![
        "Must be 6-8 digits long".to_string(),
        "Can only contain numeric characters (0-9)".to_string(),
        "Default PIN is 123456 (should be changed immediately)".to_string(),
        "PIN is blocked after 3 incorrect attempts".to_string(),
    ]
}
