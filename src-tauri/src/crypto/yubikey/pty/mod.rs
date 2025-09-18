/// PTY automation module for YubiKey operations
/// Handles PIN entry and touch confirmation through pseudo-terminal

pub mod core;
pub mod age_operations;
pub mod ykman_operations;

pub use core::{run_age_plugin_yubikey, run_ykman_command};
pub use age_operations::{generate_age_identity_pty, decrypt_with_age_pty};
pub use ykman_operations::{change_pin_pty, change_management_key_pty, change_puk_pty};