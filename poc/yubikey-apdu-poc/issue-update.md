# YubiKey APDU Authentication Issue - Update

## Problem Statement

We are implementing PIN-protected TDES management key setting for YubiKey PIV without using the `ykman` binary. The goal is to replicate:
```bash
ykman piv access change-management-key --protect --touch-policy=cached
```

## Key Discovery (Thanks to ChatGPT)

**The issue was using the wrong algorithm!** On YubiKey firmware 5.7+, the default management key uses **AES-192**, not TDES:
- P1=0x0A for AES-192 (firmware 5.7+)
- P1=0x03 for TDES (older firmware)

## Current Implementation Status

### ✅ Working:
1. PIN/PUK changes using yubikey-rs crate
2. AES-192 authentication gets proper challenge response
3. Single authentication flow structure is correct

### ❌ Still Failing:
1. AES-192 authentication response validation (error 0x6982)
2. TDES fallback still returns 0x6A80

## Test Results

### With AES-192 (P1=0x0A):
```
Request:  00 87 0A 9B 04 7C 02 81 00
Response: 7C 12 81 10 [16-byte-challenge] 90 00  ✅ Success!
```

### Authentication Response:
```
Request:  00 87 0A 9B 0C 7C 0A 82 08 [encrypted-response]
Response: 69 82  ❌ Security condition not satisfied
```

## The Problem

The AES-192 encryption of the challenge isn't matching what YubiKey expects. We're:
1. Taking first 8 bytes of the 16-byte challenge
2. Padding to 16 bytes with zeros
3. Encrypting with AES-192 ECB
4. Returning first 8 bytes

But YubiKey is rejecting our encrypted response.

## Questions

1. **For 16-byte challenges with AES-192:**
   - Should we encrypt all 16 bytes instead of just first 8?
   - Is the padding strategy wrong?

2. **Key format:**
   - Is the default management key the same 24 bytes for both TDES and AES-192?
   - Do we need to derive a different key for AES-192?

## Code Location

- Implementation: `/poc/yubikey-apdu-poc/src/apdu.rs`
- Function: `encrypt_aes192()` at line 279

## Next Steps

Need to determine the correct AES-192 encryption format for YubiKey authentication challenges.