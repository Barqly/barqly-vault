# TODO Audit - 2025-10-02

## Summary
Found 20 TODO comments in production code. Analysis reveals most are either:
1. Already implemented (stale comments)
2. Not needed (incorrect assumptions)
3. Future enhancements (should be GitHub issues)

---

## CRITICAL (Must Fix Now)

### 1. ❌ **unified_keys.rs:203** - Hardcoded timestamp
```rust
created_at: chrono::DateTime::parse_from_rfc3339("2025-01-01T00:00:00Z")
    .unwrap()
    .with_timezone(&chrono::Utc), // TODO: Get real timestamp
```

**Analysis:** KeyInfo (from unified list) doesn't have created_at, but KeyReference (target) needs it.
**Action:** Add created_at/last_used to KeyInfo struct, get from registry

---

## HIGH (Incomplete Features - Need Review)

### 2. **yubikey/crypto_commands.rs:62** - Implement YubiKey decryption
```rust
// TODO: Implement proper YubiKey decryption logic
```
**Status:** Check if this is placeholder or real gap
**Action:** Review and implement or remove

### 3. **yubikey/device_commands.rs:155** - YubiKey registration
```rust
// TODO: Implement YubiKey registration with YubiKeyManager
```
**Status:** Check if registration already works
**Action:** Verify functionality, remove if complete

### 4. **crypto/progress.rs:108** - Status tracking
```rust
// TODO: Implement actual status tracking
```
**Status:** Check if progress system already works
**Action:** Verify, remove if implemented

### 5. **crypto/manifest.rs:104** - File count
```rust
file_count: 0, // TODO: Get from manager if needed
```
**Status:** Check if file_count is used by UI
**Action:** Implement or remove field if not needed

---

## MEDIUM (Architecture/Refactoring Notes)

### 6-7. **services/mod.rs:60,91** - Passphrase abstractions
```rust
// TODO: Implement common abstractions after passphrase refactoring is complete
// TODO: Add after passphrase refactoring
```
**Status:** Passphrase refactoring is complete
**Action:** Remove or implement now

### 8. **registry_service.rs:6** - Vault integration
```rust
//! TODO: Integration with vault management to be handled by higher-level services
```
**Status:** Check if integration exists
**Action:** Document pattern or remove

### 9-11. **registry_service.rs:457,461,465** - Device metadata storage
```rust
/// TODO: Store form factor and interfaces in registry
_slot: u8, // TODO: Store slot mapping in device metadata
// TODO: This is a temporary solution - should store actual values
```
**Status:** Enhancement for better device reconstruction
**Action:** Create GitHub issue, remove comments

### 12. **metadata.rs:280** - Async YubiKeyManager
```rust
// TODO: Replace with async YubiKeyManager.is_device_connected() when available
```
**Status:** Check if async version exists
**Action:** Implement or remove

---

## LOW (Future Enhancements)

### 13. **provider_pty.rs:350** - PTY for decryption
```rust
// TODO: Consider PTY for age decryption as well if it needs PIN input
```
**Action:** Create GitHub issue, remove comment

### 14. **archive_service.rs:172** - Dialog integration
```rust
// TODO: Implement proper dialog integration with tauri-plugin-dialog
```
**Action:** Create GitHub issue, remove comment

### 15. **pty_helpers.rs:187** - Tauri event
```rust
// TODO: Emit Tauri event here
```
**Action:** Implement or create issue

### 16-19. **factory.rs:112,130,150,168** - Service trait (4x)
```rust
// TODO: Implement Service trait for all service implementations
```
**Action:** Create single GitHub issue for trait implementation

### 20. **manager.rs:603** - Integration tests
```rust
// TODO: Add integration tests with mock services
```
**Action:** Create GitHub issue, remove comment

---

## Recommended Actions

1. **Fix #1 (CRITICAL):** Add timestamps to KeyInfo domain model
2. **Review #2-5 (HIGH):** Verify if implemented, remove if yes
3. **Remove #6-20 (MEDIUM/LOW):** Create GitHub issues for real work, delete stale comments

---

## Next Steps

Waiting for your direction on how to handle each category.
