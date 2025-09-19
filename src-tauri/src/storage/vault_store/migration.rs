//! Migration from ProtectionMode to vault-centric model
//!
//! Handles automatic migration of existing vaults that use the old
//! ProtectionMode structure to the new vault-centric architecture.

use crate::models::{KeyReference, KeyState, KeyType, Vault};
use crate::storage::metadata_v2::VaultMetadataV2;
use chrono::Utc;
use serde_json::Value;
use tracing::{info, warn};

/// Check if a vault needs migration and perform it if necessary
pub async fn migrate_vault_if_needed(
    _vault: &mut Vault,
) -> Result<bool, Box<dyn std::error::Error + Send + Sync>> {
    // This function would be called when loading existing vaults
    // For now, we'll return false since we're creating new vaults
    Ok(false)
}

/// Migrate from ProtectionMode-based metadata to vault-centric model
pub fn migrate_from_protection_mode(
    metadata: &VaultMetadataV2,
    vault_id: String,
    vault_name: String,
) -> Vault {
    let mut vault = Vault {
        id: vault_id,
        name: vault_name,
        description: Some("Migrated from legacy format".to_string()),
        created_at: metadata.created_at,
        updated_at: Utc::now(),
        keys: Vec::new(),
        is_current: false,
    };

    // Convert recipients to key references
    for (index, recipient) in metadata.recipients.iter().enumerate() {
        let key_ref = match &recipient.recipient_type {
            crate::storage::metadata_v2::RecipientType::Passphrase => KeyReference {
                id: format!("migrated_passphrase_{index}"),
                key_type: KeyType::Passphrase {
                    key_id: recipient.public_key.clone(),
                },
                label: recipient.label.clone(),
                state: KeyState::Active,
                created_at: recipient.created_at,
                last_used: None,
            },
            crate::storage::metadata_v2::RecipientType::YubiKey { serial, slot, .. } => {
                KeyReference {
                    id: format!("migrated_yubikey_{index}"),
                    key_type: KeyType::Yubikey {
                        serial: serial.clone(),
                        slot_index: (index as u8).min(2), // Cap at 3 YubiKeys
                        piv_slot: *slot,
                    },
                    label: recipient.label.clone(),
                    state: KeyState::Registered,
                    created_at: recipient.created_at,
                    last_used: None,
                }
            }
        };

        let _ = vault.add_key(key_ref);
    }

    info!(
        "Migrated vault '{}' with {} keys from ProtectionMode format",
        vault.name,
        vault.keys.len()
    );

    vault
}

/// Check if a JSON value contains ProtectionMode field (needs migration)
pub fn needs_migration(value: &Value) -> bool {
    // Check for presence of protection_mode field
    if let Some(obj) = value.as_object() {
        return obj.contains_key("protection_mode") || obj.contains_key("protectionMode");
    }
    false
}

/// Perform migration on a raw JSON value
pub async fn migrate_json_vault(
    value: &mut Value,
    vault_id: &str,
) -> Result<bool, Box<dyn std::error::Error + Send + Sync>> {
    if !needs_migration(value) {
        return Ok(false);
    }

    info!("Migrating vault {} from ProtectionMode format", vault_id);

    // Extract relevant fields from old format
    let vault_name = value
        .get("name")
        .and_then(|v| v.as_str())
        .unwrap_or("Migrated Vault")
        .to_string();

    let created_at = value
        .get("created_at")
        .and_then(|v| v.as_str())
        .and_then(|s| chrono::DateTime::parse_from_rfc3339(s).ok())
        .map(|dt| dt.with_timezone(&Utc))
        .unwrap_or_else(Utc::now);

    // Create new vault structure
    let mut vault = Vault {
        id: vault_id.to_string(),
        name: vault_name,
        description: Some("Automatically migrated from legacy format".to_string()),
        created_at,
        updated_at: Utc::now(),
        keys: Vec::new(),
        is_current: value
            .get("is_current")
            .and_then(|v| v.as_bool())
            .unwrap_or(false),
    };

    // Handle protection mode conversion
    if let Some(protection_mode) = value.get("protection_mode").or(value.get("protectionMode")) {
        match protection_mode.as_str() {
            Some("PassphraseOnly") | Some("passphrase_only") => {
                // Add passphrase key reference
                vault
                    .add_key(KeyReference {
                        id: format!("{vault_id}_passphrase"),
                        key_type: KeyType::Passphrase {
                            key_id: format!("{vault_id}_key"),
                        },
                        label: "Primary Passphrase".to_string(),
                        state: KeyState::Active,
                        created_at,
                        last_used: None,
                    })
                    .ok();
            }
            Some("YubiKeyOnly") | Some("yubikey_only") => {
                // Add YubiKey reference
                if let Some(yubikey_info) = value.get("yubikey_info") {
                    if let Some(serial) = yubikey_info.get("serial").and_then(|v| v.as_str()) {
                        vault
                            .add_key(KeyReference {
                                id: format!("{vault_id}_yubikey"),
                                key_type: KeyType::Yubikey {
                                    serial: serial.to_string(),
                                    slot_index: 0,
                                    piv_slot: 82, // Default to first retired slot
                                },
                                label: "Primary YubiKey".to_string(),
                                state: KeyState::Registered,
                                created_at,
                                last_used: None,
                            })
                            .ok();
                    }
                }
            }
            Some("Hybrid") | Some("hybrid") => {
                // Add both passphrase and YubiKey
                vault
                    .add_key(KeyReference {
                        id: format!("{vault_id}_passphrase"),
                        key_type: KeyType::Passphrase {
                            key_id: format!("{vault_id}_key"),
                        },
                        label: "Passphrase".to_string(),
                        state: KeyState::Active,
                        created_at,
                        last_used: None,
                    })
                    .ok();

                if let Some(yubikey_info) = value.get("yubikey_info") {
                    if let Some(serial) = yubikey_info.get("serial").and_then(|v| v.as_str()) {
                        vault
                            .add_key(KeyReference {
                                id: format!("{vault_id}_yubikey"),
                                key_type: KeyType::Yubikey {
                                    serial: serial.to_string(),
                                    slot_index: 0,
                                    piv_slot: 82,
                                },
                                label: "YubiKey".to_string(),
                                state: KeyState::Registered,
                                created_at,
                                last_used: None,
                            })
                            .ok();
                    }
                }
            }
            _ => {
                warn!("Unknown protection mode: {:?}", protection_mode);
            }
        }
    }

    // Replace the JSON value with new vault structure
    *value = serde_json::to_value(vault)?;

    Ok(true)
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    #[test]
    fn test_needs_migration() {
        let old_format = json!({
            "protection_mode": "PassphraseOnly",
            "name": "Test Vault"
        });
        assert!(needs_migration(&old_format));

        let new_format = json!({
            "id": "vault_123",
            "name": "Test Vault",
            "keys": []
        });
        assert!(!needs_migration(&new_format));
    }

    #[tokio::test]
    async fn test_migrate_passphrase_vault() {
        let mut old_vault = json!({
            "name": "My Vault",
            "protection_mode": "PassphraseOnly",
            "created_at": "2024-01-01T00:00:00Z"
        });

        let migrated = migrate_json_vault(&mut old_vault, "test_vault")
            .await
            .unwrap();
        assert!(migrated);

        // Check the migrated structure
        let vault: Vault = serde_json::from_value(old_vault).unwrap();
        assert_eq!(vault.id, "test_vault");
        assert_eq!(vault.name, "My Vault");
        assert_eq!(vault.keys.len(), 1);
        assert!(matches!(vault.keys[0].key_type, KeyType::Passphrase { .. }));
    }
}
