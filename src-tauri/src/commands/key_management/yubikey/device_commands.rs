//! YubiKey Device Commands - Core Hardware Operations
//!
//! This module provides THIN WRAPPER commands for core YubiKey device operations.
//! ALL YubiKey business logic is delegated to the DDD YubiKeyManager.
//! This layer ONLY handles parameter validation and response formatting.
//!
//! Commands included:
//! - list_yubikeys: List all YubiKeys with state detection
//! - init_yubikey: Initialize new YubiKey device
//! - register_yubikey: Register existing YubiKey device

use crate::commands::command_types::{CommandError, ErrorCode};
use crate::prelude::*;
use crate::services::key_management::yubikey::{
    YubiKeyManager,
    domain::models::{Pin, Serial},
};
use tauri;

// Re-export domain types
pub use crate::services::key_management::yubikey::domain::models::{
    state::{PinStatus, YubiKeyState},
    yubikey_state_info::YubiKeyStateInfo,
};

#[derive(Debug, serde::Serialize, specta::Type)]
pub struct StreamlinedYubiKeyInitResult {
    pub serial: String,
    pub slot: u8,
    pub recipient: String,
    pub identity_tag: String,
    pub label: String,
    // Recovery code removed - user provides their own recovery PIN
}

/// List all YubiKeys with intelligent state detection
/// Uses YubiKeyManager for centralized device and registry operations
#[tauri::command]
#[specta::specta]
pub async fn list_yubikeys() -> Result<Vec<YubiKeyStateInfo>, CommandError> {
    info!("Listing YubiKeys with state detection");

    // Delegate to YubiKeyManager - logic moved to service layer
    let manager = YubiKeyManager::new().await.map_err(|e| {
        error!("Failed to initialize YubiKeyManager: {}", e);
        CommandError::operation(
            ErrorCode::YubiKeyInitializationFailed,
            format!("Failed to initialize YubiKey manager: {e}"),
        )
    })?;

    manager.list_yubikeys_with_state().await.map_err(|e| {
        error!("Failed to list YubiKeys: {}", e);
        CommandError::operation(
            ErrorCode::YubiKeyCommunicationError,
            format!("Failed to list YubiKeys: {e}"),
        )
    })
}

/// Initialize a brand new YubiKey device
/// Uses YubiKeyManager for complete hardware and software initialization
#[tauri::command]
#[specta::specta]
pub async fn init_yubikey(
    serial: String,
    new_pin: String,
    recovery_pin: String,
    label: String,
) -> Result<StreamlinedYubiKeyInitResult, CommandError> {
    info!(
        "Initializing YubiKey with label {} using YubiKeyManager",
        label
    );

    // Validate that PIN and recovery PIN are different
    if new_pin == recovery_pin {
        return Err(CommandError::validation(
            "PIN and Recovery PIN must be different for security".to_string(),
        ));
    }

    // Create domain objects for type safety
    let serial_obj = Serial::new(serial.clone())
        .map_err(|e| CommandError::validation(format!("Invalid serial format: {e}")))?;

    let pin_obj =
        Pin::new(new_pin).map_err(|e| CommandError::validation(format!("Invalid PIN: {e}")))?;

    let recovery_pin_obj = Pin::new(recovery_pin)
        .map_err(|e| CommandError::validation(format!("Invalid Recovery PIN: {e}")))?;

    // Initialize YubiKey manager
    let manager = YubiKeyManager::new().await.map_err(|e| {
        CommandError::operation(
            ErrorCode::YubiKeyInitializationFailed,
            format!("Failed to initialize YubiKey manager: {e}"),
        )
    })?;

    // Initialize hardware with user-provided recovery PIN (no auto-generation)
    manager
        .initialize_device_hardware(&serial_obj, &pin_obj, &recovery_pin_obj)
        .await
        .map_err(|e| {
            CommandError::operation(
                ErrorCode::YubiKeyInitializationFailed,
                format!("Failed to initialize YubiKey hardware: {e}"),
            )
        })?;

    // Hash recovery PIN for secure storage
    use sha2::{Digest, Sha256};
    let mut hasher = Sha256::new();
    hasher.update(recovery_pin_obj.value().as_bytes());
    let recovery_code_hash = format!("{:x}", hasher.finalize());

    // Use centralized manager for the complete initialization workflow
    let (device, identity, entry_id) = manager
        .initialize_device(
            &serial_obj,
            &pin_obj,
            1, // Default to slot 1
            recovery_code_hash,
            Some(label.clone()),
        )
        .await
        .map_err(|e| {
            CommandError::operation(
                ErrorCode::YubiKeyInitializationFailed,
                format!("Failed to initialize YubiKey through manager: {e}"),
            )
        })?;

    // Shutdown manager gracefully
    if let Err(e) = manager.shutdown().await {
        warn!("Failed to shutdown YubiKey manager: {}", e);
    }

    info!(
        "Successfully initialized YubiKey: {} with entry ID: {}",
        serial_obj.redacted(),
        entry_id
    );

    Ok(StreamlinedYubiKeyInitResult {
        serial: device.serial().value().to_string(),
        slot: 1, // Default slot for age-plugin-yubikey
        recipient: identity.to_recipient().to_string(),
        identity_tag: identity.identity_tag().to_string(),
        label,
        // Recovery PIN not returned - user already knows it
    })
}

/// Register an existing YubiKey device to global registry (vault-agnostic)
///
/// This command adds an already-initialized YubiKey (with existing age identity)
/// to the global key registry WITHOUT attaching it to any vault.
///
/// **Use Case:** YubiKey in "orphaned"/"suspended" state:
/// - Has age identity (was used before)
/// - NOT in current machine's registry
/// - User wants to add to registry for future vault attachment
///
/// **State Transitions:**
/// - Device State: Orphaned → Registered
/// - Lifecycle Status: Suspended → Active (NIST-aligned)
///
/// **Differs from init_yubikey:**
/// - init_yubikey: For NEW YubiKeys (generates new identity)
/// - register_yubikey: For ORPHANED YubiKeys (reads existing identity)
#[tauri::command]
#[specta::specta]
pub async fn register_yubikey(
    serial: String,
    label: String,
    pin: Option<String>,
) -> Result<StreamlinedYubiKeyInitResult, CommandError> {
    info!(
        "Registering existing YubiKey to global registry: {}",
        &serial[..8.min(serial.len())]
    );

    // Create domain objects for type safety
    let serial_obj = Serial::new(serial.clone())
        .map_err(|e| CommandError::validation(format!("Invalid serial format: {e}")))?;

    let pin_obj = if let Some(pin_str) = pin {
        Some(Pin::new(pin_str).map_err(|e| CommandError::validation(format!("Invalid PIN: {e}")))?)
    } else {
        None
    };

    // Initialize YubiKey manager
    let manager = YubiKeyManager::new().await.map_err(|e| {
        CommandError::operation(
            ErrorCode::YubiKeyInitializationFailed,
            format!("Failed to initialize YubiKey manager: {e}"),
        )
    })?;

    // Validate device exists
    let device = manager
        .detect_device(&serial_obj)
        .await
        .map_err(|e| {
            CommandError::operation(
                ErrorCode::YubiKeyNotFound,
                format!("Failed to detect YubiKey: {e}"),
            )
        })?
        .ok_or_else(|| {
            CommandError::operation(
                ErrorCode::YubiKeyNotFound,
                "YubiKey not found or not connected",
            )
        })?;

    // Check if YubiKey already has identity
    let has_identity = manager.has_identity(&serial_obj).await.map_err(|e| {
        CommandError::operation(
            ErrorCode::YubiKeyInitializationFailed,
            format!("Failed to check YubiKey identity: {e}"),
        )
    })?;

    if !has_identity {
        return Err(CommandError::operation(
            ErrorCode::InvalidInput,
            "This YubiKey needs to be initialized first - it has no age identity",
        ));
    }

    // Verify PIN if provided (ownership proof)
    // Note: For ORPHANED keys, PIN is optional since we're just reading the public identity
    // The frontend should not request PIN for orphaned keys (Scenario 3)
    if let Some(ref pin) = pin_obj {
        if !manager
            .validate_pin(&serial_obj, pin)
            .await
            .unwrap_or(false)
        {
            return Err(CommandError::operation(
                ErrorCode::YubiKeyPinRequired,
                "Invalid PIN - could not verify YubiKey ownership",
            ));
        }
    } else {
        debug!(
            serial = %serial_obj.redacted(),
            "Skipping PIN validation for orphaned key (just reading public identity)"
        );
    }

    // Check if already in registry
    if manager
        .find_by_serial(&serial_obj)
        .await
        .unwrap_or(None)
        .is_some()
    {
        return Err(CommandError::operation(
            ErrorCode::KeyAlreadyExists,
            "This YubiKey is already registered in the global registry",
        ));
    }

    // Get existing identity from YubiKey
    let identity = manager
        .get_existing_identity(&serial_obj)
        .await
        .map_err(|e| {
            CommandError::operation(
                ErrorCode::YubiKeyInitializationFailed,
                format!("Failed to get YubiKey identity: {e}"),
            )
        })?
        .ok_or_else(|| {
            CommandError::operation(
                ErrorCode::YubiKeyInitializationFailed,
                "YubiKey identity not found despite has_identity check",
            )
        })?;

    // Generate recovery code placeholder (key was already initialized elsewhere)
    use sha2::{Digest, Sha256};
    let recovery_placeholder = format!("{:x}", Sha256::digest(b"orphaned-key-recovery"));

    // Register device in global registry
    // Note: register_device sets lifecycle_status to PreActivation initially
    // Key will transition to Active when first attached to a vault (NIST standard)
    let entry_id = manager
        .register_device(
            &device,
            &identity,
            1,
            recovery_placeholder,
            Some(label.clone()),
        )
        .await
        .map_err(|e| {
            CommandError::operation(
                ErrorCode::InternalError,
                format!("Failed to register YubiKey in registry: {e}"),
            )
        })?;

    // NOTE: We do NOT transition to Active here - key stays in PreActivation
    // Per NIST lifecycle: Key becomes Active only when first attached to a vault

    // Shutdown manager gracefully
    if let Err(e) = manager.shutdown().await {
        warn!("Failed to shutdown YubiKey manager: {}", e);
    }

    info!(
        "Successfully registered YubiKey to global registry: {} with entry ID: {}",
        serial_obj.redacted(),
        entry_id
    );

    Ok(StreamlinedYubiKeyInitResult {
        serial: device.serial().value().to_string(),
        slot: 1,
        recipient: identity.to_recipient().to_string(),
        identity_tag: identity.identity_tag().to_string(),
        label,
        // Recovery code removed - not needed for registration
    })
}

/// Complete YubiKey setup for Scenario 1: Reused without TDES
///
/// For YubiKeys that have custom PIN/PUK but management key is not TDES+protected.
/// This command will:
/// 1. Change management key to TDES+protected
/// 2. Generate age identity (requires touch)
/// 3. Register in global registry
#[tauri::command]
#[specta::specta]
pub async fn complete_yubikey_setup(
    serial: String,
    pin: String,
    label: String,
) -> Result<StreamlinedYubiKeyInitResult, CommandError> {
    info!(
        "Completing YubiKey setup (change mgmt key + generate identity): {}",
        &serial[..8.min(serial.len())]
    );

    let serial_obj = Serial::new(serial.clone())
        .map_err(|e| CommandError::validation(format!("Invalid serial format: {e}")))?;

    let pin_obj =
        Pin::new(pin).map_err(|e| CommandError::validation(format!("Invalid PIN: {e}")))?;

    let manager = YubiKeyManager::new().await.map_err(|e| {
        CommandError::operation(
            ErrorCode::YubiKeyInitializationFailed,
            format!("Failed to initialize YubiKey manager: {e}"),
        )
    })?;

    // Validate device exists
    let device = manager
        .detect_device(&serial_obj)
        .await
        .map_err(|e| {
            CommandError::operation(
                ErrorCode::YubiKeyNotFound,
                format!("Failed to detect YubiKey: {e}"),
            )
        })?
        .ok_or_else(|| {
            CommandError::operation(ErrorCode::YubiKeyNotFound, "YubiKey not connected")
        })?;

    // Validate PIN
    if !manager
        .validate_pin(&serial_obj, &pin_obj)
        .await
        .unwrap_or(false)
    {
        return Err(CommandError::operation(
            ErrorCode::YubiKeyPinRequired,
            "Invalid PIN",
        ));
    }

    // Step 1: Change management key to TDES+protected
    use crate::services::key_management::yubikey::infrastructure::pty::ykman_ops::piv_operations::change_management_key_pty;

    tokio::task::spawn_blocking({
        let serial_clone = serial_obj.value().to_string();
        let pin_clone = pin_obj.value().to_string();
        move || change_management_key_pty(&serial_clone, &pin_clone)
    })
    .await
    .map_err(|e| CommandError::operation(ErrorCode::InternalError, format!("Task error: {e}")))?
    .map_err(|e| {
        CommandError::operation(
            ErrorCode::YubiKeyInitializationFailed,
            format!("Failed to change management key: {e}"),
        )
    })?;

    // Step 2: Generate age identity (requires touch)
    let identity = manager
        .generate_identity(&serial_obj, &pin_obj, 1)
        .await
        .map_err(|e| {
            CommandError::operation(
                ErrorCode::YubiKeyInitializationFailed,
                format!("Failed to generate identity: {e}"),
            )
        })?;

    // Step 3: Register in global registry
    let recovery_placeholder = String::new(); // Not used for reused keys

    let entry_id = manager
        .register_device(
            &device,
            &identity,
            1,
            recovery_placeholder,
            Some(label.clone()),
        )
        .await
        .map_err(|e| {
            CommandError::operation(
                ErrorCode::InternalError,
                format!("Failed to register YubiKey: {e}"),
            )
        })?;

    // Shutdown manager
    if let Err(e) = manager.shutdown().await {
        warn!("Failed to shutdown YubiKey manager: {}", e);
    }

    info!(
        "Successfully completed YubiKey setup: {} entry ID: {}",
        serial_obj.redacted(),
        entry_id
    );

    Ok(StreamlinedYubiKeyInitResult {
        serial: device.serial().value().to_string(),
        slot: 1,
        recipient: identity.to_recipient().to_string(),
        identity_tag: identity.identity_tag().to_string(),
        label,
    })
}

/// Generate age identity for Scenario 2: Reused with TDES
///
/// For YubiKeys that already have custom PIN/PUK and TDES+protected management key,
/// but no age identity yet. This command only:
/// 1. Generates age identity (requires touch)
/// 2. Registers in global registry
#[tauri::command]
#[specta::specta]
pub async fn generate_yubikey_identity(
    serial: String,
    pin: String,
    label: String,
) -> Result<StreamlinedYubiKeyInitResult, CommandError> {
    info!(
        "Generating age identity for YubiKey: {}",
        &serial[..8.min(serial.len())]
    );

    let serial_obj = Serial::new(serial.clone())
        .map_err(|e| CommandError::validation(format!("Invalid serial format: {e}")))?;

    let pin_obj =
        Pin::new(pin).map_err(|e| CommandError::validation(format!("Invalid PIN: {e}")))?;

    let manager = YubiKeyManager::new().await.map_err(|e| {
        CommandError::operation(
            ErrorCode::YubiKeyInitializationFailed,
            format!("Failed to initialize YubiKey manager: {e}"),
        )
    })?;

    // Validate device exists
    let device = manager
        .detect_device(&serial_obj)
        .await
        .map_err(|e| {
            CommandError::operation(
                ErrorCode::YubiKeyNotFound,
                format!("Failed to detect YubiKey: {e}"),
            )
        })?
        .ok_or_else(|| {
            CommandError::operation(ErrorCode::YubiKeyNotFound, "YubiKey not connected")
        })?;

    // Validate PIN
    if !manager
        .validate_pin(&serial_obj, &pin_obj)
        .await
        .unwrap_or(false)
    {
        return Err(CommandError::operation(
            ErrorCode::YubiKeyPinRequired,
            "Invalid PIN",
        ));
    }

    // Generate age identity (requires touch)
    let identity = manager
        .generate_identity(&serial_obj, &pin_obj, 1)
        .await
        .map_err(|e| {
            CommandError::operation(
                ErrorCode::YubiKeyInitializationFailed,
                format!("Failed to generate identity: {e}"),
            )
        })?;

    // Register in global registry
    let recovery_placeholder = String::new(); // Not used for reused keys

    let entry_id = manager
        .register_device(
            &device,
            &identity,
            1,
            recovery_placeholder,
            Some(label.clone()),
        )
        .await
        .map_err(|e| {
            CommandError::operation(
                ErrorCode::InternalError,
                format!("Failed to register YubiKey: {e}"),
            )
        })?;

    // Shutdown manager
    if let Err(e) = manager.shutdown().await {
        warn!("Failed to shutdown YubiKey manager: {}", e);
    }

    info!(
        "Successfully generated identity for YubiKey: {} entry ID: {}",
        serial_obj.redacted(),
        entry_id
    );

    Ok(StreamlinedYubiKeyInitResult {
        serial: device.serial().value().to_string(),
        slot: 1,
        recipient: identity.to_recipient().to_string(),
        identity_tag: identity.identity_tag().to_string(),
        label,
    })
}
