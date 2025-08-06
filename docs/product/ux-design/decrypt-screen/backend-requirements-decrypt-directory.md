# Backend Requirements: Decrypt Directory Creation

**Date**: 2025-08-06  
**From**: Senior Frontend Engineer  
**To**: Senior Backend Engineer  
**Priority**: High  
**Related**: Decrypt Screen Implementation

## Problem Statement

The `decrypt_data` command currently fails with "Output directory not found" error when the specified output directory doesn't exist. This is inconsistent with the `encrypt_files` command which successfully creates directories when needed.

### Current Error
```
Invalid Input
Validation failed for input: Output directory not found: /Users/nauman/Documents/Barqly-Recovery/2025-08-06_143633
```

## Requirements

### 1. Directory Creation on Decrypt

The `decrypt_data` command should automatically create the output directory if it doesn't exist, similar to how `encrypt_files` handles this.

**Current encrypt_files behavior** (working correctly):
- Uses `validate_output_directory` function
- Creates directory with `std::fs::create_dir_all` if it doesn't exist
- Located in: `src-tauri/src/commands/crypto_commands.rs`

**Needed for decrypt_data**:
- Apply the same directory validation/creation logic
- Ensure parent directories are also created (recursive)
- Handle permissions errors gracefully

### 2. Consistency with Encrypt Flow

The decrypt flow should mirror the encrypt flow for better user experience:

| Encrypt | Decrypt |
|---------|---------|
| Default: `~/Documents/Barqly-Vaults/` | Default: `~/Documents/Barqly-Recovery/[timestamp]/` |
| Creates directory if doesn't exist ✅ | Should create directory if doesn't exist ❌ |
| Returns clear error if permission denied | Should return clear error if permission denied |

### 3. Implementation Details

#### Current DecryptDataInput Structure
```rust
pub struct DecryptDataInput {
    pub encrypted_file: String,
    pub key_id: String,
    pub passphrase: String,
    pub output_dir: String,  // This path may not exist yet
}
```

#### Suggested Implementation
In the `decrypt_data` function, before attempting to decrypt:

1. Validate the output_dir path
2. If directory doesn't exist, create it with `std::fs::create_dir_all`
3. If creation fails, return appropriate error with recovery guidance
4. Proceed with decryption only after directory is confirmed to exist

You can reuse the existing `validate_output_directory` function that's already used by `encrypt_files`.

### 4. Error Handling

Ensure proper error messages for:
- Permission denied when creating directory
- Invalid path characters
- Disk space issues
- Read-only filesystem

### 5. Testing Requirements

Please add tests for:
- Creating nested directories (e.g., `Barqly-Recovery/2025-08-06_143633/`)
- Handling existing directories (should not error)
- Permission denied scenarios
- Invalid path scenarios

## Frontend Context

The frontend is already sending the full path including subdirectories:
```typescript
// Example path being sent from frontend
const recoveryPath = await join(docsPath, 'Barqly-Recovery', `${date}_${time}`);
// Results in: /Users/nauman/Documents/Barqly-Recovery/2025-08-06_143633
```

The frontend expects the backend to handle directory creation, just like it does for encrypt operations.

## Acceptance Criteria

- [ ] `decrypt_data` creates output directory if it doesn't exist
- [ ] Directory creation is recursive (creates parent directories)
- [ ] Appropriate error messages for failure cases
- [ ] Consistent behavior with `encrypt_files` command
- [ ] Tests cover directory creation scenarios
- [ ] No changes needed to the TypeScript interface (already has `output_dir`)

## Notes

- The TypeScript interface (`DecryptDataInput`) already includes the `output_dir` field
- No API changes needed, just implementation update
- This will provide feature parity between encrypt and decrypt operations

## References

- Current encrypt implementation: `src-tauri/src/commands/crypto_commands.rs` → `encrypt_files` → `validate_output_directory`
- Current decrypt implementation: `src-tauri/src/commands/crypto_commands.rs` → `decrypt_data`
- Frontend decrypt page: `src-ui/src/pages/DecryptPage.tsx`
- API types: `src-ui/src/lib/api-types.ts` → `DecryptDataInput`

---

**Action Required**: Please implement directory creation in the `decrypt_data` command to match the behavior of `encrypt_files`.