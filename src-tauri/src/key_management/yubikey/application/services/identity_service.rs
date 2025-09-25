//! Identity service for YubiKey age-plugin-yubikey operations
//!
//! This service handles age-plugin-yubikey operations and fixes the critical
//! identity tag bug by centralizing identity management and validation.

use crate::key_management::yubikey::{
    domain::errors::{YubiKeyError, YubiKeyResult},
    domain::models::{Pin, Serial, YubiKeyIdentity},
};
use crate::prelude::*;
use async_trait::async_trait;
use std::path::PathBuf;
use std::process::Stdio;
use std::time::Duration;
use tempfile::NamedTempFile;
use tokio::fs;
use tokio::process::Command;

/// Identity service trait for age-plugin-yubikey operations
#[async_trait]
pub trait IdentityService: Send + Sync + std::fmt::Debug {
    /// Generate new identity for device during initialization
    async fn generate_identity(
        &self,
        serial: &Serial,
        pin: &Pin,
        slot: u8,
    ) -> YubiKeyResult<YubiKeyIdentity>;

    /// Get existing identity from device (for orphaned keys)
    async fn get_existing_identity(
        &self,
        serial: &Serial,
    ) -> YubiKeyResult<Option<YubiKeyIdentity>>;

    /// Check if device has any identity
    async fn has_identity(&self, serial: &Serial) -> YubiKeyResult<bool>;

    /// Encrypt data with recipient
    async fn encrypt_with_recipient(&self, recipient: &str, data: &[u8]) -> YubiKeyResult<Vec<u8>>;

    /// Decrypt data with identity
    async fn decrypt_with_identity(
        &self,
        serial: &Serial,
        identity_tag: &str,
        encrypted_data: &[u8],
    ) -> YubiKeyResult<Vec<u8>>;

    /// List all identities on device
    async fn list_identities(&self, serial: &Serial) -> YubiKeyResult<Vec<YubiKeyIdentity>>;
}

/// age-plugin-yubikey based identity service implementation
#[derive(Debug)]
pub struct AgePluginIdentityService {
    plugin_path: PathBuf,
    timeout: Duration,
}

impl AgePluginIdentityService {
    /// Create new age-plugin identity service
    pub async fn new() -> YubiKeyResult<Self> {
        let plugin_path = Self::find_plugin_binary()
            .await
            .ok_or_else(|| YubiKeyError::configuration("age-plugin-yubikey binary not found"))?;

        Ok(Self {
            plugin_path,
            timeout: Duration::from_secs(60),
        })
    }

    /// Create with custom plugin path
    pub fn with_plugin_path(plugin_path: PathBuf) -> Self {
        Self {
            plugin_path,
            timeout: Duration::from_secs(60),
        }
    }

    /// Find age-plugin-yubikey binary in common locations
    async fn find_plugin_binary() -> Option<PathBuf> {
        let common_paths = vec![
            "age-plugin-yubikey", // Try PATH first
            "/usr/local/bin/age-plugin-yubikey",
            "/opt/homebrew/bin/age-plugin-yubikey",
        ];

        for path in common_paths {
            if Command::new(path).arg("--help").output().await.is_ok() {
                return Some(PathBuf::from(path));
            }
        }

        // Try Cargo installation directory
        if let Ok(home_dir) = std::env::var("HOME") {
            let cargo_bin_path = PathBuf::from(home_dir)
                .join(".cargo")
                .join("bin")
                .join("age-plugin-yubikey");

            if cargo_bin_path.exists() {
                return Some(cargo_bin_path);
            }
        }

        None
    }

    /// Run age-plugin-yubikey command with timeout and proper error handling
    async fn run_plugin_command(
        &self,
        args: Vec<String>,
        stdin_data: Option<&[u8]>,
    ) -> YubiKeyResult<Vec<u8>> {
        debug!("Running age-plugin-yubikey command: {}", args.join(" "));

        let mut cmd = Command::new(&self.plugin_path);
        cmd.args(&args);

        if stdin_data.is_some() {
            cmd.stdin(Stdio::piped());
        }
        cmd.stdout(Stdio::piped());
        cmd.stderr(Stdio::piped());

        let mut child = cmd.spawn().map_err(|e| {
            YubiKeyError::age_plugin(format!("Failed to spawn age-plugin-yubikey: {}", e))
        })?;

        // Write stdin data if provided
        if let Some(data) = stdin_data
            && let Some(stdin) = child.stdin.take()
        {
            use tokio::io::AsyncWriteExt;
            let mut stdin = stdin;
            stdin
                .write_all(data)
                .await
                .map_err(|e| YubiKeyError::age_plugin(format!("Failed to write stdin: {}", e)))?;
            stdin
                .shutdown()
                .await
                .map_err(|e| YubiKeyError::age_plugin(format!("Failed to close stdin: {}", e)))?;
        }

        // Wait for command completion with timeout
        let output = tokio::time::timeout(self.timeout, child.wait_with_output())
            .await
            .map_err(|_| {
                YubiKeyError::timeout("age-plugin-yubikey operation", self.timeout.as_secs())
            })?
            .map_err(|e| YubiKeyError::age_plugin(format!("Command execution failed: {}", e)))?;

        if output.status.success() {
            debug!("age-plugin-yubikey command successful");
            Ok(output.stdout)
        } else {
            let stderr = String::from_utf8_lossy(&output.stderr);
            error!("age-plugin-yubikey command failed: {}", stderr);
            Err(YubiKeyError::age_plugin_command_failed(
                &args.join(" "),
                output.status.code().unwrap_or(-1),
                &stderr,
            ))
        }
    }

    /// Parse identity information from age-plugin-yubikey output
    fn parse_identity(&self, output: &[u8], serial: &Serial) -> YubiKeyResult<YubiKeyIdentity> {
        let output_str = String::from_utf8_lossy(output);

        // Parse recipient (public key) - format: age1yubikey...
        let recipient = self.extract_recipient(&output_str)?;

        // Parse identity tag - format: AGE-PLUGIN-YUBIKEY-...
        let identity_tag = self.extract_identity_tag(&output_str)?;

        // Validate the identity format (fixes the identity tag bug)
        self.validate_identity_format(&recipient, &identity_tag)?;

        Ok(YubiKeyIdentity::new(
            identity_tag,
            serial.clone(),
            recipient,
        )?)
    }

    /// Extract recipient from age-plugin output
    fn extract_recipient(&self, output: &str) -> YubiKeyResult<String> {
        for line in output.lines() {
            let line = line.trim();

            // Handle multiple formats with maximum robustness:
            // 1. "Recipient: age1yubikey..." (direct)
            // 2. "#     Recipient: age1yubikey..." (commented with spacing)
            // 3. "# Recipient:age1yubikey..." (no space after colon)
            // 4. "age1yubikey..." (direct recipient line)
            if line.contains("Recipient:") {
                if let Some(recipient_part) = line.split("Recipient:").nth(1) {
                    let recipient = recipient_part.trim();
                    if recipient.starts_with("age1yubikey") {
                        return Ok(recipient.to_string());
                    }
                }
            } else if line.starts_with("age1yubikey") {
                return Ok(line.to_string());
            }
        }

        Err(YubiKeyError::identity(
            "No recipient found in age-plugin output",
        ))
    }

    /// Extract identity tag from age-plugin output
    fn extract_identity_tag(&self, output: &str) -> YubiKeyResult<String> {
        debug!(output_preview = %output.lines().take(5).collect::<Vec<_>>().join(" | "), "Parsing identity tag from output");

        for line in output.lines() {
            let line = line.trim();
            // Look for standalone AGE-PLUGIN-YUBIKEY line (not comment line with #)
            if line.starts_with("AGE-PLUGIN-YUBIKEY-") && !line.starts_with("#") {
                debug!(identity_tag = %line, "Found identity tag");
                return Ok(line.to_string());
            }
        }

        // If not found in the main output, check the end of output for standalone tag
        let lines: Vec<&str> = output.lines().collect();
        if let Some(last_line) = lines.last() {
            let last_line = last_line.trim();
            if last_line.starts_with("AGE-PLUGIN-YUBIKEY-") {
                debug!(identity_tag = %last_line, "Found identity tag at end of output");
                return Ok(last_line.to_string());
            }
        }

        error!(full_output = %output, "Failed to find identity tag in age-plugin output");
        Err(YubiKeyError::identity(
            "No identity tag found in age-plugin output",
        ))
    }

    /// Validate identity format to prevent the identity tag bug
    fn validate_identity_format(&self, recipient: &str, identity_tag: &str) -> YubiKeyResult<()> {
        // Recipient validation
        if !recipient.starts_with("age1yubikey") {
            return Err(YubiKeyError::validation(format!(
                "Invalid recipient format: '{}', expected to start with 'age1yubikey'",
                recipient
            )));
        }

        if recipient.len() < 20 {
            return Err(YubiKeyError::validation(format!(
                "Recipient too short: {} chars, minimum 20",
                recipient.len()
            )));
        }

        // Identity tag validation
        if !identity_tag.starts_with("AGE-PLUGIN-YUBIKEY-") {
            return Err(YubiKeyError::validation(format!(
                "Invalid identity tag format: '{}', expected to start with 'AGE-PLUGIN-YUBIKEY-'",
                identity_tag
            )));
        }

        if identity_tag.len() < 30 {
            return Err(YubiKeyError::validation(format!(
                "Identity tag too short: {} chars, minimum 30",
                identity_tag.len()
            )));
        }

        Ok(())
    }

    /// Create temporary file for identity operations
    async fn create_temp_identity_file(&self, identity_tag: &str) -> YubiKeyResult<PathBuf> {
        let temp_file = NamedTempFile::new()
            .map_err(|e| YubiKeyError::file(format!("Failed to create temp file: {}", e)))?;

        let temp_path = temp_file.path().to_path_buf();

        fs::write(&temp_path, identity_tag)
            .await
            .map_err(|e| YubiKeyError::file(format!("Failed to write identity file: {}", e)))?;

        // Prevent auto-deletion by keeping the file
        temp_file
            .into_temp_path()
            .keep()
            .map_err(|e| YubiKeyError::file(format!("Failed to persist temp file: {}", e)))?;

        Ok(temp_path)
    }
}

#[async_trait]
impl IdentityService for AgePluginIdentityService {
    async fn generate_identity(
        &self,
        serial: &Serial,
        pin: &Pin,
        slot: u8,
    ) -> YubiKeyResult<YubiKeyIdentity> {
        info!(
            serial = %serial.redacted(),
            slot = %slot,
            "Generating new YubiKey identity"
        );

        let args = vec![
            "-g".to_string(),
            "--serial".to_string(),
            serial.value().to_string(), // Bind to specific YubiKey
            "--touch-policy".to_string(),
            "cached".to_string(), // Use cached touch policy like POC
            "--name".to_string(),
            format!("barqly-{}", serial.value()), // Descriptive name
        ];

        // Use PTY-based execution for PIN interaction
        use crate::key_management::yubikey::infrastructure::pty::core::run_age_plugin_yubikey;
        let output = tokio::task::spawn_blocking({
            let args_clone = args.clone();
            let pin_clone = pin.value().to_string();
            move || run_age_plugin_yubikey(args_clone, Some(&pin_clone), false)
        })
        .await
        .map_err(|e| YubiKeyError::device(format!("Task join error: {}", e)))?
        .map_err(|e| YubiKeyError::device(format!("age-plugin-yubikey failed: {}", e)))?;

        debug!(
            output_length = output.len(),
            output_preview = %output.lines().take(5).collect::<Vec<_>>().join(" | "),
            "Raw age-plugin-yubikey output for identity generation"
        );

        let output = output.as_bytes().to_vec();
        let identity = self.parse_identity(&output, serial)?;

        info!(
            serial = %serial.redacted(),
            slot = %slot,
            recipient = %identity.to_recipient(),
            "Successfully generated YubiKey identity"
        );

        Ok(identity)
    }

    async fn get_existing_identity(
        &self,
        serial: &Serial,
    ) -> YubiKeyResult<Option<YubiKeyIdentity>> {
        debug!(
            serial = %serial.redacted(),
            "Getting existing YubiKey identity from any slot"
        );

        let args = vec![
            "--identity".to_string(),
            "--serial".to_string(),
            serial.value().to_string(),
        ];

        match self.run_plugin_command(args, None).await {
            Ok(output) => match self.parse_identity(&output, serial) {
                Ok(identity) => {
                    debug!(
                        serial = %serial.redacted(),
                        identity_tag = %identity.identity_tag(),
                        "Found existing YubiKey identity"
                    );
                    Ok(Some(identity))
                }
                Err(parse_error) => {
                    debug!(
                        serial = %serial.redacted(),
                        error = %parse_error,
                        output = %String::from_utf8_lossy(&output),
                        "Failed to parse identity from YubiKey output"
                    );
                    Ok(None)
                }
            },
            Err(_) => {
                debug!(
                    serial = %serial.redacted(),
                    "No identity found (command failed)"
                );
                Ok(None)
            }
        }
    }

    async fn has_identity(&self, serial: &Serial) -> YubiKeyResult<bool> {
        let identity = self.get_existing_identity(serial).await?;
        Ok(identity.is_some())
    }

    async fn encrypt_with_recipient(&self, recipient: &str, data: &[u8]) -> YubiKeyResult<Vec<u8>> {
        debug!(
            recipient = %recipient,
            data_len = %data.len(),
            "Encrypting data with YubiKey recipient"
        );

        let args = vec![
            "--encrypt".to_string(),
            "--recipient".to_string(),
            recipient.to_string(),
        ];

        let encrypted_data = self.run_plugin_command(args, Some(data)).await?;

        debug!(
            original_len = %data.len(),
            encrypted_len = %encrypted_data.len(),
            "Successfully encrypted data"
        );

        Ok(encrypted_data)
    }

    async fn decrypt_with_identity(
        &self,
        serial: &Serial,
        identity_tag: &str,
        encrypted_data: &[u8],
    ) -> YubiKeyResult<Vec<u8>> {
        debug!(
            serial = %serial.redacted(),
            encrypted_len = %encrypted_data.len(),
            "Decrypting data with YubiKey identity"
        );

        // Create temporary identity file
        let identity_file = self.create_temp_identity_file(identity_tag).await?;

        let args = vec![
            "--decrypt".to_string(),
            "--identity".to_string(),
            identity_file.to_string_lossy().to_string(),
            "--serial".to_string(),
            serial.value().to_string(),
        ];

        let result = self.run_plugin_command(args, Some(encrypted_data)).await;

        // Clean up temporary file
        let _ = fs::remove_file(&identity_file).await;

        match result {
            Ok(decrypted_data) => {
                debug!(
                    encrypted_len = %encrypted_data.len(),
                    decrypted_len = %decrypted_data.len(),
                    "Successfully decrypted data"
                );
                Ok(decrypted_data)
            }
            Err(e) => {
                error!(
                    serial = %serial.redacted(),
                    error = %e,
                    "Failed to decrypt data"
                );
                Err(e)
            }
        }
    }

    async fn list_identities(&self, serial: &Serial) -> YubiKeyResult<Vec<YubiKeyIdentity>> {
        debug!(
            serial = %serial.redacted(),
            "Listing all identities for YubiKey"
        );

        let args = vec![
            "--list-all".to_string(),
            "--serial".to_string(),
            serial.value().to_string(),
        ];

        let output = self.run_plugin_command(args, None).await?;
        let output_str = String::from_utf8_lossy(&output);

        let mut identities = Vec::new();

        // Parse multiple identities from output
        // This would need more sophisticated parsing based on actual output format
        for line in output_str.lines() {
            if line.contains("Slot") && line.contains("age1yubikey") {
                // Extract slot number and identity info
                // This is a simplified implementation
                if let Some(identity) = self.parse_single_identity_line(line, serial)? {
                    identities.push(identity);
                }
            }
        }

        debug!(
            serial = %serial.redacted(),
            count = %identities.len(),
            "Found identities for YubiKey"
        );

        Ok(identities)
    }
}

impl AgePluginIdentityService {
    /// Parse a single identity line from list output
    fn parse_single_identity_line(
        &self,
        line: &str,
        serial: &Serial,
    ) -> YubiKeyResult<Option<YubiKeyIdentity>> {
        // This is a simplified implementation
        // In a real implementation, you'd parse the actual age-plugin-yubikey list format

        // Extract slot number (this would need actual format parsing)
        let _slot = 1; // Placeholder

        // Extract recipient and identity tag from line
        // This would need proper parsing based on actual output format
        if let (Some(recipient), Some(identity_tag)) = (
            self.extract_recipient(line).ok(),
            self.extract_identity_tag(line).ok(),
        ) {
            Ok(Some(YubiKeyIdentity::new(
                identity_tag,
                serial.clone(),
                recipient,
            )?))
        } else {
            Ok(None)
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_identity_service_creation() {
        // This test may fail if age-plugin-yubikey is not installed
        match AgePluginIdentityService::new().await {
            Ok(service) => {
                // Service was created successfully, which means plugin was found
                // The plugin_path should be valid but may not exist in test environment
                assert!(!service.plugin_path.to_string_lossy().is_empty());
            }
            Err(e) => {
                // Plugin not found is acceptable in test environment
                assert!(
                    e.to_string()
                        .contains("age-plugin-yubikey binary not found")
                );
            }
        }
    }

    #[test]
    fn test_recipient_extraction() {
        let service = AgePluginIdentityService::with_plugin_path(PathBuf::from("test"));

        let output = "Generated identity:\nage1yubikey1qxe2f9w5h2k8r7t3y6u4i1o0p9l8k7j6h5g4f3d2s1a0\nAGE-PLUGIN-YUBIKEY-1234567890ABCDEF";

        let recipient = service.extract_recipient(output).unwrap();
        assert!(recipient.starts_with("age1yubikey"));
    }

    #[test]
    fn test_identity_tag_extraction() {
        let service = AgePluginIdentityService::with_plugin_path(PathBuf::from("test"));

        let output = "Generated identity:\nage1yubikey1qxe2f9w5h2k8r7t3y6u4i1o0p9l8k7j6h5g4f3d2s1a0\nAGE-PLUGIN-YUBIKEY-1234567890ABCDEF";

        let identity_tag = service.extract_identity_tag(output).unwrap();
        assert!(identity_tag.starts_with("AGE-PLUGIN-YUBIKEY-"));
    }

    #[test]
    fn test_identity_validation() {
        let service = AgePluginIdentityService::with_plugin_path(PathBuf::from("test"));

        // Valid identity
        let recipient = "age1yubikey1qxe2f9w5h2k8r7t3y6u4i1o0p9l8k7j6h5g4f3d2s1a0";
        let identity_tag = "AGE-PLUGIN-YUBIKEY-1234567890ABCDEF";
        assert!(
            service
                .validate_identity_format(recipient, identity_tag)
                .is_ok()
        );

        // Invalid recipient
        let invalid_recipient = "invalid_recipient";
        assert!(
            service
                .validate_identity_format(invalid_recipient, identity_tag)
                .is_err()
        );

        // Invalid identity tag
        let invalid_tag = "INVALID-TAG";
        assert!(
            service
                .validate_identity_format(recipient, invalid_tag)
                .is_err()
        );
    }
}
