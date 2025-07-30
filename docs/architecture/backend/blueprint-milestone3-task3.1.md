# Technical Blueprint: Tauri Commands Bridge (Task 3.1)

## Task Overview

The Tauri Commands Bridge provides the secure interface between the frontend application and the core Rust modules. This task implements type-safe command handlers that expose crypto, storage, and file operations functionality while maintaining security boundaries and providing comprehensive error handling.

### Specific Functionality to Implement

1. **Command Handler Infrastructure**: Base types and patterns for all commands
2. **Crypto Commands**: Key generation, encryption, decryption operations
3. **Storage Commands**: Key management and configuration operations
4. **File Operations Commands**: File selection, archiving, manifest operations
5. **Progress Reporting**: Streaming updates for long-running operations
6. **Error Translation**: Convert Rust errors to user-friendly messages

### Success Criteria

- All core module functions exposed through commands
- Type-safe interfaces with TypeScript definitions
- Comprehensive input validation on all commands
- Progress reporting for operations >1 second
- User-friendly error messages for all failure cases
- Zero security vulnerabilities in command layer

### Performance Requirements

- Command overhead: <10ms for validation and routing
- Progress updates: At least every 100ms for long operations
- Memory usage: Streaming for large files (no full loading)
- Concurrent commands: Support parallel non-conflicting operations

## Implementation Specification

### Command Infrastructure

```rust
// src-tauri/src/commands/types.rs

/// Standard command response wrapper
#[derive(Debug, Serialize, Deserialize)]
#[serde(tag = "status", content = "data")]
pub enum CommandResult<T> {
    Success(T),
    Error(CommandError),
}

/// Unified error type for all commands
#[derive(Debug, Serialize, Deserialize)]
pub struct CommandError {
    pub code: ErrorCode,
    pub message: String,
    pub details: Option<String>,
}

/// Error codes for client-side handling
#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum ErrorCode {
    // Validation errors
    InvalidInput,
    MissingParameter,
    InvalidPath,
    
    // Permission errors
    PermissionDenied,
    PathNotAllowed,
    
    // Not found errors
    KeyNotFound,
    FileNotFound,
    
    // Operation errors
    EncryptionFailed,
    DecryptionFailed,
    StorageFailed,
    
    // Internal errors
    InternalError,
}

/// Progress update for streaming operations
#[derive(Debug, Serialize, Deserialize)]
pub struct ProgressUpdate {
    pub operation_id: String,
    pub progress: f32, // 0.0 to 1.0
    pub message: String,
    pub details: Option<ProgressDetails>,
}

/// Trait for validatable command inputs
pub trait ValidateInput {
    fn validate(&self) -> Result<(), CommandError>;
}
```

### Crypto Commands Interface

```rust
// src-tauri/src/commands/crypto_commands.rs

/// Input for key generation command
#[derive(Debug, Deserialize)]
pub struct GenerateKeyInput {
    pub label: String,
    pub passphrase: String,
}

/// Response from key generation
#[derive(Debug, Serialize)]
pub struct GenerateKeyResponse {
    pub public_key: String,
    pub key_id: String,
    pub saved_path: String,
}

/// Generate a new encryption keypair
#[tauri::command]
pub async fn generate_key(
    input: GenerateKeyInput,
    state: State<'_, AppState>,
) -> CommandResult<GenerateKeyResponse>;

/// Encrypt files with progress streaming
#[tauri::command]
pub async fn encrypt_data(
    input: EncryptDataInput,
    window: tauri::Window,
    state: State<'_, AppState>,
) -> CommandResult<String>;

/// Decrypt files with progress streaming
#[tauri::command]
pub async fn decrypt_data(
    input: DecryptDataInput,
    window: tauri::Window,
    state: State<'_, AppState>,
) -> CommandResult<DecryptionResult>;
```

### Storage Commands Interface

```rust
// src-tauri/src/commands/storage_commands.rs

/// List all available keys
#[tauri::command]
pub async fn list_keys(
    state: State<'_, AppState>,
) -> CommandResult<Vec<KeyMetadata>>;

/// Delete a key by ID
#[tauri::command]
pub async fn delete_key(
    key_id: String,
    state: State<'_, AppState>,
) -> CommandResult<()>;

/// Get/update application configuration
#[tauri::command]
pub async fn get_config(
    state: State<'_, AppState>,
) -> CommandResult<AppConfig>;

#[tauri::command]
pub async fn update_config(
    config: AppConfigUpdate,
    state: State<'_, AppState>,
) -> CommandResult<()>;
```

### File Operations Commands Interface

```rust
// src-tauri/src/commands/file_commands.rs

/// Select files or folder for encryption
#[tauri::command]
pub async fn select_files(
    selection_type: SelectionType,
    window: tauri::Window,
) -> CommandResult<FileSelection>;

/// Get file/folder information
#[tauri::command]
pub async fn get_file_info(
    paths: Vec<String>,
    state: State<'_, AppState>,
) -> CommandResult<Vec<FileInfo>>;

/// Create manifest for file set
#[tauri::command]
pub async fn create_manifest(
    file_paths: Vec<String>,
    state: State<'_, AppState>,
) -> CommandResult<Manifest>;
```

### Error Handling Strategy

| Scenario | Error Code | User Message |
|----------|------------|--------------|
| Invalid key label | `INVALID_INPUT` | "Key label can only contain letters, numbers, and dashes" |
| Weak passphrase | `INVALID_INPUT` | "Passphrase must be at least 12 characters" |
| Key not found | `KEY_NOT_FOUND` | "No key found with that name" |
| Decryption failed | `DECRYPTION_FAILED` | "Unable to decrypt file. Wrong key or corrupted file" |
| Path traversal | `PATH_NOT_ALLOWED` | "Selected path is not allowed" |

### TypeScript Integration

```typescript
// src-ui/src/types/commands.ts

// Command result wrapper
export type CommandResult<T> = 
  | { status: 'success'; data: T }
  | { status: 'error'; data: CommandError };

// Command invocation pattern
export async function invokeCommand<T>(
  cmd: string,
  args?: any
): Promise<T> {
  const result = await invoke<CommandResult<T>>(cmd, args);
  
  if (result.status === 'error') {
    throw new CommandError(result.data);
  }
  
  return result.data;
}
```

## Progress Reporting

### Event-Based Progress Updates

```typescript
// Listen for progress events
const unlisten = await listen<ProgressUpdate>('progress', (event) => {
  updateProgress(event.payload);
});

// Cleanup when done
unlisten();
```

### Progress Event Flow

1. Long operations spawn async tasks
2. Tasks emit progress via `window.emit()`
3. Frontend subscribes to progress events
4. UI updates based on progress data
5. Completion/error events end the flow

## Security Considerations

### Input Validation
- All paths canonicalized and validated
- Labels restricted to safe characters
- File sizes checked before processing
- Concurrent operation limits enforced

### Memory Safety
- Passphrases cleared after use
- Large files streamed, not loaded
- Sensitive data never logged
- Proper error boundaries

## Testing Strategy

### Unit Tests
- Validate each command handler
- Test input validation logic
- Verify error code mapping
- Check progress event emission

### Integration Tests
- Full command flow testing
- Progress event verification
- Error propagation validation
- State management integration

### Security Tests
- Path traversal attempts
- Input injection tests
- Resource exhaustion checks
- Concurrent access validation

## Dependencies and Constraints

### External Dependencies

```toml
[dependencies]
tauri = { version = "2", features = ["api-all"] }
serde = { version = "1", features = ["derive"] }
serde_json = "1"
tokio = { version = "1", features = ["full"] }
```

### Design Constraints

- Commands must be stateless
- All operations async
- Errors must map to user-friendly messages
- Progress required for operations >1s

---

*This blueprint defines the Tauri Commands Bridge architecture. Implementation details are left to the engineer's discretion while following these specifications.* 