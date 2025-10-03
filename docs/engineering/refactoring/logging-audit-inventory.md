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

- [ ] `crypto/infrastructure/age_operations.rs` - Review debug! calls
- [ ] `key_management/yubikey/infrastructure/age/provider_pty.rs` - PTY state machine logs
- [ ] `key_management/yubikey/infrastructure/age/pty_helpers.rs` - Helper logs
- [ ] `key_management/yubikey/infrastructure/pty/age_ops/*` - Age operation logs
- [ ] `key_management/yubikey/infrastructure/pty/ykman_ops/*` - YKMan logs
- [ ] `key_management/yubikey/infrastructure/pty/core.rs` - PTY core logs

### Priority 2: Application Services (Medium Volume)

- [ ] `crypto/application/services/encryption_service.rs` - Review info! calls
- [ ] `crypto/application/services/decryption_orchestration_service.rs`
- [ ] `file/application/services/archive_service.rs`
- [ ] `file/application/services/manifest_service.rs`
- [ ] `key_management/shared/application/services/registry_service.rs`
- [ ] `key_management/yubikey/application/manager.rs`
- [ ] `key_management/yubikey/application/services/*`

### Priority 3: File Operations (Low Volume, Keep Most)

- [ ] `file/infrastructure/file_operations/archive_operations/creation.rs`
- [ ] `file/infrastructure/file_operations/archive_operations/extraction.rs`
- [ ] `file/infrastructure/file_operations/staging.rs`
- [ ] `file/infrastructure/file_operations/validation/*`

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

**Completed:** 0/48 files
**Log Statements Removed:** 0
**Log Statements Enhanced:** 0

Update after each file processed.
