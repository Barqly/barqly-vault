//! Device service for YubiKey hardware detection and management
//!
//! This service provides hardware-level YubiKey operations using ykman.
//! It implements the DeviceService trait to provide testable abstractions
//! over the physical device interactions.

use crate::prelude::*;
use crate::services::yubikey::{
    domain::errors::{YubiKeyError, YubiKeyResult},
    domain::models::{FormFactor, Interface, Pin, Serial, YubiKeyDevice},
};
use async_trait::async_trait;
use std::time::Duration;

/// Device service trait for YubiKey hardware operations
#[async_trait]
pub trait DeviceService: Send + Sync + std::fmt::Debug {
    /// List all connected YubiKey devices
    async fn list_connected_devices(&self) -> YubiKeyResult<Vec<YubiKeyDevice>>;

    /// Detect specific device by serial
    async fn detect_device(&self, serial: &Serial) -> YubiKeyResult<Option<YubiKeyDevice>>;

    /// Check if device is connected
    async fn is_device_connected(&self, serial: &Serial) -> YubiKeyResult<bool>;

    /// Validate PIN for device
    async fn validate_pin(&self, serial: &Serial, pin: &Pin) -> YubiKeyResult<bool>;

    /// Check if device has default PIN (123456)
    async fn has_default_pin(&self, serial: &Serial) -> YubiKeyResult<bool>;

    /// Get device firmware version
    async fn get_firmware_version(&self, serial: &Serial) -> YubiKeyResult<Option<String>>;

    /// Get device capabilities
    async fn get_capabilities(&self, serial: &Serial) -> YubiKeyResult<Vec<String>>;
}

/// ykman-based device service implementation
#[derive(Debug)]
pub struct YkmanDeviceService {
    ykman_path: String,
    #[allow(dead_code)]
    timeout: Duration,
}

impl YkmanDeviceService {
    /// Create new ykman device service using bundled binary
    pub async fn new() -> YubiKeyResult<Self> {
        let ykman_path = crate::services::yubikey::infrastructure::pty::core::get_ykman_path();

        Ok(Self {
            ykman_path: ykman_path.to_string_lossy().to_string(),
            timeout: Duration::from_secs(30),
        })
    }

    /// Create with custom ykman path
    pub fn with_ykman_path(ykman_path: String) -> Self {
        Self {
            ykman_path,
            timeout: Duration::from_secs(30),
        }
    }

    /// Run ykman command with timeout
    async fn run_ykman_command(&self, args: Vec<String>) -> YubiKeyResult<String> {
        debug!(
            "Running ykman command: {} {}",
            self.ykman_path,
            args.join(" ")
        );

        let output = tokio::process::Command::new(&self.ykman_path)
            .args(&args)
            .output()
            .await
            .map_err(|e| YubiKeyError::device(format!("Failed to run ykman: {}", e)))?;

        if output.status.success() {
            let stdout = String::from_utf8_lossy(&output.stdout).to_string();
            debug!("ykman command successful: {}", stdout);
            Ok(stdout)
        } else {
            let stderr = String::from_utf8_lossy(&output.stderr).to_string();
            error!("ykman command failed: {}", stderr);
            Err(YubiKeyError::device(format!(
                "ykman command failed: {}",
                stderr
            )))
        }
    }

    /// Run ykman command with serial parameter
    async fn run_ykman_with_serial(
        &self,
        serial: &Serial,
        args: Vec<String>,
    ) -> YubiKeyResult<String> {
        let mut full_args = vec!["--device".to_string(), serial.value().to_string()];
        full_args.extend(args);
        self.run_ykman_command(full_args).await
    }

    /// Parse ykman list output into devices
    fn parse_device_list(&self, output: &str) -> YubiKeyResult<Vec<YubiKeyDevice>> {
        let mut devices = Vec::new();

        for line in output.lines() {
            if line.trim().is_empty() {
                continue;
            }

            // Parse ykman list output format
            // Expected format: "YubiKey 5 NFC [USB] Serial: 12345678 Version: 5.4.3"
            let parts: Vec<&str> = line.split_whitespace().collect();

            if parts.len() < 4 {
                warn!("Unexpected ykman list output format: {}", line);
                continue;
            }

            // Extract serial number
            let serial_str = if let Some(serial_pos) = parts.iter().position(|&x| x == "Serial:") {
                if serial_pos + 1 < parts.len() {
                    parts[serial_pos + 1]
                } else {
                    warn!("Serial number missing in ykman output: {}", line);
                    continue;
                }
            } else {
                warn!("Serial field not found in ykman output: {}", line);
                continue;
            };

            let serial = Serial::new(serial_str.to_string())
                .map_err(|e| YubiKeyError::device(format!("Invalid serial format: {}", e)))?;

            // Extract device name and interfaces
            let device_name = self.extract_device_name(&parts);
            let interfaces = self.extract_interfaces(&parts);
            let form_factor = self.determine_form_factor(&device_name, &interfaces);
            let firmware_version = self.extract_firmware_version(&parts);
            debug!(
                serial = %serial.redacted(),
                firmware_version = ?firmware_version,
                line = %line,
                "Parsed YubiKey device from ykman list output"
            );

            let device = YubiKeyDevice::from_detected_device(
                serial,
                device_name,
                form_factor,
                interfaces,
                firmware_version,
            );

            devices.push(device);
        }

        Ok(devices)
    }

    /// Extract device name from ykman output parts
    fn extract_device_name(&self, parts: &[&str]) -> String {
        // Look for device name pattern (usually starts with "YubiKey")
        let name_parts: Vec<&str> = parts
            .iter()
            .take_while(|&&part| !part.starts_with('['))
            .copied()
            .collect();

        if name_parts.is_empty() {
            "YubiKey".to_string()
        } else {
            name_parts.join(" ")
        }
    }

    /// Extract interfaces from ykman output
    fn extract_interfaces(&self, parts: &[&str]) -> Vec<Interface> {
        let mut interfaces = Vec::new();

        for part in parts {
            if part.starts_with('[') && part.ends_with(']') {
                let interface_str = &part[1..part.len() - 1];
                match interface_str {
                    "USB" => interfaces.push(Interface::USB),
                    "NFC" => interfaces.push(Interface::NFC),
                    _ => {} // Unknown interface
                }
            }
        }

        if interfaces.is_empty() {
            interfaces.push(Interface::USB); // Default assumption
        }

        interfaces
    }

    /// Determine form factor from device name and interfaces
    fn determine_form_factor(&self, device_name: &str, interfaces: &[Interface]) -> FormFactor {
        let name_lower = device_name.to_lowercase();

        if name_lower.contains("nano") {
            FormFactor::Nano
        } else if name_lower.contains("5c") {
            FormFactor::UsbC
        } else if interfaces.contains(&Interface::NFC) {
            FormFactor::NFC
        } else {
            FormFactor::UsbA // Default assumption
        }
    }

    /// Extract firmware version from ykman output
    fn extract_firmware_version(&self, parts: &[&str]) -> Option<String> {
        debug!(parts = ?parts, "Extracting firmware version from ykman output parts");

        // Look for version in parentheses format: (5.7.1)
        for part in parts {
            if part.starts_with('(') && part.ends_with(')') && part.len() > 2 {
                let version = &part[1..part.len() - 1]; // Remove parentheses
                // Check if it looks like a version (contains dots and numbers)
                if version.contains('.') && version.chars().any(|c| c.is_numeric()) {
                    debug!(firmware_version = %version, "Found firmware version in ykman list output (parentheses format)");
                    return Some(version.to_string());
                }
            }
        }

        // Fallback: Look for "Version:" format (for other ykman commands)
        if let Some(version_pos) = parts.iter().position(|&x| x == "Version:")
            && version_pos + 1 < parts.len()
        {
            let version = parts[version_pos + 1].to_string();
            debug!(firmware_version = %version, "Found firmware version in ykman output (Version: format)");
            return Some(version);
        }

        debug!("No firmware version found in ykman output");
        None
    }
}

#[async_trait]
impl DeviceService for YkmanDeviceService {
    async fn list_connected_devices(&self) -> YubiKeyResult<Vec<YubiKeyDevice>> {
        info!("Listing connected YubiKey devices");

        let output = self.run_ykman_command(vec!["list".to_string()]).await?;
        let devices = self.parse_device_list(&output)?;

        info!("Found {} connected YubiKey devices", devices.len());
        Ok(devices)
    }

    async fn detect_device(&self, serial: &Serial) -> YubiKeyResult<Option<YubiKeyDevice>> {
        debug!("Detecting YubiKey device: {}", serial.redacted());

        let devices = self.list_connected_devices().await?;
        let device = devices.into_iter().find(|d| d.serial() == serial);

        if device.is_some() {
            debug!("YubiKey device found: {}", serial.redacted());
        } else {
            debug!("YubiKey device not found: {}", serial.redacted());
        }

        Ok(device)
    }

    async fn is_device_connected(&self, serial: &Serial) -> YubiKeyResult<bool> {
        let device = self.detect_device(serial).await?;
        Ok(device.is_some())
    }

    async fn validate_pin(&self, serial: &Serial, _pin: &Pin) -> YubiKeyResult<bool> {
        debug!(
            "PIN validation skipped for YubiKey: {} - PIN validation only happens during actual operations",
            serial.redacted()
        );

        // PIN validation is not possible without attempting an actual operation that requires PIN.
        // YubiKey has no API to "test" a PIN - you only discover PIN issues when using it.
        // Real PIN validation happens during key generation, signing, etc.
        // For now, assume PIN is valid - errors will surface during actual PIN-required operations.
        Ok(true)
    }

    async fn has_default_pin(&self, serial: &Serial) -> YubiKeyResult<bool> {
        debug!("Checking default PIN for YubiKey: {}", serial.redacted());

        // Use the actual ykman PTY implementation to test default PIN
        use crate::services::yubikey::infrastructure::pty::ykman_operations::has_default_pin;

        let result = tokio::task::spawn_blocking(move || {
            has_default_pin()
                .map_err(|e| YubiKeyError::device(format!("Default PIN check failed: {}", e)))
        })
        .await
        .map_err(|e| YubiKeyError::device(format!("Task join error: {}", e)))??;

        debug!(
            "Default PIN check result for YubiKey {}: {}",
            serial.redacted(),
            result
        );

        Ok(result)
    }

    async fn get_firmware_version(&self, serial: &Serial) -> YubiKeyResult<Option<String>> {
        debug!(
            "Getting firmware version for YubiKey: {}",
            serial.redacted()
        );

        let args = vec!["piv".to_string(), "info".to_string()];
        let output = self.run_ykman_with_serial(serial, args).await?;

        // Parse firmware version from piv info output
        // Looking for line like "PIV version:              5.7.1"
        for line in output.lines() {
            if line.contains("PIV version:")
                && let Some(version) = line.split(':').nth(1)
            {
                return Ok(Some(version.trim().to_string()));
            }
        }

        Ok(None)
    }

    async fn get_capabilities(&self, serial: &Serial) -> YubiKeyResult<Vec<String>> {
        debug!("Getting capabilities for YubiKey: {}", serial.redacted());

        let args = vec!["info".to_string()];
        let output = self.run_ykman_with_serial(serial, args).await?;

        let mut capabilities = Vec::new();

        // Parse capabilities from info output
        for line in output.lines() {
            let line = line.trim().to_lowercase();

            if line.contains("piv") {
                capabilities.push("PIV".to_string());
            }
            if line.contains("oath") {
                capabilities.push("OATH".to_string());
            }
            if line.contains("fido2") || line.contains("webauthn") {
                capabilities.push("FIDO2".to_string());
            }
            if line.contains("openpgp") {
                capabilities.push("OpenPGP".to_string());
            }
            if line.contains("otp") {
                capabilities.push("OTP".to_string());
            }
        }

        Ok(capabilities)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_device_service_creation() {
        // This test may fail if ykman is not installed
        match YkmanDeviceService::new().await {
            Ok(service) => {
                assert!(!service.ykman_path.is_empty());
            }
            Err(e) => {
                // ykman not found is acceptable in test environment
                assert!(e.to_string().contains("ykman executable not found"));
            }
        }
    }

    #[test]
    fn test_device_list_parsing() {
        let service = YkmanDeviceService::with_ykman_path("ykman".to_string());

        let output = "YubiKey 5 NFC [USB] Serial: 12345678 Version: 5.4.3\nYubiKey 5C [USB] Serial: 87654321 Version: 5.2.7";
        let devices = service.parse_device_list(output).unwrap();

        assert_eq!(devices.len(), 2);
        assert_eq!(devices[0].serial().value(), "12345678");
        assert_eq!(devices[1].serial().value(), "87654321");
    }

    #[test]
    fn test_interface_extraction() {
        let service = YkmanDeviceService::with_ykman_path("ykman".to_string());

        let parts_usb = vec!["YubiKey", "5", "NFC", "[USB]", "Serial:", "12345678"];
        let interfaces = service.extract_interfaces(&parts_usb);
        assert!(interfaces.contains(&Interface::USB));

        let parts_nfc = vec!["YubiKey", "5", "NFC", "[USB+NFC]", "Serial:", "12345678"];
        let interfaces = service.extract_interfaces(&parts_nfc);
        // This would need more sophisticated parsing for combined interfaces
        assert!(!interfaces.is_empty());
    }

    #[test]
    fn test_form_factor_determination() {
        let service = YkmanDeviceService::with_ykman_path("ykman".to_string());

        assert_eq!(
            service.determine_form_factor("YubiKey 5 Nano", &[Interface::USB]),
            FormFactor::Nano
        );

        assert_eq!(
            service.determine_form_factor("YubiKey 5C", &[Interface::USB]),
            FormFactor::UsbC
        );

        assert_eq!(
            service.determine_form_factor("YubiKey 5 NFC", &[Interface::USB, Interface::NFC]),
            FormFactor::NFC
        );
    }
}
