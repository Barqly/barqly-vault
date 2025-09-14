# YubiKey APDU POC - Findings & Next Steps

## Summary
We successfully researched and documented the APDU specification for PIN-protected TDES management keys. However, implementation revealed that the `yubikey` crate (v0.8) has limitations that prevent direct APDU implementation.

## Key Findings

### 1. APDU Specification (✅ Documented)
Successfully identified the required APDU commands:
- **VERIFY PIN**: `00 20 00 80 08 [PIN padded]`
- **SET MGMT KEY**: `00 FF FF FF 1B 03 9B 18 [24-byte key]`
- **STORE METADATA**: `00 DB 3F FF [Length] [TLV data]`

### 2. YubiKey Crate Capabilities & Limitations
**Available with `features = ["untested"]`:**
- ✅ PIN change method (`change_pin`)
- ✅ PUK change method (`change_puk`)
- ✅ Basic PIV operations

**Not Available:**
- ❌ Raw APDU transmission (`Transaction` is private)
- ❌ PIN-protected TDES management key setting
- ❌ Custom metadata storage for protection flags

### 3. Implementation Options

#### Option A: Use pcsc-sys directly (Recommended)
```toml
[dependencies]
pcsc = "2.9"
pcsc-sys = "1.2"
```
- **Pros**: Full control over APDU commands, no external binaries
- **Cons**: More complex implementation, need to handle PC/SC directly

#### Option B: Fork/patch yubikey crate
- **Pros**: Cleaner API, can contribute back
- **Cons**: Maintenance burden, divergence from upstream

#### Option C: Hybrid approach
- Use `yubikey` crate for basic operations (PIN verify, auth)
- Use `pcsc` for raw APDU commands (management key setting)
- **Pros**: Best of both worlds
- **Cons**: Two dependencies

## Proof of Concept Status

### Completed ✅
1. Researched Python ykman implementation
2. Documented complete APDU specification
3. Created library structure for APDU implementation
4. Built test harness framework
5. Identified exact commands needed

### Partially Completed ⚠️
1. PIN/PUK changes work with `yubikey` crate + `untested` feature
2. Management key APDU still needs `pcsc-sys` for raw commands
3. Testing with real YubiKey pending

## Recommended Next Steps

### 1. Implement with pcsc-sys
Create a new implementation using `pcsc-sys` for raw APDU access:

```rust
use pcsc::{Card, Context, Protocols, Scope};

fn set_protected_mgmt_key(pin: &str, key: &[u8; 24]) -> Result<()> {
    let ctx = Context::establish(Scope::System)?;
    let mut card = ctx.connect(reader, Protocols::T1)?;
    
    // Send raw APDUs
    let verify_pin = build_verify_pin_apdu(pin);
    card.transmit(&verify_pin)?;
    
    let set_key = build_set_mgmt_key_apdu(key);
    card.transmit(&set_key)?;
    
    Ok(())
}
```

### 2. Test Integration Path
1. Implement raw APDU with pcsc-sys
2. Test with actual YubiKey
3. Verify age-plugin-yubikey recognizes the key
4. Integrate into main codebase
5. Remove ykman dependency

### 3. Size Comparison
- Current (with ykman): ~55MB
- With APDU implementation: ~5MB
- **Savings**: 50MB (90% reduction)

## Alternative: Keep ykman for now
If time is critical, consider:
1. Keep using ykman in PTY (already working)
2. Document ykman as required dependency
3. User installs ykman separately
4. Revisit APDU implementation later

## Conclusion

### What Works Now
- ✅ **Steps 1-2**: PIN/PUK changes work with `yubikey` crate + `untested` feature
- ✅ **Step 4**: Key generation works with `age-plugin-yubikey`

### What Still Needs Work  
- ⚠️ **Step 3**: PIN-protected TDES management key requires raw APDU via `pcsc-sys`

### The Hybrid Solution
As you originally planned in SSD1409.1:
1. Use `yubikey` crate for PIN/PUK (working!)
2. Implement APDU for management key (needs `pcsc-sys`)
3. Use `age-plugin-yubikey` for generation (working!)

This approach would eliminate the 50MB ykman binary while reusing existing working components.