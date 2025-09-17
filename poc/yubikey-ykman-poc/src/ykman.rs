use crate::errors::{Result, YubiKeyError, YubiKeyInfo};
use crate::get_ykman_path;
use std::process::Command;
use log::{debug, info, warn};

// Yubico published default PIV values (PUBLIC INFORMATION - NOT SECRETS)
// These values are documented in Yubico's official documentation:
// https://developers.yubico.com/yubico-piv-tool/YubiKey_PIV_introduction.html
// 
// SECURITY NOTE: These are factory defaults that MUST be changed during initialization.
// They are used ONLY to detect and transition from factory state to secure state.
// Any YubiKey in production MUST have these values changed.
//
// These constants are marked as "DEFAULT_" to indicate they are insecure defaults
// that exist solely for the purpose of changing them to secure values.

// Default PIN as shipped from factory (PUBLIC - must be changed)
const DEFAULT_PIN: &str = "123456";

// Default PUK as shipped from factory (PUBLIC - must be changed)  
const DEFAULT_PUK: &str = "12345678";

// Yubico published default PIV management key (PUBLIC - must be changed)
// This is the factory default for all YubiKeys and is public knowledge.
// Used ONLY to authenticate when transitioning from unprotected default (AES-192 on 5.7+) 
// to secure protected TDES mode required by age-plugin-yubikey.
// Source: https://developers.yubico.com/yubico-piv-tool/YubiKey_PIV_introduction.html

const DEFAULT_MGMT_KEY: &str = "010203040506070801020304050607080102030405060708";

pub fn check_ykman() -> Result<Option<String>> {
    debug!("Checking for ykman installation");

    let ykman_path = get_ykman_path();
    debug!("Using bundled ykman at: {:?}", ykman_path);

    let output = Command::new(&ykman_path)
        .arg("--version")
        .output();

    match output {
        Ok(out) if out.status.success() => {
            let version = String::from_utf8_lossy(&out.stdout).trim().to_string();
            info!("Found ykman: {}", version);
            Ok(Some(version))
        }
        _ => {
            warn!("ykman not found");
            Ok(None)
        }
    }
}

/// Get YubiKey serial number from ykman list output
/// This returns the decimal serial number format that age-plugin-yubikey expects
pub fn get_yubikey_serial() -> Result<String> {
    debug!("Getting YubiKey serial from ykman list");

    let output = Command::new(&get_ykman_path())
        .arg("list")
        .output()?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        if stderr.contains("No YubiKey detected") {
            return Err(YubiKeyError::NoYubiKey);
        }
        return Err(YubiKeyError::OperationFailed(stderr.to_string()));
    }

    let list_output = String::from_utf8_lossy(&output.stdout);
    debug!("ykman list output: {}", list_output);

    // Parse serial from output like: "YubiKey 5C NFC (5.7.1) [FIDO+CCID] Serial: 31310420"
    for line in list_output.lines() {
        if let Some(serial_part) = line.split("Serial:").nth(1) {
            let serial = serial_part.trim().to_string();
            info!("Found YubiKey serial: {}", serial);
            return Ok(serial);
        }
    }

    Err(YubiKeyError::OperationFailed("Could not parse serial from ykman list".to_string()))
}

pub fn check_age_plugin() -> Result<Option<String>> {
    debug!("Checking for age-plugin-yubikey installation");
    
    let age_plugin_path = crate::get_age_plugin_path();
    debug!("Using bundled age-plugin-yubikey at: {:?}", age_plugin_path);
    
    let output = Command::new(&age_plugin_path)
        .arg("--version")
        .output();
    
    match output {
        Ok(out) if out.status.success() => {
            let version = String::from_utf8_lossy(&out.stdout).trim().to_string();
            info!("Found age-plugin-yubikey: {}", version);
            Ok(Some(version))
        }
        _ => {
            warn!("age-plugin-yubikey not found");
            Ok(None)
        }
    }
}

pub fn get_yubikey_info() -> Result<Option<YubiKeyInfo>> {
    debug!("Getting YubiKey PIV info");
    
    let output = Command::new(&get_ykman_path())
        .args(&["piv", "info"])
        .output()?;
    
    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        if stderr.contains("No YubiKey detected") || stderr.contains("Failed to connect") {
            return Ok(None);
        }
        return Err(YubiKeyError::OperationFailed(stderr.to_string()));
    }
    
    let info_str = String::from_utf8_lossy(&output.stdout);
    debug!("Raw PIV info output:\n{}", info_str);
    let info = parse_piv_info(&info_str)?;
    
    Ok(Some(info))
}

fn parse_piv_info(info: &str) -> Result<YubiKeyInfo> {
    let mut serial = String::new();
    let mut version = String::new();
    let mut pin_attempts = 3;
    let mut puk_attempts = 3;
    let mut mgmt_key_default = false;
    let mut mgmt_key_algo = String::from("Unknown");
    let mut mgmt_key_protected = false;
    
    for line in info.lines() {
        if line.contains("Serial") {
            serial = line.split(':').nth(1)
                .unwrap_or("")
                .trim()
                .to_string();
        } else if line.contains("Version") {
            version = line.split(':').nth(1)
                .unwrap_or("")
                .trim()
                .to_string();
        } else if line.contains("PIN tries remaining") {
            // Extract just the first number before the slash
            if let Some(num_part) = line.split('/').next() {
                if let Some(attempts) = num_part.chars()
                    .filter(|c| c.is_numeric())
                    .collect::<String>()
                    .parse::<u8>()
                    .ok() {
                    pin_attempts = attempts;
                }
            }
        } else if line.contains("PUK tries remaining") {
            // Extract just the first number before the slash
            if let Some(num_part) = line.split('/').next() {
                if let Some(attempts) = num_part.chars()
                    .filter(|c| c.is_numeric())
                    .collect::<String>()
                    .parse::<u8>()
                    .ok() {
                    puk_attempts = attempts;
                }
            }
        } else if line.contains("Using default Management key") || line.contains("Management key is the default") {
            mgmt_key_default = true;
        } else if line.contains("Management key algorithm") {
            mgmt_key_algo = line.split(':').nth(1)
                .unwrap_or("Unknown")
                .trim()
                .to_string();
        } else if line.contains("Management key is stored on the YubiKey") {
            mgmt_key_protected = line.contains("protected");
        }
    }
    
    Ok(YubiKeyInfo {
        serial,
        version,
        pin_attempts,
        puk_attempts,
        management_key_is_default: mgmt_key_default,
        management_key_algorithm: mgmt_key_algo,
        management_key_protected: mgmt_key_protected,
    })
}

pub fn change_pin(old_pin: &str, new_pin: &str) -> Result<()> {
    info!("Changing YubiKey PIN");
    
    if new_pin.len() < 6 || new_pin.len() > 8 || !new_pin.chars().all(|c| c.is_numeric()) {
        return Err(YubiKeyError::InvalidPin);
    }
    
    let output = Command::new(&get_ykman_path())
        .args(&["piv", "access", "change-pin"])
        .arg("-P").arg(old_pin)
        .arg("-n").arg(new_pin)
        .output()?;
    
    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        let stdout = String::from_utf8_lossy(&output.stdout);
        debug!("PIN change failed - stderr: {}, stdout: {}", stderr, stdout);
        if stderr.contains("incorrect") || stderr.contains("wrong") {
            let info = get_yubikey_info()?.ok_or(YubiKeyError::NoYubiKey)?;
            return Err(YubiKeyError::PinFailed(info.pin_attempts));
        }
        return Err(YubiKeyError::OperationFailed(stderr.to_string()));
    }
    
    info!("PIN changed successfully");
    Ok(())
}

pub fn change_puk(old_puk: &str, new_puk: &str) -> Result<()> {
    info!("Changing YubiKey PUK");
    
    if new_puk.len() < 6 || new_puk.len() > 8 || !new_puk.chars().all(|c| c.is_numeric()) {
        return Err(YubiKeyError::InvalidPin);
    }
    
    let output = Command::new(&get_ykman_path())
        .args(&["piv", "access", "change-puk"])
        .arg("-p").arg(old_puk)
        .arg("-n").arg(new_puk)
        .output()?;
    
    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        if stderr.contains("incorrect") || stderr.contains("wrong") {
            let info = get_yubikey_info()?.ok_or(YubiKeyError::NoYubiKey)?;
            return Err(YubiKeyError::PukFailed(info.puk_attempts));
        }
        return Err(YubiKeyError::OperationFailed(stderr.to_string()));
    }
    
    info!("PUK changed successfully");
    Ok(())
}

pub fn set_management_key_protected(pin: &str) -> Result<()> {
    use std::process::Stdio;
    use std::io::Write;
    
    // Check current YubiKey state
    let info = get_yubikey_info()?.ok_or(YubiKeyError::NoYubiKey)?;
    
    // Skip if already configured with protected TDES
    if info.management_key_protected && info.management_key_algorithm == "TDES" {
        info!("Management key already set to protected TDES");
        return Ok(());
    }
    
    // SECURITY: Only use factory default if YubiKey confirms it's using default
    // This prevents any attempt to use this key on a configured device
    if !info.management_key_is_default {
        warn!("Management key is not default but not protected TDES either");
        return Err(YubiKeyError::ManagementKeyError(
            "YubiKey management key is in unknown state. Please reset PIV first.".to_string()
        ));
    }
    
    info!("YubiKey using factory defaults - transitioning to secure state");
    info!("Will set protected TDES management key (PIN-derived, secure)");
    
    // Use piped stdin instead of PTY - simpler and works fine with ykman
    let mut child = Command::new(&get_ykman_path())
        .args(&["piv", "access", "change-management-key"])
        .args(&["-a", "TDES"])
        .arg("--protect")
        .args(&["-m", DEFAULT_MGMT_KEY])
        .stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()?;
    
    // Send PIN via stdin
    if let Some(mut stdin) = child.stdin.take() {
        stdin.write_all(format!("{}\n", pin).as_bytes())?;
    }
    
    let output = child.wait_with_output()?;
    
    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(YubiKeyError::ManagementKeyError(stderr.to_string()));
    }
    
    info!("Management key set to protected TDES");
    Ok(())
}

pub fn ensure_initialized(new_pin: &str) -> Result<bool> {
    let info = get_yubikey_info()?.ok_or(YubiKeyError::NoYubiKey)?;
    
    let mut changed = false;
    
    // IMPORTANT: Set management key FIRST while PIN is still default
    // The --protect flag requires PIN authentication, so we need default PIN
    if !info.management_key_protected || info.management_key_algorithm != "TDES" {
        // Pass DEFAULT_PIN since we haven't changed it yet
        set_management_key_protected(DEFAULT_PIN)?;
        changed = true;
        info!("Set management key to protected TDES");
    } else {
        info!("Management key already protected TDES");
    }
    
    // NOW change PIN (after management key is set)
    if info.pin_attempts < 3 {
        warn!("PIN may not be default (attempts used)");
    } else {
        // Try to change PIN from default
        match change_pin(DEFAULT_PIN, new_pin) {
            Ok(_) => {
                changed = true;
                info!("Changed PIN from default");
            }
            Err(e) => {
                debug!("PIN might already be changed: {:?}", e);
            }
        }
    }
    
    // Finally set PUK to match PIN
    match change_puk(DEFAULT_PUK, new_pin) {
        Ok(_) => {
            changed = true;
            info!("Changed PUK to match PIN");
        }
        Err(e) => {
            debug!("PUK might already be set: {:?}", e);
        }
    }
    
    Ok(changed)
}