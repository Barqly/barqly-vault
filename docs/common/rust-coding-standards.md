# Rust Coding Standards

## Overview

This document defines the Rust coding standards for the Barqly Vault project. These standards ensure code quality, security, maintainability, and consistency across the backend codebase.

### Enforcement

All standards are enforced through tooling:
- **rustfmt**: Automatic code formatting
- **clippy**: Linting with security and performance checks
- **cargo test**: Test execution and coverage
- **CI/CD**: Automated validation on every commit

Run `make validate-rust` before committing to ensure compliance.

## 1. Idiomatic Rust Patterns

### 1.1 Ownership and Borrowing

#### Prefer Borrowing Over Cloning
```rust
//  Good: Borrow when possible
fn validate_path(path: &Path) -> Result<()> {
    if !path.exists() {
        return Err(FileOpsError::FileNotFound(path.to_string_lossy().to_string()));
    }
    Ok(())
}

// L Bad: Unnecessary clone
fn validate_path(path: PathBuf) -> Result<()> {
    if !path.exists() {
        return Err(FileOpsError::FileNotFound(path.to_string_lossy().to_string()));
    }
    Ok(())
}
```

#### Use Smart Pointers Appropriately
```rust
// Use Arc for shared ownership across threads
use std::sync::Arc;
let shared_config = Arc::new(config);

// Use Rc for single-threaded shared ownership
use std::rc::Rc;
let shared_state = Rc::new(state);

// Use Box for heap allocation without shared ownership
let large_data = Box::new(LargeStruct::new());
```

### 1.2 Error Handling

#### Always Use Result<T, E> for Fallible Operations
```rust
//  Good: Explicit error handling
pub fn encrypt_files(paths: Vec<PathBuf>, key: &PublicKey) -> Result<Vec<u8>, CryptoError> {
    // Implementation
}

// L Bad: Panic on error
pub fn encrypt_files(paths: Vec<PathBuf>, key: &PublicKey) -> Vec<u8> {
    // Implementation that might panic
}
```

#### Use thiserror for Custom Error Types
```rust
use thiserror::Error;

#[derive(Error, Debug)]
pub enum CryptoError {
    #[error("Invalid key format: {0}")]
    InvalidKeyFormat(String),
    
    #[error("Encryption failed: {0}")]
    EncryptionFailed(String),
    
    #[error("IO error: {0}")]
    IoError(#[from] std::io::Error),
}
```

#### Error Propagation Pattern
```rust
// Use ? operator for error propagation
pub fn process_file(path: &Path) -> Result<String, FileOpsError> {
    let content = std::fs::read_to_string(path)?;
    let processed = validate_content(&content)?;
    Ok(processed)
}

// Map errors when context is needed
pub fn load_key(path: &Path) -> Result<PrivateKey, CryptoError> {
    let key_data = std::fs::read(path)
        .map_err(|e| CryptoError::InvalidKeyFormat(format!("Failed to read key: {}", e)))?;
    parse_key(&key_data)
}
```

### 1.3 Pattern Matching

#### Exhaustive Matching
```rust
//  Good: Handle all cases explicitly
match operation {
    Operation::Encrypt { data, key } => encrypt(data, key),
    Operation::Decrypt { data, key } => decrypt(data, key),
    Operation::Verify { data, signature } => verify(data, signature),
}

// L Bad: Using wildcard when all cases should be handled
match operation {
    Operation::Encrypt { data, key } => encrypt(data, key),
    _ => Err(OperationError::NotImplemented),
}
```

#### Use if let for Single Pattern
```rust
//  Good: Simple pattern match
if let Some(key) = optional_key {
    process_key(&key)?;
}

// For error handling
if let Err(e) = validate_input(&input) {
    log::error!("Validation failed: {}", e);
    return Err(e.into());
}
```

### 1.4 Zero-Copy Operations

#### Use Borrowed Types in APIs
```rust
//  Good: Accept &str for string parameters
pub fn validate_label(label: &str) -> Result<(), ValidationError> {
    // Implementation
}

// L Bad: Force allocation
pub fn validate_label(label: String) -> Result<(), ValidationError> {
    // Implementation
}
```

#### Use Cow for Conditional Ownership
```rust
use std::borrow::Cow;

pub fn normalize_path(path: &str) -> Cow<str> {
    if path.contains("..") {
        Cow::Owned(path.replace("..", ""))
    } else {
        Cow::Borrowed(path)
    }
}
```

### 1.5 Memory Safety with Sensitive Data

#### Always Use Zeroize for Sensitive Data
```rust
use zeroize::{Zeroize, ZeroizeOnDrop};
use secrecy::{Secret, SecretString};

#[derive(Zeroize, ZeroizeOnDrop)]
pub struct SensitiveData {
    #[zeroize(skip)] // Only skip if truly necessary
    pub id: String,
    passphrase: Vec<u8>,
}

// Use SecretString for passwords
pub fn validate_passphrase(passphrase: SecretString) -> Result<(), CryptoError> {
    let exposed = passphrase.expose_secret();
    // Use exposed, it will be zeroized when dropped
}
```

## 2. Tauri-Specific Patterns

### 2.1 Command Architecture

#### Command Structure
```rust
// Commands should be in src/commands/ organized by domain
// Each command should:
// 1. Validate input
// 2. Perform operation with proper error handling
// 3. Return CommandResponse<T>

#[tauri::command]
pub async fn generate_key(
    label: String,
    passphrase: String,
) -> CommandResponse<KeyGenerationResponse> {
    // Input validation
    ValidationHelper::validate_key_label(&label)?;
    ValidationHelper::validate_passphrase_strength(&passphrase)?;
    
    // Wrap sensitive data
    let secret_passphrase = SecretString::from(passphrase);
    
    // Perform operation with error handling
    let handler = ErrorHandler::new();
    let keypair = handler.handle_operation_error(
        crypto::generate_keypair(),
        "Key generation",
        ErrorCode::EncryptionFailed,
    )?;
    
    // Store securely
    let stored_path = handler.handle_operation_error(
        storage::store_keypair(&label, &keypair, secret_passphrase),
        "Key storage",
        ErrorCode::StorageFailed,
    )?;
    
    Ok(KeyGenerationResponse {
        public_key: keypair.public_key.to_string(),
        key_label: label,
        stored_at: stored_path,
    })
}
```

### 2.2 Async/Await Best Practices

#### Use Async for I/O Operations
```rust
#[tauri::command]
pub async fn encrypt_files(
    file_paths: Vec<String>,
    recipient_key: String,
    app_handle: tauri::AppHandle,
) -> CommandResponse<EncryptionResult> {
    // Spawn blocking operations
    let encrypted_data = tokio::task::spawn_blocking(move || {
        // CPU-intensive encryption happens here
        crypto::encrypt_files(&file_paths, &recipient_key)
    })
    .await
    .map_err(|e| CommandError::operation(
        ErrorCode::EncryptionFailed,
        format!("Encryption task failed: {}", e)
    ))??;
    
    Ok(EncryptionResult {
        archive_path: encrypted_data.path,
        size: encrypted_data.size,
    })
}
```

### 2.3 State Management

#### Use Tauri State Safely
```rust
use tauri::State;
use std::sync::Mutex;

pub struct AppState {
    operations: Mutex<HashMap<String, OperationStatus>>,
}

#[tauri::command]
pub fn get_operation_status(
    operation_id: String,
    state: State<AppState>,
) -> CommandResponse<OperationStatus> {
    let operations = state.operations.lock()
        .map_err(|_| CommandError::operation(
            ErrorCode::InternalError,
            "Failed to acquire state lock"
        ))?;
    
    operations.get(&operation_id)
        .cloned()
        .ok_or_else(|| CommandError::not_found("Operation not found").into())
}
```

### 2.4 Error Serialization

#### Ensure Errors are Frontend-Friendly
```rust
// All errors must implement proper serialization
#[derive(Debug, Serialize, Deserialize)]
pub struct CommandError {
    pub code: ErrorCode,
    pub message: String,
    pub details: Option<String>,
    pub recovery_guidance: Option<String>,
    pub user_actionable: bool,
}

// Convert domain errors to command errors
impl From<CryptoError> for Box<CommandError> {
    fn from(err: CryptoError) -> Self {
        Box::new(match err {
            CryptoError::WrongPassphrase => CommandError::operation(
                ErrorCode::WrongPassphrase,
                "Incorrect passphrase"
            ).with_recovery_guidance("Please check your passphrase and try again"),
            _ => CommandError::operation(
                ErrorCode::EncryptionFailed,
                err.to_string()
            ),
        })
    }
}
```

## 3. Project Structure Standards

### 3.1 Module Organization

```
src-tauri/src/
   commands/           # Tauri command handlers
      mod.rs         # Public command exports
      types.rs       # Shared command types
      crypto_commands.rs
      file_commands.rs
      storage_commands.rs
   crypto/            # Encryption operations
      mod.rs         # Public crypto API
      errors.rs      # Crypto-specific errors
      key_mgmt.rs    # Key generation/management
      age_ops.rs     # Age encryption operations
   file_ops/          # File operations
      mod.rs         # Public file ops API
      errors.rs      # File operation errors
      archive.rs     # TAR archive operations
      manifest.rs    # Manifest generation
      staging.rs     # File staging operations
   storage/           # Persistent storage
      mod.rs         # Public storage API
      errors.rs      # Storage errors
      key_store.rs   # Key storage operations
      paths.rs       # Platform-specific paths
   logging/           # Application logging
       mod.rs         # Public logging API
       logger.rs      # Logger implementation
```

### 3.2 Public/Private API Boundaries

```rust
// In mod.rs files, explicitly control visibility

// Public API (consumed by commands)
pub use self::key_mgmt::{generate_keypair, validate_passphrase};
pub use self::age_ops::{encrypt_data, decrypt_data};
pub use self::errors::CryptoError;

// Keep implementation details private
mod key_mgmt;
mod age_ops;
mod errors;

// Use pub(crate) for cross-module internal APIs
pub(crate) fn internal_helper() -> Result<()> {
    // Only visible within crate
}
```

### 3.3 Feature Flags

```rust
// Define features in Cargo.toml
[features]
default = []
generate-types = []  # For TypeScript type generation
test-utils = []      # Test-only utilities

// Use conditional compilation
#[cfg(feature = "test-utils")]
pub mod test_utils {
    pub fn create_test_keypair() -> KeyPair {
        // Test implementation
    }
}

// Platform-specific code
#[cfg(target_os = "windows")]
fn get_app_data_dir() -> PathBuf {
    // Windows implementation
}

#[cfg(not(target_os = "windows"))]
fn get_app_data_dir() -> PathBuf {
    // Unix implementation
}
```

### 3.4 Test Organization

```rust
// Unit tests in same file
#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn test_key_generation() {
        let keypair = generate_keypair().unwrap();
        assert!(!keypair.public_key.as_str().is_empty());
    }
}

// Integration tests in tests/ directory
// tests/integration/crypto_integration.rs
use barqly_vault::crypto::{generate_keypair, encrypt_data};

#[test]
fn test_full_encryption_flow() {
    // Test complete encryption workflow
}
```

## 4. Code Style Guidelines

### 4.1 Naming Conventions

```rust
// Modules: snake_case
mod crypto_operations;

// Types: PascalCase
struct EncryptionConfig;
enum OperationStatus;
trait Encryptable;

// Functions and methods: snake_case
fn encrypt_file(path: &Path) -> Result<Vec<u8>>;

// Constants: SCREAMING_SNAKE_CASE
const MAX_FILE_SIZE: u64 = 100 * 1024 * 1024; // 100MB
const DEFAULT_BUFFER_SIZE: usize = 8192;

// Statics: SCREAMING_SNAKE_CASE
static ENCRYPTION_COUNTER: AtomicU64 = AtomicU64::new(0);
```

### 4.2 Import Organization

```rust
// Standard library imports first
use std::collections::HashMap;
use std::path::{Path, PathBuf};
use std::sync::Arc;

// External crate imports
use age::x25519::Identity;
use serde::{Deserialize, Serialize};
use tauri::State;
use thiserror::Error;

// Internal crate imports
use crate::crypto::{CryptoError, KeyPair};
use crate::storage::StorageError;

// Module imports
use super::types::CommandResponse;
```

### 4.3 Documentation Standards

```rust
//! Module-level documentation
//! 
//! This module handles all cryptographic operations for Barqly Vault.
//! It provides secure key generation, encryption, and decryption using
//! the age encryption standard.

/// Generate a new age keypair for encryption operations.
/// 
/// # Returns
/// 
/// Returns a `KeyPair` containing the public and private keys.
/// The private key is wrapped in `SecretString` for secure handling.
/// 
/// # Errors
/// 
/// Returns `CryptoError` if key generation fails.
/// 
/// # Example
/// 
/// ```no_run
/// use barqly_vault::crypto::generate_keypair;
/// 
/// let keypair = generate_keypair()?;
/// println!("Public key: {}", keypair.public_key.as_str());
/// ```
/// 
/// # Security
/// 
/// The private key material is automatically zeroized when dropped.
pub fn generate_keypair() -> Result<KeyPair, CryptoError> {
    // Implementation
}
```

### 4.4 Comments

```rust
// Use // for single-line comments explaining "why"
// Avoid obvious comments

//  Good: Explains reasoning
// Use constant-time comparison to prevent timing attacks
if constant_time_eq(&expected_hash, &computed_hash) {
    // Process valid data
}

// L Bad: States the obvious
// Increment counter
counter += 1;
```

### 4.5 Line Length and Formatting

```rust
// Maximum line length: 100 characters (enforced by rustfmt)
// Use rustfmt.toml for project-specific formatting

// Break long function signatures
pub fn encrypt_with_recipients(
    data: &[u8],
    recipients: &[PublicKey],
    config: EncryptionConfig,
) -> Result<EncryptedData, CryptoError> {
    // Implementation
}

// Chain method calls
let result = data.iter()
    .filter(|item| item.is_valid())
    .map(|item| item.process())
    .collect::<Result<Vec<_>, _>>()?;
```

## 5. Security-First Patterns

### 5.1 Constant-Time Operations

```rust
use constant_time_eq::constant_time_eq;

//  Good: Constant-time comparison for sensitive data
pub fn verify_passphrase(input: &[u8], expected: &[u8]) -> bool {
    constant_time_eq(input, expected)
}

// L Bad: Timing-vulnerable comparison
pub fn verify_passphrase(input: &[u8], expected: &[u8]) -> bool {
    input == expected
}
```

### 5.2 Secure Memory Handling

```rust
use zeroize::{Zeroize, ZeroizeOnDrop};
use secrecy::{Secret, SecretVec};

// Always zeroize sensitive data
#[derive(ZeroizeOnDrop)]
struct SensitiveBuffer {
    data: Vec<u8>,
}

// Use secrecy crate for automatic protection
pub fn process_password(password: SecretString) -> Result<()> {
    let exposed = password.expose_secret();
    // Password automatically zeroized when function returns
    validate_password_strength(exposed)?;
    Ok(())
}

// Clear buffers after use
pub fn encrypt_buffer(mut buffer: Vec<u8>, key: &Key) -> Result<Vec<u8>> {
    let encrypted = perform_encryption(&buffer, key)?;
    buffer.zeroize(); // Explicitly clear original data
    Ok(encrypted)
}
```

### 5.3 Input Validation

```rust
// Validate all external input
pub fn process_file_path(path: &str) -> Result<PathBuf, ValidationError> {
    // Prevent path traversal
    if path.contains("..") {
        return Err(ValidationError::InvalidPath("Path traversal detected"));
    }
    
    let path = PathBuf::from(path);
    
    // Verify path is under allowed directory
    let canonical = path.canonicalize()
        .map_err(|_| ValidationError::InvalidPath("Cannot resolve path"))?;
    
    if !canonical.starts_with(&allowed_base_path()) {
        return Err(ValidationError::InvalidPath("Path outside allowed directory"));
    }
    
    Ok(canonical)
}

// Validate data sizes
pub fn validate_file_size(size: u64) -> Result<(), ValidationError> {
    const MAX_SIZE: u64 = 100 * 1024 * 1024; // 100MB
    
    if size > MAX_SIZE {
        return Err(ValidationError::FileTooLarge(size, MAX_SIZE));
    }
    Ok(())
}
```

### 5.4 Secure Defaults

```rust
// Always use secure defaults
pub struct EncryptionConfig {
    // Private fields with secure defaults
    work_factor: u32,
}

impl Default for EncryptionConfig {
    fn default() -> Self {
        Self {
            work_factor: 19, // High work factor by default
        }
    }
}

// Builder pattern for explicit configuration
impl EncryptionConfig {
    pub fn builder() -> EncryptionConfigBuilder {
        EncryptionConfigBuilder::default()
    }
}
```

## 6. Performance Guidelines

### 6.1 Arc vs Rc Usage

```rust
// Use Arc for data shared across threads
use std::sync::Arc;

pub struct SharedState {
    config: Arc<Config>,
}

// Use Rc for single-threaded scenarios (rare in Tauri apps)
use std::rc::Rc;

#[cfg(not(feature = "multi-threaded"))]
pub struct LocalState {
    cache: Rc<Cache>,
}
```

### 6.2 String vs &str

```rust
// Accept &str in function parameters
pub fn validate_input(input: &str) -> Result<()> {
    // Implementation
}

// Return String when ownership is needed
pub fn generate_id() -> String {
    uuid::Uuid::new_v4().to_string()
}

// Use Cow for conditional ownership
use std::borrow::Cow;

pub fn normalize_string(s: &str) -> Cow<str> {
    if s.chars().all(|c| c.is_ascii()) {
        Cow::Borrowed(s)
    } else {
        Cow::Owned(s.to_ascii_lowercase())
    }
}
```

### 6.3 Collection Guidelines

```rust
// Choose collections based on use case

// Vec for ordered data
let files: Vec<PathBuf> = collect_files()?;

// HashMap for key-value lookups
let cache: HashMap<String, CachedData> = HashMap::new();

// BTreeMap when ordering matters
let sorted_entries: BTreeMap<String, Entry> = BTreeMap::new();

// HashSet for unique values
let unique_keys: HashSet<PublicKey> = HashSet::new();

// Pre-allocate when size is known
let mut buffer = Vec::with_capacity(EXPECTED_SIZE);
```

### 6.4 Async Best Practices

```rust
// Don't block the async runtime
#[tauri::command]
pub async fn heavy_computation(data: Vec<u8>) -> Result<String> {
    // Move CPU-intensive work to blocking thread
    let result = tokio::task::spawn_blocking(move || {
        perform_heavy_computation(&data)
    }).await?;
    
    Ok(result)
}

// Use async I/O operations
pub async fn read_large_file(path: PathBuf) -> Result<Vec<u8>> {
    tokio::fs::read(path).await
        .map_err(|e| FileOpsError::IoError(e))
}

// Avoid unnecessary async
//  Good: Synchronous for CPU-bound operations
pub fn calculate_hash(data: &[u8]) -> String {
    // Direct computation
}

// L Bad: Async for non-I/O operations
pub async fn calculate_hash(data: &[u8]) -> String {
    // Unnecessary async
}
```

### 6.5 Resource Cleanup

```rust
// Use RAII patterns
pub struct TempDirectory {
    path: PathBuf,
}

impl Drop for TempDirectory {
    fn drop(&mut self) {
        let _ = std::fs::remove_dir_all(&self.path);
    }
}

// Use defer pattern for cleanup
pub fn process_with_cleanup() -> Result<()> {
    let _guard = CleanupGuard::new(|| {
        // Cleanup code runs when guard is dropped
    });
    
    // Main processing
    risky_operation()?;
    
    Ok(())
}

// Explicit resource management
pub async fn process_archive(path: &Path) -> Result<()> {
    let file = tokio::fs::File::open(path).await?;
    let mut archive = Archive::new(file);
    
    // Process archive
    
    // Explicit cleanup
    archive.finish().await?;
    Ok(())
}
```

## Enforcement and Tooling

### Required Tools

1. **rustfmt** - Automatic formatting
   ```bash
   cargo fmt --all -- --check  # CI check
   cargo fmt --all             # Auto-fix
   ```

2. **clippy** - Linting with security focus
   ```bash
   cargo clippy --all-targets --all-features -- -D warnings
   ```

3. **cargo-audit** - Security vulnerability scanning
   ```bash
   cargo audit
   ```

### Recommended clippy.toml

```toml
# Warn on all pedantic lints
warn = ["clippy::pedantic"]

# Deny security-critical lints
deny = [
    "clippy::mem_forget",
    "clippy::cast_ptr_alignment",
    "clippy::cast_possible_truncation",
    "clippy::integer_overflow",
]

# Allow some pedantic lints
allow = [
    "clippy::module_name_repetitions",
    "clippy::must_use_candidate",
]
```

### Pre-commit Validation

Run before every commit:
```bash
make validate-rust
```

This runs:
- `cargo fmt --check`
- `cargo clippy --all-targets --all-features -- -D warnings`
- `cargo test`

## Summary

These standards ensure:
1. **Security**: Memory safety, secure defaults, input validation
2. **Performance**: Efficient resource usage, appropriate async
3. **Maintainability**: Clear structure, comprehensive documentation
4. **Consistency**: Enforced through tooling

All code must pass `make validate-rust` before merge.