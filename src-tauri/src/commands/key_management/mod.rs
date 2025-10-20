//! Key Management Commands Module
//!
//! This module provides all command layer functionality for key management operations.
//! Commands are organized by key type with unified cross-cutting operations.
//!
//! Structure:
//! - passphrase/: Passphrase key commands (generation, validation, vault integration)
//! - yubikey/: YubiKey commands (device management, crypto operations, vault integration)
//! - unified_keys.rs: Cross-key-type operations and unified APIs
//! - attach_key.rs: Universal key attachment to vaults (R2 API)
//! - import_key.rs: Import external .enc key files (R2 API Phase 4)

pub mod attach_key;
pub mod deactivate_key;
pub mod delete_key;
pub mod export_key;
pub mod import_key;
pub mod key_menu_commands;
pub mod passphrase;
pub mod restore_key;
pub mod unified_keys;
pub mod update_global_key_label;
pub mod yubikey;

// Re-export command functions - avoiding glob imports to prevent name conflicts
pub use passphrase::{
    AddPassphraseKeyRequest, AddPassphraseKeyResponse, GenerateKeyInput, GenerateKeyResponse,
    ListPassphraseKeysResponse, PassphraseKeyInfo, PassphraseValidationResult,
    ValidatePassphraseInput, ValidatePassphraseResponse, VerifyKeyPassphraseInput,
    VerifyKeyPassphraseResponse, add_passphrase_key_to_vault, generate_key, validate_passphrase,
    validate_passphrase_strength, validate_vault_passphrase_key, verify_key_passphrase,
};

pub use yubikey::{
    AvailableYubiKey, PinStatus, RegisterYubiKeyForVaultParams, StreamlinedYubiKeyInitResult,
    UnlockCredentials, YubiKeyInitForVaultParams, YubiKeyState, YubiKeyStateInfo, init_yubikey,
    init_yubikey_for_vault, list_yubikeys, register_yubikey, register_yubikey_for_vault,
    yubikey_decrypt_file,
};

pub use key_menu_commands::{GetKeyMenuDataRequest, GetKeyMenuDataResponse, get_key_menu_data};

pub use unified_keys::{
    GlobalKey, KeyListFilter, KeyType, YubiKeyInfo, list_unified_keys, test_unified_keys,
};

pub use attach_key::{AttachKeyToVaultRequest, AttachKeyToVaultResponse, attach_key_to_vault};

pub use import_key::{
    ImportKeyFileRequest, ImportKeyFileResponse, KeyMetadata, ValidationStatus, import_key_file,
};

pub use deactivate_key::{DeactivateKeyRequest, DeactivateKeyResponse, deactivate_key};

pub use delete_key::{DeleteKeyRequest, DeleteKeyResponse, delete_key};

pub use export_key::{ExportKeyRequest, ExportKeyResponse, export_key};

pub use restore_key::{RestoreKeyRequest, RestoreKeyResponse, restore_key};

pub use update_global_key_label::{
    UpdateGlobalKeyLabelRequest, UpdateGlobalKeyLabelResponse, update_global_key_label,
};
