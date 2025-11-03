# YubiKey State Management

**Version:** 1.0
**Date:** 2025-11-02
**Purpose:** Technical reference for YubiKey registration workflow

## Overview

Barqly Vault supports 4 distinct YubiKey states, each requiring different initialization steps. The backend detects state via hardware inspection, and the frontend displays appropriate forms.

---

## The 4 States

### 1. NEW (Factory Default)

**Detection:**
```
PIN: 123456 (default)
PUK: 12345678 (default)
Mgmt Key: Default (AES192)
Age Identity: None
```

**Backend Detection:**
- `has_default_pin()` → true
- `has_identity()` → false

**Required Operations:**
1. Change PIN from default (no touch)
2. Change PUK from default (no touch)
3. Change mgmt key to TDES+protected (no touch)
4. Generate age identity (requires touch)

**Command:** `init_yubikey(serial, new_pin, recovery_pin, label)`

**Touch Required:** Yes (during age key generation)

---

### 2. REUSED - No TDES

**Detection:**
```
PIN: Custom (changed)
PUK: Custom (changed)
Mgmt Key: NOT TDES+protected (default or AES192)
Age Identity: None
```

**Backend Detection:**
- `has_default_pin()` → false
- `has_identity()` → false
- `has_tdes_protected_mgmt_key()` → false

**Required Operations:**
1. Change mgmt key to TDES+protected (no touch)
2. Generate age identity (requires touch)

**Command:** `complete_yubikey_setup(serial, pin, label)`

**Touch Required:** Yes (during age key generation)

---

### 3. REUSED - Has TDES

**Detection:**
```
PIN: Custom (changed)
PUK: Custom (changed)
Mgmt Key: TDES+protected ✓
Age Identity: None
```

**Backend Detection:**
- `has_default_pin()` → false
- `has_identity()` → false
- `has_tdes_protected_mgmt_key()` → true

**Required Operations:**
1. Generate age identity (requires touch)

**Command:** `generate_yubikey_identity(serial, pin, label)`

**Touch Required:** Yes (during age key generation)

---

### 4. ORPHANED (Fully Initialized)

**Detection:**
```
PIN: Custom (changed)
PUK: Custom (changed)
Mgmt Key: TDES+protected ✓
Age Identity: EXISTS ✓
Registry: Not present
```

**Backend Detection:**
- `in_registry` → false
- `has_identity()` → true

**Required Operations:**
1. Read existing identity (no authentication needed)
2. Add to registry

**Command:** `register_yubikey(serial, label, pin: null)`

**Touch Required:** No (just reading public identity)

**Important:** PIN should NOT be requested - we're only reading the public age identity, not performing any crypto operations.

---

## State Detection Logic

**File:** `yubikey/application/manager.rs:145-163`

```rust
let state = match (in_registry, has_identity) {
    (true, true) => Registered,
    (false, true) => Orphaned,
    (false, false) => {
        if has_default_pin() { New } else { Reused }
    }
};
```

**For REUSED state, check TDES:**
```rust
let has_tdes = has_tdes_protected_mgmt_key(serial)?;
// Frontend uses this to differentiate Scenario 2 vs 3
```

---

## API Response

**Type:** `YubiKeyStateInfo`

```typescript
{
  serial: string;
  state: "new" | "reused" | "orphaned" | "registered";
  has_tdes_protected_mgmt_key: boolean;  // Key field for UI logic
  pin_status: "default" | "custom";
  recipient: string | null;
  identity_tag: string | null;
  firmware_version: string | null;
  lifecycle_status: KeyLifecycleStatus;
}
```

---

## Frontend UI Mapping

```typescript
if (state === "new") {
  return <PinPukForm command="initYubikey" />;
}

if (state === "reused") {
  if (!has_tdes_protected_mgmt_key) {
    return <PinOnlyForm command="completeYubikeySetup" />;  // Scenario 2
  } else {
    return <PinOnlyForm command="generateYubikeyIdentity" />;  // Scenario 3
  }
}

if (state === "orphaned") {
  return <KeyDisplayForm command="registerYubikey" showPin={false} />;  // Scenario 4
}
```

---

## Touch Detection

**Binary:** `age-plugin-yubikey` (for identity generation)

**Detection:** PTY watches for "👆 Please touch the YubiKey" prompt

**Implementation:** `run_age_plugin_yubikey(args, pin, expect_touch=true)`

**Critical:** Must pass `expect_touch=true` for identity generation commands

**Touch Policy:** `cached` (touch required on first use, cached for 15 seconds)

---

## ykman vs age-plugin-yubikey

| Operation | Binary | Touch Required? |
|-----------|--------|-----------------|
| Change PIN | ykman | No |
| Change PUK | ykman | No |
| Change mgmt key | ykman | No |
| Generate age identity | age-plugin-yubikey | Yes |
| Decrypt | age-plugin-yubikey | Yes (if touch policy requires) |

**Key insight:** Only `age-plugin-yubikey` operations require touch, not `ykman` PIV operations.

---

## DELETE Behavior

**PreActivation/Destroyed keys:**
- Actually removed from registry (allows re-registration)

**Active/Suspended keys:**
- Marked as destroyed (safer for keys attached to vaults)

**File:** `commands/key_management/delete_key.rs:137-167`

---

## Common Issues

### Issue: "YubiKey already registered" after DELETE
**Cause:** Key marked as destroyed, not removed
**Fix:** DELETE now removes PreActivation keys completely

### Issue: Touch not detected on Linux
**Cause:** `expect_touch=false` in identity generation
**Fix:** Changed to `expect_touch=true` in `identity_service.rs:357`

### Issue: ORPHANED key asks for PIN
**Cause:** UI showing PIN form unnecessarily
**Fix:** Frontend checks state and hides PIN for orphaned

### Issue: Same form for all REUSED keys
**Cause:** No TDES detection
**Fix:** Backend provides `has_tdes_protected_mgmt_key` field

---

## Key Files

| File | Purpose |
|------|---------|
| `yubikey/application/manager.rs` | State detection logic |
| `yubikey/infrastructure/pty/ykman_ops/pin_operations.rs` | TDES detection |
| `commands/yubikey/device_commands.rs` | All registration commands |
| `domain/models/yubikey_state_info.rs` | API response structure |
| `infrastructure/pty/age_ops/identity.rs` | Age key generation |

---

## Testing Checklist

**NEW YubiKey:**
- [ ] Shows PIN+PUK form
- [ ] Touch prompt appears after submission
- [ ] All 4 operations complete (PIN, PUK, mgmt, age key)

**REUSED without TDES:**
- [ ] Shows PIN-only form
- [ ] Message mentions mgmt key + age key
- [ ] Touch prompt appears
- [ ] Mgmt key changed to TDES
- [ ] Age key generated

**REUSED with TDES:**
- [ ] Shows PIN-only form
- [ ] Message mentions only age key
- [ ] Touch prompt appears
- [ ] Age key generated (mgmt key unchanged)

**ORPHANED:**
- [ ] Shows key display (NO PIN input)
- [ ] No touch message
- [ ] Registers immediately
- [ ] No PIN validation occurs

**DELETE:**
- [ ] PreActivation key actually removed
- [ ] Can re-register same YubiKey
- [ ] No "already registered" error

---

## Quick Reference

| State | PIN Form? | Touch? | Command | What Happens |
|-------|-----------|--------|---------|--------------|
| NEW | PIN+PUK | Yes | `init_yubikey` | Change PIN/PUK/mgmt → gen age key |
| REUSED (no TDES) | PIN only | Yes | `complete_yubikey_setup` | Change mgmt → gen age key |
| REUSED (has TDES) | PIN only | Yes | `generate_yubikey_identity` | Gen age key only |
| ORPHANED | No PIN | No | `register_yubikey` | Read identity → register |
