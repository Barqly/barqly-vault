//! age-plugin-yubikey binary integration provider
//!
//! This module implements the YubiIdentityProvider trait using the
//! age-plugin-yubikey binary for mature, reliable YubiKey operations.

use super::providers::provider::{
    AgeHeader, DataEncryptionKey, ProviderInfo, YubiIdentityProvider, YubiRecipient,
};
use super::pty::core::get_age_path;
use crate::key_management::yubikey::domain::errors::{YubiKeyError, YubiKeyResult};
use crate::log_sensitive;
use crate::tracing_setup::debug;
// serde_json::Value removed - not needed
use std::path::PathBuf;
use std::process::Stdio;
use std::time::Duration;
use tokio::fs;
// AsyncReadExt, AsyncWriteExt removed - not currently used
use tokio::process::Command;
use tokio::time::timeout;
// PTY support
use portable_pty::{CommandBuilder, PtySize, native_pty_system};
use std::io::{BufRead, BufReader, Write};

/// Default timeout for age-plugin-yubikey operations
const DEFAULT_TIMEOUT: Duration = Duration::from_secs(30);

/// Extended timeout for operations requiring user interaction
const INTERACTIVE_TIMEOUT: Duration = Duration::from_secs(120);

/// age-plugin-yubikey provider implementation
#[derive(Debug)]
pub struct AgePluginProvider {
    plugin_path: PathBuf,
    timeout: Duration,
}

/// PTY-based age-plugin-yubikey provider for interactive operations
#[derive(Debug)]
pub struct AgePluginPtyProvider {
    plugin_path: PathBuf,
    timeout: Duration,
}

impl AgePluginProvider {
    /// Create a new age-plugin-yubikey provider
    pub fn new() -> YubiKeyResult<Self> {
        let plugin_path = Self::find_plugin_binary()?;
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

    /// Find the age-plugin-yubikey binary
    pub fn find_plugin_binary() -> YubiKeyResult<PathBuf> {
        // First, try to find in PATH
        if let Ok(path) = Self::find_in_path("age-plugin-yubikey") {
            return Ok(path);
        }

        // Try common Cargo installation directory
        if let Ok(home_dir) = std::env::var("HOME") {
            let cargo_bin_path = PathBuf::from(home_dir)
                .join(".cargo")
                .join("bin")
                .join("age-plugin-yubikey");
            if cargo_bin_path.exists() && cargo_bin_path.is_file() {
                return Ok(cargo_bin_path);
            }
        }

        // Try application-specific locations
        if let Ok(app_dir) = crate::storage::get_application_directory() {
            let runtime_path = app_dir.join("runtime").join("age-plugin-yubikey");
            if runtime_path.exists() {
                return Ok(runtime_path);
            }

            let bundled_path = app_dir.join("binaries").join("age-plugin-yubikey");
            if bundled_path.exists() {
                return Ok(bundled_path);
            }
        }

        Err(YubiKeyError::age_plugin(
            "age-plugin-yubikey binary not found in PATH, ~/.cargo/bin, or application directories",
        ))
    }

    /// Find binary in system PATH
    fn find_in_path(binary_name: &str) -> Result<PathBuf, std::io::Error> {
        let paths = std::env::var("PATH").unwrap_or_default();
        let path_separator = if cfg!(windows) { ";" } else { ":" };

        for path_str in paths.split(path_separator) {
            let path = PathBuf::from(path_str);
            let binary_path = if cfg!(windows) {
                path.join(format!("{binary_name}.exe"))
            } else {
                path.join(binary_name)
            };

            if binary_path.exists() && binary_path.is_file() {
                return Ok(binary_path);
            }
        }

        Err(std::io::Error::new(
            std::io::ErrorKind::NotFound,
            format!("{binary_name} not found in PATH"),
        ))
    }

    /// Execute age-plugin-yubikey with the given arguments
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
        .map_err(|e| {
            YubiKeyError::age_plugin(format!("Failed to execute age-plugin-yubikey: {e}"))
        })?;

        let stdout = String::from_utf8_lossy(&output.stdout).to_string();
        let stderr = String::from_utf8_lossy(&output.stderr).to_string();

        if !output.status.success() {
            return Err(YubiKeyError::age_plugin(format!(
                "age-plugin-yubikey failed: {stderr}"
            )));
        }

        Ok((stdout, stderr))
    }

    /// Execute plugin with interactive mode (longer timeout)
    async fn execute_plugin_interactive(&self, args: &[&str]) -> YubiKeyResult<(String, String)> {
        // Temporarily increase timeout for interactive operations
        let provider = self.clone_with_timeout(INTERACTIVE_TIMEOUT);

        provider.execute_plugin(args).await
    }

    /// Clone provider with different timeout
    fn clone_with_timeout(&self, new_timeout: Duration) -> Self {
        Self {
            plugin_path: self.plugin_path.clone(),
            timeout: new_timeout,
        }
    }

    /// Parse YubiKey recipients from plugin output
    fn parse_recipients(&self, output: &str) -> YubiKeyResult<Vec<YubiRecipient>> {
        let mut recipients = Vec::new();

        for line in output.lines() {
            let trimmed = line.trim();
            if trimmed.is_empty() || trimmed.starts_with('#') {
                continue;
            }

            // The --list-all command outputs in format:
            // age1yubikey1[recipient_key] [label]
            // or with more details:
            // age1yubikey1... [label] (Serial: 12345678, Slot: 9c)

            // Split on whitespace to get recipient and rest
            let parts: Vec<&str> = trimmed.split_whitespace().collect();
            if parts.is_empty() || !parts[0].starts_with("age1yubikey1") {
                continue;
            }

            let recipient_str = parts[0].to_string();

            // Get everything after the recipient for metadata parsing
            let remainder = trimmed.strip_prefix(parts[0]).unwrap_or("").trim();

            // Parse metadata - handle both simple label and detailed format
            let (label, serial, slot) = if remainder.contains("Serial:") {
                // Detailed format with serial and slot
                self.parse_recipient_metadata(remainder)?
            } else if !remainder.is_empty() {
                // Simple format - just label
                let label = remainder.replace(['[', ']'], "").trim().to_string();
                // Extract serial from recipient string (work around for missing metadata)
                let serial = self
                    .extract_serial_from_recipient(&recipient_str)
                    .unwrap_or_else(|_| "unknown".to_string());
                (label, serial, 0x9c) // Default to slot 9c
            } else {
                // No metadata - use defaults
                let serial = self
                    .extract_serial_from_recipient(&recipient_str)
                    .unwrap_or_else(|_| "unknown".to_string());
                ("YubiKey".to_string(), serial, 0x9c)
            };

            recipients.push(YubiRecipient {
                recipient: recipient_str,
                label,
                serial,
                slot,
            });
        }

        Ok(recipients)
    }

    /// Extract serial number from age recipient string
    /// The serial number is embedded in the bech32 encoding of the age recipient
    fn extract_serial_from_recipient(&self, _recipient: &str) -> YubiKeyResult<String> {
        // This is a simplified extraction - in practice the serial is embedded
        // in the bech32-encoded data. For now, return "unknown" if we can't extract it.
        // The actual serial should be obtained from age-plugin-yubikey or from metadata.
        Ok("unknown".to_string())
    }

    /// Parse recipient metadata from the descriptive part
    fn parse_recipient_metadata(&self, metadata: &str) -> YubiKeyResult<(String, String, u8)> {
        // Default values
        let mut label = "YubiKey".to_string();
        let mut serial = "unknown".to_string();
        let mut slot = 0x9a;

        // Look for label in brackets [label]
        if let Some(start) = metadata.find('[')
            && let Some(end) = metadata.find(']')
            && end > start
        {
            label = metadata[start + 1..end].trim().to_string();
        }

        // Look for serial in parentheses
        if let Some(start) = metadata.find("Serial:") {
            let serial_part = &metadata[start + 7..];
            if let Some(end) = serial_part.find(',') {
                serial = serial_part[..end].trim().to_string();
            } else if let Some(end) = serial_part.find(')') {
                serial = serial_part[..end].trim().to_string();
            }
        }

        // Look for slot in parentheses
        if let Some(start) = metadata.find("Slot:") {
            let slot_part = &metadata[start + 5..];
            if let Some(end) = slot_part.find(')')
                && let Ok(parsed_slot) = u8::from_str_radix(slot_part[..end].trim(), 16)
            {
                slot = parsed_slot;
            }
        }

        Ok((label, serial, slot))
    }

    /// Create a temporary file for age operations
    async fn create_temp_file(&self, content: &[u8]) -> YubiKeyResult<PathBuf> {
        use tempfile::NamedTempFile;

        let temp_file = NamedTempFile::new().map_err(|e| {
            YubiKeyError::age_plugin(format!("Failed to create temporary file: {e}"))
        })?;

        let temp_path = temp_file.path().to_path_buf();

        // Write content to temp file
        fs::write(&temp_path, content).await.map_err(|e| {
            YubiKeyError::age_plugin(format!("Failed to write to temporary file: {e}"))
        })?;

        // Keep the temp file around by forgetting the NamedTempFile
        let _ = temp_file.into_temp_path();

        Ok(temp_path)
    }
}

#[async_trait::async_trait]
impl YubiIdentityProvider for AgePluginProvider {
    async fn list_recipients(&self) -> YubiKeyResult<Vec<YubiRecipient>> {
        // Try --list-all first (newer versions), fallback to --list
        let result = self.execute_plugin(&["--list-all"]).await;
        let (stdout, _stderr) = match result {
            Ok(output) => output,
            Err(_) => {
                // Fallback to --list for older versions
                self.execute_plugin(&["--list"]).await?
            }
        };

        // If output is empty, return empty list (no recipients configured)
        if stdout.trim().is_empty() {
            return Ok(Vec::new());
        }

        self.parse_recipients(&stdout)
    }

    async fn register(&self, label: &str, _pin: Option<&str>) -> YubiKeyResult<YubiRecipient> {
        // Note: PIN is handled through interactive prompts by age-plugin-yubikey
        // The pin parameter is kept for interface compatibility but not used directly
        // as age-plugin-yubikey doesn't accept PIN via command line for security reasons

        let mut args = vec!["--generate"];

        // Set PIN policy using centralized configuration
        args.push("--pin-policy");
        let pin_policy_str =
            crate::key_management::yubikey::domain::models::policy_config::DEFAULT_PIN_POLICY.to_string();
        args.push(&pin_policy_str);

        // Set touch policy using centralized configuration
        args.push("--touch-policy");
        let touch_policy_str =
            crate::key_management::yubikey::domain::models::policy_config::DEFAULT_TOUCH_POLICY.to_string();
        args.push(&touch_policy_str);

        args.push("--name");
        args.push(label);

        // Execute with interactive timeout for user interaction
        let (stdout, _stderr) = self.execute_plugin_interactive(&args).await?;

        // Parse the generated recipient from output
        let recipients = self.parse_recipients(&stdout)?;
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

        // Use age command for decryption (it will call age-plugin-yubikey internally)
        let age_path = get_age_path();
        let output = timeout(INTERACTIVE_TIMEOUT, async {
            Command::new(&age_path)
                .args(["--decrypt", &temp_path.to_string_lossy()])
                .env("AGE_PLUGIN_YUBIKEY_SKIP_PROMPT", "1") // Skip prompts if possible
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
            name: "age-plugin-yubikey".to_string(),
            version: "0.5.x".to_string(), // Will be determined at runtime
            description: "YubiKey identity provider using age-plugin-yubikey binary".to_string(),
            capabilities: vec![
                "list_recipients".to_string(),
                "register".to_string(),
                "unwrap_dek".to_string(),
                "hardware_security".to_string(),
                "touch_authentication".to_string(),
            ],
        }
    }
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

    /// Execute age-plugin-yubikey with PTY support for interactive operations
    async fn execute_plugin_with_pty(
        &self,
        args: &[&str],
        pin: Option<&str>,
    ) -> YubiKeyResult<(String, String)> {
        #[cfg(debug_assertions)]
        log_sensitive!(dev_only: {
            debug!(
                    "Executing with PTY: {} {}",
                    self.plugin_path.display(),
                    args.join(" ")
                );
        });

        // Create PTY system and open a new PTY
        let pty_system = native_pty_system();
        let pty_pair = pty_system
            .openpty(PtySize {
                rows: 24,
                cols: 80,
                pixel_width: 0,
                pixel_height: 0,
            })
            .map_err(|e| YubiKeyError::age_plugin(format!("Failed to create PTY: {e}")))?;

        // Build command with proper terminal environment
        let mut cmd = CommandBuilder::new(&self.plugin_path);
        for arg in args {
            cmd.arg(arg);
        }

        // Set comprehensive environment variables to ensure proper terminal behavior
        cmd.env("TERM", "xterm-256color");
        cmd.env("AGE_PLUGIN_YUBIKEY_FORCE_TTY", "1");
        cmd.env("FORCE_COLOR", "1");
        // Additional terminal detection variables
        cmd.env("CI", "false"); // Ensure it doesn't think it's in CI
        cmd.env("COLORTERM", "truecolor");
        // Force interactive mode
        cmd.env("RUST_LOG", "debug"); // Enable debug logging in age-plugin-yubikey

        // Ensure stdin/stdout/stderr are properly connected
        log_sensitive!(dev_only: {

            debug!("🔧 TRACER: Setting up PTY environment for age-plugin-yubikey");

        });

        // Spawn command in PTY
        let mut child = pty_pair.slave.spawn_command(cmd).map_err(|e| {
            YubiKeyError::age_plugin(format!("Failed to spawn command in PTY: {e}"))
        })?;

        // Create reader and writer for PTY master
        let reader = pty_pair
            .master
            .try_clone_reader()
            .map_err(|e| YubiKeyError::age_plugin(format!("Failed to clone PTY reader: {e}")))?;
        let writer = pty_pair
            .master
            .take_writer()
            .map_err(|e| YubiKeyError::age_plugin(format!("Failed to take PTY writer: {e}")))?;

        let mut buf_reader = BufReader::new(reader);
        let mut output = String::new();
        let mut line = String::new();
        let mut pin_sent = false;

        // Add comprehensive debug logging for touch detection
        log_sensitive!(dev_only: {

            debug!(
            "🎯 TRACER: PTY interaction starting - timeout: {:?}",
            self.timeout
        );

        });
        log_sensitive!(dev_only: {

            debug!(
            "🎯 TRACER: Running command: {} {}",
            self.plugin_path.display(),
            args.join(" ")
        );

        });

        // Clone output for timeout error handling before it's moved
        let output_for_timeout = output.clone();

        // Handle the interaction with timeout
        // CRITICAL: Keep writer alive throughout the entire async block to ensure
        // stdin stays open for the age-plugin-yubikey process
        let result = timeout(self.timeout, async move {
            // Move writer into the async block to ensure it stays alive
            let mut writer = writer;
            log_sensitive!(dev_only: {

                debug!("🔧 TRACER: PTY loop starting - writer handle secured");

            });
            let mut loop_iteration = 0;
            loop {
                loop_iteration += 1;
                line.clear();
                log_sensitive!(dev_only: {

                    debug!("🔄 DETECTIVE: Read loop iteration #{loop_iteration} - about to read from PTY");

                });
                match buf_reader.read_line(&mut line) {
                    Ok(0) => {
                        log_sensitive!(dev_only: {

                            debug!("📄 TRACER: EOF detected - checking if process finished");

                        });
                        log_sensitive!(dev_only: {

                            debug!("🔍 DETECTIVE: EOF encountered, output so far: '{}' ({} bytes)",
                                output.chars().rev().take(200).collect::<String>().chars().rev().collect::<String>(),
                                output.len());

                        });
                        log_sensitive!(dev_only: {

                            debug!("🔍 DETECTIVE: Process handle available - checking wait status");

                        });
                        // EOF - check if process finished
                        match child.try_wait() {
                            Ok(Some(status)) => {
                                log_sensitive!(dev_only: {

                                    debug!("✅ TRACER: Process finished with status: {status:?}");

                                });
                                return Ok((status, output.clone()));
                            },
                            Ok(None) => {
                                log_sensitive!(dev_only: {

                                    debug!("⏳ TRACER: Process still running after EOF - implementing active polling...");

                                });
                                log_sensitive!(dev_only: {

                                    debug!("⏳ TRACER: This is likely YubiKey waiting for touch - process alive but quiet");

                                });

                                // Active polling with proper retry loop structure
                                let max_retries = 60; // 30 seconds total with 500ms intervals
                                let mut nudge_count = 0;

                                // Proper polling loop - retry counter increments per polling attempt
                                for retry_count in 1..=max_retries {
                                    log_sensitive!(dev_only: {

                                        debug!("🔍 TRACER: PTY EOF active polling: attempt {retry_count}/{max_retries}, checking process state...");

                                    });
                                    log_sensitive!(dev_only: {

                                        debug!("🕵️ DETECTIVE: About to poll process - attempt: {}, elapsed time: {}ms",
                                            retry_count, retry_count * 500);

                                    });

                                    // Check if process completed
                                    match child.try_wait() {
                                        Ok(Some(status)) => {
                                            log_sensitive!(dev_only: {

                                                debug!("✅ TRACER: Process completed during active polling with status: {status:?}");

                                            });
                                            return Ok((status, output.clone()));
                                        },
                                        Ok(None) => {
                                            // Process still alive - continue polling with backoff
                                            log_sensitive!(dev_only: {

                                                debug!("🔄 TRACER: Process still alive, continuing to poll...");

                                            });

                                            // Send periodic CRLF nudge to help with line discipline
                                            // This mimics what a real terminal would do
                                            if retry_count % 4 == 0 { // Every 2 seconds (4 * 500ms)
                                                nudge_count += 1;
                                                log_sensitive!(dev_only: {

                                                    debug!("📤 TRACER: Sending CRLF nudge #{nudge_count} to assist line discipline");

                                                });
                                                log_sensitive!(dev_only: {

                                                    debug!("🕵️ DETECTIVE: Writer available before nudge: true, nudge #{nudge_count}");

                                                });

                                                match writer.write_all(b"\r\n") {
                                                    Ok(_) => {
                                                        match writer.flush() {
                                                            Ok(_) => {
                                                                log_sensitive!(dev_only: {

                                                                    debug!("📤 TRACER: CRLF nudge sent and flushed successfully");

                                                                });
                                                                log_sensitive!(dev_only: {

                                                                    debug!("🕵️ DETECTIVE: CRLF bytes [\\r\\n] written to PTY master");

                                                                });
                                                            }
                                                            Err(e) => {
                                                                log_sensitive!(dev_only: {

                                                                    debug!("⚠️ TRACER: CRLF nudge flush failed: {e}");

                                                                });
                                                                log_sensitive!(dev_only: {

                                                                    debug!("🚨 DETECTIVE: FLUSH ERROR - PTY may be broken: {e}");

                                                                });
                                                            }
                                                        }
                                                    }
                                                    Err(e) => {
                                                        log_sensitive!(dev_only: {

                                                            debug!("⚠️ TRACER: CRLF nudge write failed: {e}");

                                                        });
                                                        log_sensitive!(dev_only: {

                                                            debug!("🚨 DETECTIVE: WRITE ERROR - PTY connection may be lost: {e}");

                                                        });
                                                    }
                                                }
                                            }

                                            // Graduated backoff: start fast, slow down
                                            let sleep_ms = if retry_count < 10 { 250 } else { 500 };
                                            tokio::time::sleep(Duration::from_millis(sleep_ms)).await;
                                        }
                                        Err(e) => {
                                            log_sensitive!(dev_only: {

                                                debug!("❌ TRACER: Process wait error during active polling: {e}");

                                            });
                                            return Err(YubiKeyError::age_plugin(format!("Process error: {e}")));
                                        }
                                    }
                                }

                                // If we get here, we've exhausted all polling attempts
                                log_sensitive!(dev_only: {

                                    debug!("⏰ TRACER: Touch timeout - process still running after {}s, continuing to outer timeout handler", max_retries / 2);

                                });
                                log_sensitive!(dev_only: {

                                    debug!("🕵️ DETECTIVE: Polling exhausted - returning to outer read loop to check for delayed output");

                                });

                                // Try reading again - maybe output appeared during final polling attempts
                                log_sensitive!(dev_only: {

                                    debug!("🔄 DETECTIVE: About to continue outer read loop - looking for post-touch output");

                                });
                                continue; // Continue outer read loop
                            }
                            Err(e) => {
                                log_sensitive!(dev_only: {

                                    debug!("❌ TRACER: Process wait error: {e}");

                                });
                                return Err(YubiKeyError::age_plugin(format!(
                                    "Process wait error: {e}"
                                )))
                            }
                        }
                    }
                    Ok(_) => {
                        output.push_str(&line);

                        // Enhanced logging for all PTY output
                        log_sensitive!(dev_only: {

                            debug!("📡 TRACER: PTY output: {}", line.trim());

                        });

                        // Handle PIN prompt - allow multiple PIN prompts during generation
                        if line.contains("PIN:")
                            || line.contains("Enter PIN")
                            || line.contains("pin:")
                        {
                            if let Some(p) = pin {
                                if !pin_sent {
                                    log_sensitive!(dev_only: {

                                        debug!("🔑 TRACER: First PIN prompt detected - sending PIN to PTY");

                                    });
                                } else {
                                    log_sensitive!(dev_only: {

                                        debug!("🔑 TRACER: Additional PIN prompt detected - sending PIN again");

                                    });
                                }

                                writeln!(writer, "{p}").map_err(|e| {
                                    YubiKeyError::age_plugin(format!("Failed to write PIN: {e}"))
                                })?;
                                // CRITICAL: Flush the writer to ensure PIN is sent immediately
                                writer.flush().map_err(|e| {
                                    YubiKeyError::age_plugin(format!("Failed to flush PIN: {e}"))
                                })?;
                                // CRITICAL: Do NOT drop writer after sending PIN
                                pin_sent = true;
                                log_sensitive!(dev_only: {

                                    debug!("✅ TRACER: PIN sent and flushed successfully - KEEPING writer alive");

                                });
                            } else {
                                log_sensitive!(dev_only: {

                                    debug!("❌ TRACER: PIN prompt detected but no PIN provided");

                                });
                            }
                        }

                        // Touch detection for age-plugin-yubikey - it shows "Generating key..." then goes silent
                        // The key insight: age-plugin-yubikey doesn't show explicit touch prompts
                        // Instead it shows "Generating key..." and then waits silently for touch
                        // IMPORTANT: Exclude our own debug messages (those with emojis)
                        // IMPORTANT: Skip touch detection if policy is Never
                        let touch_policy = crate::key_management::yubikey::domain::models::policy_config::DEFAULT_TOUCH_POLICY;
                        log_sensitive!(dev_only: {

                            debug!("🔧 POLICY CHECK: Current touch policy = {touch_policy:?}");

                        });

                        if (line.contains("Generating key") || line.contains("generating key"))
                            && !line.contains("🔍") && !line.contains("TRACER:") && !line.contains("DETECTIVE:") {
                            log_sensitive!(dev_only: {

                                debug!("🔧 POLICY CHECK: Found 'Generating key' line, checking if should trigger touch detection...");

                            });
                            if touch_policy != crate::key_management::yubikey::domain::models::TouchPolicy::Never {
                                log_sensitive!(dev_only: {

                                    debug!("🔧 POLICY CHECK: Touch policy is NOT Never, triggering touch detection");

                                });
                            } else {
                                log_sensitive!(dev_only: {

                                    debug!("🔧 POLICY CHECK: Touch policy is Never, SKIPPING touch detection");

                                });
                                continue; // Skip touch detection entirely
                            }
                        }

                        if (line.contains("Generating key") || line.contains("generating key"))
                            && !line.contains("🔍") && !line.contains("TRACER:") && !line.contains("DETECTIVE:")
                            && touch_policy != crate::key_management::yubikey::domain::models::TouchPolicy::Never {
                            log_sensitive!(dev_only: {

                                debug!("👆 TRACER: KEY GENERATION STARTED - Touch will be required!");

                            });
                            log_sensitive!(dev_only: {

                                debug!("👆 TRACER: Full line: '{}'", line.trim());

                            });
                            log_sensitive!(dev_only: {

                                debug!("👆 TRACER: age-plugin-yubikey will now wait silently for touch...");

                            });
                            log_sensitive!(dev_only: {

                                debug!("👆 TRACER: ** SWITCHING TO TOUCH-WAIT MODE **");

                            });
                            // TODO: Emit Tauri event here

                            // Start timeout-based touch detection since no more output will come
                            let touch_start = std::time::Instant::now();
                            let mut touch_timeout_count = 0;

                            // Continue reading but with timeout expectations
                            log_sensitive!(dev_only: {

                                debug!("⏰ TRACER: Entering touch-wait polling mode - process is silent during touch");

                            });
                            loop {
                                line.clear();
                                let read_result = timeout(Duration::from_millis(1000), async {
                                    buf_reader.read_line(&mut line)
                                }).await;

                                match read_result {
                                    Ok(Ok(0)) => {
                                        // EOF during touch wait - this is expected behavior
                                        touch_timeout_count += 1;
                                        log_sensitive!(dev_only: {

                                            debug!("⏳ TRACER: Touch wait timeout #{} - still waiting for touch completion (elapsed: {:?})",
                                                touch_timeout_count, touch_start.elapsed());

                                        });

                                        // Send periodic CRLF nudges to help the process along
                                        if touch_timeout_count % 3 == 0 {
                                            writer.write_all(b"\r\n").map_err(|e| {
                                                YubiKeyError::age_plugin(format!("Failed to write CRLF nudge: {e}"))
                                            })?;
                                            writer.flush().map_err(|e| {
                                                YubiKeyError::age_plugin(format!("Failed to flush CRLF nudge: {e}"))
                                            })?;
                                            log_sensitive!(dev_only: {

                                                debug!("📡 TRACER: Sent CRLF nudge #{}", touch_timeout_count / 3);

                                            });
                                        }

                                        // Check if process completed
                                        match child.try_wait() {
                                            Ok(Some(status)) => {
                                                log_sensitive!(dev_only: {

                                                    debug!("✅ TRACER: Process completed after touch! Status: {status:?}");

                                                });
                                                return Ok((status, output.clone()));
                                            }
                                            Ok(None) => {
                                                // Process still running, continue waiting
                                                if touch_start.elapsed() > Duration::from_secs(30) {
                                                    log_sensitive!(dev_only: {

                                                        debug!("⚠️  TRACER: Touch timeout after 30s - user may need to touch YubiKey");

                                                    });
                                                }
                                                continue;
                                            }
                                            Err(e) => {
                                                return Err(YubiKeyError::age_plugin(format!("Process wait error during touch: {e}")));
                                            }
                                        }
                                    }
                                    Ok(Ok(bytes_read)) => {
                                        // Got output during touch wait - this means touch completed!
                                        log_sensitive!(dev_only: {

                                            debug!("🎉 TRACER: TOUCH COMPLETED! Got output: '{}' ({} bytes)", line.trim(), bytes_read);

                                        });
                                        output.push_str(&line);
                                        break; // Exit touch-wait mode, return to normal processing
                                    }
                                    Ok(Err(e)) => {
                                        return Err(YubiKeyError::age_plugin(format!("Read error during touch wait: {e}")));
                                    }
                                    Err(_) => {
                                        // Timeout on read - continue waiting
                                        touch_timeout_count += 1;
                                        continue;
                                    }
                                }
                            }

                            // Continue with normal processing after touch completion
                            log_sensitive!(dev_only: {

                                debug!("🔄 TRACER: Resuming normal PTY processing after successful touch");

                            });
                            continue;
                        }

                        // Don't automatically send input on empty lines - this was causing premature newlines
                        // age-plugin-yubikey will handle touch detection internally
                        // We just need to keep the PTY loop alive until the process completes

                        // Log potential completion indicators
                        if line.contains("age1yubikey") || line.contains("Generated") || line.contains("Success") {
                            log_sensitive!(dev_only: {

                                debug!("🎉 TRACER: Potential completion detected: '{}'", line.trim());

                            });
                        }

                        // Log error indicators
                        if line.to_lowercase().contains("error") || line.to_lowercase().contains("failed") {
                            log_sensitive!(dev_only: {

                                debug!("❌ TRACER: Error detected: '{}'", line.trim());

                            });
                        }
                    }
                    Err(e) => {
                        log_sensitive!(dev_only: {

                            debug!("⚠️ TRACER: PTY read error: {e} - checking process status");

                        });
                        // IMPORTANT: Only return on read error if process is actually finished
                        // Don't close the connection prematurely due to temporary read issues
                        match child.try_wait() {
                            Ok(Some(status)) => {
                                log_sensitive!(dev_only: {

                                    debug!("✅ TRACER: Process finished after read error - status: {status:?}");

                                });
                                return Ok((status, output.clone()));
                            },
                            Ok(None) => {
                                log_sensitive!(dev_only: {

                                    debug!("⚠️ TRACER: Read error but process still running - this might be the issue!");

                                });
                                log_sensitive!(dev_only: {

                                    debug!("⚠️ TRACER: Treating as temporary error - waiting and continuing...");

                                });
                                tokio::time::sleep(Duration::from_millis(200)).await;
                                continue;  // Don't abort on read errors if process is still running
                            }
                            Err(wait_err) => {
                                log_sensitive!(dev_only: {

                                    debug!("❌ TRACER: Process error during read error handling: {wait_err}");

                                });
                                return Err(YubiKeyError::age_plugin(format!(
                                    "Process error: {wait_err}"
                                )))
                            }
                        }
                    }
                }
            }
        })
        .await;

        // Handle timeout and get final result
        let (status, full_output) = result.map_err(|_| {
            log_sensitive!(dev_only: {

                debug!(
                "⏰ TRACER: PTY operation TIMED OUT after {:?}",
                self.timeout
            );

            });
            log_sensitive!(dev_only: {

                debug!(
                "⏰ TRACER: Last output received: '{}'",
                output_for_timeout
                    .chars()
                    .rev()
                    .take(200)
                    .collect::<String>()
                    .chars()
                    .rev()
                    .collect::<String>()
            );

            });
            YubiKeyError::age_plugin("PTY operation timed out")
        })??;

        log_sensitive!(dev_only: {


            debug!(
            "🏁 TRACER: PTY finished - Status: {:?}, output length: {}",
            status,
            full_output.len()
        );


        });
        log_sensitive!(dev_only: {

            debug!(
            "🏁 TRACER: Final output: '{}'",
            full_output
                .chars()
                .rev()
                .take(500)
                .collect::<String>()
                .chars()
                .rev()
                .collect::<String>()
        );

        });

        if !status.success() {
            return Err(YubiKeyError::age_plugin(format!(
                "age-plugin-yubikey failed: {full_output}"
            )));
        }

        // age-plugin-yubikey typically outputs to stderr, but PTY combines streams
        // Return empty stdout and the output as stderr for compatibility with existing code
        Ok((String::new(), full_output))
    }

    /// Execute plugin with standard timeout
    async fn execute_plugin(&self, args: &[&str]) -> YubiKeyResult<(String, String)> {
        self.execute_plugin_with_pty(args, None).await
    }

    /// Execute plugin with interactive timeout for PIN/touch operations
    async fn execute_plugin_interactive(
        &self,
        args: &[&str],
        pin: Option<&str>,
    ) -> YubiKeyResult<(String, String)> {
        // Use longer timeout for interactive operations
        let provider = Self {
            plugin_path: self.plugin_path.clone(),
            timeout: INTERACTIVE_TIMEOUT,
        };
        provider.execute_plugin_with_pty(args, pin).await
    }

    /// Parse YubiKey recipients from plugin output (reuse AgePluginProvider's method)
    fn parse_recipients(&self, output: &str) -> YubiKeyResult<Vec<YubiRecipient>> {
        // Create temporary AgePluginProvider to reuse parsing logic
        let temp_provider = AgePluginProvider {
            plugin_path: self.plugin_path.clone(),
            timeout: self.timeout,
        };
        temp_provider.parse_recipients(output)
    }

    /// Create a temporary file for age operations (reuse AgePluginProvider's method)
    async fn create_temp_file(&self, content: &[u8]) -> YubiKeyResult<PathBuf> {
        let temp_provider = AgePluginProvider {
            plugin_path: self.plugin_path.clone(),
            timeout: self.timeout,
        };
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
            crate::key_management::yubikey::domain::models::policy_config::DEFAULT_PIN_POLICY.to_string();
        args.push(&pin_policy_str);

        // Set touch policy using centralized configuration
        args.push("--touch-policy");
        let touch_policy_str =
            crate::key_management::yubikey::domain::models::policy_config::DEFAULT_TOUCH_POLICY.to_string();
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

        // TODO: Consider PTY for age decryption as well if it needs PIN input
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

#[cfg(test)]
mod tests {
    use super::*;
    // std::path::Path removed - not used in these simplified tests

    #[test]
    fn test_recipient_metadata_parsing() {
        let provider = AgePluginProvider {
            plugin_path: PathBuf::from("test"),
            timeout: DEFAULT_TIMEOUT,
        };

        let metadata = "[Test Key] (Serial: 12345678, Slot: 9a)";
        let (label, serial, slot) = provider.parse_recipient_metadata(metadata).unwrap();

        assert_eq!(label, "Test Key");
        assert_eq!(serial, "12345678");
        assert_eq!(slot, 0x9a);
    }

    #[test]
    fn test_recipient_parsing() {
        let provider = AgePluginProvider {
            plugin_path: PathBuf::from("test"),
            timeout: DEFAULT_TIMEOUT,
        };

        let output = "age1yubikey112345678abcdef [My YubiKey] (Serial: 12345678, Slot: 9a)\n";
        let recipients = provider.parse_recipients(output).unwrap();

        assert_eq!(recipients.len(), 1);
        assert_eq!(recipients[0].label, "My YubiKey");
        assert_eq!(recipients[0].serial, "12345678");
        assert_eq!(recipients[0].slot, 0x9a);
    }

    #[tokio::test]
    async fn test_provider_creation() {
        // This test will fail if age-plugin-yubikey is not installed
        // but demonstrates the expected behavior
        match AgePluginProvider::new() {
            Ok(provider) => {
                assert!(provider.plugin_path.exists());
            }
            Err(YubiKeyError::age_plugin(msg)) => {
                assert!(msg.contains("age-plugin-yubikey binary not found"));
            }
            Err(e) => panic!("Unexpected error: {e:?}"),
        }
    }
}
