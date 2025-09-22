# Backend-Frontend API Synchronization Guide

## Overview

This document describes the **automatic type generation system** that keeps Rust backend and TypeScript frontend in perfect synchronization. We use `tauri-specta` to automatically generate TypeScript types and bindings from Rust code.

## Table of Contents
1. [The Automatic System](#the-automatic-system)
2. [Backend Engineer Workflow](#backend-engineer-workflow)
3. [Files Involved](#files-involved)
4. [Frontend Developer Guide](#frontend-developer-guide)
5. [Quick Reference Checklist](#quick-reference-checklist)
6. [Migration from Manual System](#migration-from-manual-system)

---

## The Automatic System

### Key Innovation
We use **tauri-specta** to automatically generate TypeScript types from Rust:
- Rust types are the single source of truth
- TypeScript bindings are generated automatically
- Zero manual synchronization needed
- Type safety guaranteed across the boundary

### Benefits
- ✅ **Zero manual TypeScript maintenance** - all types auto-generated
- ✅ **No parameter mismatch errors** - types enforced at compile time
- ✅ **Single source of truth** - Rust types drive everything
- ✅ **Automatic consistency** - impossible to have frontend/backend mismatch
- ✅ **Reduced from 729 lines to 4 lines** in build.rs

---

## Backend Engineer Workflow

### When Adding a New Tauri Command

#### Step 1: Create Your Command with Annotations

```rust
// src-tauri/src/commands/vault_commands/yubikey_integration.rs

use tauri::command;

// Add specta::Type derive to all structs
#[derive(Debug, Serialize, Deserialize, specta::Type)]
pub struct YubiKeyInitForVaultParams {
    pub serial: String,
    pub pin: String,
    pub label: String,
    pub vault_id: String,
    pub slot_index: u8,
}

// Add both tauri::command and specta::specta annotations
#[tauri::command]
#[specta::specta]
pub async fn init_yubikey_for_vault(
    input: YubiKeyInitForVaultParams,
) -> CommandResponse<YubiKeyInitResult> {
    // Implementation...
}
```

**Key Requirements:**
- Add `specta::Type` derive to ALL command structs
- Add `#[specta::specta]` after `#[tauri::command]`
- Return types must also implement `specta::Type`

#### Step 2: Register Command in lib.rs

```rust
// src-tauri/src/lib.rs

#[cfg(debug_assertions)]
{
    use tauri_specta::{Builder, collect_commands};

    let builder = Builder::<tauri::Wry>::new()
        .commands(collect_commands![
            // ... existing commands ...
            init_yubikey_for_vault,  // Add your new command
        ]);

    // This automatically generates TypeScript bindings
    builder
        .export(
            Typescript::default()
                .bigint(specta_typescript::BigIntExportBehavior::Number),
            "../src-ui/src/bindings.ts"
        )
        .expect("Failed to export typescript bindings");
}
```

#### Step 3: Build to Generate TypeScript

```bash
# From src-tauri directory
cargo build

# TypeScript bindings are automatically generated at:
# src-ui/src/bindings.ts
```

That's it! The TypeScript types and command functions are automatically generated.

---

## Files Involved

### Core Files

| File | Purpose | When to Edit |
|------|---------|--------------|
| `/src-tauri/Cargo.toml` | Dependencies | Already configured with tauri-specta |
| `/src-tauri/src/lib.rs` | Command registration & type export | Add new commands to collect_commands! |
| `/src-tauri/build.rs` | Build script | No longer needs editing (reduced to 4 lines) |
| `/src-ui/src/bindings.ts` | Generated TypeScript | **NEVER EDIT** - auto-generated |

### Removed Files (No Longer Needed)
- ❌ `/src-tauri/scripts/generate-param-map.rs` - Deleted
- ❌ `/src-ui/src/lib/command-parameter-map.generated.ts` - Deleted
- ❌ Manual TypeScript in build.rs - Removed (725 lines deleted)

---

## Frontend Developer Guide

### Using Generated Commands

The generated bindings provide fully typed command functions:

```typescript
// Import from the generated bindings
import { commands } from '../bindings';

// Use commands with full type safety
const result = await commands.initYubikeyForVault({
    serial: "12345",
    pin: "123456",
    label: "My YubiKey",
    vault_id: "vault_123",
    slot_index: 0
});

// TypeScript knows the exact types!
if (result.status === "ok") {
    console.log(result.data.public_key); // Fully typed
} else {
    console.error(result.error); // Error is typed too
}
```

### For Existing Code Using safeInvoke

The `safeInvoke` wrapper continues to work but is no longer needed for parameter mapping:

```typescript
// Old way (still works)
await safeInvoke('init_yubikey_for_vault', params);

// New way (recommended - fully typed)
await commands.initYubikeyForVault(params);
```

---

## Quick Reference Checklist

### Adding a New Command

- [ ] Add `specta::Type` derive to all command structs
- [ ] Add `#[tauri::command]` to the function
- [ ] Add `#[specta::specta]` after the command annotation
- [ ] Add command to `collect_commands!` in lib.rs
- [ ] Run `cargo build` to generate TypeScript
- [ ] Use the command from `commands` in TypeScript

### Modifying an Existing Command

- [ ] Update the Rust struct/function signature
- [ ] Ensure `specta::Type` is on all types
- [ ] Run `cargo build` to regenerate TypeScript
- [ ] TypeScript will show compile errors if breaking changes

---

## Migration from Manual System

### What Changed

**Before (Manual System):**
- Had to update 3 files when adding commands
- 729 lines of manual TypeScript in build.rs
- Manual parameter mapping in frontend
- Frequent runtime errors from mismatches

**After (Automatic System):**
- Update only Rust code
- 4 lines in build.rs
- Automatic TypeScript generation
- Compile-time type safety

### Commands Already Migrated

All 50+ commands have been migrated to the automatic system:
- ✅ Crypto commands (12 commands)
- ✅ Storage commands (4 commands)
- ✅ File commands (4 commands)
- ✅ Vault commands (15 commands)
- ✅ YubiKey commands (15+ commands)

### No Action Required

The migration is complete. All existing commands work with the new system.