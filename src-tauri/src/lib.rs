pub mod commands; // Keep public - this is the UI interface
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
    get_config,
    get_encryption_status,
    get_file_info,
    get_progress,
    // Storage commands
    list_keys_command,
    // File commands
    select_files,
    update_config,
    validate_passphrase,
    verify_manifest,
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
            validate_passphrase,
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
            // File commands
            select_files,
            get_file_info,
            create_manifest,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
