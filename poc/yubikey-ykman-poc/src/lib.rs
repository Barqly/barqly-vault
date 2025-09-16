pub mod errors;
pub mod ykman;
pub mod ykman_pty;
pub mod pty;
pub mod pty_decrypt;
pub mod manifest;
pub mod age_crate;
pub mod logger;

use errors::{Result, YubiKeyError, Requirements, InitStatus};
use log::{info, warn};
use std::path::PathBuf;
use manifest::{YubiKeyManifest, DEFAULT_MANIFEST_PATH};

const NEW_PIN: &str = "212121";
const TOUCH_POLICY: &str = "cached";
const SLOT_NAME: &str = "Barqly Vault";

/// Get path to bundled binary based on platform
pub fn get_bundled_binary_path(binary_name: &str) -> PathBuf {
    let mut path = PathBuf::from(env!("CARGO_MANIFEST_DIR"));
    
    #[cfg(target_os = "macos")]
    path.push("bin/darwin");
    
    #[cfg(target_os = "linux")]
    path.push("bin/linux");
    
    #[cfg(target_os = "windows")]
    path.push("bin/windows");
    
    path.push(binary_name);
    
    // Add .exe extension on Windows
    #[cfg(target_os = "windows")]
    path.set_extension("exe");
    
    path
}

/// Get path to bundled ykman
pub fn get_ykman_path() -> PathBuf {
    // For POC, use system ykman
    PathBuf::from("ykman")
}

/// Get path to bundled age-plugin-yubikey
pub fn get_age_plugin_path() -> PathBuf {
    get_bundled_binary_path("age-plugin-yubikey")
}

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
    
    // Check if identity already exists (returns recipient, not identity)
    if let Ok(existing) = pty::list_identities() {
        if !existing.is_empty() && existing.starts_with("age1yubikey") {
            info!("Age recipient already exists: {}", existing);
            return Ok(existing);
        }
    }
    
    // Generate identity via PTY (returns recipient)
    let recipient = pty::generate_age_identity(pin, TOUCH_POLICY, SLOT_NAME)?;
    
    info!("Successfully generated age recipient: {}", recipient);
    Ok(recipient)
}

/// Encrypt data using the age recipient
pub fn encrypt_data(data: &[u8], recipient: &str) -> Result<Vec<u8>> {
    info!("Encrypting data with recipient: {}", recipient);

    // Use the age crate for encryption (this actually uses the crate, not CLI!)
    age_crate::encrypt_with_yubikey(data, recipient)
}

/// Decrypt data using YubiKey (requires PIN and touch)
pub fn decrypt_data(encrypted_data: &[u8], pin: &str) -> Result<Vec<u8>> {
    info!("Starting decryption - YubiKey touch will be required");

    // Try to load manifest and use age crate implementation
    if let Ok(manifest) = manifest::YubiKeyManifest::load_from_file("yubikey-manifest.json") {
        // Use age crate with manifest
        return age_crate::decrypt_with_manifest(encrypted_data, &manifest, pin);
    }

    // Fallback: try to use identity file directly if it exists
    if std::path::Path::new("yubikey-identity.txt").exists() {
        return age_crate::decrypt_with_yubikey(encrypted_data, "yubikey-identity.txt", pin);
    }

    Err(YubiKeyError::OperationFailed(
        "No YubiKey identity found. Please run setup first.".to_string()
    ))
}

/// Get YubiKey identity info (both recipient and identity string)
fn get_yubikey_identity_info() -> Result<(String, String)> {
    use std::process::Command;

    let output = Command::new(get_age_plugin_path())
        .arg("--identity")
        .output()?;

    if !output.status.success() {
        return Err(YubiKeyError::OperationFailed("Failed to get identity info".to_string()));
    }

    let output_str = String::from_utf8_lossy(&output.stdout);
    let mut recipient = String::new();
    let mut identity = String::new();

    for line in output_str.lines() {
        if line.starts_with("#    Recipient:") {
            recipient = line.replace("#    Recipient:", "").trim().to_string();
        } else if line.starts_with("AGE-PLUGIN-YUBIKEY") {
            identity = line.trim().to_string();
        }
    }

    if recipient.is_empty() || identity.is_empty() {
        return Err(YubiKeyError::OperationFailed("Could not parse identity info".to_string()));
    }

    Ok((recipient, identity))
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

    // Get both recipient and identity for manifest
    let (recipient_verified, identity) = get_yubikey_identity_info()?;

    // Get YubiKey info for manifest
    let info = ykman::get_yubikey_info()?.ok_or(YubiKeyError::NoYubiKey)?;

    // Create and save manifest
    let manifest = YubiKeyManifest::new(
        info.serial.clone(),
        1, // Slot 1 (RETIRED1 = slot 82 in PIV, but we call it slot 1)
        "once".to_string(),
        TOUCH_POLICY.to_string(),
        recipient_verified.clone(),
        identity,
    );

    manifest.save_to_file(DEFAULT_MANIFEST_PATH)?;
    info!("Saved YubiKey manifest to {}", DEFAULT_MANIFEST_PATH);

    info!("Complete setup successful");
    Ok(recipient_verified)
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
