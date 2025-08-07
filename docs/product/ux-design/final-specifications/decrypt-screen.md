# Decrypt Screen - Final Specification

> **Status**: Implemented in Alpha Release  
> **Last Updated**: January 2025

## Overview
The Decrypt screen provides secure recovery of encrypted files, optimized for emergency situations where family members need to access Bitcoin custody information.

## Implemented Design

### Layout Structure
- **Clear recovery messaging** for stressed users
- **Simple file selection** for .age archives
- **Passphrase entry** with security features
- **Output control** for extracted files

### Key Components
1. **Archive Selection**
   - File picker for .age files
   - Drag-and-drop support
   - Archive validation
   - Metadata display (size, date)

2. **Authentication**
   - Passphrase input field
   - Visibility toggle (500ms delay)
   - Clear error messages
   - Retry guidance

3. **Extraction Controls**
   - Output directory selector
   - Default to archive location
   - Overwrite warnings
   - Progress indication

4. **Recovery Feedback**
   - File-by-file extraction status
   - Success confirmation
   - Location of extracted files
   - Next steps guidance

### Emergency Use Optimization
- Large, clear UI elements
- Minimal cognitive load
- Step-by-step guidance
- Error recovery help
- No technical jargon

## Technical Implementation
- Symmetric decryption flow
- Manifest verification
- Directory structure preservation
- Atomic operations (all or nothing)

## Error Handling
- Wrong passphrase: Clear retry guidance
- Corrupted archive: Recovery suggestions
- Disk space issues: Space requirements shown
- Permission errors: Admin guidance

## Success Metrics
- < 60 second recovery time
- 100% successful decryption rate
- Works under stress conditions
- Family-member tested

## Related Documents
- Backend requirements: `archive/decrypt-screen/backend-requirements-decrypt-directory.md`
- Original design: `archive/decrypt-screen/design-specification-uxd.md`
- Implementation: `/src-ui/pages/DecryptPage.tsx`