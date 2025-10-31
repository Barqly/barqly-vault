// Deny debug and print macros in production code
#![deny(clippy::print_stdout)]
#![deny(clippy::print_stderr)]
#![deny(clippy::dbg_macro)]
// Allow disallowed macros for this module since Tauri macros may use eprintln internally
#![allow(clippy::disallowed_macros)]

pub mod commands; // Keep public - this is the UI interface
pub mod constants; // Centralized constants for the application
// Crypto module moved to services/crypto/infrastructure for proper DDD architecture
pub mod error; // Centralized error handling infrastructure
pub mod logging; // Centralized logging and tracing infrastructure
pub mod prelude;
pub mod services; // Business logic layer (DDD) - renamed from key_management
pub mod types; // Shared interface types for Tauri bridge (used by commands and services)

use commands::{
    analyze_encrypted_vault,
    create_manifest,
    decrypt_data,
    encrypt_files,
    encrypt_files_multi,
    // Crypto commands
    get_encryption_status,
    get_file_info,
    // Key management commands
    get_key_menu_data,
    get_progress,
    key_management::{
        attach_key::attach_key_to_vault,
        deactivate_key::deactivate_key,
        delete_key::delete_key,
        export_key::export_key,
        import_key::import_key_file,
        passphrase::{
            add_passphrase_key_to_vault, generate_key, validate_passphrase,
            validate_passphrase_strength, validate_vault_passphrase_key, verify_key_passphrase,
        },
        restore_key::restore_key,
        unified_keys::{
            get_vault_keys, list_unified_keys, remove_key_from_vault, test_unified_keys,
            update_key_label,
        },
        update_global_key_label::update_global_key_label,
        yubikey::{
            init_yubikey, init_yubikey_for_vault, list_yubikeys, register_yubikey,
            register_yubikey_for_vault, yubikey_decrypt_file,
        },
    },
    // Storage commands
    select_directory,
    // File commands
    select_files,
    // Vault commands
    vault::{
        create_vault, delete_vault, get_all_vault_statistics, get_current_vault,
        get_vault_statistics, list_vaults, set_current_vault,
    },
    verify_manifest,
};

use crate::prelude::*;
use services::vault::application::services::BootstrapService;

/// Run bootstrap initialization
///
/// Syncs key registry from vault manifests and ensures device identity exists.
fn run_bootstrap() -> Result<(), Box<dyn std::error::Error>> {
    use tokio::runtime::Runtime;

    let rt = Runtime::new()?;
    rt.block_on(async {
        let bootstrap = BootstrapService::new();
        let result = bootstrap.bootstrap().await?;

        info!(
            manifests_found = result.manifests_found,
            keys_added = result.keys_added,
            keys_total = result.keys_after,
            "Bootstrap completed"
        );

        Ok(())
    })
}

/// Generate TypeScript bindings for all Tauri commands
/// This is called by the generate-bindings binary and the build hooks
pub fn generate_typescript_bindings() -> Result<(), String> {
    use specta_typescript::Typescript;
    use std::fs;
    use std::path::Path;
    use tauri_specta::{Builder, collect_commands};

    let builder = Builder::<tauri::Wry>::new().commands(collect_commands![
        // Crypto commands
        generate_key,
        validate_passphrase,
        verify_key_passphrase,
        validate_passphrase_strength,
        encrypt_files,
        encrypt_files_multi,
        get_encryption_status,
        decrypt_data,
        verify_manifest,
        get_progress,
        analyze_encrypted_vault,
        // Storage commands
        // Unified key management
        list_unified_keys,
        test_unified_keys,
        get_vault_keys,
        get_key_menu_data,
        remove_key_from_vault,
        update_key_label,
        // Key lifecycle management
        deactivate_key,
        delete_key,
        export_key,
        restore_key,
        update_global_key_label,
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
        get_vault_statistics,
        get_all_vault_statistics,
        // Passphrase/YubiKey vault integration
        add_passphrase_key_to_vault,
        validate_vault_passphrase_key,
        init_yubikey_for_vault,
        register_yubikey_for_vault,
        attach_key_to_vault,
        import_key_file,
        // Streamlined YubiKey commands
        list_yubikeys,
        init_yubikey,
        register_yubikey,
        // YubiKey crypto commands
        yubikey_decrypt_file,
    ]);

    let bindings_path = "../src-ui/src/bindings.ts";

    // First, export the bindings
    builder
        .export(
            Typescript::default()
                .bigint(specta_typescript::BigIntExportBehavior::Number)
                .header("// This file is auto-generated by tauri-specta. Do not edit manually."),
            bindings_path,
        )
        .map_err(|e| format!("Failed to export TypeScript bindings: {e}"))?;

    // Post-process the file to add @ts-nocheck at the very beginning
    let bindings_full_path = Path::new(env!("CARGO_MANIFEST_DIR")).join(bindings_path);
    let content = fs::read_to_string(&bindings_full_path)
        .map_err(|e| format!("Failed to read bindings file: {e}"))?;

    // Prepend @ts-nocheck to suppress TypeScript warnings for unused generated code
    let modified_content = format!(
        "// @ts-nocheck - Suppress TypeScript warnings for unused generated code\n{}",
        content
    );

    fs::write(&bindings_full_path, modified_content)
        .map_err(|e| format!("Failed to write modified bindings file: {e}"))?;

    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run_app() {
    // CRITICAL: Initialize PathProvider FIRST (before logging)
    // This ensures consistent paths during bootstrap and runtime
    if let Err(e) = services::shared::infrastructure::path_management::init_path_provider() {
        // Use eprintln only for initialization errors
        // This is before logging is set up, so it's acceptable
        #[allow(clippy::disallowed_macros, clippy::print_stderr)]
        {
            eprintln!("Failed to initialize PathProvider: {e:?}");
        }
    }

    // Initialize new tracing system (now uses PathProvider internally)
    if let Err(e) = logging::init() {
        // Use eprintln only for initialization errors
        // This is before logging is set up, so it's acceptable
        #[allow(clippy::disallowed_macros, clippy::print_stderr)]
        {
            eprintln!("Failed to initialize tracing: {e:?}");
        }
    }

    // Use tracing for application started message
    info!("Barqly Vault application started");

    // Run bootstrap to sync registry from vault manifests
    if let Err(e) = run_bootstrap() {
        warn!(error = %e, "Bootstrap failed, continuing with startup");
    }

    // Build the regular Tauri handler with ALL commands for now (during migration)
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .setup(|app| {
            // Initialize the global AppHandle for binary path resolution
            use services::key_management::yubikey::infrastructure::pty::app_handle::init_app_handle;
            init_app_handle(app.handle().clone());

            // Update PathProvider with AppHandle (maintains same paths)
            if let Err(e) =
                services::shared::infrastructure::path_management::update_with_app_handle(
                    app.handle().clone(),
                )
            {
                warn!("Failed to update PathProvider with AppHandle: {}", e);
            }

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            // Crypto commands
            generate_key,
            validate_passphrase,
            verify_key_passphrase,
            validate_passphrase_strength,
            encrypt_files,
            encrypt_files_multi,
            get_encryption_status,
            decrypt_data,
            verify_manifest,
            get_progress,
            analyze_encrypted_vault,
            // Storage commands
            // Unified key management
            list_unified_keys,
            test_unified_keys,
            get_vault_keys,
            get_key_menu_data,
            remove_key_from_vault,
            update_key_label,
            // Key lifecycle management
            deactivate_key,
            delete_key,
            export_key,
            restore_key,
            update_global_key_label,
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
            get_vault_statistics,
            get_all_vault_statistics,
            // Passphrase/YubiKey vault integration
            add_passphrase_key_to_vault,
            validate_vault_passphrase_key,
            init_yubikey_for_vault,
            register_yubikey_for_vault,
            attach_key_to_vault,
            import_key_file,
            // Streamlined YubiKey commands
            list_yubikeys,
            init_yubikey,
            register_yubikey,
            // YubiKey crypto commands
            yubikey_decrypt_file,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
