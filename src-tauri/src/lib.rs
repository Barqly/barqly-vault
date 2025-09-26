// Deny debug and print macros in production code
#![deny(clippy::print_stdout)]
#![deny(clippy::print_stderr)]
#![deny(clippy::dbg_macro)]
// Allow disallowed macros for this module since Tauri macros may use eprintln internally
#![allow(clippy::disallowed_macros)]

pub mod commands; // Keep public - this is the UI interface
pub mod constants; // Centralized constants for the application
pub mod crypto; // Public for tests, but should be treated as private for external use
pub mod file_ops; // Public for tests, but should be treated as private for external use
pub mod key_management;
pub mod models; // Vault and key management models
pub mod prelude;
pub mod storage; // Public for tests, but should be treated as private for external use
pub mod tracing_setup; // New centralized tracing configuration // Project-wide common imports // Centralized key management architecture (YubiKey, passphrase, etc.)

use commands::{
    create_manifest,
    decrypt_data,
    delete_key_command,
    encrypt_files,
    encrypt_files_multi,
    // Crypto commands
    generate_key,
    generate_key_multi,
    get_cache_metrics,
    get_config,
    get_encryption_status,
    get_file_info,
    // get_identities, // TODO: REMOVE - Disabled, unused by frontend
    get_progress,
    init_yubikey,
    // Storage commands
    list_keys_command,
    // Unified key management
    list_unified_keys,
    // Streamlined YubiKey commands
    list_yubikeys,
    register_yubikey,
    select_directory,
    // File commands
    select_files,
    test_unified_keys,
    update_config,
    validate_passphrase,
    validate_passphrase_strength,
    // Vault commands
    vault_commands::{
        add_key_to_vault, add_passphrase_key_to_vault,
        /* check_yubikey_availability, */ create_vault, delete_vault, get_current_vault,
        get_vault_keys, list_vaults, remove_key_from_vault, set_current_vault, update_key_label,
        validate_vault_passphrase_key,
    },
    // Consolidated YubiKey commands
    vault_yubikey_commands::{
        /* check_keymenubar_positions_available, */ init_yubikey_for_vault,
        list_available_yubikeys_for_vault, register_yubikey_for_vault,
    },
    verify_key_passphrase,
    verify_manifest,
    yubikey_crypto_commands::{
        yubikey_decrypt_file, /* yubikey_get_available_unlock_methods, yubikey_test_unlock_credentials, */
    },
    yubikey_list_devices,
};

use crate::prelude::*;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // Initialize new tracing system
    if let Err(e) = tracing_setup::init() {
        // Use eprintln only for initialization errors
        // This is before logging is set up, so it's acceptable
        #[allow(clippy::disallowed_macros, clippy::print_stderr)]
        {
            eprintln!("Failed to initialize tracing: {e:?}");
        }
    }

    // Use tracing for application started message
    info!("Barqly Vault application started");

    // Configure tauri-specta for automatic TypeScript generation (only in build mode, not runtime)
    #[cfg(debug_assertions)]
    {
        use specta_typescript::Typescript;
        use tauri_specta::{Builder, collect_commands};

        let builder = Builder::<tauri::Wry>::new().commands(collect_commands![
            // Crypto commands
            generate_key,
            generate_key_multi,
            validate_passphrase,
            verify_key_passphrase,
            validate_passphrase_strength,
            encrypt_files,
            encrypt_files_multi,
            get_encryption_status,
            decrypt_data,
            verify_manifest,
            get_progress,
            // Storage commands
            list_keys_command,
            delete_key_command,
            // Unified key management
            list_unified_keys,
            test_unified_keys,
            get_config,
            update_config,
            get_cache_metrics,
            // File commands
            select_files,
            select_directory,
            get_file_info,
            create_manifest,
            // Vault commands
            create_vault,
            list_vaults,
            get_current_vault,
            set_current_vault,
            delete_vault,
            get_vault_keys,
            add_key_to_vault,
            remove_key_from_vault,
            update_key_label,
            // check_yubikey_availability, // TODO: REMOVE - Disabled, unused by frontend
            // Passphrase/YubiKey vault integration
            add_passphrase_key_to_vault,
            validate_vault_passphrase_key,
            init_yubikey_for_vault,
            register_yubikey_for_vault,
            list_available_yubikeys_for_vault,
            // check_keymenubar_positions_available, // TODO: REMOVE - Disabled, legacy helper, unused by frontend
            // Streamlined YubiKey commands
            list_yubikeys,
            init_yubikey,
            register_yubikey,
            // get_identities, // TODO: REMOVE - Disabled, unused by frontend
            yubikey_list_devices,
            // YubiKey crypto commands
            yubikey_decrypt_file,
            // yubikey_get_available_unlock_methods, // TODO: REMOVE - Disabled, unused by frontend
            // yubikey_test_unlock_credentials, // TODO: REMOVE - Disabled, unused by frontend
        ]);

        builder
            .export(
                Typescript::default()
                    .bigint(specta_typescript::BigIntExportBehavior::Number)
                    .header(
                        "// This file is auto-generated by tauri-specta. Do not edit manually.",
                    ),
                "../src-ui/src/bindings.ts",
            )
            .expect("Failed to export typescript bindings");
    }

    // Build the regular Tauri handler with ALL commands for now (during migration)
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            // Crypto commands
            generate_key,
            generate_key_multi,
            validate_passphrase,
            verify_key_passphrase,
            validate_passphrase_strength,
            encrypt_files,
            encrypt_files_multi,
            get_encryption_status,
            decrypt_data,
            verify_manifest,
            get_progress,
            // Storage commands
            list_keys_command,
            delete_key_command,
            // Unified key management
            list_unified_keys,
            test_unified_keys,
            get_config,
            update_config,
            get_cache_metrics,
            // File commands
            select_files,
            select_directory,
            get_file_info,
            create_manifest,
            // Vault commands
            create_vault,
            list_vaults,
            get_current_vault,
            set_current_vault,
            delete_vault,
            get_vault_keys,
            add_key_to_vault,
            remove_key_from_vault,
            update_key_label,
            // check_yubikey_availability, // TODO: REMOVE - Disabled, unused by frontend
            // Passphrase/YubiKey vault integration
            add_passphrase_key_to_vault,
            validate_vault_passphrase_key,
            init_yubikey_for_vault,
            register_yubikey_for_vault,
            list_available_yubikeys_for_vault,
            // check_keymenubar_positions_available, // TODO: REMOVE - Disabled, legacy helper, unused by frontend
            // Streamlined YubiKey commands
            list_yubikeys,
            init_yubikey,
            register_yubikey,
            // get_identities, // TODO: REMOVE - Disabled, unused by frontend
            yubikey_list_devices,
            // YubiKey crypto commands
            yubikey_decrypt_file,
            // yubikey_get_available_unlock_methods, // TODO: REMOVE - Disabled, unused by frontend
            // yubikey_test_unlock_credentials, // TODO: REMOVE - Disabled, unused by frontend
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
