//! PTY-based age-plugin-yubikey provider for interactive operations
//!
//! This module implements YubiKey operations that require terminal interaction,
//! such as PIN entry and touch detection.

use super::provider::AgePluginProvider;
use super::pty_helpers::{
    poll_for_process_completion, setup_pty_session, wait_for_touch_completion,
};
use crate::log_sensitive;
// debug! macro is only used inside log_sensitive! which is compiled out in release builds
#[allow(unused_imports)]
use crate::logging::debug;
use crate::services::key_management::yubikey::domain::errors::{YubiKeyError, YubiKeyResult};
use crate::services::key_management::yubikey::infrastructure::providers::provider::{
    AgeHeader, DataEncryptionKey, ProviderInfo, YubiIdentityProvider, YubiRecipient,
};
use crate::services::key_management::yubikey::infrastructure::pty::core::get_age_path;
use std::io::BufRead;
use std::path::PathBuf;
use std::process::Stdio;
use std::time::Duration;
use tokio::fs;
use tokio::process::Command;
use tokio::time::timeout;

/// Default timeout for age-plugin-yubikey operations
const DEFAULT_TIMEOUT: Duration = Duration::from_secs(30);

/// Extended timeout for operations requiring user interaction
const INTERACTIVE_TIMEOUT: Duration = Duration::from_secs(120);

/// PTY-based age-plugin-yubikey provider for interactive operations
#[derive(Debug)]
pub struct AgePluginPtyProvider {
    plugin_path: PathBuf,
    timeout: Duration,
}

impl AgePluginPtyProvider {
    /// Create a new PTY-based age-plugin-yubikey provider
    pub fn new() -> YubiKeyResult<Self> {
        let plugin_path = AgePluginProvider::find_plugin_binary()?;
        Ok(Self {
            plugin_path,
            timeout: DEFAULT_TIMEOUT,
        })
    }

    /// Create provider with custom plugin path and timeout
    pub fn with_config(plugin_path: PathBuf, timeout: Duration) -> Self {
        Self {
            plugin_path,
            timeout,
        }
    }

    /// Execute plugin with arguments
    async fn execute_plugin(&self, args: &[&str]) -> YubiKeyResult<(String, String)> {
        let output = timeout(self.timeout, async {
            Command::new(&self.plugin_path)
                .args(args)
                .stdout(Stdio::piped())
                .stderr(Stdio::piped())
                .output()
                .await
        })
        .await
        .map_err(|_| YubiKeyError::age_plugin("age-plugin-yubikey operation timed out"))?
        .map_err(|e| YubiKeyError::age_plugin(format!("Failed to execute plugin: {e}")))?;

        let stdout = String::from_utf8_lossy(&output.stdout).into_owned();
        let stderr = String::from_utf8_lossy(&output.stderr).into_owned();

        if !output.status.success() {
            return Err(YubiKeyError::age_plugin(format!(
                "age-plugin-yubikey failed: {stderr}"
            )));
        }

        Ok((stdout, stderr))
    }

    /// Execute plugin with PTY for interactive operations
    async fn execute_plugin_interactive(
        &self,
        args: &[&str],
        pin: Option<&str>,
    ) -> YubiKeyResult<(String, String)> {
        self.execute_plugin_with_pty(args, pin).await
    }

    /// Execute plugin using PTY for proper terminal interaction
    async fn execute_plugin_with_pty(
        &self,
        args: &[&str],
        pin: Option<&str>,
    ) -> YubiKeyResult<(String, String)> {
        #[cfg(debug_assertions)]
        log_sensitive!(dev_only: {
            debug!(
                "Starting PTY execution of age-plugin-yubikey with args: {}",
                args.join(" ")
            );
        });

        // Setup PTY session
        let (mut child, mut buf_reader, mut writer) = setup_pty_session(&self.plugin_path, args)?;

        let mut output = String::new();
        let mut line = String::new();
        let mut pin_sent = false;

        // Add comprehensive debug logging for touch detection
        log_sensitive!(dev_only: {
        });

        // Determine touch policy from args for touch detection
        let touch_policy = if args.contains(&"--touch-policy") {
            if let Some(idx) = args.iter().position(|&arg| arg == "--touch-policy") {
                if let Some(policy_str) = args.get(idx + 1) {
                    match policy_str.to_lowercase().as_str() {
                        "always" => crate::services::key_management::yubikey::domain::models::TouchPolicy::Always,
                        "cached" => crate::services::key_management::yubikey::domain::models::TouchPolicy::Cached,
                        "never" => crate::services::key_management::yubikey::domain::models::TouchPolicy::Never,
                        _ => crate::services::key_management::yubikey::domain::models::TouchPolicy::Always,
                    }
                } else {
                    crate::services::key_management::yubikey::domain::models::TouchPolicy::Always
                }
            } else {
                crate::services::key_management::yubikey::domain::models::TouchPolicy::Always
            }
        } else {
            crate::services::key_management::yubikey::domain::models::TouchPolicy::Always
        };

        log_sensitive!(dev_only: {
            debug!("Detected touch policy: {:?}", touch_policy);
        });

        // Main PTY interaction loop
        loop {
            line.clear();

            // Try reading with timeout
            let read_result = timeout(Duration::from_millis(500), async {
                buf_reader.read_line(&mut line)
            })
            .await;

            match read_result {
                Ok(Ok(0)) => {
                    // EOF detected
                    log_sensitive!(dev_only: {
                        debug!("PTY EOF detected - process may be completing or waiting for touch");
                    });

                    // Active polling for process completion
                    if let Some(status) =
                        poll_for_process_completion(&mut child, &mut writer, &output).await?
                    {
                        return Ok((format!("{:?}", status), output));
                    }

                    continue; // Continue outer read loop
                }
                Ok(Ok(_bytes_read)) => {
                    log_sensitive!(dev_only: {
                        debug!("Read {} bytes from PTY: '{}'", _bytes_read, line.trim());
                    });

                    output.push_str(&line);

                    // Check for PIN prompt
                    if !pin_sent
                        && (line.contains("PIN:")
                            || line.contains("pin:")
                            || line.contains("Enter PIN"))
                    {
                        log_sensitive!(dev_only: {
                            debug!("PIN prompt detected: '{}'", line.trim());
                        });

                        if let Some(pin_value) = pin {
                            log_sensitive!(dev_only: {
                                debug!("Sending PIN to PTY (length: {} chars)", pin_value.len());
                            });

                            let pin_with_newline = format!("{}\n", pin_value);
                            writer.write_all(pin_with_newline.as_bytes()).map_err(|e| {
                                YubiKeyError::age_plugin(format!("Failed to write PIN: {e}"))
                            })?;
                            writer.flush().map_err(|e| {
                                YubiKeyError::age_plugin(format!("Failed to flush PIN: {e}"))
                            })?;
                            pin_sent = true;

                            log_sensitive!(dev_only: {
                                debug!("PIN sent successfully");
                            });
                        } else {
                            return Err(YubiKeyError::age_plugin("PIN required but not provided"));
                        }
                    }

                    // Enhanced touch detection for key generation
                    if (line.contains("Generating key") || line.contains("generating key"))
                        && !line.contains("TRACER:") && !line.contains("DETECTIVE:")
                        && touch_policy != crate::services::key_management::yubikey::domain::models::TouchPolicy::Never {

                        log_sensitive!(dev_only: {
                            debug!("KEY GENERATION STARTED - Touch will be required!");
                            debug!("Full line: '{}'", line.trim());
                            debug!("age-plugin-yubikey will now wait silently for touch...");
                            debug!("** SWITCHING TO TOUCH-WAIT MODE **");
                        });

                        let status = wait_for_touch_completion(&mut child, &mut buf_reader, &mut writer, &mut output).await?;
                        return Ok((format!("{:?}", status), output));
                    }

                    // Log potential completion indicators
                    if line.contains("age1yubikey")
                        || line.contains("Generated")
                        || line.contains("Success")
                    {
                        log_sensitive!(dev_only: {
                            debug!("Potential completion detected: '{}'", line.trim());
                        });
                    }

                    // Log error indicators
                    if line.to_lowercase().contains("error")
                        || line.to_lowercase().contains("failed")
                    {
                        log_sensitive!(dev_only: {
                            debug!("Error detected: '{}'", line.trim());
                        });
                    }
                }
                Ok(Err(e)) => {
                    log_sensitive!(dev_only: {
                        debug!("PTY read error: {e}");
                    });
                    return Err(YubiKeyError::age_plugin(format!("PTY read error: {e}")));
                }
                Err(_) => {
                    // Timeout on read - check if process completed
                    log_sensitive!(dev_only: {
                        debug!("PTY read timeout (500ms) - checking process status");
                    });

                    match child.try_wait() {
                        Ok(Some(status)) => {
                            log_sensitive!(dev_only: {
                                debug!("Process completed with status: {status:?}");
                            });
                            return Ok((format!("{:?}", status), output));
                        }
                        Ok(None) => {
                            // Process still running, continue
                            continue;
                        }
                        Err(e) => {
                            return Err(YubiKeyError::age_plugin(format!("Process error: {e}")));
                        }
                    }
                }
            }
        }
    }

    /// Parse recipients from plugin output
    fn parse_recipients(&self, output: &str) -> YubiKeyResult<Vec<YubiRecipient>> {
        // Delegate to non-PTY provider for parsing logic
        let provider = AgePluginProvider::with_config(self.plugin_path.clone(), self.timeout);
        provider.parse_recipients(output)
    }

    /// Create temporary file for operations
    async fn create_temp_file(&self, content: &[u8]) -> YubiKeyResult<PathBuf> {
        let temp_provider = AgePluginProvider::with_config(self.plugin_path.clone(), self.timeout);
        temp_provider.create_temp_file(content).await
    }
}

#[async_trait::async_trait]
impl YubiIdentityProvider for AgePluginPtyProvider {
    async fn list_recipients(&self) -> YubiKeyResult<Vec<YubiRecipient>> {
        // Try --list-all first (newer versions), fallback to --list
        let result = self.execute_plugin(&["--list-all"]).await;
        let (_stdout, stderr) = match result {
            Ok(output) => output,
            Err(_) => {
                // Fallback to --list for older versions
                self.execute_plugin(&["--list"]).await?
            }
        };

        // If output is empty, return empty list (no recipients configured)
        if stderr.trim().is_empty() {
            return Ok(Vec::new());
        }

        self.parse_recipients(&stderr)
    }

    async fn register(&self, label: &str, pin: Option<&str>) -> YubiKeyResult<YubiRecipient> {
        let mut args = vec!["--generate"];

        // Set PIN policy using centralized configuration
        args.push("--pin-policy");
        let pin_policy_str =
            crate::services::key_management::yubikey::domain::models::policy_config::DEFAULT_PIN_POLICY.to_string();
        args.push(&pin_policy_str);

        // Set touch policy using centralized configuration
        args.push("--touch-policy");
        let touch_policy_str =
            crate::services::key_management::yubikey::domain::models::policy_config::DEFAULT_TOUCH_POLICY
                .to_string();
        args.push(&touch_policy_str);

        args.push("--name");
        args.push(label);

        // Execute with interactive timeout and PIN support
        let (_stdout, stderr) = self.execute_plugin_interactive(&args, pin).await?;

        // Parse the generated recipient from output
        let recipients = self.parse_recipients(&stderr)?;
        recipients
            .into_iter()
            .next()
            .ok_or_else(|| YubiKeyError::age_plugin("No recipient generated by age-plugin-yubikey"))
    }

    async fn unwrap_dek(
        &self,
        header: &AgeHeader,
        _pin: Option<&str>,
    ) -> YubiKeyResult<DataEncryptionKey> {
        // Create temporary file with the age header/encrypted data
        let temp_path = self.create_temp_file(&header.data).await?;

        // For YubiKey decryption, we need to use the age command directly
        // The age-plugin-yubikey will be invoked automatically by age when it encounters
        // a YubiKey recipient in the encrypted file

        let age_path = get_age_path();
        let output = timeout(INTERACTIVE_TIMEOUT, async {
            Command::new(&age_path)
                .args(["--decrypt", &temp_path.to_string_lossy()])
                .stdout(Stdio::piped())
                .stderr(Stdio::piped())
                .output()
                .await
        })
        .await
        .map_err(|_| YubiKeyError::age_plugin("age decryption operation timed out"))?
        .map_err(|e| YubiKeyError::age_plugin(format!("Failed to execute age decrypt: {e}")))?;

        // Clean up temp file
        let _ = fs::remove_file(&temp_path).await;

        if !output.status.success() {
            let stderr = String::from_utf8_lossy(&output.stderr);
            return Err(YubiKeyError::age_plugin(format!(
                "age decrypt failed: {stderr}"
            )));
        }

        // The decrypted content contains the DEK
        Ok(DataEncryptionKey::new(output.stdout))
    }

    async fn test_connectivity(&self) -> YubiKeyResult<()> {
        // Test by checking version
        let (_stdout, _stderr) = self.execute_plugin(&["--version"]).await?;
        Ok(())
    }

    fn get_provider_info(&self) -> ProviderInfo {
        ProviderInfo {
            name: "age-plugin-yubikey-pty".to_string(),
            version: "0.5.x".to_string(),
            description: "PTY-based YubiKey identity provider using age-plugin-yubikey binary"
                .to_string(),
            capabilities: vec![
                "list_recipients".to_string(),
                "register".to_string(),
                "unwrap_dek".to_string(),
                "hardware_security".to_string(),
                "touch_authentication".to_string(),
                "interactive_pin_input".to_string(),
                "pty_support".to_string(),
            ],
        }
    }
}
