# YubiKey Command Organization Refactoring Plan 6

**Created**: 2025-09-25
**Status**: In Progress
**Goal**: Reorganize YubiKey commands into clean, cohesive architecture with proper visibility and zero dead code

## Context & Architecture

### Current DDD Architecture Pattern
Following successful consolidation in Plan 5, our architecture flow is:
```
Frontend → Consolidated Commands → Implementation Modules → YubiKeyManager → Domain/Infrastructure
```

### Issues to Address
1. **Scattered file organization**: YubiKey code spread across multiple locations
2. **Naming conflicts**: `yubikey_commands/` folder vs `*_yubikey_commands.rs` files
3. **Improper visibility**: Internal functions exposed as `pub` instead of private
4. **Potential dead code**: Old functions that may no longer be used

### Target Architecture
```
commands/yubikey/
├── mod.rs                  # Public API exports only
├── device_commands.rs      # Tauri commands for device ops
├── vault_commands.rs       # Tauri commands for vault integration
├── crypto_commands.rs      # Tauri commands for crypto ops
└── internal/               # Private implementation (mod internal)
    ├── mod.rs              # Internal re-exports with pub(super)
    ├── device_impl.rs      # Business logic (was streamlined.rs)
    ├── crypto_impl.rs      # Business logic (was smart_decryption.rs)
    └── helpers.rs          # Shared utilities (was vault_yubikey_helpers.rs)
```

## Milestone 1: Dead Code Analysis & Documentation ⏳ PENDING
- [ ] Search frontend codebase for YubiKey command usage patterns
- [ ] Create list of actively called commands from TypeScript files
- [ ] Analyze generated bindings.ts for 1:1 mapping with frontend usage
- [ ] Identify unused bindings (potential dead code)
- [ ] Audit backend command modules against binding file
- [ ] Mark suspicious/unused functions with TODO comments
- [ ] Document findings and cleanup strategy

### Analysis Strategy:
1. **Frontend Usage**: Search `.ts/.tsx` files for YubiKey command invocations
2. **Binding Validation**: Verify all frontend calls have corresponding bindings
3. **Backend Audit**: Find backend functions not in bindings (likely dead code)
4. **Progressive Cleanup**: Mark → Test → Remove approach

## Milestone 2: Create New Organized Structure ⏳ PENDING
- [ ] Create `commands/yubikey/` directory structure
- [ ] Create `commands/yubikey/internal/` private implementation directory
- [ ] Set up proper module declarations with visibility controls
- [ ] Create placeholder files with proper Rust module structure
- [ ] Validate structure compiles without moving logic yet

### File Structure Creation:
```bash
mkdir -p commands/yubikey/internal/
touch commands/yubikey/mod.rs
touch commands/yubikey/device_commands.rs
touch commands/yubikey/vault_commands.rs
touch commands/yubikey/crypto_commands.rs
touch commands/yubikey/internal/mod.rs
touch commands/yubikey/internal/device_impl.rs
touch commands/yubikey/internal/crypto_impl.rs
touch commands/yubikey/internal/helpers.rs
```

## Milestone 3: Move & Reorganize Implementation Code ⏳ PENDING
- [ ] Move logic from `yubikey_device_commands.rs` to `yubikey/device_commands.rs`
- [ ] Move logic from `vault_yubikey_commands.rs` to `yubikey/vault_commands.rs`
- [ ] Move logic from `yubikey_crypto_commands.rs` to `yubikey/crypto_commands.rs`
- [ ] Move implementation from `streamlined.rs` to `internal/device_impl.rs`
- [ ] Move implementation from `smart_decryption.rs` to `internal/crypto_impl.rs`
- [ ] Move helpers from `vault_yubikey_helpers.rs` to `internal/helpers.rs`
- [ ] Update all internal functions to use `pub(super)` visibility
- [ ] Ensure all files stay under 300 LOC guideline

### Key Principles:
- Preserve all existing functionality
- No parameter or behavior changes
- Maintain proper error handling patterns
- Keep YubiKeyManager integration intact

## Milestone 4: Fix Visibility & Module Structure ⏳ PENDING
- [ ] Set up `commands/yubikey/mod.rs` with proper public exports
- [ ] Configure `internal/mod.rs` with `pub(super)` visibility
- [ ] Change all internal implementation functions from `pub async fn` to `pub(super) async fn`
- [ ] Remove old `#[tauri::command]` attributes from internal functions
- [ ] Update import paths throughout codebase
- [ ] Verify no accidental public exposure of internal functions

### Rust Visibility Patterns:
```rust
// Public API (commands/yubikey/mod.rs)
pub mod device_commands;
pub mod vault_commands;
pub mod crypto_commands;
mod internal; // Private!

// Internal implementation (internal/mod.rs)
pub(super) mod device_impl;
pub(super) mod crypto_impl;
pub(super) mod helpers;

// Implementation functions
pub(super) async fn register_device_impl(...) -> Result<...> {
    // Only callable from yubikey module
}
```

## Milestone 5: Update Module Registration & Imports ⏳ PENDING
- [ ] Update `commands/mod.rs` to use new `yubikey` module
- [ ] Remove references to old scattered files
- [ ] Update `lib.rs` command registration to use new paths
- [ ] Fix all import statements throughout codebase
- [ ] Remove old file references from module declarations

### Import Updates:
```rust
// Old imports to replace:
use crate::commands::yubikey_device_commands::*;
use crate::commands::vault_yubikey_commands::*;
use crate::commands::yubikey_crypto_commands::*;

// New consolidated imports:
use crate::commands::yubikey::*;
```

## Milestone 6: Clean Up Old Files & Dead Code ⏳ PENDING
- [ ] Remove confirmed dead code based on Milestone 1 analysis
- [ ] Delete old scattered command files after migration
- [ ] Remove old `yubikey_commands/` directory structure
- [ ] Clean up any remaining TODO-marked suspicious code
- [ ] Update documentation and comments to reflect new structure

### Files to Remove After Migration:
- `yubikey_device_commands.rs`
- `vault_yubikey_commands.rs`
- `yubikey_crypto_commands.rs`
- `vault_yubikey_helpers.rs`
- `yubikey_commands/` directory (entire folder)

## Milestone 7: Testing & Validation ⏳ PENDING
- [ ] Run full build and fix any compilation errors
- [ ] Generate new TypeScript bindings
- [ ] Test all YubiKey workflows end-to-end
- [ ] Verify frontend still calls commands correctly
- [ ] Run validation suite (`make validate`)
- [ ] Confirm zero dead code or unused functions remain

### Test Scenarios:
1. **Device Operations**: List, init, register YubiKeys
2. **Vault Integration**: Add YubiKeys to vaults
3. **Crypto Operations**: Encrypt/decrypt with YubiKeys
4. **Error Handling**: Proper error messages and recovery guidance
5. **TypeScript Bindings**: All commands available to frontend

## Success Criteria

- ✅ All YubiKey code organized under single `commands/yubikey/` module
- ✅ Proper Rust visibility: `pub` for API, `pub(super)` for internal, `mod internal`
- ✅ Zero dead code or unused functions
- ✅ All files under 300 LOC
- ✅ Clean 1:1 mapping between frontend usage and backend commands
- ✅ All end-to-end workflows tested and working
- ✅ Pattern documented and ready for passphrase module

## File Size Constraints

All files must stay under 300 LOC:
- `device_commands.rs` < 300 LOC
- `vault_commands.rs` < 300 LOC
- `crypto_commands.rs` < 300 LOC
- `internal/device_impl.rs` < 300 LOC
- `internal/crypto_impl.rs` < 300 LOC
- `internal/helpers.rs` < 300 LOC

If any file exceeds limit, extract to additional internal modules.

## Next Steps After Completion

Once YubiKey command organization is complete and tested:
1. **Document the pattern** for future reference
2. **Apply same pattern to passphrase commands** following incremental approach
3. **Establish as standard** for all future command modules

**Note**: Each milestone should be completed, tested, and validated before moving to the next. Follow the same incremental approach that made Plan 5 successful.