pub mod commands; // Keep public - this is the UI interface
pub mod constants; // Centralized constants for the application
pub mod crypto; // Public for tests, but should be treated as private for external use
pub mod file_ops; // Public for tests, but should be treated as private for external use
pub mod logging; // Public for tests, but should be treated as private for external use
pub mod storage; // Public for tests, but should be treated as private for external use

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

use logging::{init_logging, log_info, LogLevel};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    if let Err(e) = init_logging(LogLevel::Info) {
        eprintln!("Failed to initialize logging: {e:?}");
    } else {
        log_info("Barqly Vault application started");
    }
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            // Crypto commands
            generate_key,
            generate_key_multi,
            validate_passphrase,
            verify_key_passphrase,
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
