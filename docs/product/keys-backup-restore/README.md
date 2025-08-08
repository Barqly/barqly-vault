# Key Backup & Restore Feature

## Overview

This feature enables users to securely backup and restore their encryption keys, following patterns familiar from Bitcoin wallet applications. Since age encryption keys cannot be represented as human-readable seed phrases like BIP39, we must provide robust digital backup methods.

## Core Principles

1. **Immediate Backup**: Following Bitcoin wallet UX patterns, backup happens immediately after key generation
2. **Cannot Skip**: Users cannot proceed without acknowledging backup importance (though dangerous skip is allowed with warnings)
3. **Verification Required**: Backup must be verified to work before completion
4. **Multiple Methods**: Support various backup methods for different user preferences
5. **Recovery Focused**: Design assumes users are stressed during recovery - make it simple

## Key Format

- **Private Key Format**: `AGE-SECRET-KEY-1[BASE64_STRING]` (~190 characters)
- **Not Human-Friendly**: Cannot be written down like BIP39 seed phrases
- **Digital Only**: Must be copied digitally to USB, external drive, or encoded as QR

## Documentation Structure

- `README.md` - This overview document
- `user-journey.md` - Detailed user flows for backup and restore
- `technical-requirements.md` - Implementation details for engineering teams
- `backup-card-design.md` - Printable backup card specifications
- `file-organization.md` - File structure and storage locations
- `passphrase-hint-guidelines.md` - Security guidelines for passphrase hints

## Quick Links

- [User Journey](./user-journey.md) - Step-by-step flows
- [Technical Requirements](./technical-requirements.md) - API and implementation details
- [Backup Card Design](./backup-card-design.md) - Print template specifications
- [File Organization](./file-organization.md) - Directory structure decisions
- [Passphrase Hints](./passphrase-hint-guidelines.md) - Hint implementation guidelines

## Status

- **Phase**: Design & Specification
- **Target Release**: Post-initial iteration
- **Dependencies**: Current key generation flow must be modified