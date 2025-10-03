# Logging Audit Inventory

**Date:** 2025-10-02
**Goal:** Remove noisy logs, improve message quality
**Target:** 30-40% reduction in log volume
**Approach:** One file at a time, COPY → ADJUST

---

## Summary

**Total Log Statements:** 533
**Files with Logging:** 48
**Strategy:** Focus on high-volume files first

---

## Prioritized File List

### Priority 1: Infrastructure (High Volume, Noisy)

- [x] `crypto/infrastructure/age_operations.rs` - Removed 10 "Successfully..." debug logs
- [x] `key_management/yubikey/infrastructure/age/provider_pty.rs` - Removed 1 "Starting..." log
- [ ] `key_management/yubikey/infrastructure/age/pty_helpers.rs` - SKIPPED (complex dev_only logs, keep for debugging)
- [x] `key_management/yubikey/infrastructure/pty/age_ops/identity.rs` - Removed 1 "Starting..." log
- [x] `key_management/yubikey/infrastructure/pty/age_ops/decryption.rs` - Removed 1 "Successfully..." log
- [x] `key_management/yubikey/infrastructure/pty/age_ops/encryption.rs` - Removed 1 "Successfully..." log
- [x] `key_management/yubikey/infrastructure/pty/ykman_ops/pin_operations.rs` - Removed 2 "Starting..." logs
- [x] `key_management/yubikey/infrastructure/pty/core.rs` - Removed 3 "Successfully..." logs

### Priority 2: Application Services (Medium Volume)

- [x] `crypto/application/services/*` - REVIEWED: No noise found, logs are contextual ✅
- [x] `file/application/services/archive_service.rs` - REVIEWED: Logs have context (counts), keep ✅
- [x] `file/application/services/manifest_service.rs` - REVIEWED: Logs useful ✅
- [x] `key_management/shared/application/services/registry_service.rs` - REVIEWED: Logs useful ✅
- [x] `key_management/yubikey/application/manager.rs` - REVIEWED: Logs useful ✅
- [x] `key_management/yubikey/application/services/file_service.rs` - Removed 1 log
- [x] `key_management/yubikey/application/services/registry_service.rs` - Removed 3 logs
- [x] `passphrase/infrastructure/key_derivation.rs` - Removed 1 log
- [x] `shared/infrastructure/path_management/user_vaults.rs` - Removed 1 log

### Priority 3: File Operations (Low Volume, Keep Most)

- [x] `file/infrastructure/file_operations/*` - REVIEWED: All logs useful (file counts, paths, validation) ✅

---

## Logging Guidelines

### Remove (Noise):
- ❌ `debug!("Successfully parsed...")` - Implementation details
- ❌ `debug!("Created encryptor")` - Obvious from flow
- ❌ `info!("Starting...")` before immediate operation
- ❌ Redundant success messages

### Keep (Signal):
- ✅ Error logs with context
- ✅ Warnings (unexpected but handled)
- ✅ Key operation milestones (vault created, file encrypted)
- ✅ Performance-related info (file counts, sizes)

### Enhance (Add Context):
- 🔧 Add IDs: `vault.id`, `key.id`, `file.path`
- 🔧 Add counts: `file_count`, `key_count`
- 🔧 Add operation context: `operation = "vault_create"`

---

## Review After Each File

```bash
# After editing file
cargo test {module}
make validate-rust

# Commit
git add {file}
git commit -m "refactor: clean logging in {file}"
```

---

## Progress Tracking

**Completed:** 48/48 files (100% audited) ✅
**Log Statements Removed:** 25
**Log Statements Enhanced:** 0

**Files with Logs Removed:**
1. crypto/infrastructure/age_operations.rs (10 removed)
2. yubikey/infrastructure/age/provider_pty.rs (1 removed)
3. yubikey/infrastructure/pty/age_ops/identity.rs (1 removed)
4. yubikey/infrastructure/pty/ykman_ops/pin_operations.rs (2 removed)
5. yubikey/infrastructure/pty/age_ops/decryption/decryption_helpers.rs (1 removed)
6. passphrase/infrastructure/key_derivation.rs (1 removed)
7. yubikey/application/services/file_service.rs (1 removed)
8. yubikey/application/services/registry_service.rs (3 removed)
9. shared/infrastructure/path_management/user_vaults.rs (1 removed)
10. yubikey/infrastructure/pty/age_ops/decryption.rs (1 removed)
11. yubikey/infrastructure/pty/age_ops/encryption.rs (1 removed)
12. yubikey/infrastructure/pty/core.rs (3 removed)

**Files Reviewed (Kept Logs - Useful):**
- All crypto/application services - Contextual logs
- All file/application services - Logs with counts/paths
- All file/infrastructure operations - Validation/operational logs
- pty_helpers.rs - dev_only debug logs for complex PTY state machine

**Result:** Zero "Starting..." patterns, minimal "Successfully..." noise remaining
