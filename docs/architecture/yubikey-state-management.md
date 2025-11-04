# YubiKey State Management

**Version:** 2.0
**Date:** 2025-11-04
**Purpose:** Technical reference for YubiKey registration workflow and architectural decisions

## Overview

Barqly Vault supports 4 distinct YubiKey states, each requiring different initialization steps. The backend detects state via hardware inspection, frontend displays appropriate forms, and real-time progress events enable precise "Touch your YubiKey" timing.

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

## Architecture Decisions

### Progress Updates: Events vs Polling

**Decision:** YubiKey initialization uses **event-based progress** for precise touch message timing.

**Why Events (not Polling):**
- ✅ Real-time updates DURING operation execution
- ✅ No timing guesswork or hardcoded delays
- ✅ Frontend receives updates while `await` blocks
- ✅ Professional UX with precise touch prompts

**Implementation:**
```rust
pub async fn init_yubikey(
    window: tauri::Window,  // Tauri auto-injects, not in TypeScript signature
) -> Result<...> {
    // Emit events during execution
    window.emit("yubikey-init-progress", progress_update)?;
}
```

**Frontend pattern:**
```typescript
const unlisten = await safeListen('yubikey-init-progress', (event) => {
  if (event.payload.details?.phase === 'WaitingForTouch') {
    setShowTouchMessage(true);  // Show exactly when backend needs it
  }
});
await commands.initYubikey(...);
unlisten();
```

---

### Comparison: YubiKey vs Decryption/Encryption

**Decryption/Encryption Pattern:**
- Have `_window: Window` parameter (unused, hence underscore prefix)
- Do NOT emit events (no `window.emit()` calls)
- Frontend shows touch message **statically** based on key type
- Progress phases determined by **progress percentage ranges** (0-10, 10-20, etc.)
- Works fine because touch is needed IMMEDIATELY before decryption starts (no delay)

**YubiKey Init Pattern:**
- Has `window: Window` parameter (NO underscore - actively used)
- DOES emit events (`window.emit("yubikey-init-progress", ...)`)
- Frontend shows touch message **event-driven** when phase = WaitingForTouch
- More sophisticated because touch needed AFTER ykman operations (~1.5s delay)

**Why the difference:**
- **Decryption:** Touch needed immediately → static message works perfectly
- **YubiKey Init:** Touch needed after PIN/PUK/mgmt setup → events provide precise timing

**Common infrastructure:**
- Both use `safeListen()` in frontend (enc/dec have placeholder for future events)
- Both store progress in global HashMap (`update_global_progress()`)
- YubiKey additionally emits events for real-time updates

---

### PTY and Touch Detection

**Critical Implementation Detail:**

**For ykman operations (non-interactive):**
```rust
// Don't use PTY when passing credentials via flags
run_ykman_command(args, None)  // None = simple Command execution
```

**Platform difference discovered:**
- Linux PTY: `reader.lines()` blocks indefinitely without trailing newline
- macOS PTY: Handles EOF more gracefully
- Solution: Use simple Command execution for non-interactive ykman commands

**For age-plugin-yubikey (interactive):**
```rust
// Use PTY with touch detection
run_age_plugin_yubikey(args, Some(pin), expect_touch=true)
```

**Why this works:**
- PTY needed to detect "Touch your YubiKey" prompt from age-plugin
- Touch detection essential for proper UX
- 60-second timeout prevents hangs

---

### YubiKey OTP Prevention

**Problem:** YubiKey acts as USB keyboard, types OTP characters when touched

**Solution in Frontend:**
```typescript
// On form submit:
(document.activeElement as HTMLElement)?.blur();  // Remove focus
setFormReadOnly(true);  // Block typing (not disabled - stays visible)
```

**Why this matters:**
- User might touch early (before backend needs it)
- YubiKey types 'cccxxxyyy...' into focused field
- Blurring prevents OTP from entering form
- Read-only blocks typing without hiding UI

---

## Event Names

**For Frontend Event Listeners:**

| Scenario | Command | Event Name | When to Listen |
|----------|---------|------------|----------------|
| NEW | `init_yubikey` | `'yubikey-init-progress'` | Before command call |
| REUSED (no TDES) | `complete_yubikey_setup` | `'yubikey-complete-progress'` | Before command call |
| REUSED (has TDES) | `generate_yubikey_identity` | `'yubikey-generate-progress'` | Before command call |
| ORPHANED | `register_yubikey` | None (instant operation) | N/A |

**Event payload:** `GetProgressResponse` with `YubiKeyOperation` details

**Critical phases:**
- `Starting` (0%) - Operation begins
- `WaitingForTouch` (75%) - Show touch message NOW
- `Completed` (100%) - Operation done

---

## Quick Reference

| State | PIN Form? | Touch? | Command | Event Name |
|-------|-----------|--------|---------|------------|
| NEW | PIN+PUK | Yes | `init_yubikey` | `yubikey-init-progress` |
| REUSED (no TDES) | PIN only | Yes | `complete_yubikey_setup` | `yubikey-complete-progress` |
| REUSED (has TDES) | PIN only | Yes | `generate_yubikey_identity` | `yubikey-generate-progress` |
| ORPHANED | No PIN | No | `register_yubikey` | None |

---

## Key Takeaways for New Engineers

1. **YubiKey has 4 distinct states** - Detection logic in `manager.rs`, differentiated by PIN status, TDES status, and age identity presence

2. **Two binaries used:**
   - `ykman`: PIV operations (PIN/PUK/mgmt changes) - no touch required
   - `age-plugin-yubikey`: Age identity generation - touch required

3. **PTY usage is selective:**
   - Don't use PTY for non-interactive commands (causes hangs on Linux)
   - Use PTY only for age-plugin (needs touch detection)

4. **Progress events are YubiKey-specific:**
   - Decryption/encryption use static touch messages (immediate need)
   - YubiKey uses real-time events (delayed need after setup)
   - Both patterns valid for their use cases

5. **Touch timing matters:**
   - NEW: Touch needed ~1.5s after submit (after PIN/PUK/mgmt)
   - Events ensure message appears exactly when backend ready
   - Prevents YubiKey OTP typing into form fields

6. **Window parameter:**
   - Tauri auto-injects (doesn't appear in TypeScript)
   - Prefix with `_` if unused (suppresses warnings)
   - No prefix if actively calling `.emit()`
