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

## Phase 2: Core Component Migration ✅ COMPLETED
- [x] Error handling foundation:
  - `lib/errors/error-formatting.ts` - CommandError, ErrorCode from bindings ✅
  - `lib/errors/command-error.ts` - CommandError, ErrorCode from bindings ✅
  - `components/ui/error-message.tsx` - CommandError type ✅
- [x] Core utilities:
  - `hooks/useProgressTracking.ts` - ProgressUpdate type ✅
  - `components/ui/progress-bar.tsx` - ProgressUpdate type ✅
- [x] Key hooks:
  - `hooks/useKeyGeneration.ts` - CommandError, ErrorCode types ✅
  - `hooks/useKeyGenerationForm.ts` - GenerateKey types ✅
  - `hooks/useYubiKeyWorkflow.ts` - ProtectionMode type ✅
- [x] UI Components (11 files total):
  - Progress components: `EncryptionProgress.tsx`, `DecryptProgress.tsx`, `DecryptSuccess.tsx` ✅
  - Form components: `DropdownButton.tsx`, `KeyGenerationForm.tsx`, `FormMessages.tsx` ✅
  - YubiKey components: `YubiKeyDecryption.tsx` ✅
  - Setup components: `ProtectionModeSelector*.tsx` (3 files) ✅
- [x] Validation layer:
  - `lib/key-generation/validation.ts` - CommandError, ErrorCode ✅
- [x] Fixed ErrorCode usage from enum-style to string literals

**Core migration completed**: 19 key files migrated from api-types to bindings

## Phase 3: Remaining File Migration (~40 files)
- [ ] Fix type compatibility issues:
  - CommandError interface differences (trace_id, span_id fields)
  - Missing YubiKeyDevice export in bindings.ts
  - CommandErrorClass reference in tauri-safe.ts
- [ ] Remaining hooks and services:
  - Workflow hooks, encryption/decryption hooks
  - State management files
  - Remaining validation files
- [ ] Pages and remaining components
- [ ] Test files (can be deferred)

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