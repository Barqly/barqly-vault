# API Interfaces - Backend

> **New to the team?** Start with the [UX Engineer Onboarding Guide](./UX-Engineer-Onboarding.md) for a complete introduction.

## Overview

This document provides comprehensive documentation for the Barqly Vault backend API interfaces available to the frontend. All interfaces are automatically generated from Rust types to ensure type safety and consistency.

## Architecture Principles

### **Source-First Documentation**

- **Single Source of Truth**: All interfaces defined in Rust source code
- **Automatic Generation**: TypeScript definitions generated during build
- **Type Safety**: Frontend builds against generated interfaces
- **Consistency**: Documentation always matches implementation

### **Command-Only Access Pattern**

- **UI Interface**: Only Tauri commands are public to the frontend
- **Internal Modules**: All other modules are private implementation details
- **Clean Separation**: Clear boundary between UI and backend logic

### **Error Handling Strategy**

- **Unified Error Types**: All commands use `CommandError` with structured information
- **User-Friendly Messages**: Errors include recovery guidance and actionable information
- **Programmatic Handling**: Error codes enable client-side error handling

## Generated TypeScript Definitions

### **Location**

TypeScript definitions are automatically generated during build:

```
src-tauri/target/debug/build/barqly-vault-*/out/generated/types.ts
```

### **Generation**

```bash
# Generate TypeScript definitions
cargo build --features generate-types
```

### **Usage in Frontend**

```typescript
import { invokeCommand, CommandError, ErrorCode } from "./generated/types";

// Use the generated types for type safety
const result = await invokeCommand<GenerateKeyResponse>("generate_key", {
  label: "My Key",
  passphrase: "secure-passphrase",
});
```

## Core Types

### **Command Response Pattern**

All commands follow a consistent response pattern:

```typescript
// Success case
{
  status: "success";
  data: T;
}

// Error case
{
  status: "error";
  data: CommandError;
}
```

### **Error Handling**

```typescript
interface CommandError {
  code: ErrorCode; // Programmatic error code
  message: string; // User-friendly message
  details?: string; // Technical details for debugging
  recovery_guidance?: string; // Suggested user actions
  user_actionable: boolean; // Whether user can resolve
  trace_id?: string; // Debugging trace ID
  span_id?: string; // Debugging span ID
}
```

### **Progress Tracking**

```typescript
interface ProgressUpdate {
  operation_id: string;
  progress: number; // 0.0 to 1.0
  message: string; // Human-readable status
  details?: ProgressDetails; // Operation-specific details
  timestamp: string; // ISO 8601
  estimated_time_remaining?: number; // seconds
}
```

## Crypto Commands

### **1. Key Generation**

```typescript
// Generate a new encryption keypair
generate_key(input: GenerateKeyInput): Promise<CommandResponse<GenerateKeyResponse>>

interface GenerateKeyInput {
  label: string;        // Key label/name
  passphrase: string;   // Encryption passphrase
}

interface GenerateKeyResponse {
  public_key: string;   // Public key for sharing
  key_id: string;       // Unique key identifier
  saved_path: string;   // Where key was saved
}
```

### **2. Passphrase Validation**

```typescript
// Validate passphrase strength
validate_passphrase(input: ValidatePassphraseInput): Promise<CommandResponse<ValidatePassphraseResponse>>

interface ValidatePassphraseInput {
  passphrase: string;
}

interface ValidatePassphraseResponse {
  is_valid: boolean;
  message: string;
}
```

### **3. Data Encryption**

```typescript
// Encrypt files with a public key
encrypt_files(input: EncryptDataInput): Promise<CommandResponse<string>>

interface EncryptDataInput {
  key_id: string;           // Key to use for encryption
  file_paths: string[];     // Files to encrypt
  output_name?: string;     // Optional output name
}
```

### **4. Data Decryption**

```typescript
// Decrypt files with a private key
decrypt_data(input: DecryptDataInput): Promise<CommandResponse<DecryptionResult>>

interface DecryptDataInput {
  encrypted_file: string;   // Encrypted file to decrypt
  key_id: string;           // Key to use for decryption
  passphrase: string;       // Key passphrase
  output_dir: string;       // Where to extract files
}

interface DecryptionResult {
  extracted_files: string[]; // List of extracted files
  output_dir: string;        // Directory where files were extracted
  manifest_verified: boolean; // Whether manifest was verified
}
```

### **5. Encryption Status**

```typescript
// Get status of encryption operation
get_encryption_status(input: GetEncryptionStatusInput): Promise<CommandResponse<EncryptionStatusResponse>>

interface GetEncryptionStatusInput {
  operation_id: string;
}

interface EncryptionStatusResponse {
  operation_id: string;
  status: EncryptionStatus;
  progress_percentage: number;
  current_file?: string;
  total_files: number;
  processed_files: number;
  total_size: number;
  processed_size: number;
  estimated_time_remaining?: number;
  error_message?: string;
}

enum EncryptionStatus {
  PENDING = 'Pending',
  IN_PROGRESS = 'InProgress',
  COMPLETED = 'Completed',
  FAILED = 'Failed',
  CANCELLED = 'Cancelled',
}
```

### **6. Progress Tracking**

```typescript
// Get progress of any operation
get_progress(input: GetProgressInput): Promise<CommandResponse<GetProgressResponse>>

interface GetProgressInput {
  operation_id: string;
}

interface GetProgressResponse {
  operation_id: string;
  progress: number;
  message: string;
  details?: ProgressDetails;
  timestamp: string;
  estimated_time_remaining?: number;
  is_complete: boolean;
}
```

### **7. Manifest Verification**

```typescript
// Verify extracted files against manifest
verify_manifest(input: VerifyManifestInput): Promise<CommandResponse<VerifyManifestResponse>>

interface VerifyManifestInput {
  manifest_path: string;        // Path to manifest file
  extracted_files_dir: string;  // Directory with extracted files
}

interface VerifyManifestResponse {
  is_valid: boolean;
  message: string;
  file_count: number;
  total_size: number;
}
```

## Storage Commands

### **1. Key Management**

```typescript
// List all available keys
list_keys(): Promise<CommandResponse<KeyMetadata[]>>

interface KeyMetadata {
  label: string;
  created_at: string;
  public_key?: string;
}

// Delete a key
delete_key(key_id: string): Promise<CommandResponse<() => void>>
```

### **2. Configuration**

```typescript
// Get application configuration
get_config(): Promise<CommandResponse<AppConfig>>

interface AppConfig {
  version: string;
  default_key_label?: string;
  remember_last_folder: boolean;
  max_recent_files: number;
}

// Update application configuration
update_config(updates: AppConfigUpdate): Promise<CommandResponse<AppConfig>>

interface AppConfigUpdate {
  default_key_label?: string;
  remember_last_folder?: boolean;
  max_recent_files?: number;
}
```

## File Commands

### **1. File Selection**

```typescript
// Select files or folders for encryption
select_files(selection_type: SelectionType): Promise<CommandResponse<FileSelection>>

enum SelectionType {
  FILES = 'Files',
  FOLDER = 'Folder',
}

interface FileSelection {
  paths: string[];
  total_size: number;
  file_count: number;
  selection_type: string;
}
```

### **2. File Information**

```typescript
// Get information about a file
get_file_info(file_path: string): Promise<CommandResponse<FileInfo>>

interface FileInfo {
  path: string;
  name: string;
  size: number;
  is_file: boolean;
  is_directory: boolean;
}
```

### **3. Manifest Operations**

```typescript
// Create manifest for files
create_manifest(file_paths: string[]): Promise<CommandResponse<Manifest>>

interface Manifest {
  version: string;
  created_at: string;
  files: FileInfo[];
  total_size: number;
  file_count: number;
}
```

## Error Codes

### **Validation Errors**

- `INVALID_INPUT` - General input validation failure
- `MISSING_PARAMETER` - Required parameter not provided
- `INVALID_PATH` - Invalid file or directory path
- `INVALID_KEY_LABEL` - Invalid key label format
- `WEAK_PASSPHRASE` - Passphrase doesn't meet strength requirements
- `INVALID_FILE_FORMAT` - Unsupported file format
- `FILE_TOO_LARGE` - File exceeds size limits
- `TOO_MANY_FILES` - Too many files selected

### **Permission Errors**

- `PERMISSION_DENIED` - Insufficient permissions
- `PATH_NOT_ALLOWED` - Path not allowed by security policy
- `INSUFFICIENT_PERMISSIONS` - More specific permission error
- `READ_ONLY_FILE_SYSTEM` - File system is read-only

### **Not Found Errors**

- `KEY_NOT_FOUND` - Encryption key not found
- `FILE_NOT_FOUND` - File doesn't exist
- `DIRECTORY_NOT_FOUND` - Directory doesn't exist
- `OPERATION_NOT_FOUND` - Operation ID not found

### **Operation Errors**

- `ENCRYPTION_FAILED` - Encryption operation failed
- `DECRYPTION_FAILED` - Decryption operation failed
- `STORAGE_FAILED` - Storage operation failed
- `ARCHIVE_CORRUPTED` - Archive file is corrupted
- `MANIFEST_INVALID` - Manifest file is invalid
- `INTEGRITY_CHECK_FAILED` - Data integrity check failed
- `CONCURRENT_OPERATION` - Concurrent operation conflict

### **Resource Errors**

- `DISK_SPACE_INSUFFICIENT` - Not enough disk space
- `MEMORY_INSUFFICIENT` - Not enough memory
- `FILE_SYSTEM_ERROR` - File system error
- `NETWORK_ERROR` - Network-related error

### **Security Errors**

- `INVALID_KEY` - Invalid encryption key
- `WRONG_PASSPHRASE` - Incorrect passphrase
- `TAMPERED_DATA` - Data has been tampered with
- `UNAUTHORIZED_ACCESS` - Unauthorized access attempt

### **Internal Errors**

- `INTERNAL_ERROR` - Internal application error
- `UNEXPECTED_ERROR` - Unexpected error occurred
- `CONFIGURATION_ERROR` - Configuration error

## Usage Examples

### **Complete Encryption Workflow**

```typescript
import { invokeCommand, CommandError } from "./generated/types";

async function encryptFiles() {
  try {
    // 1. Generate a key
    const keyResult = await invokeCommand("generate_key", {
      label: "My Backup Key",
      passphrase: "secure-passphrase-123",
    });

    // 2. Select files
    const selectionResult = await invokeCommand("select_files", "Files");

    // 3. Encrypt files
    const encryptionResult = await invokeCommand("encrypt_files", {
      key_id: keyResult.key_id,
      file_paths: selectionResult.paths,
      output_name: "backup-encrypted",
    });

    console.log("Encryption completed:", encryptionResult);
  } catch (error) {
    if (error instanceof CommandError) {
      if (error.isValidationError()) {
        console.error("Validation error:", error.message);
      } else if (error.isSecurityError()) {
        console.error("Security error:", error.message);
      } else {
        console.error("Operation failed:", error.message);
      }
    }
  }
}
```

### **Progress Tracking**

```typescript
async function trackProgress(operationId: string) {
  const interval = setInterval(async () => {
    try {
      const progress = await invokeCommand("get_progress", {
        operation_id: operationId,
      });

      console.log(`Progress: ${Math.round(progress.progress * 100)}%`);
      console.log(`Message: ${progress.message}`);

      if (progress.is_complete) {
        clearInterval(interval);
        console.log("Operation completed!");
      }
    } catch (error) {
      clearInterval(interval);
      console.error("Progress tracking failed:", error);
    }
  }, 1000);
}
```

### **Error Handling**

```typescript
async function handleErrors() {
  try {
    const result = await invokeCommand("some_command", {});
    return result;
  } catch (error) {
    if (error instanceof CommandError) {
      switch (error.code) {
        case "INVALID_INPUT":
          // Show validation error to user
          showValidationError(error.message);
          break;

        case "PERMISSION_DENIED":
          // Request permissions from user
          requestPermissions();
          break;

        case "KEY_NOT_FOUND":
          // Guide user to create or import key
          showKeyNotFoundDialog();
          break;

        default:
          // Show generic error
          showError(error.message, error.recovery_guidance);
      }
    }
  }
}
```

## Best Practices

### **1. Always Use Generated Types**

- Import types from generated file for type safety
- Don't define interfaces manually in frontend
- Let TypeScript catch type mismatches at compile time

### **2. Handle All Error Cases**

- Always wrap command calls in try-catch
- Use `CommandError` class for structured error handling
- Provide user-friendly error messages

### **3. Implement Progress Tracking**

- Use progress updates for long-running operations
- Show progress bars and status messages
- Handle operation cancellation gracefully

### **4. Validate Input Early**

- Validate user input before calling commands
- Use client-side validation for immediate feedback
- Let backend validation catch edge cases

### **5. Follow Security Guidelines**

- Never log sensitive data (passphrases, keys)
- Clear sensitive data from memory after use
- Use secure storage for configuration

## Development Workflow

### **1. Adding New Commands**

1. Define input/output types in Rust
2. Add TypeScript equivalents in documentation
3. Generate TypeScript definitions
4. Update this documentation
5. Test with frontend integration

### **2. Modifying Existing Commands**

1. Update Rust types
2. Regenerate TypeScript definitions
3. Update frontend code to match new types
4. Test backward compatibility

### **3. Error Handling**

1. Use appropriate error codes
2. Provide user-friendly messages
3. Include recovery guidance
4. Test error scenarios

## Security Considerations

### **Data Protection**

- All sensitive data is automatically zeroed from memory
- Passphrases use constant-time comparison
- Keys are stored encrypted at rest
- No sensitive data is logged

### **Input Validation**

- All input is validated before processing
- Path traversal attempts are detected and blocked
- File size limits are enforced
- Malicious file types are rejected

### **Access Control**

- Commands only access allowed file system locations
- Key access requires proper authentication
- Operations are isolated and sandboxed

## Performance Guidelines

### **Large File Handling**

- Use streaming for large files
- Implement progress tracking
- Handle memory constraints gracefully
- Support operation cancellation

### **Concurrent Operations**

- Prevent conflicting operations
- Use operation IDs for tracking
- Implement proper cleanup
- Handle resource contention

## Testing

### **Frontend Integration Tests**

- Test all command interfaces
- Verify error handling
- Test progress tracking
- Validate type safety

### **End-to-End Tests**

- Test complete workflows
- Verify data integrity
- Test error recovery
- Validate security measures

## Maintenance

### **Version Compatibility**

- Maintain backward compatibility
- Version API changes appropriately
- Document breaking changes
- Provide migration guides

### **Documentation Updates**

- Keep documentation in sync with code
- Update examples for new features
- Maintain usage guidelines
- Document known issues

---

_This document is automatically generated and maintained as part of the Barqly Vault development process. For questions or issues, please refer to the project documentation or create an issue in the repository._
