pub mod errors;
pub mod ykman;
pub mod ykman_pty;
pub mod pty;

use errors::{Result, YubiKeyError, Requirements, InitStatus};
use log::{info, warn};

const NEW_PIN: &str = "212121";
const TOUCH_POLICY: &str = "cached";
const SLOT_NAME: &str = "Barqly Vault";

/// Check all requirements for YubiKey operations
pub fn check_requirements() -> Result<Requirements> {
    info!("Checking YubiKey requirements");
    
    let ykman_version = ykman::check_ykman()?;
    let age_plugin_version = ykman::check_age_plugin()?;
    let yubikey_info = ykman::get_yubikey_info()?;
    
    let requirements = Requirements {
        ykman_installed: ykman_version.is_some(),
        ykman_version,
        age_plugin_installed: age_plugin_version.is_some(),
        age_plugin_version,
        yubikey_present: yubikey_info.is_some(),
        yubikey_info,
    };
    
    if !requirements.ykman_installed {
        return Err(YubiKeyError::YkmanNotFound);
    }
    
    if !requirements.age_plugin_installed {
        return Err(YubiKeyError::AgePluginNotFound);
    }
    
    if !requirements.yubikey_present {
        return Err(YubiKeyError::NoYubiKey);
    }
    
    Ok(requirements)
}

/// Initialize YubiKey with new PIN/PUK and protected management key
pub fn initialize_yubikey(pin: &str) -> Result<InitStatus> {
    info!("Initializing YubiKey");
    
    // Check current state
    let info = ykman::get_yubikey_info()?.ok_or(YubiKeyError::NoYubiKey)?;
    
    let mut status = InitStatus {
        pin_changed: false,
        puk_changed: false,
        management_key_set: false,
        ready_for_generation: false,
        message: String::new(),
    };
    
    // Check if already initialized
    if info.management_key_protected && 
       info.management_key_algorithm == "TDES" &&
       !info.management_key_is_default {
        info!("YubiKey already initialized");
        status.ready_for_generation = true;
        status.message = "YubiKey already initialized and ready".to_string();
        return Ok(status);
    }
    
    // Initialize with new settings
    let changed = ykman::ensure_initialized(pin)?;
    
    if changed {
        status.pin_changed = true;
        status.puk_changed = true;
        status.management_key_set = true;
        status.ready_for_generation = true;
        status.message = "YubiKey successfully initialized".to_string();
    } else {
        status.ready_for_generation = true;
        status.message = "YubiKey was already configured".to_string();
    }
    
    Ok(status)
}

/// Generate age identity using the initialized YubiKey
pub fn generate_age_identity(pin: &str) -> Result<String> {
    info!("Generating age identity");
    
    // Verify YubiKey is ready
    let info = ykman::get_yubikey_info()?.ok_or(YubiKeyError::NoYubiKey)?;
    
    if !info.management_key_protected || info.management_key_algorithm != "TDES" {
        warn!("YubiKey not properly initialized");
        return Err(YubiKeyError::OperationFailed(
            "YubiKey must be initialized first".to_string()
        ));
    }
    
    // Check if identity already exists
    if let Ok(existing) = pty::list_identities() {
        if !existing.is_empty() {
            info!("Age identity already exists: {}", existing);
            return Ok(existing);
        }
    }
    
    // Generate identity via PTY
    let recipient = pty::generate_age_identity(pin, TOUCH_POLICY, SLOT_NAME)?;
    
    info!("Successfully generated age identity: {}", recipient);
    Ok(recipient)
}

/// Encrypt data using the age recipient
pub fn encrypt_data(data: &[u8], recipient: &str) -> Result<Vec<u8>> {
    use std::process::{Command, Stdio};
    use std::io::Write;
    
    info!("Encrypting data with recipient: {}", recipient);
    
    let mut child = Command::new("age")
        .args(&["-r", recipient])
        .stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()?;
    
    // Write data to stdin
    if let Some(mut stdin) = child.stdin.take() {
        stdin.write_all(data)?;
    }
    
    let output = child.wait_with_output()?;
    
    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(YubiKeyError::OperationFailed(format!("Encryption failed: {}", stderr)));
    }
    
    Ok(output.stdout)
}

/// Decrypt data using YubiKey (requires PIN and touch)
pub fn decrypt_data(encrypted_data: &[u8], pin: &str) -> Result<Vec<u8>> {
    info!("Starting decryption - YubiKey touch will be required");
    
    // Use PTY for decryption to handle PIN and touch prompts
    pty::decrypt_with_yubikey(encrypted_data, pin)
}

/// Complete setup workflow: initialize and generate identity
pub fn complete_setup(pin: Option<&str>) -> Result<String> {
    let pin = pin.unwrap_or(NEW_PIN);
    
    info!("Starting complete YubiKey setup");
    
    // Check requirements
    let reqs = check_requirements()?;
    info!("Requirements met: ykman={:?}, age-plugin={:?}", 
          reqs.ykman_version, reqs.age_plugin_version);
    
    // Initialize YubiKey
    let init_status = initialize_yubikey(pin)?;
    info!("Initialization status: {:?}", init_status);
    
    if !init_status.ready_for_generation {
        return Err(YubiKeyError::OperationFailed(
            "YubiKey initialization failed".to_string()
        ));
    }
    
    // Generate age identity
    let recipient = generate_age_identity(pin)?;
    
    info!("Complete setup successful");
    Ok(recipient)
}

#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn test_requirements_check() {
        // This will fail if ykman not installed
        let _ = check_requirements();
    }
}
