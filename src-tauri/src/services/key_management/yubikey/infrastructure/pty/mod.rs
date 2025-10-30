/// PTY automation module for YubiKey operations
/// Handles PIN entry and touch confirmation through pseudo-terminal
pub mod age_ops;
pub mod app_handle;
pub mod core;
pub mod ykman_ops;

pub use age_ops::{decrypt_with_age_pty, generate_age_identity_pty};
pub use core::{run_age_plugin_yubikey, run_ykman_command};
pub use ykman_ops::{
    change_management_key_pty, change_pin_pty, change_puk_pty, verify_yubikey_pin,
};
