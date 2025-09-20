# Refactoring Requirements

## 1. Enum Serialization Standardization

### Problem Statement
Inconsistent enum serialization across Rust backend and TypeScript frontend. The backend uses `#[serde(rename_all = "lowercase")]` producing values like "new", "orphaned", while TypeScript types expect "NEW", "ORPHANED", and the UI has to check for both variants.

### Current State - The Chaos
```rust
// Backend (Rust)
#[serde(rename_all = "lowercase")]
pub enum YubiKeyState {
    New,        // Serializes as "new"
    Orphaned,   // Serializes as "orphaned"
    Registered, // Serializes as "registered"
}
```

```typescript
// TypeScript Types (api-types.ts)
export interface YubiKeyStateInfo {
  state: 'NEW' | 'ORPHANED' | 'REGISTERED'; // Expects uppercase
}
```

```typescript
// Frontend Usage (YubiKeySetupDialog.tsx)
// Has to check BOTH variants everywhere!
if (state === 'NEW' || state === 'new') { ... }
if (state === 'ORPHANED' || state === 'orphaned') { ... }
```

### Why This Is Critical
1. **Type Safety Lost**: TypeScript types don't match runtime values
2. **Fragile Code**: Every enum comparison needs duplicate checks
3. **Bug-Prone**: Easy to miss a variant when adding new code
4. **Maintenance Nightmare**: Duplicate checks throughout the codebase
5. **Confusing**: Developers unsure which format to use

### The Solution - SCREAMING_SNAKE_CASE Everywhere

**Rule: ALL enums use SCREAMING_SNAKE_CASE serialization**

```rust
#[derive(Serialize, Deserialize)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum YubiKeyState {
    New,        // Serializes as "NEW"
    Orphaned,   // Serializes as "ORPHANED"
    Registered, // Serializes as "REGISTERED"
}
```

This matches:
- Industry standards (constants are uppercase)
- TypeScript enum conventions
- REST API best practices
- Eliminates all variant checking

### Implementation Steps

1. **Audit ALL enums** in Rust codebase:
   ```bash
   grep -r "serde(rename_all" src-tauri/
   ```

2. **Update each enum** to use SCREAMING_SNAKE_CASE:
   ```rust
   // Change from:
   #[serde(rename_all = "lowercase")]
   // To:
   #[serde(rename_all = "SCREAMING_SNAKE_CASE")]
   ```

3. **Regenerate TypeScript types**:
   ```bash
   cd src-tauri && cargo build --features generate-types
   ```

4. **Clean up frontend** - remove ALL duplicate checks:
   ```typescript
   // Before:
   if (state === 'NEW' || state === 'new')

   // After:
   if (state === 'NEW')
   ```

### Enums Needing Update
- `YubiKeyState`
- `PinStatus`
- `KeyState`
- `VaultState`
- `ErrorCode`
- `RecoveryMethod`
- Any other serialized enums

### Benefits
- **Type safety restored**: TypeScript types match runtime
- **Clean code**: Single check per enum value
- **Future-proof**: New enum values work immediately
- **Developer happiness**: No more guessing games
- **Less bugs**: Can't forget to check a variant

### Effort Estimate
- **Time**: ~1 hour
- **Risk**: Low (mechanical change)
- **ROI**: Eliminates entire class of bugs

---

## 2. Parameter Wrapping Inconsistency Refactor

### Problem Statement

The codebase has **inconsistent parameter wrapping conventions** between frontend and backend Tauri commands, causing frequent runtime errors and lengthy debugging sessions.

## Current State - The Mess

### Three Different Patterns
Commands currently use THREE different parameter patterns:

1. **Wrapped in `input`**:
   ```rust
   pub async fn init_yubikey_for_vault(input: YubiKeyInitForVaultParams)
   pub async fn add_passphrase_key_to_vault(input: AddPassphraseKeyRequest)
   ```

2. **Wrapped in custom names** (e.g., `params`):
   ```rust
   pub async fn register_yubikey_for_vault(params: RegisterYubiKeyForVaultParams)
   ```

3. **Direct parameters** (no wrapper):
   ```rust
   pub async fn list_available_yubikeys(vault_id: String)
   pub async fn validate_passphrase_strength(passphrase: String)
   ```

### The Mapping Nightmare

In `tauri-safe.ts`, we have to maintain a complex mapping for EACH command:

```typescript
const commandParameterMap: Record<string, string | null> = {
  init_yubikey_for_vault: 'input',        // Wrapped in 'input'
  register_yubikey_for_vault: 'params',   // Wrapped in 'params'
  list_available_yubikeys: null,          // Direct parameters
  // ... 40+ more commands with different patterns
};
```

## Why This Is a Major Problem

### 1. Runtime-Only Errors
- TypeScript types don't enforce the actual wrapping
- Errors only appear when you click the button in the UI
- Error messages are cryptic: "invalid args `params` for command"

### 2. Time Waste
- Every new command requires checking:
  - How the Rust function is defined
  - What parameter name it uses
  - Updating tauri-safe.ts mapping
- Debugging takes 30+ minutes for what should be obvious

### 3. No Compile-Time Safety
- Frontend TypeScript compiles fine
- Backend Rust compiles fine
- But they don't talk to each other correctly

### 4. Knowledge Burden
- Developers must remember which pattern each command uses
- No way to know without checking the source
- Easy to copy the wrong pattern from another command

## The Solution - Standardization

### Rule: ALL Commands Use `input`

**Every Tauri command should follow this pattern:**

```rust
#[command]
pub async fn any_command(input: SomeParamsStruct) -> CommandResponse<SomeResult>
```

**Never this:**
```rust
// BAD - inconsistent parameter names
pub async fn command1(params: ...)
pub async fn command2(data: ...)
pub async fn command3(request: ...)
```

### Implementation Steps

1. **Refactor all Rust commands** to use `input` as parameter name:
   ```rust
   // Before
   pub async fn register_yubikey_for_vault(params: RegisterYubiKeyForVaultParams)

   // After
   pub async fn register_yubikey_for_vault(input: RegisterYubiKeyForVaultParams)
   ```

2. **Simplify tauri-safe.ts** to have ONE rule:
   ```typescript
   // For commands with struct parameters
   if (typeof args === 'object' && commandExpectsInput(cmd)) {
     invokeArgs = { input: args };
   }

   // List of commands that take direct strings/primitives (exceptions)
   const DIRECT_PARAM_COMMANDS = [
     'validate_passphrase_strength',  // Takes string directly
     'delete_key_command',            // Takes key_id string
   ];
   ```

3. **Document the convention** clearly:
   - README: "ALL commands wrap parameters in `input`"
   - Exceptions list for primitive parameters

## Benefits

1. **One Rule**: Developers only need to remember ONE pattern
2. **Less Debugging**: Consistent = predictable = fewer errors
3. **Faster Development**: No need to check each command's pattern
4. **Better Onboarding**: New developers learn one pattern, not three

## Migration Plan

### Phase 1: Document Current State
- List all commands and their current parameter patterns
- Identify which need changing

### Phase 2: Backend Refactor
- Update all Rust command functions to use `input`
- Run tests to ensure no breaking changes

### Phase 3: Frontend Cleanup
- Simplify tauri-safe.ts parameter mapping
- Remove complex conditional logic

### Phase 4: Validation
- Test all commands end-to-end
- Update documentation

## Effort Estimate

- **Time**: ~2-3 hours
- **Risk**: Low (mechanical refactor)
- **Benefit**: Saves 30+ minutes per parameter bug × many bugs = huge ROI

## Commands Needing Refactor

### Currently using `params`:
- `register_yubikey_for_vault`

### Currently using direct parameters:
- `list_available_yubikeys`
- `check_yubikey_slot_availability`
- `validate_passphrase_strength`
- `validate_vault_passphrase_key`
- Many others...

## Example Refactor

### Before (Inconsistent)
```rust
// Different parameter names everywhere
pub async fn init_yubikey_for_vault(input: YubiKeyInitForVaultParams)
pub async fn register_yubikey_for_vault(params: RegisterYubiKeyForVaultParams)
pub async fn list_available_yubikeys(vault_id: String)
```

### After (Consistent)
```rust
// ALL use 'input'
pub async fn init_yubikey_for_vault(input: YubiKeyInitForVaultParams)
pub async fn register_yubikey_for_vault(input: RegisterYubiKeyForVaultParams)
pub async fn list_available_yubikeys(input: ListAvailableYubiKeysParams)

// Where ListAvailableYubiKeysParams is:
pub struct ListAvailableYubiKeysParams {
    pub vault_id: String,
}
```

## Conclusion

This refactor would eliminate a major source of debugging pain and make the codebase significantly more maintainable. The current state where each command might use a different pattern is unsustainable and wastes significant development time.