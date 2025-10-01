# Circular Dependency Elimination Plan

**Created:** 2025-10-01
**Objective:** Break circular dependencies and fix architectural violations in key management

---

## 🔴 Problem Statement

### Critical Issues Found

**Issue 1: Service → Commands Circular Dependency**

UnifiedKeyListService (Service layer) calls Commands:
- Line 13: `use crate::commands::yubikey::device_commands::list_yubikeys`
- Line 11: `use crate::commands::passphrase::list_passphrase_keys_for_vault`
- Line 14: `use crate::commands::yubikey::vault_commands::list_available_yubikeys_for_vault`
- Line 11: `use crate::commands::passphrase::list_available_passphrase_keys_for_vault`

**This creates:**
```
Commands → KeyManager → UnifiedKeyListService → Commands (CIRCULAR!)
```

**Issue 2: Commands Call Infrastructure Directly**

Multiple commands bypass service layer:
- `commands/key_management/passphrase/vault_commands.rs` → `KeyRegistry::load()`
- `commands/key_management/yubikey/vault_commands.rs` → `KeyRegistry::load()`
- `commands/key_management/key_menu_commands.rs` → `KeyRegistry::load()`

**Issue 3: Massive Logic Duplication**

Same filtering logic in 6+ places:
- UnifiedKeyListService methods
- 4 different command functions
- All load vault, load registry, filter keys, build response

---

## 🔍 Root Cause Analysis

### Why This Exists

Looking at code comments: "Layer 2 delegation" - someone attempted abstraction but:
1. Created circular dependencies (Service → Commands)
2. Bypassed service layer (Commands → Infrastructure)
3. Duplicated logic across layers

### Why It's Wrong

**DDD/Clean Architecture violations:**
- ❌ Commands should never be called by Services (layer inversion)
- ❌ Commands should never call Infrastructure directly
- ❌ Logic duplication creates brittle codebase (the 7-day debugging nightmare)

**Correct flow:**
```
Commands → Manager → Service → Infrastructure
(NO circles, NO backwards, NO bypassing)
```

---

## 📊 Current State Analysis

### What UnifiedKeyListService Does (270 LOC)

**4 public methods:**
1. `list_keys(filter)` - Routes to 4 internal methods
2. `list_all_keys()` - All keys across all vaults
3. `list_vault_keys(vault_id)` - Keys for specific vault
4. `list_available_for_vault(vault_id)` - Keys not in vault
5. `list_connected_keys()` - Only physically connected keys

**What it calls:**
- ✅ `KeyRegistryService.load_registry()` (correct - service to service)
- 🔴 `list_yubikeys()` command (backwards)
- 🔴 `list_passphrase_keys_for_vault()` command (backwards)
- 🔴 `list_available_passphrase_keys_for_vault()` command (backwards)
- 🔴 `list_available_yubikeys_for_vault()` command (backwards)

### What Commands Do

**list_yubikeys command:**
```rust
YubiKeyManager::new()
  .list_connected_devices()
  + state detection logic
  → Vec<YubiKeyStateInfo>
```

**list_passphrase_keys_for_vault command:**
```rust
VaultManager.get_vault(vault_id)
KeyRegistry::load() // 🔴 INFRASTRUCTURE!
Filter keys for vault
→ Vec<PassphraseKeyInfo>
```

**Duplicated logic:**
- Load vault
- Load registry
- Filter by vault keys
- Convert to response DTOs

---

## ✅ Solution Design

### Principle: Logic Belongs in Service Layer

**Commands should be thin:**
```rust
let manager = KeyManager::new();
manager.list_keys(filter)
```

**Services contain logic:**
```rust
impl UnifiedKeyListService {
    async fn list_all_keys() {
        // Call YubiKeyManager
        // Call PassphraseManager
        // Aggregate results
    }
}
```

### Architecture After Fix

```
Commands
  ↓ uses
KeyManager (facade)
  ↓ delegates to
UnifiedKeyListService
  ↓ aggregates from
YubiKeyManager + PassphraseManager + KeyRegistryService
  ↓ use
Infrastructure
```

**NO circular dependencies!**

---

## 🔧 Refactoring Plan

### Phase 1: Make UnifiedKeyListService Self-Sufficient

**Milestone 1.1: Add Manager Dependencies**
- [ ] Add `yubikey_manager: YubiKeyManager` field to UnifiedKeyListService
- [ ] Add `vault_manager: VaultManager` field
- [ ] Update `new()` to initialize managers
- [ ] Import YubiKeyManager, VaultManager, PassphraseManager

**Milestone 1.2: Replace list_all_keys() Command Call**

Current (lines 56):
```rust
match list_yubikeys().await {  // 🔴 Command call
```

Fixed:
```rust
match self.yubikey_manager.list_connected_devices().await {
    Ok(devices) => {
        // Convert devices to YubiKeyStateInfo format
        // Build unified KeyInfo
    }
}
```

**Milestone 1.3: Replace list_vault_keys() Command Calls**

Current (line 108):
```rust
match list_passphrase_keys_for_vault(vault_id.clone()).await {  // 🔴
```

Fixed:
```rust
match self.vault_manager.get_vault(&vault_id).await {
    Ok(vault) => {
        let registry = self.registry_service.load_registry()?;
        // Filter passphrase keys that are in vault
        for key_id in &vault.keys {
            if let Some(KeyEntry::Passphrase { ... }) = registry.get_key(key_id) {
                // Build PassphraseKeyInfo
                // Convert to unified
            }
        }
    }
}
```

**Milestone 1.4: Replace list_available_for_vault() Command Calls**

Similar pattern - use managers instead of commands.

**Milestone 1.5: Replace list_connected_keys() Command Call**

Current (line 243):
```rust
match list_yubikeys().await {  // 🔴
```

Fixed:
```rust
match self.yubikey_manager.list_connected_devices().await {
```

**Milestone 1.6: Remove Command Imports**

Delete lines 10-14:
```rust
// DELETE THESE
use crate::commands::passphrase::{...};
use crate::commands::yubikey::device_commands::list_yubikeys;
use crate::commands::yubikey::vault_commands::list_available_yubikeys_for_vault;
```

**Milestone 1.7: Verify & Commit**
- [ ] `make validate-rust` - all 619 tests must pass
- [ ] Verify NO `use crate::commands` in any service file
- [ ] Commit: "refactor: eliminate circular dependency in UnifiedKeyListService"

---

### Phase 2: Fix Commands Calling Infrastructure

**Milestone 2.1: Add Methods to KeyRegistryService**

If not already present:
```rust
pub fn get_vault_passphrase_keys(&self, vault_id: &str) -> Result<Vec<PassphraseKeyInfo>>
pub fn get_available_passphrase_keys(&self, vault_id: &str) -> Result<Vec<PassphraseKeyInfo>>
```

**Milestone 2.2: Add Methods to KeyManager**

```rust
pub async fn get_vault_passphrase_keys(&self, vault_id: &str) -> Result<Vec<PassphraseKeyInfo>>
pub async fn get_vault_yubikeys(&self, vault_id: &str) -> Result<Vec<YubiKeyInfo>>
pub async fn get_available_passphrase_keys(&self, vault_id: &str) -> Result<Vec<PassphraseKeyInfo>>
pub async fn get_available_yubikeys(&self, vault_id: &str) -> Result<Vec<YubiKeyInfo>>
```

**Milestone 2.3: Update Commands to Use KeyManager**

Replace in 3 command files:
```rust
// OLD
let registry = KeyRegistry::load()?;  // 🔴 Infrastructure!

// NEW
let manager = KeyManager::new();
let keys = manager.get_vault_passphrase_keys(&vault_id).await?;
```

**Milestone 2.4: Verify & Commit**
- [ ] `rg "KeyRegistry::load\(\)" src-tauri/src/commands` returns ZERO
- [ ] `make validate-rust` passes
- [ ] Commit: "refactor: eliminate infrastructure access from commands"

---

## 📋 Detailed Execution Checklist

### Pre-Flight Checks
- [ ] Backup current state: `git commit` or `git stash`
- [ ] All 619 tests passing before starting
- [ ] Document current commit hash

### Phase 1 Execution

**Step 1.1: Update UnifiedKeyListService struct**
- [ ] Add manager fields
- [ ] Update new() method
- [ ] Handle async initialization for YubiKeyManager

**Step 1.2: Update list_all_keys()**
- [ ] Replace `list_yubikeys()` with `yubikey_manager.list_connected_devices()`
- [ ] Keep passphrase logic (already correct - uses registry)
- [ ] Test: Verify YubiKey listing works

**Step 1.3: Update list_vault_keys()**
- [ ] Replace `list_passphrase_keys_for_vault()` with vault/registry logic
- [ ] Already has YubiKey filtering logic (keep)
- [ ] Test: Verify vault key listing works

**Step 1.4: Update list_available_for_vault()**
- [ ] Replace both command calls with manager calls
- [ ] Test: Verify available keys correct

**Step 1.5: Update list_connected_keys()**
- [ ] Replace `list_yubikeys()` with manager call
- [ ] Test: Verify connected detection

**Step 1.6: Clean up imports**
- [ ] Remove command imports
- [ ] Add manager imports
- [ ] Verify no compilation errors

### Phase 2 Execution

**Step 2.1: Check if methods exist**
- [ ] Review KeyRegistryService methods
- [ ] Review KeyManager methods
- [ ] Add missing methods if needed

**Step 2.2: Update command files**
- [ ] `passphrase/vault_commands.rs` - 2 functions
- [ ] `yubikey/vault_commands.rs` - similar functions
- [ ] `key_menu_commands.rs` - key menu data

**Step 2.3: Verify**
- [ ] No `KeyRegistry::load()` in commands
- [ ] All tests passing

### Validation
- [ ] `make validate-rust` - all 619 tests
- [ ] Manual test: UI key listing works
- [ ] Manual test: Vault key operations work
- [ ] Check: NO `use crate::commands` in services
- [ ] Check: NO `Infrastructure::load()` in commands

---

## 🎯 Success Criteria

After completion:

- [ ] ✅ ZERO circular dependencies
- [ ] ✅ ZERO commands calling infrastructure
- [ ] ✅ 100% Command → Manager → Service flow
- [ ] ✅ All 619 tests passing
- [ ] ✅ Logic deduplicated (single source of truth)
- [ ] ✅ Clean architecture throughout

---

## 📝 Notes

**Estimated time:** 45-60 minutes

**Risk level:** Medium (touching multiple files, but clear pattern)

**Context available:** 685K tokens (68% remaining) - plenty of room

**Approach:** Systematic, one method at a time, validate frequently

---

## 🚀 Execution Log

_(Will be filled in as we execute)_

- [ ] Phase 1 started: [timestamp]
- [ ] Phase 1 complete: [timestamp]
- [ ] Phase 2 started: [timestamp]
- [ ] Phase 2 complete: [timestamp]
- [ ] Final validation: [timestamp]
- [ ] Commits: [hashes]

---

**Ready to execute!**
