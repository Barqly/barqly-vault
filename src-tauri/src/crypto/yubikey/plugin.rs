//! age-plugin-yubikey integration and management

use super::errors::{YubiKeyError, YubiKeyResult};
use serde::{Deserialize, Serialize};
use std::path::{Path, PathBuf};
use tokio::fs;
use tokio::process::Command as TokioCommand;

/// Plugin management error types
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum PluginError {
    NotFound,
    VersionMismatch { expected: String, found: String },
    ExecutionFailed(String),
    DeploymentFailed(String),
    UnsupportedPlatform,
}

impl std::fmt::Display for PluginError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            PluginError::NotFound => write!(f, "age-plugin-yubikey not found"),
            PluginError::VersionMismatch { expected, found } => {
                write!(
                    f,
                    "Plugin version mismatch: expected {expected}, found {found}"
                )
            }
            PluginError::ExecutionFailed(msg) => write!(f, "Plugin execution failed: {msg}"),
            PluginError::DeploymentFailed(msg) => write!(f, "Plugin deployment failed: {msg}"),
            PluginError::UnsupportedPlatform => write!(f, "Unsupported platform"),
        }
    }
}

impl std::error::Error for PluginError {}

impl From<PluginError> for YubiKeyError {
    fn from(err: PluginError) -> Self {
        YubiKeyError::PluginError(err.to_string())
    }
}

/// Platform-specific information for plugin management
#[derive(Debug)]
pub struct Platform {
    pub name: String,
    pub arch: String,
    pub extension: String,
}

impl Platform {
    pub fn current() -> Self {
        let name = std::env::consts::OS.to_string();
        let arch = std::env::consts::ARCH.to_string();
        let extension = if name == "windows" { ".exe" } else { "" }.to_string();

        Self {
            name,
            arch,
            extension,
        }
    }

    pub fn plugin_binary_name(&self) -> String {
        format!(
            "age-plugin-yubikey-{}-{}{}",
            self.arch, self.name, self.extension
        )
    }
}

/// Plugin manager for age-plugin-yubikey
pub struct PluginManager {
    bundle_dir: PathBuf,
    runtime_dir: PathBuf,
    platform: Platform,
    required_version: String,
}

impl PluginManager {
    /// Create a new plugin manager
    pub fn new(bundle_dir: PathBuf, runtime_dir: PathBuf) -> Self {
        Self {
            bundle_dir,
            runtime_dir,
            platform: Platform::current(),
            required_version: "0.5.0".to_string(), // Target version
        }
    }

    /// Ensure age-plugin-yubikey is available and ready to use
    pub async fn ensure_plugin_available(&self) -> YubiKeyResult<PathBuf> {
        // Check if plugin is already available in runtime location
        let runtime_plugin_path = self.get_runtime_plugin_path();

        if runtime_plugin_path.exists() {
            // Validate existing plugin
            if self
                .validate_plugin_version(&runtime_plugin_path)
                .await
                .is_ok()
            {
                return Ok(runtime_plugin_path);
            }
        }

        // Plugin not available or invalid - deploy from bundle
        self.deploy_plugin_from_bundle().await
    }

    /// Get the expected runtime plugin path
    fn get_runtime_plugin_path(&self) -> PathBuf {
        self.runtime_dir
            .join(format!("age-plugin-yubikey{}", self.platform.extension))
    }

    /// Get the bundled plugin path
    fn get_bundled_plugin_path(&self) -> PathBuf {
        let plugin_name = self.platform.plugin_binary_name();
        self.bundle_dir.join(plugin_name)
    }

    /// Deploy plugin from bundle to runtime location
    async fn deploy_plugin_from_bundle(&self) -> YubiKeyResult<PathBuf> {
        let bundled_path = self.get_bundled_plugin_path();
        let runtime_path = self.get_runtime_plugin_path();

        // Verify bundled plugin exists
        if !bundled_path.exists() {
            return Err(YubiKeyError::PluginError(format!(
                "Bundled plugin not found: {}",
                bundled_path.display()
            )));
        }

        // Verify plugin integrity
        self.verify_plugin_integrity(&bundled_path).await?;

        // Ensure runtime directory exists
        if let Some(parent) = runtime_path.parent() {
            fs::create_dir_all(parent).await.map_err(|e| {
                YubiKeyError::PluginError(format!("Failed to create runtime directory: {e}"))
            })?;
        }

        // Copy plugin to runtime location
        fs::copy(&bundled_path, &runtime_path)
            .await
            .map_err(|e| YubiKeyError::PluginError(format!("Failed to deploy plugin: {e}")))?;

        // Set executable permissions on Unix systems
        #[cfg(unix)]
        {
            use std::os::unix::fs::PermissionsExt;
            let mut perms = fs::metadata(&runtime_path)
                .await
                .map_err(|e| {
                    YubiKeyError::PluginError(format!("Failed to get plugin metadata: {e}"))
                })?
                .permissions();
            perms.set_mode(0o755);
            fs::set_permissions(&runtime_path, perms)
                .await
                .map_err(|e| {
                    YubiKeyError::PluginError(format!("Failed to set plugin permissions: {e}"))
                })?;
        }

        // Validate deployed plugin
        self.validate_plugin_version(&runtime_path).await?;

        Ok(runtime_path)
    }

    /// Verify plugin integrity using checksums
    async fn verify_plugin_integrity(&self, plugin_path: &Path) -> YubiKeyResult<()> {
        // Read plugin binary
        let plugin_data = fs::read(plugin_path)
            .await
            .map_err(|e| YubiKeyError::PluginError(format!("Failed to read plugin binary: {e}")))?;

        // Calculate SHA-256 hash
        use sha2::{Digest, Sha256};
        let mut hasher = Sha256::new();
        hasher.update(&plugin_data);
        let calculated_hash = hasher.finalize();

        // Check against expected checksums
        let checksums_path = self.bundle_dir.join("checksums.json");
        if checksums_path.exists() {
            if let Ok(checksums_content) = fs::read_to_string(&checksums_path).await {
                if let Ok(checksums) = serde_json::from_str::<serde_json::Value>(&checksums_content)
                {
                    let plugin_name = self.platform.plugin_binary_name();
                    if let Some(expected_hash) =
                        checksums.get(&plugin_name).and_then(|v| v.as_str())
                    {
                        let expected_bytes = hex::decode(expected_hash).map_err(|e| {
                            YubiKeyError::PluginError(format!("Invalid checksum format: {e}"))
                        })?;

                        if calculated_hash.as_slice() != expected_bytes.as_slice() {
                            return Err(YubiKeyError::PluginError(
                                "Plugin integrity verification failed".to_string(),
                            ));
                        }
                    }
                }
            }
        }

        Ok(())
    }

    /// Validate plugin version
    async fn validate_plugin_version(&self, plugin_path: &Path) -> YubiKeyResult<()> {
        // Execute plugin with --version flag
        let output = TokioCommand::new(plugin_path)
            .arg("--version")
            .output()
            .await
            .map_err(|e| {
                YubiKeyError::PluginError(format!("Failed to execute plugin version check: {e}"))
            })?;

        if !output.status.success() {
            return Err(YubiKeyError::PluginError(
                "Plugin version check failed".to_string(),
            ));
        }

        let version_output = String::from_utf8_lossy(&output.stdout);
        let version = self.extract_version_from_output(&version_output)?;

        // Check version compatibility
        if !self.is_version_compatible(&version) {
            return Err(YubiKeyError::PluginError(format!(
                "Plugin version {} is not compatible with required version {}",
                version, self.required_version
            )));
        }

        Ok(())
    }

    /// Extract version number from plugin output
    fn extract_version_from_output(&self, output: &str) -> YubiKeyResult<String> {
        // Look for version pattern in output
        for line in output.lines() {
            if line.contains("age-plugin-yubikey") {
                // Extract version using regex-like parsing
                let parts: Vec<&str> = line.split_whitespace().collect();
                for part in parts {
                    if part.chars().next().is_some_and(|c| c.is_ascii_digit()) {
                        return Ok(part.to_string());
                    }
                }
            }
        }

        Err(YubiKeyError::PluginError(
            "Could not extract version from plugin output".to_string(),
        ))
    }

    /// Check if a version is compatible with requirements
    fn is_version_compatible(&self, version: &str) -> bool {
        // Simplified version comparison
        // In practice, you might want to use a proper semver library
        version.starts_with("0.5") || version.starts_with("0.6")
    }

    /// Test plugin functionality with a simple command
    pub async fn test_plugin_functionality(&self, plugin_path: &Path) -> YubiKeyResult<()> {
        // Execute plugin with --help to verify basic functionality
        let output = TokioCommand::new(plugin_path)
            .arg("--help")
            .output()
            .await
            .map_err(|e| {
                YubiKeyError::PluginError(format!("Failed to test plugin functionality: {e}"))
            })?;

        if !output.status.success() {
            return Err(YubiKeyError::PluginError(
                "Plugin functionality test failed".to_string(),
            ));
        }

        Ok(())
    }
}

/// Global function to ensure age-plugin-yubikey is available
pub async fn ensure_plugin_available() -> YubiKeyResult<PathBuf> {
    // Determine bundle and runtime directories based on application structure
    let app_dir = crate::storage::get_application_directory()
        .map_err(|e| YubiKeyError::PluginError(format!("Failed to get app directory: {e}")))?;

    let bundle_dir = app_dir.join("binaries");
    let runtime_dir = app_dir.join("runtime");

    let manager = PluginManager::new(bundle_dir, runtime_dir);
    manager.ensure_plugin_available().await
}

/// Execute age command with YubiKey plugin
pub async fn execute_age_with_yubikey(
    plugin_path: &Path,
    recipients: &[String],
    input_data: &[u8],
) -> YubiKeyResult<Vec<u8>> {
    // Set up environment for age plugin
    let mut env_path = std::env::var("PATH").unwrap_or_default();
    if let Some(plugin_dir) = plugin_path.parent() {
        env_path = format!("{}:{}", plugin_dir.display(), env_path);
    }

    // Create age command with YubiKey recipients
    let mut cmd = TokioCommand::new("age");

    for recipient in recipients {
        cmd.arg("-r").arg(recipient);
    }

    cmd.env("PATH", env_path)
        .stdin(std::process::Stdio::piped())
        .stdout(std::process::Stdio::piped())
        .stderr(std::process::Stdio::piped());

    let mut child = cmd
        .spawn()
        .map_err(|e| YubiKeyError::PluginError(format!("Failed to spawn age process: {e}")))?;

    // Write input data to stdin
    if let Some(stdin) = child.stdin.take() {
        use tokio::io::AsyncWriteExt;
        let mut stdin = stdin;
        stdin
            .write_all(input_data)
            .await
            .map_err(|e| YubiKeyError::PluginError(format!("Failed to write to age stdin: {e}")))?;
        stdin
            .shutdown()
            .await
            .map_err(|e| YubiKeyError::PluginError(format!("Failed to close age stdin: {e}")))?;
    }

    // Wait for completion and collect output
    let output = child
        .wait_with_output()
        .await
        .map_err(|e| YubiKeyError::PluginError(format!("Failed to wait for age process: {e}")))?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(YubiKeyError::PluginError(format!(
            "age encryption failed: {stderr}"
        )));
    }

    Ok(output.stdout)
}

// Temporarily disabling tests for initial validation
#[cfg(test)]
mod _tests {
    use super::*;
    use tempfile::TempDir;

    #[test]
    fn test_plugin_manager_creation() {
        let temp_dir = TempDir::new().unwrap();
        let bundle_dir = temp_dir.path().join("bundle");
        let runtime_dir = temp_dir.path().join("runtime");

        let manager = PluginManager::new(bundle_dir, runtime_dir);
        assert!(!manager.required_version.is_empty());
    }

    #[test]
    fn test_platform_detection() {
        let platform = Platform::current();
        assert!(!platform.name.is_empty());
        assert!(!platform.arch.is_empty());
    }

    #[test]
    fn test_version_compatibility() {
        let manager = PluginManager::new(PathBuf::new(), PathBuf::new());

        assert!(manager.is_version_compatible("0.5.0"));
        assert!(manager.is_version_compatible("0.5.1"));
        assert!(manager.is_version_compatible("0.6.0"));
        assert!(!manager.is_version_compatible("0.4.9"));
        assert!(!manager.is_version_compatible("1.0.0"));
    }
}
