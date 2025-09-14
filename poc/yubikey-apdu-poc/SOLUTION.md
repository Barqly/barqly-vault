# YubiKey APDU POC - Pragmatic Solution

## Problem Statement
After 3 days of debugging, we discovered that `age-plugin-yubikey` has very strict requirements for the management key format that are extremely difficult to replicate via raw APDU commands. The plugin specifically requires a PIN-protected TDES management key stored in a specific format that only `ykman` creates correctly.

## Final Solution: Pragmatic Hybrid Approach

### Components Used
1. **yubikey crate** - For PIN/PUK changes (works perfectly with "untested" feature)
2. **ykman** - ONLY for setting PIN-protected TDES management key (minimal usage)
3. **age-plugin-yubikey** - For age identity generation
4. **PTY emulation** - To automate PIN entry for age-plugin-yubikey

### Why This Approach Works

#### What We Keep From Our Code
- PIN/PUK changes via yubikey crate (no ykman needed)
- PTY automation for age-plugin-yubikey
- Complete programmatic control over the workflow

#### What We Delegate to ykman
- ONLY the management key setup (one command: `ykman piv access change-management-key -a TDES --protect`)
- This ensures 100% compatibility with age-plugin-yubikey

### Implementation Details

```rust
// Step 1 & 2: Use yubikey crate for PIN/PUK
change_pin_with_crate(old_pin, new_pin)?;
change_puk_with_crate(old_puk, new_pin)?;

// Step 3: Use ykman ONLY if management key isn't already protected TDES
ensure_protected_tdes_management_key(new_pin)?;

// Step 4: Use PTY for age-plugin-yubikey
generate_age_identity(new_pin, touch_policy, slot_name)?;
```

### Key Insights Discovered

1. **YubiKey 5.7+ defaults to AES-192**, not TDES after reset
2. **Protection metadata format is proprietary** - age-plugin-yubikey expects exact TLV structure
3. **Management key transitions are complex** - Can't change from protected to protected via APDU
4. **PIN prompt is invisible in PTY** - Must send PIN proactively after "Generating key..."

### Benefits of This Approach

1. **Minimal ykman usage** - Only one command, only when needed
2. **Guaranteed compatibility** - Works with age-plugin-yubikey out of the box
3. **No 50MB binary in app** - ykman only used during initial setup
4. **Maintains security** - PIN-protected TDES as required

### Testing

Run with:
```bash
RUST_LOG=info cargo run
```

**IMPORTANT**: You must TOUCH your YubiKey when it blinks during key generation!

### Future Improvements

If we want to eliminate ykman completely, we would need to:
1. Reverse engineer the exact TLV format ykman uses for protected keys
2. Handle all edge cases for management key state transitions
3. Possibly fork age-plugin-yubikey to be more flexible

For now, this pragmatic approach achieves our goals with minimal external dependencies.