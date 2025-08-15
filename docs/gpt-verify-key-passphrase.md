# Verify Key Passphrase Command Implementation

## Overview
Implemented a new backend command `verify_key_passphrase` for efficient key-passphrase validation without performing full file decryption.

## Command Details

### Purpose
Validate that a passphrase can decrypt a specific key WITHOUT decrypting files. This provides a fast, constant-time operation for validating key-passphrase combinations in the decrypt workflow.

### Command Signature
```rust
pub async fn verify_key_passphrase(
    input: VerifyKeyPassphraseInput,
) -> CommandResponse<VerifyKeyPassphraseResponse>
```

### Input Type
```rust
pub struct VerifyKeyPassphraseInput {
    pub key_id: String,      // The key label/ID to verify
    pub passphrase: String,   // The passphrase to test
}
```

### Output Type
```rust
pub struct VerifyKeyPassphraseResponse {
    pub is_valid: bool,    // true if passphrase is correct
    pub message: String,   // Human-readable message
}
```

## Implementation Details

### Location
- **File**: `src-tauri/src/commands/crypto/validation.rs`
- **Module**: `commands::crypto::validation`

### Key Features
1. **Performance Optimized**: Only loads and decrypts the private key, not encrypted files
2. **Security Focused**: 
   - No timing attacks (constant-time where possible)
   - No unnecessary file I/O
   - Proper error handling without information leakage
3. **Comprehensive Validation**:
   - Validates key_id is not empty
   - Validates passphrase is not empty  
   - Validates key label format (alphanumeric and dashes only)
4. **Proper Error Handling**:
   - Returns `ErrorCode::KeyNotFound` if key doesn't exist
   - Returns success/failure response for passphrase validation
   - Other errors return appropriate error codes

### Response Examples

#### Success Case
```json
{
  "is_valid": true,
  "message": "Passphrase is correct"
}
```

#### Wrong Passphrase
```json
{
  "is_valid": false,
  "message": "Incorrect passphrase for the selected key"
}
```

#### Key Not Found (Error)
```json
{
  "code": "KEY_NOT_FOUND",
  "message": "Key 'example-key' not found",
  ...
}
```

## TypeScript Types

The following types were added to `src-ui/src/lib/api-types.ts`:

```typescript
export interface VerifyKeyPassphraseInput {
  key_id: string;
  passphrase: string;
}

export interface VerifyKeyPassphraseResponse {
  is_valid: boolean;
  message: string;
}
```

## Testing

Basic input validation tests were implemented to verify:
- Valid input acceptance
- Empty key_id rejection
- Empty passphrase rejection
- Invalid key label format rejection (e.g., path traversal attempts)

## Usage in Frontend

The frontend can now call this command to efficiently validate key-passphrase combinations:

```typescript
import { invoke } from '@tauri-apps/api/core';

async function verifyKeyPassphrase(keyId: string, passphrase: string) {
  try {
    const result = await invoke<VerifyKeyPassphraseResponse>('verify_key_passphrase', {
      key_id: keyId,
      passphrase: passphrase
    });
    
    if (result.is_valid) {
      // Passphrase is correct, proceed with decryption
    } else {
      // Show error: incorrect passphrase
    }
  } catch (error) {
    // Handle command errors (key not found, etc.)
  }
}
```

## Benefits

1. **Performance**: Constant-time validation independent of encrypted file size
2. **User Experience**: Instant feedback on passphrase correctness
3. **Security**: No unnecessary decryption attempts with wrong passphrases
4. **Efficiency**: Minimal memory usage and file I/O

## Integration Points

- Registered in `src-tauri/src/lib.rs` command handler
- Exported from `src-tauri/src/commands/crypto/mod.rs`
- TypeScript types generated and updated in `src-ui/src/lib/api-types.ts`