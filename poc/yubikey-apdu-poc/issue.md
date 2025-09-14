# YubiKey APDU Authentication Issue

## Problem Statement

We are trying to implement PIN-protected TDES management key setting for YubiKey PIV without using the `ykman` binary. The goal is to replicate the functionality of:
```bash
ykman piv access change-management-key --protect --touch-policy=cached
```

This is part of a hybrid approach to eliminate the 50MB ykman binary dependency while avoiding third-party code signing liability.

## Current Status

✅ **Working:**
- PIN change using yubikey-rs crate with "untested" feature
- PUK change using yubikey-rs crate with "untested" feature
- age-plugin-yubikey for key generation (after management key is set)

❌ **Not Working:**
- Setting PIN-protected TDES management key via raw APDU

## The Issue

When attempting to authenticate with the default management key using GENERAL AUTHENTICATE command, we get error `6A80` (Incorrect data parameter).

### APDU Commands Tried

We've tried multiple variations of the GENERAL AUTHENTICATE command to request a witness:

1. **With P1=0x00 (as per some Yubico docs):**
   ```
   00 87 00 9B 04 7C 02 80 00
   ```
   Result: `6A80` (Incorrect data parameter)

2. **With P1=0x03 (TDES algorithm):**
   ```
   00 87 03 9B 04 7C 02 80 00
   ```
   Result: `6A80` (Incorrect data parameter)

3. **With Le byte added:**
   ```
   00 87 03 9B 04 7C 02 80 00 00
   ```
   Result: `6A80` (Incorrect data parameter)

4. **Single authentication (tag 0x81):**
   ```
   00 87 00 9B 04 7C 02 81 00
   ```
   Result: `6A80` (Incorrect data parameter)

## Test Environment

- **YubiKey State:** PIV applet freshly reset (using ykman piv reset)
- **Expected Management Key:** Default (010203040506070801020304050607080102030405060708)
- **PIN:** Changed from default "123456" to "212121"
- **PUK:** Changed from default "12345678" to "212121"
- **YubiKey Model:** [Your YubiKey model/firmware version]

## Expected Flow (Based on ykman/Python Implementation)

1. **Select PIV Application:** `00 A4 04 00 05 A0 00 00 03 08` → Success ✅
2. **Verify PIN:** `00 20 00 80 08 [PIN padded with FF]` → Success ✅
3. **Authenticate with Management Key:**
   - Request witness: `00 87 ?? 9B 04 7C 02 80 00` → **FAILS with 6A80** ❌
   - Decrypt witness with 3DES-ECB using default key
   - Send back decrypted witness + challenge
   - Verify response
4. **Set New Management Key:** `00 FF FF FE [Lc] 03 9B 18 [24-byte-key]`
5. **Store Protection Metadata:** `00 DB 3F FF [Lc] [TLV data]`

## Research Questions

1. **Does YubiKey require authentication after a PIV reset?**
   - Some implementations suggest authentication might not be required immediately after reset
   - But attempting to set management key without auth also fails

2. **What is the correct P1 value for GENERAL AUTHENTICATE?**
   - Documentation conflicts: some say 0x00, others say 0x03 (algorithm)
   - Python ykman seems to use algorithm-specific values

3. **Is the witness request format correct?**
   - We're using: `7C 02 80 00` (dynamic auth template with empty witness request)
   - This matches documentation but YubiKey rejects it

4. **Firmware Version Differences?**
   - YubiKey 5.3.x and earlier only support TDES
   - YubiKey 5.4.2+ support AES keys
   - YubiKey 5.7+ default to AES-192
   - Could firmware version affect APDU format?

## Comparison with Working Implementation

The Python ykman implementation works correctly. From source code analysis:

```python
# ykman uses this structure (simplified):
response = protocol.send_apdu(
    0, 
    INS_AUTHENTICATE,  # 0x87
    key_type,          # Algorithm reference
    SLOT_CARD_MANAGEMENT,  # 0x9B
    Tlv(TAG_DYN_AUTH, Tlv(TAG_AUTH_WITNESS))
)
```

## Alternative Approaches to Consider

1. **Skip Authentication:** Try setting management key directly without prior authentication (might work after reset)
2. **Use Different Authentication Mode:** Try other combinations of tags/values
3. **Check Firmware-Specific Requirements:** Different YubiKey versions might need different approaches

## Code Location

- Implementation: `/poc/yubikey-apdu-poc/src/apdu.rs`
- Test harness: `/poc/yubikey-apdu-poc/src/main.rs` (Option 7 in menu)

## How to Reproduce

1. Reset YubiKey PIV: `ykman piv reset`
2. Run test: `cd poc/yubikey-apdu-poc && RUST_LOG=debug cargo run`
3. Select option 7 (HYBRID implementation)
4. Choose touch policy 2 (Cached)
5. Observe error in Step 3 (authentication)

## Help Needed

We need to determine:
1. The exact APDU format for GENERAL AUTHENTICATE that YubiKey accepts
2. Whether authentication is actually required after a PIV reset
3. If there's a simpler approach to set a PIN-protected management key

## References

- [Yubico PIV Authentication Documentation](https://docs.yubico.com/yesdk/users-manual/application-piv/apdu/auth-mgmt.html)
- [YubiKey Manager Python Source](https://github.com/Yubico/yubikey-manager/blob/main/yubikit/piv.py)
- [PIV NIST SP 800-73-4](https://csrc.nist.gov/publications/detail/sp/800-73/4/final)