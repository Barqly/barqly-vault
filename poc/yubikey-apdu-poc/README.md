# YubiKey APDU POC - PIN-Protected TDES Management Key

## Overview
This POC implements PIN-protected TDES management key setting using raw APDU commands, eliminating the need for the 50MB ykman binary.

## Approach
Instead of bundling ykman, we:
1. Use the existing `yubikey` crate for PIN/PUK changes (working)
2. Implement custom APDU commands for PIN-protected management key (this POC)
3. Store protection metadata for `age-plugin-yubikey` compatibility

## Implementation Details

### APDU Commands Used
1. **VERIFY PIN**: `00 20 00 80 08 [PIN padded to 8 bytes]`
2. **SET MANAGEMENT KEY**: `00 FF FF FF 1B 03 9B 18 [24-byte TDES key]`
3. **STORE METADATA**: `00 DB 3F FF [Length] [TLV-encoded protection data]`

### Key Features
- Generates random TDES keys with proper odd parity
- Supports touch policies (Never, Cached, Always)
- PIN verification before key operations
- Compatible with `age-plugin-yubikey` expectations

## Building and Running

```bash
# Build the POC
cd poc/yubikey-apdu-poc
cargo build

# Run with debug logging
RUST_LOG=debug cargo run --bin test-apdu
```

## Test Menu Options
1. **Test with default PIN (123456)** - For fresh YubiKeys
2. **Test with target PIN (212121)** - After PIN change
3. **Test with custom PIN** - Enter your own PIN
4. **Check PIN status** - Verify PIN validity
5. **Compare with ykman** - Shows equivalent ykman command
6. **Full initialization** - Complete setup sequence

## Integration Plan

Once tested and working:
1. Move APDU functions to main codebase
2. Replace ykman calls in existing code
3. Remove ykman binary dependency
4. Reduce app size from ~55MB to ~5MB

## Testing Checklist
- [ ] Basic management key setting works
- [ ] PIN verification succeeds
- [ ] Protection metadata stores correctly
- [ ] `age-plugin-yubikey` recognizes the protected key
- [ ] Touch policies work as expected
- [ ] Error handling for wrong PIN
- [ ] Compatibility with existing YubiKey setup

## Benefits
- **Size**: Eliminates 50MB ykman binary
- **Control**: Pure Rust implementation
- **Security**: No third-party binary in signed DMG
- **Performance**: Direct APDU is faster than spawning ykman