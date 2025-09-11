//! Streamlined YubiKey API that hides PIV complexity
//!
//! This module implements the intelligent state detection and simplified API
//! as specified in the expert UX design document.

use crate::commands::command_types::CommandError;
use crate::crypto::yubikey::{YubiIdentityProviderFactory, YubiKeyManager};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::path::PathBuf;
use std::process::Stdio;
use tauri::command;
use tokio::fs;
use tokio::process::Command;

/// YubiKey state classification
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum YubiKeyState {
    /// Brand new YubiKey with default PIN (123456)
    New,
    /// YubiKey with custom PIN but no Barqly age recipient
    Reused,
    /// YubiKey with age recipient configured and ready to use
    Registered,
}

/// PIN status for the YubiKey
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum PinStatus {
    /// Using default PIN (123456)
    Default,
    /// Custom PIN has been set
    Set,
}

/// Intelligent YubiKey state information
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct YubiKeyStateInfo {
    pub serial: String,
    pub state: YubiKeyState,
    pub slot: Option<String>,
    pub recipient: Option<String>,
    pub label: Option<String>,
    pub pin_status: PinStatus,
}

/// List YubiKeys with intelligent state detection
///
/// This command replaces the basic device listing with smart state classification.
/// It detects whether each YubiKey is new, reused, or already registered with Barqly.
///
/// # Returns
/// Vector of YubiKeyStateInfo with intelligent state classification
#[command]
pub async fn list_yubikeys() -> Result<Vec<YubiKeyStateInfo>, CommandError> {
    let mut yubikeys = Vec::new();

    // Get list of connected YubiKeys via ykman
    let serials = get_connected_yubikey_serials().await?;

    // Get existing age recipients
    let age_recipients = get_age_recipients().await?;

    for serial in serials {
        // Check PIN status
        let pin_status = check_pin_status(&serial).await?;

        // Find matching age recipient
        let matching_recipient = age_recipients.iter().find(|r| r.serial == serial);

        // Determine state based on PIN status and recipient existence
        let state = if let Some(_recipient_info) = matching_recipient {
            // Has age recipient - it's registered
            YubiKeyState::Registered
        } else if pin_status == PinStatus::Default {
            // Default PIN, no recipient - it's new
            YubiKeyState::New
        } else {
            // Custom PIN, no recipient - it's reused
            YubiKeyState::Reused
        };

        yubikeys.push(YubiKeyStateInfo {
            serial: serial.clone(),
            state,
            slot: matching_recipient
                .as_ref()
                .map(|r| format!("{:02x}", r.slot)),
            recipient: matching_recipient.as_ref().map(|r| r.recipient.clone()),
            label: matching_recipient.as_ref().map(|r| r.label.clone()),
            pin_status,
        });
    }

    Ok(yubikeys)
}

/// Initialize a brand new YubiKey
///
/// This command is for YubiKeys with default PIN. It changes the PIN,
/// sets up the management key, and generates an age identity.
///
/// # Arguments
/// * `serial` - The serial number of the YubiKey
/// * `new_pin` - The new PIN to set (6-8 digits)
/// * `label` - Human-readable label for this YubiKey
///
/// # Returns
/// YubiKeyInitResult with the generated recipient and metadata
#[command]
pub async fn init_yubikey(
    serial: String,
    new_pin: String,
    label: String,
) -> Result<YubiKeyInitResult, CommandError> {
    // Validate PIN format
    let manager = YubiKeyManager::new();
    manager.validate_pin(&new_pin).map_err(CommandError::from)?;

    // Validate label
    if label.trim().is_empty() {
        return Err(CommandError::validation("Label cannot be empty"));
    }

    // Step 1: Change management key to device-protected
    change_management_key(&serial).await?;

    // Step 2: Change PIN from default to new PIN
    change_pin(&serial, "123456", &new_pin).await?;

    // Step 3: Generate age identity with the new PIN
    let recipient_info = generate_age_identity(&serial, &new_pin, &label).await?;

    Ok(YubiKeyInitResult {
        serial,
        slot: format!("{:02x}", recipient_info.slot),
        recipient: recipient_info.recipient,
        label,
    })
}

/// Register a reused YubiKey
///
/// This command is for YubiKeys that already have a custom PIN set.
/// It generates an age identity in an available slot.
///
/// # Arguments
/// * `serial` - The serial number of the YubiKey
/// * `label` - Human-readable label for this YubiKey
///
/// # Returns
/// YubiKeyInitResult with the generated recipient and metadata
#[command]
pub async fn register_yubikey(
    serial: String,
    label: String,
) -> Result<YubiKeyInitResult, CommandError> {
    // Validate label
    if label.trim().is_empty() {
        return Err(CommandError::validation("Label cannot be empty"));
    }

    // The user will be prompted for PIN by age-plugin-yubikey when needed
    // We don't need to handle PIN here - it's handled interactively
    let recipient_info = generate_age_identity_interactive(&serial, &label).await?;

    Ok(YubiKeyInitResult {
        serial,
        slot: format!("{:02x}", recipient_info.slot),
        recipient: recipient_info.recipient,
        label,
    })
}

/// Get identities for decryption operations
///
/// Returns the age identities available on the specified YubiKey.
///
/// # Arguments
/// * `serial` - The serial number of the YubiKey
///
/// # Returns
/// List of age recipients available on this YubiKey
#[command]
pub async fn get_identities(serial: String) -> Result<Vec<String>, CommandError> {
    let recipients = get_age_recipients().await?;

    let identities: Vec<String> = recipients
        .into_iter()
        .filter(|r| r.serial == serial)
        .map(|r| r.recipient)
        .collect();

    if identities.is_empty() {
        return Err(CommandError::validation(
            "No age identities found on this YubiKey",
        ));
    }

    Ok(identities)
}

// Supporting structures

#[derive(Debug, Serialize, Deserialize)]
pub struct YubiKeyInitResult {
    pub serial: String,
    pub slot: String,
    pub recipient: String,
    pub label: String,
}

#[derive(Debug)]
struct AgeRecipientInfo {
    serial: String,
    slot: u8,
    recipient: String,
    label: String,
}

// Helper functions

async fn get_connected_yubikey_serials() -> Result<Vec<String>, CommandError> {
    let output = Command::new("ykman")
        .args(&["list", "--serials"])
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .output()
        .await
        .map_err(|e| {
            CommandError::operation(
                crate::commands::command_types::ErrorCode::YubiKeyCommunicationError,
                format!("Failed to run ykman: {}", e),
            )
        })?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(CommandError::operation(
            crate::commands::command_types::ErrorCode::YubiKeyCommunicationError,
            format!("ykman failed: {}", stderr),
        ));
    }

    let stdout = String::from_utf8_lossy(&output.stdout);
    let serials: Vec<String> = stdout
        .lines()
        .map(|line| line.trim().to_string())
        .filter(|line| !line.is_empty())
        .collect();

    Ok(serials)
}

async fn get_age_recipients() -> Result<Vec<AgeRecipientInfo>, CommandError> {
    let mut all_recipients = Vec::new();

    // First, try to load from our local registry
    if let Ok(registered) = load_registered_yubikeys().await {
        all_recipients.extend(registered);
    }

    // Also try to get from age-plugin-yubikey (though it may not persist)
    if let Ok(provider) = YubiIdentityProviderFactory::create_default() {
        if let Ok(recipients) = provider.list_recipients().await {
            for r in recipients {
                // Check if we already have this recipient
                if !all_recipients.iter().any(|ar| ar.recipient == r.recipient) {
                    all_recipients.push(AgeRecipientInfo {
                        serial: r.serial,
                        slot: r.slot,
                        recipient: r.recipient,
                        label: r.label,
                    });
                }
            }
        }
    }

    // Finally, check if there's a YubiKey with known identity from environment
    // This handles the case where user has already set up their YubiKey
    if let Ok(identities) = discover_existing_identities().await {
        for identity in identities {
            if !all_recipients
                .iter()
                .any(|ar| ar.recipient == identity.recipient)
            {
                all_recipients.push(identity);
            }
        }
    }

    Ok(all_recipients)
}

async fn check_pin_status(serial: &str) -> Result<PinStatus, CommandError> {
    let output = Command::new("ykman")
        .args(&["--device", serial, "piv", "info"])
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .output()
        .await
        .map_err(|e| {
            CommandError::operation(
                crate::commands::command_types::ErrorCode::YubiKeyCommunicationError,
                format!("Failed to run ykman: {}", e),
            )
        })?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(CommandError::operation(
            crate::commands::command_types::ErrorCode::YubiKeyCommunicationError,
            format!("ykman failed: {}", stderr),
        ));
    }

    let stdout = String::from_utf8_lossy(&output.stdout);

    // Check for "WARNING: Using default PIN!" in output
    if stdout.contains("WARNING: Using default PIN!") {
        Ok(PinStatus::Default)
    } else {
        Ok(PinStatus::Set)
    }
}

async fn change_management_key(serial: &str) -> Result<(), CommandError> {
    // Change management key to be protected by device PIN
    // This is more secure and user-friendly than a separate management key
    let output = Command::new("ykman")
        .args(&[
            "--device",
            serial,
            "piv",
            "access",
            "change-management-key",
            "-a",
            "AES192",
            "--protect",
            "-m",
            "010203040506070801020304050607080102030405060708", // Default management key
        ])
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .output()
        .await
        .map_err(|e| {
            CommandError::operation(
                crate::commands::command_types::ErrorCode::YubiKeyInitializationFailed,
                format!("Failed to change management key: {}", e),
            )
        })?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        // It's ok if management key was already changed
        if !stderr.contains("already") && !stderr.contains("incorrect") {
            return Err(CommandError::operation(
                crate::commands::command_types::ErrorCode::YubiKeyInitializationFailed,
                format!("Failed to change management key: {}", stderr),
            ));
        }
    }

    Ok(())
}

async fn change_pin(serial: &str, old_pin: &str, new_pin: &str) -> Result<(), CommandError> {
    let output = Command::new("ykman")
        .args(&[
            "--device",
            serial,
            "piv",
            "access",
            "change-pin",
            "-p",
            old_pin,
            "-n",
            new_pin,
        ])
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .output()
        .await
        .map_err(|e| {
            CommandError::operation(
                crate::commands::command_types::ErrorCode::YubiKeyInitializationFailed,
                format!("Failed to change PIN: {}", e),
            )
        })?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(CommandError::operation(
            crate::commands::command_types::ErrorCode::YubiKeyInitializationFailed,
            format!("Failed to change PIN: {}", stderr),
        ));
    }

    Ok(())
}

async fn generate_age_identity(
    serial: &str,
    pin: &str,
    label: &str,
) -> Result<AgeRecipientInfo, CommandError> {
    // Use age-plugin-yubikey to generate identity
    // We'll pass the PIN via environment variable for non-interactive use
    let output = Command::new("age-plugin-yubikey")
        .args(&[
            "--generate",
            "--name",
            label,
            "--serial",
            serial,
            "--slot",
            "9c", // Default to Digital Signature slot
            "--pin-policy",
            "once",
            "--touch-policy",
            "always",
        ])
        .env("AGE_PLUGIN_YUBIKEY_PIN", pin)
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .output()
        .await
        .map_err(|e| {
            CommandError::operation(
                crate::commands::command_types::ErrorCode::YubiKeyInitializationFailed,
                format!("Failed to generate age identity: {}", e),
            )
        })?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(CommandError::operation(
            crate::commands::command_types::ErrorCode::YubiKeyInitializationFailed,
            format!("Failed to generate age identity: {}", stderr),
        ));
    }

    let stdout = String::from_utf8_lossy(&output.stdout);

    // Parse the recipient from output
    // Format: "age1yubikey1..."
    let recipient = stdout
        .lines()
        .find(|line| line.starts_with("age1yubikey1"))
        .ok_or_else(|| {
            CommandError::operation(
                crate::commands::command_types::ErrorCode::YubiKeyInitializationFailed,
                "Failed to parse generated recipient",
            )
        })?
        .trim()
        .to_string();

    let info = AgeRecipientInfo {
        serial: serial.to_string(),
        slot: 0x9c, // We used slot 9c
        recipient: recipient.clone(),
        label: label.to_string(),
    };

    // Save to our registry for future detection
    let _ = save_registered_yubikey(&info).await;

    Ok(info)
}

async fn generate_age_identity_interactive(
    serial: &str,
    label: &str,
) -> Result<AgeRecipientInfo, CommandError> {
    // For reused YubiKeys, we let age-plugin-yubikey handle PIN prompting
    // This is more secure as the PIN is never passed through our application

    // First, try to find an available slot
    let slot = find_available_slot(serial).await?;

    let output = Command::new("age-plugin-yubikey")
        .args(&[
            "--generate",
            "--name",
            label,
            "--serial",
            serial,
            "--slot",
            &format!("{:02x}", slot),
            "--pin-policy",
            "once",
            "--touch-policy",
            "always",
        ])
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .output()
        .await
        .map_err(|e| {
            CommandError::operation(
                crate::commands::command_types::ErrorCode::YubiKeyInitializationFailed,
                format!("Failed to generate age identity: {}", e),
            )
        })?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(CommandError::operation(
            crate::commands::command_types::ErrorCode::YubiKeyInitializationFailed,
            format!("Failed to generate age identity: {}", stderr),
        ));
    }

    let stdout = String::from_utf8_lossy(&output.stdout);

    // Parse the recipient from output
    let recipient = stdout
        .lines()
        .find(|line| line.starts_with("age1yubikey1"))
        .ok_or_else(|| {
            CommandError::operation(
                crate::commands::command_types::ErrorCode::YubiKeyInitializationFailed,
                "Failed to parse generated recipient",
            )
        })?
        .trim()
        .to_string();

    let info = AgeRecipientInfo {
        serial: serial.to_string(),
        slot,
        recipient: recipient.clone(),
        label: label.to_string(),
    };

    // Save to our registry for future detection
    let _ = save_registered_yubikey(&info).await;

    Ok(info)
}

async fn find_available_slot(serial: &str) -> Result<u8, CommandError> {
    // Check common slots in order of preference
    // 9c (Digital Signature) is preferred, then 9a (Authentication), 9d (Key Management), 9e (Card Auth)
    let slots_to_check = [0x9c, 0x9a, 0x9d, 0x9e];

    for slot in &slots_to_check {
        if is_slot_available(serial, *slot).await? {
            return Ok(*slot);
        }
    }

    Err(CommandError::operation(
        crate::commands::command_types::ErrorCode::YubiKeySlotInUse,
        "No available slots on YubiKey. All standard PIV slots are in use.",
    ))
}

async fn is_slot_available(serial: &str, slot: u8) -> Result<bool, CommandError> {
    let output = Command::new("ykman")
        .args(&["--device", serial, "piv", "info"])
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .output()
        .await
        .map_err(|e| {
            CommandError::operation(
                crate::commands::command_types::ErrorCode::YubiKeyCommunicationError,
                format!("Failed to check slot: {}", e),
            )
        })?;

    if !output.status.success() {
        return Ok(false); // Assume not available if we can't check
    }

    let stdout = String::from_utf8_lossy(&output.stdout);
    let slot_hex = format!("{:02x}", slot);

    // Check if this slot is mentioned in the output
    // If it's not mentioned or shows "No data available", it's available
    Ok(!stdout.contains(&format!("Slot {}", slot_hex)))
}

// Helper functions for YubiKey registry persistence

/// Get the path to the YubiKey registry file
fn get_registry_path() -> Result<PathBuf, CommandError> {
    let app_dir = crate::storage::get_application_directory().map_err(|e| {
        CommandError::operation(
            crate::commands::command_types::ErrorCode::FileSystemError,
            format!("Failed to get app directory: {}", e),
        )
    })?;
    Ok(app_dir.join("yubikey-registry.json"))
}

/// Load registered YubiKeys from local storage
async fn load_registered_yubikeys() -> Result<Vec<AgeRecipientInfo>, CommandError> {
    let registry_path = get_registry_path()?;

    if !registry_path.exists() {
        return Ok(Vec::new());
    }

    let content = fs::read_to_string(&registry_path).await.map_err(|e| {
        CommandError::operation(
            crate::commands::command_types::ErrorCode::FileSystemError,
            format!("Failed to read registry: {}", e),
        )
    })?;

    let registry: HashMap<String, StoredYubiKey> =
        serde_json::from_str(&content).unwrap_or_default();

    Ok(registry
        .into_values()
        .map(|stored| AgeRecipientInfo {
            serial: stored.serial,
            slot: stored.slot,
            recipient: stored.recipient,
            label: stored.label,
        })
        .collect())
}

/// Save a registered YubiKey to local storage
async fn save_registered_yubikey(info: &AgeRecipientInfo) -> Result<(), CommandError> {
    let registry_path = get_registry_path()?;

    // Load existing registry
    let mut registry: HashMap<String, StoredYubiKey> = if registry_path.exists() {
        let content = fs::read_to_string(&registry_path).await.map_err(|e| {
            CommandError::operation(
                crate::commands::command_types::ErrorCode::FileSystemError,
                format!("Failed to read registry: {}", e),
            )
        })?;
        serde_json::from_str(&content).unwrap_or_default()
    } else {
        HashMap::new()
    };

    // Add or update entry
    registry.insert(
        info.serial.clone(),
        StoredYubiKey {
            serial: info.serial.clone(),
            slot: info.slot,
            recipient: info.recipient.clone(),
            label: info.label.clone(),
        },
    );

    // Save registry
    let json = serde_json::to_string_pretty(&registry).map_err(|e| {
        CommandError::operation(
            crate::commands::command_types::ErrorCode::InternalError,
            format!("Failed to serialize registry: {}", e),
        )
    })?;

    fs::write(&registry_path, json).await.map_err(|e| {
        CommandError::operation(
            crate::commands::command_types::ErrorCode::FileSystemError,
            format!("Failed to write registry: {}", e),
        )
    })?;

    Ok(())
}

/// Discover existing YubiKey identities from age-plugin-yubikey
///
/// This function dynamically discovers any existing age identities on connected YubiKeys
/// by calling age-plugin-yubikey commands and parsing their output.
async fn discover_existing_identities() -> Result<Vec<AgeRecipientInfo>, CommandError> {
    let mut discovered = Vec::new();

    // Try to call age-plugin-yubikey --list or --list-all to get existing recipients
    // This will show any already-configured age identities on connected YubiKeys
    let output = match Command::new("age-plugin-yubikey")
        .arg("--list-all")
        .output()
        .await
    {
        Ok(output) => output,
        Err(_) => {
            // Fallback to --list for older versions
            Command::new("age-plugin-yubikey")
                .arg("--list")
                .output()
                .await
                .map_err(|e| {
                    CommandError::operation(
                        crate::commands::command_types::ErrorCode::InternalError,
                        format!("Failed to run age-plugin-yubikey: {}", e),
                    )
                })?
        }
    };

    if output.status.success() {
        let stdout = String::from_utf8_lossy(&output.stdout);

        // Parse the output - typical format is:
        // Serial: XXXXXXXX, Slot: 0x9c: age1yubikey1...
        // or similar variations depending on version
        for line in stdout.lines() {
            if line.contains("age1yubikey") {
                // Extract the recipient string
                if let Some(recipient_start) = line.find("age1yubikey") {
                    let recipient = line[recipient_start..]
                        .split_whitespace()
                        .next()
                        .unwrap_or("")
                        .trim_end_matches(',')
                        .trim_end_matches(':')
                        .to_string();

                    if !recipient.is_empty() {
                        // Try to extract serial number if present
                        let serial = if let Some(serial_pos) = line.to_lowercase().find("serial:") {
                            let serial_part = &line[serial_pos + 7..];
                            serial_part
                                .split(&[',', ' ', ':'][..])
                                .next()
                                .unwrap_or("")
                                .trim()
                                .to_string()
                        } else {
                            // If no serial in this line, try to get from connected YubiKeys
                            get_connected_yubikey_serials()
                                .await
                                .unwrap_or_default()
                                .first()
                                .cloned()
                                .unwrap_or_default()
                        };

                        // Extract slot if present (default to 0x9c which is common for age)
                        let slot = if let Some(slot_pos) = line.to_lowercase().find("slot:") {
                            let slot_part = &line[slot_pos + 5..];
                            let slot_str = slot_part
                                .split(&[',', ' ', ':'][..])
                                .next()
                                .unwrap_or("0x9c")
                                .trim();

                            // Parse hex slot number
                            if slot_str.starts_with("0x") {
                                u8::from_str_radix(&slot_str[2..], 16).unwrap_or(0x9c)
                            } else {
                                slot_str.parse::<u8>().unwrap_or(0x9c)
                            }
                        } else {
                            0x9c // Default PIV authentication slot
                        };

                        if !serial.is_empty() {
                            discovered.push(AgeRecipientInfo {
                                serial,
                                slot,
                                recipient,
                                label: "Existing YubiKey".to_string(), // Generic label for discovered keys
                            });
                        }
                    }
                }
            }
        }
    }

    // Also try to get identities from age-plugin-yubikey --identity
    // This shows the private key side if available
    if discovered.is_empty() {
        if let Ok(output) = Command::new("age-plugin-yubikey")
            .arg("--identity")
            .output()
            .await
        {
            if output.status.success() {
                let stdout = String::from_utf8_lossy(&output.stdout);
                // The --identity output might contain recipient information
                // Parse it similarly to above if it contains useful data
                for line in stdout.lines() {
                    if line.contains("Recipient:") && line.contains("age1yubikey") {
                        if let Some(recipient_start) = line.find("age1yubikey") {
                            let recipient = line[recipient_start..]
                                .split_whitespace()
                                .next()
                                .unwrap_or("")
                                .to_string();

                            if !recipient.is_empty() {
                                // Get the first connected YubiKey serial
                                if let Ok(serials) = get_connected_yubikey_serials().await {
                                    if let Some(serial) = serials.first() {
                                        discovered.push(AgeRecipientInfo {
                                            serial: serial.clone(),
                                            slot: 0x9c,
                                            recipient,
                                            label: "Existing YubiKey".to_string(),
                                        });
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    Ok(discovered)
}

#[derive(Debug, Serialize, Deserialize)]
struct StoredYubiKey {
    serial: String,
    slot: u8,
    recipient: String,
    label: String,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_pin_status_serialization() {
        let status = PinStatus::Default;
        let json = serde_json::to_string(&status).unwrap();
        assert_eq!(json, r#""default""#);

        let status = PinStatus::Set;
        let json = serde_json::to_string(&status).unwrap();
        assert_eq!(json, r#""set""#);
    }

    #[test]
    fn test_yubikey_state_serialization() {
        let state = YubiKeyState::New;
        let json = serde_json::to_string(&state).unwrap();
        assert_eq!(json, r#""new""#);

        let state = YubiKeyState::Reused;
        let json = serde_json::to_string(&state).unwrap();
        assert_eq!(json, r#""reused""#);

        let state = YubiKeyState::Registered;
        let json = serde_json::to_string(&state).unwrap();
        assert_eq!(json, r#""registered""#);
    }

    #[test]
    fn test_yubikey_state_info_serialization() {
        let info = YubiKeyStateInfo {
            serial: "12345678".to_string(),
            state: YubiKeyState::Registered,
            slot: Some("9c".to_string()),
            recipient: Some("age1yubikey1...".to_string()),
            label: Some("Test Key".to_string()),
            pin_status: PinStatus::Set,
        };

        let json = serde_json::to_string(&info).unwrap();
        assert!(json.contains(r#""serial":"12345678""#));
        assert!(json.contains(r#""state":"registered""#));
        assert!(json.contains(r#""pin_status":"set""#));
    }
}
