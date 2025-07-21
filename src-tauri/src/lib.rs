pub mod commands;
pub mod crypto;
pub mod file_ops;
pub mod logging;
pub mod storage;

use commands::{
    create_manifest,
    decrypt_data,
    delete_key_command,
    encrypt_data,
    // Crypto commands
    generate_key,
    get_config,
    get_file_info,
    // Storage commands
    list_keys_command,
    // File commands
    select_files,
    update_config,
    validate_passphrase,
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
        .invoke_handler(tauri::generate_handler![
            // Crypto commands
            generate_key,
            validate_passphrase,
            encrypt_data,
            decrypt_data,
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
