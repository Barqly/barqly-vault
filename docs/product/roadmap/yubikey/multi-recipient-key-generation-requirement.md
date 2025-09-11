# Multi-Recipient Key Generation Backend Requirement

## Problem Statement

The frontend YubiKey workflow is **completely broken** because the backend `generate_key` command only supports passphrase-only mode. When users select YubiKey-only or Hybrid protection modes and click "Create Key", they get a "Passphrase is required" error even though no passphrase should be needed for YubiKey-only mode.

## Current Situation

### Frontend State ✅ FIXED
- YubiKey detection working (no more crashes)
- Validation logic working (Create Key button activates)
- UI workflow complete (proper view transitions)

### Backend State ❌ MISSING
- `generate_key` command requires passphrase (hardcoded)
- No YubiKey-compatible key generation
- No multi-recipient encryption support

## Required Backend Implementation

### 1. Enhanced GenerateKeyInput Interface

**Current** (passphrase-only):
```rust
struct GenerateKeyInput {
    label: String,
    passphrase: String,  // Always required
}
```

**Required** (multi-protection mode):
```rust
struct GenerateKeyInput {
    label: String,
    passphrase: Option<String>,      // Optional for YubiKey-only mode
    protection_mode: ProtectionMode, // New field
    yubikey_device_id: Option<String>, // For YubiKey modes
    yubikey_info: Option<YubiKeyInfo>, // YubiKey configuration
}

enum ProtectionMode {
    PassphraseOnly,
    YubiKeyOnly,
    Hybrid { yubikey_serial: String },
}
```

### 2. Updated Key Generation Logic

The `generate_key` command must handle three modes:

#### **Mode 1: PassphraseOnly** (existing logic)
- Requires: `label` + `passphrase`
- Generates: Standard age keypair with passphrase protection
- Recipients: `[passphrase_recipient]`

#### **Mode 2: YubiKeyOnly** (NEW - currently missing)
- Requires: `label` + `yubikey_device_id`
- Generates: Age keypair + initializes YubiKey for age-plugin-yubikey
- Recipients: `[yubikey_recipient]`
- **Critical**: Must handle YubiKey initialization if not already configured for age

#### **Mode 3: Hybrid** (NEW - currently missing)
- Requires: `label` + `passphrase` + `yubikey_device_id`
- Generates: Age keypair with both protection methods
- Recipients: `[passphrase_recipient, yubikey_recipient]`

### 3. YubiKey Initialization Integration

**Key Requirement**: The backend must handle YubiKey initialization seamlessly:

```rust
// If YubiKey not configured for age-plugin-yubikey:
if !yubikey_has_age_identity(&device_id) {
    // Initialize YubiKey for age encryption
    let identity = initialize_yubikey_for_age(&device_id, &pin)?;
    // Use the new identity for key generation
}
```

This eliminates the need for users to run manual `age-plugin-yubikey --generate` commands.

### 4. Error Handling Updates

Add proper error codes for YubiKey key generation:
- `YUBIKEY_INITIALIZATION_REQUIRED`
- `YUBIKEY_NOT_CONFIGURED_FOR_AGE`
- `MULTI_RECIPIENT_GENERATION_FAILED`

## Success Criteria

### Frontend Integration
After backend implementation, the frontend should be able to call:

```typescript
// YubiKey-only mode
await safeInvoke('generate_key', {
  label: 'My Vault',
  protection_mode: 'YubiKeyOnly',
  yubikey_device_id: device.device_id
});

// Hybrid mode  
await safeInvoke('generate_key', {
  label: 'My Vault', 
  passphrase: 'strong-passphrase',
  protection_mode: 'Hybrid',
  yubikey_device_id: device.device_id
});
```

### Type Generation Requirements

After backend implementation, the backend engineer **MUST**:

1. **Update types**: Run `cargo build --features generate-types`
2. **Update api-types.ts**: Follow documented process in `/docs/architecture/frontend/ux-engineer-onboarding.md`
3. **Update tauri-safe.ts**: Add new command to `commandParameterMap`
4. **Test end-to-end**: Verify frontend can call new API

## Priority: CRITICAL - BLOCKING

This is **blocking the entire YubiKey feature**. The frontend workflow is complete but unusable without backend support.

## Testing Requirements

The backend engineer should:
1. **Test YubiKey-only key generation** with hardware
2. **Test hybrid mode key generation** 
3. **Verify YubiKey initialization** works for new devices
4. **Ensure type generation** produces correct TypeScript interfaces

---

**This requirement must be implemented before YubiKey functionality can be considered complete.**