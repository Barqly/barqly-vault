# YubiKey PIN-Protected TDES Management Key APDU Specification

## Overview
This document specifies the APDU commands required to set a PIN-protected TDES management key on a YubiKey PIV applet, compatible with `age-plugin-yubikey`.

## Research Findings

### Core Components
Based on analysis of ykman, yubico-piv-tool, and yubikey-manager sources:

1. **Basic Management Key Setting** uses standard PIV commands
2. **PIN-Protected Storage** requires additional metadata storage
3. **TDES Key Format** is 24 bytes (3 x 8-byte DES keys)

## APDU Command Specifications

### 1. SET MANAGEMENT KEY Command

**Basic Structure:**
```
CLA: 0x00
INS: 0xFF (YKPIV_INS_SET_MGMKEY)
P1:  0xFF
P2:  0xFF (no touch) or 0xFE (touch required)
```

**Data Field Format:**
```
[Algorithm Type] + [TLV Structure]
```

Where:
- Algorithm Type: `0x03` for TDES
- TLV Structure: Tag `0x9B` (SLOT_CARD_MANAGEMENT) + Length + Key Data

**Example APDU for TDES:**
```
00 FF FF FF 1B              # Header (CLA INS P1 P2 Lc)
03                          # Algorithm: TDES
9B 18                       # Tag 0x9B, Length 24 bytes
[24 bytes of key data]      # The TDES key
```

### 2. PIN-Protected Management Key Storage

For PIN-protected keys, two operations are required:

#### Step 1: Set the Management Key
Same as basic management key setting above.

#### Step 2: Store Protected Metadata

**PUT DATA Command for Protected Storage:**
```
CLA: 0x00
INS: 0xDB (PUT DATA)
P1:  0x3F
P2:  0xFF
```

**Data Structure for Protected Metadata:**
```
5C XX                       # Tag list
  [Object ID bytes]         # Target object for metadata
53 XX                       # Data object
  88 XX                     # Protected data tag
    89 XX                   # Management key indicator
      [Protection flags]    # Indicates PIN-protected
```

### 3. Object IDs for Storage

Based on the research:
- **PIVMAN Data Object**: `0x5F FF00` (vendor-specific)
- **PIVMAN Protected Data**: `0x5F FF01` (vendor-specific)

### 4. Complete Sequence for PIN-Protected TDES

1. **Verify PIN** (if not already verified)
   ```
   00 20 00 80 08 [PIN padded to 8 bytes with 0xFF]
   ```

2. **Set Management Key**
   ```
   00 FF FF FF 1B 03 9B 18 [24-byte TDES key]
   ```

3. **Store Protection Metadata**
   ```
   00 DB 3F FF [Length] [TLV-encoded protection data]
   ```

## Implementation Approach

### Phase 1: Basic Management Key Setting
Implement the standard SET MANAGEMENT KEY APDU without protection.

### Phase 2: Protected Storage
Add the metadata storage for PIN protection compatibility.

### Phase 3: Integration
Ensure the implementation works with `age-plugin-yubikey`.

## Key Considerations

1. **Key Generation**: For security, generate random TDES keys rather than using fixed values
2. **Weak Key Checking**: Verify the TDES key doesn't match known weak keys
3. **PIN Verification**: Must verify PIN before accessing protected functions
4. **Error Handling**: Handle common errors:
   - `6982`: Security condition not satisfied (need PIN verification)
   - `6A80`: Incorrect data parameter
   - `6A86`: Incorrect P1/P2 parameter

## Compatibility Requirements

The implementation must be compatible with:
- `age-plugin-yubikey` expectations for protected management keys
- YubiKey PIV applet version 4.3.5 and above
- Standard PIV specifications (NIST SP 800-73-4)

## Testing Strategy

1. Test basic management key setting
2. Verify PIN protection metadata storage
3. Confirm `age-plugin-yubikey` can use the protected key
4. Test error conditions and edge cases

## References

- YubiKey PIV Tool: https://github.com/Yubico/yubico-piv-tool
- YubiKey Manager: https://github.com/Yubico/yubikey-manager
- PIV Standard: NIST SP 800-73-4
- age-plugin-yubikey: https://github.com/str4d/age-plugin-yubikey