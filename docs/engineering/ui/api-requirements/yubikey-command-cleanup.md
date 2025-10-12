# YubiKey Command Cleanup

**Date:** 2025-10-12
**Type:** Breaking API Change
**Backend:** Complete ✅

## What Changed

The `yubikeyListDevices` command has been removed as it was a duplicate of `listYubikeys`.

### Removed Command
- **Command:** `yubikeyListDevices()`
- **Reason:** Technical debt - it was just an alias that called `listYubikeys()` internally

### Use Instead
- **Command:** `listYubikeys()`
- **Returns:** Same `YubiKeyStateInfo[]` type
- **Behavior:** Identical functionality

## Frontend Update Required

### Location
File: `src-ui/src/components/decrypt/YubiKeyDecryption.tsx` (line 64)

### Code Change
```typescript
// OLD - Remove this:
const result = await commands.yubikeyListDevices();

// NEW - Use this:
const result = await commands.listYubikeys();
```

## API Consolidation

This is part of cleaning up the API surface. We now have a single, consistent command for listing YubiKeys:

- `listYubikeys()` - Lists all connected YubiKeys with their state information

No other changes needed - the return type and behavior are identical.

## Verification

The TypeScript bindings have been regenerated and no longer include `yubikeyListDevices`.