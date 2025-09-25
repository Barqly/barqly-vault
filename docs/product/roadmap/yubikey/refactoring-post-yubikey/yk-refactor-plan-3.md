# Frontend Type System Migration Plan: api-types.ts → bindings.ts

## 🎯 KEY FINDING: NO Backend Commands Needed!
All required functionality already exists in bindings.ts with proper high-level abstractions:
- `checkYubikeyAvailability()` - replaces yubikey_test_connection
- `listYubikeys()` - replaces yubikey_get_device_info
- `initYubikeyForVault()` - replaces yubikey_initialize
- Dead code components found that can be removed entirely

## Phase 1: Dead Code Cleanup ✅ COMPLETED
- [x] Remove `UnlockMethodChooser.tsx` - not used anywhere (dead code)
- [x] Remove `HybridProtectionSetup.tsx` - only used by test file (dead code)
- [x] Remove `YubiKeyInitialization.tsx` - only used by HybridProtectionSetup (dead code)
- [x] Remove `YubiKeyDeviceList.tsx` - only used by test file (dead code)
- [x] Remove associated test files for dead components

**Result**: Removed 4 components + 4 test files that required missing backend commands

## Phase 2: Type Migration (Immediate Next Step)
Now focus on migrating the remaining live components from api-types.ts to bindings.ts imports.

## Phase 3: Systematic Type Migration (One File at a Time)
- [ ] Error handling foundation:
  - `lib/errors/error-formatting.ts` - CommandError, ErrorCode from bindings
  - `lib/errors/command-error.ts` - CommandError, ErrorCode from bindings
  - `lib/tauri-safe.ts` - Update imports to bindings
- [ ] Core utilities:
  - `hooks/useProgressTracking.ts` - ProgressUpdate type
  - `components/ui/progress-bar.tsx` - ProgressUpdate type
  - `components/ui/error-message.tsx` - CommandError type
- [ ] Validation layer:
  - `lib/validation/encryption-validation.ts` - Multiple types
  - `lib/validation/decryption-validation.ts` - CommandError type
  - `lib/key-generation/validation.ts` - CommandError, ErrorCode
- [ ] State management:
  - `lib/encryption/state-management.ts` - Multiple types
  - `lib/decryption/state-management.ts` - Multiple types
  - `lib/key-generation/state-management.ts` - Multiple types
- [ ] Workflow systems:
  - All workflow files - ProgressUpdate, CommandError, ErrorCode
  - All hook files - Various types
- [ ] UI Components:
  - Protection mode components - ProtectionMode type
  - Page components - ErrorCode type
  - Progress components - ProgressUpdate type
  - Form components - Various response types

## Phase 4: Final Cleanup & Validation
- [ ] Delete `src-ui/src/lib/api-types.ts` (671 lines removed)
- [ ] Remove deprecated invokeCommand function
- [ ] Update any remaining import statements
- [ ] Update test mocks to use bindings.ts (deferred - can be done separately)
- [ ] Run validation: `make validate`
- [ ] Commit: "refactor: complete migration from api-types.ts to auto-generated bindings"

**Simplified Migration Rules:**
1. Remove dead code first (immediate value)
2. One file at a time for live code - test after each change
3. Use existing high-level abstractions in bindings.ts
4. No backend changes required - everything already exists
5. Test functionality at component level, not just types