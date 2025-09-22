# API Type Generation & Usage Guide

## Overview

This document provides a complete guide for backend engineers to generate TypeScript types from Rust commands and for frontend engineers to use these types. The system ensures type safety across the Tauri bridge between Rust backend and TypeScript frontend.

## Table of Contents
1. [Backend Engineer Workflow](#backend-engineer-workflow)
2. [Frontend Usage Guide](#frontend-usage-guide)
3. [Parameter Mapping Reference](#parameter-mapping-reference)
4. [Quick Reference Checklist](#quick-reference-checklist)
5. [Common Pitfalls & Solutions](#common-pitfalls--solutions)

---

## Backend Engineer Workflow

Follow these steps **in order** whenever you add, update, or remove a Tauri command.

### Step 1: Define TypeScript Types in build.rs

Location: `/src-tauri/build.rs`

Add your TypeScript interface definitions in the `generate_typescript_content()` function:

```typescript
// Example: Adding a new passphrase validation command
export interface PassphraseValidationResult {
  is_valid: boolean;
  strength: 'weak' | 'fair' | 'good' | 'strong';
  feedback: string[];
  score: number;
}

export interface AddPassphraseKeyRequest {
  vault_id: string;
  label: string;
  passphrase: string;
}
```

**Type Mapping Guide:**
- Rust `String` ’ TypeScript `string`
- Rust `bool` ’ TypeScript `boolean`
- Rust `i32/u32/f64` ’ TypeScript `number`
- Rust `Vec<T>` ’ TypeScript `T[]`
- Rust `Option<T>` ’ TypeScript `T | null` or `T?`
- Rust `HashMap<K,V>` ’ TypeScript `Record<K, V>`
- Rust enums ’ TypeScript union types or enums

### Step 2: Register Command in lib.rs

Location: `/src-tauri/src/lib.rs`

```rust
// 1. Import your command
use commands::crypto::passphrase_validation::validate_passphrase_strength;

// 2. Add to invoke_handler
.invoke_handler(tauri::generate_handler![
    // ... existing commands ...
    validate_passphrase_strength,
    add_passphrase_key_to_vault,
])
```

### Step 3: Generate TypeScript Types

Run from project root or src-tauri directory:

```bash
cd src-tauri
cargo build --features generate-types
```

This generates types at: `target/debug/build/barqly-vault-*/out/generated/types.ts`

**Verify generation:**
```bash
# Check the file was created
ls -la ../target/debug/build/*/out/generated/types.ts

# Verify your types are included
grep "PassphraseValidationResult" ../target/debug/build/*/out/generated/types.ts
```

### Step 4: Update tauri-safe.ts Command Mappings

Location: `/src-ui/src/lib/tauri-safe.ts`

Add your command to the `commandParameterMap` object:

```typescript
const commandParameterMap: Record<string, string | null> = {
  // ... existing commands ...

  // Commands that expect 'input' parameter wrapper
  add_passphrase_key_to_vault: 'input',  // Takes AddPassphraseKeyRequest

  // Commands that take parameters directly (no wrapper)
  validate_passphrase_strength: null,     // Takes passphrase string directly

  // Commands with custom parameter names
  update_config: 'config',                // Wraps in { config: ... }
};
```

**Parameter Mapping Rules:**
- `'input'`: Wraps parameters in `{ input: yourData }`
- `null`: Passes parameters directly without wrapping
- `'customName'`: Wraps in `{ customName: yourData }`

### Step 5: Update TypeScript Types File

Run the update script from project root:

```bash
./scripts/update-types.sh
```

This script:
1. Finds the generated types.ts file
2. Creates a backup of api-types.ts
3. Merges the generated types into `/src-ui/src/lib/api-types.ts`
4. Preserves the file header with warnings

**Verify update:**
```bash
# Check types were added
grep "PassphraseValidationResult" src-ui/src/lib/api-types.ts

# Backup was created
ls -la src-ui/src/lib/api-types.ts.backup
```

### Step 6: Add Rerun Triggers (Optional)

For automatic rebuilds when files change, add to build.rs:

```rust
// Re-run if any of our source files change
println!("cargo:rerun-if-changed=src/commands/your_new_command.rs");
```

---

## Frontend Usage Guide

### Basic Import Pattern

```typescript
// Import the safe invoke wrapper
import { safeInvoke } from '../lib/tauri-safe';

// Import types from api-types
import {
  PassphraseValidationResult,
  AddPassphraseKeyRequest,
  CommandError
} from '../lib/api-types';
```

### Simple Command Invocation

```typescript
// Command with direct parameters (null mapping)
const result = await safeInvoke<PassphraseValidationResult>(
  'validate_passphrase_strength',
  'myPassphrase123!',  // Passed directly
  'ComponentName.methodName'  // Context for logging
);

// Access the result
if (result.is_valid) {
  console.log(`Strength: ${result.strength}, Score: ${result.score}`);
}
```

### Command with Input Wrapper

```typescript
// Command with 'input' wrapper
const request: AddPassphraseKeyRequest = {
  vault_id: 'vault_123',
  label: 'My Key',
  passphrase: 'SecurePass123!'
};

const response = await safeInvoke<AddPassphraseKeyResponse>(
  'add_passphrase_key_to_vault',
  request,  // Will be wrapped as { input: request }
  'KeyManager.addPassphrase'
);
```

### Error Handling

```typescript
try {
  const result = await safeInvoke<YourResponseType>(
    'your_command',
    params,
    'Context.method'
  );
  // Handle success
} catch (error) {
  if (error instanceof CommandError) {
    console.error(`Error ${error.code}: ${error.message}`);
    // Show user-friendly message
    if (error.recovery_guidance) {
      showToast(error.recovery_guidance);
    }
  }
}
```

### With Loading States

```typescript
const [isLoading, setIsLoading] = useState(false);
const [error, setError] = useState<string | null>(null);

const handleAction = async () => {
  setIsLoading(true);
  setError(null);

  try {
    const result = await safeInvoke<ResponseType>(
      'command_name',
      params,
      'Component.action'
    );
    // Handle result
  } catch (err: any) {
    setError(err.message || 'Operation failed');
  } finally {
    setIsLoading(false);
  }
};
```

---

## Parameter Mapping Reference

| Command | Mapping | Parameter Structure | Example |
|---------|---------|-------------------|---------|
| `generate_key` | `'input'` | `GenerateKeyInput` | `{ label, passphrase }` |
| `validate_passphrase_strength` | `null` | Direct string | `"password123"` |
| `add_passphrase_key_to_vault` | `'input'` | `AddPassphraseKeyRequest` | `{ vault_id, label, passphrase }` |
| `list_vaults` | `null` | No parameters | `undefined` |
| `delete_key_command` | `null` | Direct string | `"key_id_123"` |
| `update_config` | `'config'` | Config object | `{ theme: 'dark' }` |
| `select_files` | `'selectionType'` | Selection enum | `'Files'` or `'Folders'` |
| `init_yubikey_for_vault` | `'input'` | `YubiKeyInitForVaultParams` | `{ serial, pin, label, vault_id, slot_index }` |

---

## Quick Reference Checklist

### Adding a New Command

- [ ] 1. Define TypeScript interfaces in `/src-tauri/build.rs`
- [ ] 2. Implement Rust command with `#[command]` attribute
- [ ] 3. Import and register in `/src-tauri/src/lib.rs`
- [ ] 4. Run `cargo build --features generate-types`
- [ ] 5. Add to `commandParameterMap` in `/src-ui/src/lib/tauri-safe.ts`
- [ ] 6. Run `./scripts/update-types.sh`
- [ ] 7. Test command invocation from frontend

### Updating Existing Command

- [ ] 1. Update TypeScript interface in `build.rs`
- [ ] 2. Update Rust implementation if needed
- [ ] 3. Run `cargo build --features generate-types`
- [ ] 4. Run `./scripts/update-types.sh`
- [ ] 5. Update frontend usage if interface changed

### Removing a Command

- [ ] 1. Remove from `lib.rs` invoke_handler
- [ ] 2. Remove TypeScript interface from `build.rs`
- [ ] 3. Remove from `commandParameterMap` in `tauri-safe.ts`
- [ ] 4. Regenerate types and update
- [ ] 5. Remove/update frontend usage

---

## Common Pitfalls & Solutions

### Problem: Types not appearing after generation

**Solution:**
1. Check build.rs has the interface defined
2. Verify `cargo build --features generate-types` completed without errors
3. Run `./scripts/update-types.sh` to copy types
4. Check the generated file directly: `target/debug/build/*/out/generated/types.ts`

### Problem: "Command not found" error

**Solution:**
1. Verify command is registered in `lib.rs` invoke_handler
2. Check exact spelling matches between Rust function name and frontend call
3. Restart the Tauri dev server

### Problem: Parameter wrapping issues

**Symptoms:** Backend receives undefined or incorrectly structured parameters

**Solution:**
1. Check `commandParameterMap` in tauri-safe.ts
2. Use `'input'` for commands expecting `{ input: data }`
3. Use `null` for direct parameters
4. Check Rust command parameter names match

### Problem: Type mismatches

**Solution:**
1. Ensure TypeScript types in build.rs match Rust structs exactly
2. Remember: Rust `Option<T>` ’ TypeScript `T | null` or `T?`
3. Check enum variants match between Rust and TypeScript

### Problem: Build cache issues

**Solution:**
```bash
# Clean and rebuild
cd src-tauri
cargo clean
cargo build --features generate-types
../scripts/update-types.sh
```

### Problem: CommandError not imported

**Solution:**
```typescript
// Always import from api-types
import { CommandError, ErrorCode } from '../lib/api-types';
```

---

## Testing Your Implementation

### Backend Testing
```rust
#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_command() {
        let result = your_command(params).await;
        assert!(result.is_ok());
    }
}
```

### Frontend Testing
```typescript
// In component test
vi.mock('../lib/tauri-safe', () => ({
  safeInvoke: vi.fn().mockResolvedValue(mockResponse)
}));

// Test the command call
await myFunction();
expect(safeInvoke).toHaveBeenCalledWith(
  'command_name',
  expectedParams,
  expect.any(String)
);
```

---

## Additional Resources

- [Tauri Command Documentation](https://tauri.app/v1/guides/features/command)
- [TypeScript Type Generation](https://tauri.app/v1/guides/features/typescript)
- Project-specific docs:
  - `/docs/architecture/frontend/ux-engineer-onboarding.md`
  - `/scripts/update-types.sh` - Type update script
  - `/src-ui/src/lib/tauri-safe.ts` - Runtime wrapper implementation

---

*Last Updated: 2025-09-18*
*Maintained by: Backend Engineering Team*