//! Type Conversion Functions
//!
//! Converts Layer 2 key types (PassphraseKeyInfo, YubiKeyStateInfo) to unified KeyInfo structure.

use super::{KeyInfo, KeyType, YubiKeyInfo};
use crate::commands::passphrase::PassphraseKeyInfo;
use crate::commands::yubikey::device_commands::{PinStatus, YubiKeyState, YubiKeyStateInfo};
use crate::commands::yubikey::vault_commands::AvailableYubiKey;
use crate::models::KeyState;

/// Convert PassphraseKeyInfo to unified KeyInfo
pub fn convert_passphrase_to_unified(
    passphrase_key: PassphraseKeyInfo,
    vault_id: Option<String>,
) -> KeyInfo {
    let key_id = passphrase_key.id.clone();
    KeyInfo {
        id: passphrase_key.id,
        label: passphrase_key.label,
        key_type: KeyType::Passphrase { key_id },
        recipient: passphrase_key.public_key, // Real public key from registry!
        is_available: passphrase_key.is_available,
        vault_id,
        state: if passphrase_key.is_available {
            KeyState::Active
        } else {
            KeyState::Registered
        },
        yubikey_info: None,
    }
}

/// Convert YubiKeyStateInfo to unified KeyInfo
pub fn convert_yubikey_to_unified(
    yubikey_key: YubiKeyStateInfo,
    vault_id: Option<String>,
) -> KeyInfo {
    let is_available = match yubikey_key.state {
        YubiKeyState::Registered => true,
        YubiKeyState::Orphaned => true,
        YubiKeyState::Reused => true,
        YubiKeyState::New => false,
    };

    KeyInfo {
        id: format!("yubikey_{}", yubikey_key.serial), // Generate consistent ID
        label: yubikey_key
            .label
            .unwrap_or_else(|| format!("YubiKey-{}", yubikey_key.serial)),
        key_type: KeyType::YubiKey {
            serial: yubikey_key.serial.clone(),
            firmware_version: yubikey_key.firmware_version.clone(), // Real firmware version from registry/device
        },
        recipient: yubikey_key
            .recipient
            .unwrap_or_else(|| "unknown".to_string()), // Real recipient from registry!
        is_available,
        vault_id,
        state: match yubikey_key.state {
            YubiKeyState::Registered => KeyState::Active,
            YubiKeyState::Orphaned => KeyState::Orphaned,
            YubiKeyState::Reused => KeyState::Registered,
            YubiKeyState::New => KeyState::Orphaned,
        },
        yubikey_info: Some(YubiKeyInfo {
            slot: yubikey_key.slot,
            identity_tag: yubikey_key.identity_tag,
            pin_status: yubikey_key.pin_status,
            yubikey_state: yubikey_key.state,
        }),
    }
}

/// Convert AvailableYubiKey to unified KeyInfo
pub fn convert_available_yubikey_to_unified(
    available_key: AvailableYubiKey,
    vault_id: Option<String>,
) -> KeyInfo {
    KeyInfo {
        id: format!("available_yubikey_{}", available_key.serial),
        label: available_key
            .label
            .unwrap_or_else(|| format!("YubiKey-{}", available_key.serial)),
        key_type: KeyType::YubiKey {
            serial: available_key.serial.clone(),
            firmware_version: None,
        },
        recipient: available_key
            .recipient
            .unwrap_or_else(|| "pending".to_string()),
        is_available: true,
        vault_id,
        state: match available_key.state.as_str() {
            "new" => KeyState::Orphaned,
            "orphaned" => KeyState::Orphaned,
            _ => KeyState::Orphaned,
        },
        yubikey_info: Some(YubiKeyInfo {
            slot: available_key.slot,
            identity_tag: available_key.identity_tag,
            pin_status: PinStatus::Set, // Simplified for available keys
            yubikey_state: match available_key.state.as_str() {
                "new" => YubiKeyState::New,
                "orphaned" => YubiKeyState::Orphaned,
                _ => YubiKeyState::Orphaned,
            },
        }),
    }
}
