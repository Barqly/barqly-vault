# YubiKey Integration for Barqly Vault

## Overview

This feature adds hardware security key support to Barqly Vault using YubiKey devices. Users can choose between passphrase protection, YubiKey protection, or both for maximum flexibility and security.

## Core Concepts

### Protection Modes

1. **Passphrase Only** (Current/Default)
   - Traditional password-based encryption
   - Works everywhere, no hardware required
   - User memorizes passphrase

2. **YubiKey Only** (Hardware Security)
   - Key generated on YubiKey hardware
   - PIN protection instead of passphrase
   - Requires YubiKey for any decryption

3. **Both** (Recommended)
   - Dual protection methods
   - YubiKey for daily convenience
   - Passphrase as emergency backup

### Technical Approach

We use `age-plugin-yubikey` for native YubiKey integration with age encryption. Each YubiKey generates its own unique key on-chip, and we use age's multi-recipient encryption to allow multiple keys to decrypt the same vault.

### Key Architecture

```
One Encrypted Vault File
        ↓
Can be decrypted by ANY of:
  • YubiKey 1 (age1yubikey1abc...)
  • YubiKey 2 (age1yubikey1xyz...)  
  • Passphrase key (age1regular...)
```

## Documentation Structure

- `README.md` - This overview document
- `technical-architecture.md` - Detailed technical implementation
- `user-journey.md` - User flows and UX specifications
- `metadata-structure.md` - Metadata format changes for multi-recipient support
- `implementation-roadmap.md` - Phased rollout plan
- `security-considerations.md` - Security analysis and threat model
- `recovery-scenarios.md` - Backup and recovery strategies

## Quick Summary for Engineers

### Backend Requirements
- Bundle `age-plugin-yubikey` with application
- Implement PIV communication for YubiKey management
- Update metadata structure for multiple recipients
- Modify encryption commands to support multi-recipient

### Frontend Requirements
- New setup flow with three protection modes
- YubiKey management interface
- PIN entry dialogs
- Recovery mode selection

### Key Features
- Generate age keys directly on YubiKey hardware
- Support multiple YubiKeys per user
- One encrypted file works with all registered keys
- Seamless fallback between YubiKey and passphrase

## Design Principles

1. **No Lock-in**: Always have a backup method
2. **User Choice**: Let users pick their security/convenience balance
3. **Clear Mental Model**: "Multiple keys, one lock"
4. **Stress-Optimized**: Simple recovery under pressure
5. **Future-Proof**: Support for multiple hardware key types

## Status

- **Phase**: Design & Specification
- **Target Release**: Post-initial launch
- **Dependencies**: Current key management must be stable

## Next Steps

1. Review technical architecture
2. Validate user journey flows
3. Plan migration strategy for existing users
4. Begin prototype implementation