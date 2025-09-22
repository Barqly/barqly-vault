// Deny debug and print macros in production code
#![deny(clippy::print_stdout)]
#![deny(clippy::print_stderr)]
#![deny(clippy::dbg_macro)]

pub mod commands; // Keep public - this is the UI interface
pub mod constants; // Centralized constants for the application
pub mod crypto; // Public for tests, but should be treated as private for external use
pub mod file_ops; // Public for tests, but should be treated as private for external use
// pub mod logging; // REMOVED - migrated to tracing_setup
pub mod models; // Vault and key management models
pub mod storage; // Public for tests, but should be treated as private for external use
pub mod tracing_setup; // New centralized tracing configuration
pub mod prelude; // Project-wide common imports

use commands::{
    create_manifest,
    decrypt_data,
    delete_key_command,
    encrypt_files,
    // Crypto commands
    generate_key,
    generate_key_multi,
    get_cache_metrics,
    get_config,
    get_encryption_status,
    get_file_info,
    get_identities,
    get_progress,
    init_yubikey,
    // Storage commands
    list_keys_command,
    // Streamlined YubiKey commands
    list_yubikeys,
    register_yubikey,
    select_directory,
    // File commands
    select_files,
    update_config,
    validate_passphrase,
    validate_passphrase_strength,
    // Vault commands
    vault_commands::{
        add_key_to_vault, add_passphrase_key_to_vault, check_yubikey_availability,
        check_yubikey_slot_availability, create_vault, delete_vault, get_current_vault,
        get_vault_keys, init_yubikey_for_vault, list_available_yubikeys, list_vaults,
        register_yubikey_for_vault, remove_key_from_vault, set_current_vault, update_key_label,
        validate_vault_passphrase_key,
    },
    verify_key_passphrase,
    verify_manifest,
    yubikey_check_setup_status,
    yubikey_decrypt_file,
    yubikey_devices_available,
    yubikey_get_available_unlock_methods,
    yubikey_get_device_info,
    yubikey_get_setup_recommendations,
    yubikey_initialize,
    // YubiKey commands
    yubikey_list_devices,
    yubikey_test_connection,
    yubikey_test_unlock_credentials,
    yubikey_validate_pin,
};

// use logging::{init_logging, LogLevel}; // REMOVED - migrated to tracing_setup
use crate::prelude::*;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // Initialize new tracing system
    if let Err(e) = tracing_setup::init() {
        // Use eprintln only for initialization errors
        // This is before logging is set up, so it's acceptable
        #[allow(clippy::print_stderr)]
        eprintln!("Failed to initialize tracing: {e:?}");
    }

    // Use tracing for application started message
    info!("Barqly Vault application started");

    // Configure tauri-specta for automatic TypeScript generation (only in build mode, not runtime)
    #[cfg(debug_assertions)]
    {
        use tauri_specta::{Builder, collect_commands};
        use specta_typescript::Typescript;

        let builder = Builder::<tauri::Wry>::new()
            .commands(collect_commands![
                // Crypto commands
                generate_key,
                generate_key_multi,
                validate_passphrase,
                verify_key_passphrase,
                validate_passphrase_strength,
                encrypt_files,
                get_encryption_status,
                decrypt_data,
                verify_manifest,
                get_progress,
                // Storage commands
                list_keys_command,
                delete_key_command,
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
                check_yubikey_availability,
                // Passphrase/YubiKey vault integration
                add_passphrase_key_to_vault,
                validate_vault_passphrase_key,
                init_yubikey_for_vault,
                register_yubikey_for_vault,
                list_available_yubikeys,
                check_yubikey_slot_availability,
                // YubiKey commands
                yubikey_list_devices,
                yubikey_devices_available,
                yubikey_get_device_info,
                yubikey_test_connection,
                yubikey_initialize,
                yubikey_get_setup_recommendations,
                yubikey_validate_pin,
                yubikey_check_setup_status,
                yubikey_decrypt_file,
                yubikey_get_available_unlock_methods,
                yubikey_test_unlock_credentials,
                // Streamlined YubiKey commands
                list_yubikeys,
                init_yubikey,
                register_yubikey,
                get_identities,
            ]);

        builder
            .export(
                Typescript::default()
                    .bigint(specta_typescript::BigIntExportBehavior::Number),
                "../src-ui/src/bindings.ts"
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
        get_encryption_status,
        decrypt_data,
        verify_manifest,
        get_progress,
        // Storage commands
        list_keys_command,
        delete_key_command,
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
        check_yubikey_availability,
        // Passphrase/YubiKey vault integration
        add_passphrase_key_to_vault,
        validate_vault_passphrase_key,
        init_yubikey_for_vault,
        register_yubikey_for_vault,
        list_available_yubikeys,
        check_yubikey_slot_availability,
        // YubiKey commands
        yubikey_list_devices,
        yubikey_devices_available,
        yubikey_get_device_info,
        yubikey_test_connection,
        yubikey_initialize,
        yubikey_get_setup_recommendations,
        yubikey_validate_pin,
        yubikey_check_setup_status,
        yubikey_decrypt_file,
        yubikey_get_available_unlock_methods,
        yubikey_test_unlock_credentials,
        // Streamlined YubiKey commands
        list_yubikeys,
        init_yubikey,
        register_yubikey,
        get_identities,
    ])
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
