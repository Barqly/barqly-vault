// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    // Fix PATH inheritance for GUI apps on macOS/Linux
    // This ensures age-plugin-yubikey and other CLI tools are accessible
    #[cfg(any(target_os = "macos", target_os = "linux"))]
    let _ = fix_path_env::fix();

    barqly_vault_lib::run()
}
