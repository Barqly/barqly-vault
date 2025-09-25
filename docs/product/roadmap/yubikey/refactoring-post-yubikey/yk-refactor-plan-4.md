# Test File Migration Plan: api-types.ts → bindings.ts

## 🎯 OBJECTIVE: Clean up 29 test files with incremental approach

**Status**: Runtime migration ✅ COMPLETE (yk-refactor-plan-3.md)
**Next**: Test file cleanup for maintainability and build system health

## Strategy: Content vs Functionality Testing

### ✂️ **REMOVE**: Content/Label Testing (Low Value)
Tests that verify static text, labels, UI copy, or element presence - these are brittle and low ROI.

### 🔧 **REFACTOR**: Functionality Flow Testing (High Value)
Tests that verify business logic, user workflows, state management, and API integrations.

---

## 📊 Test File Analysis (29 files)

### **Category A: Simple Type-Only Imports** (12 files) - ⚡ **QUICK WINS**
*Easy 1-line import fixes, no mocking complexity*

| File | Types Used | Migration | Effort |
|------|------------|-----------|---------|
| `DecryptPage.test.tsx` | `ErrorCode` | Simple import swap | 5min |
| `EncryptPage.test.tsx` | `ErrorCode` | Simple import swap | 5min |
| `decryption-validation.test.ts` | `ErrorCode, FileSelection` | Import + type mapping | 10min |
| `encryption-validation.test.ts` | `ErrorCode` | Simple import swap | 5min |
| `environment-specific.test.ts` | `ErrorCode` | Simple import swap | 5min |
| `passphrase-validation.test.ts` | `ErrorCode` | Simple import swap | 5min |
| `form-submission-tauri-api.test.tsx` | `CommandError, ErrorCode` | Import + CommandError fix | 10min |
| `tauri-safe.test.ts` | `CommandError, ErrorCode` | Import + CommandError fix | 10min |
| `DecryptProgress.test.tsx` | `ProgressUpdate` | Import + check if ProgressUpdate exists | 10min |
| `ProgressBar.test.tsx` | `ProgressUpdate` | Import + check if ProgressUpdate exists | 10min |
| `useProgressTracking.test.ts` | `ProgressUpdate` | Import + check if ProgressUpdate exists | 10min |
| `tauri-mocks.ts` | `ProgressUpdate` | Import + check if ProgressUpdate exists | 10min |

**Total: 12 files, ~1.5 hours**

### **Category B: YubiKey Type Migration** (4 files) - 🔄 **MODERATE**
*YubiKeyDevice → YubiKeyStateInfo conversion needed*

| File | Types Used | Migration | Effort |
|------|------------|-----------|---------|
| `YubiKeyDecryption.test.tsx` | `YubiKeyDevice` | Replace with YubiKeyStateInfo + property updates | 20min |
| `ProtectionModeSelector.test.tsx` | `ProtectionMode, YubiKeyDevice` + mocks | YubiKeyDevice → YubiKeyStateInfo + mock updates | 30min |
| `useYubiKeySetupWorkflow.test.ts` | `ProtectionMode, YubiKeyDevice` + mocks | Complex mock refactoring needed | 45min |
| `KeySelectionDropdown.test.tsx` | `KeyMetadata` | Check if KeyMetadata exists in bindings | 15min |

**Total: 4 files, ~2 hours**

### **Category C: Hook Integration Tests** (13 files) - 🧪 **COMPLEX**
*Functional tests with mocking - high value but complex migration*

| File Group | Files | Migration Strategy | Effort |
|------------|--------|-------------------|--------|
| **File Encryption** (4 files) | `encryption-success.test.ts`<br/>`encryption-failure.test.ts`<br/>`encryption-validation.test.ts`<br/>`environment-specific.test.ts` | • Replace ProgressUpdate imports<br/>• Update CommandError structure<br/>• Verify all types exist in bindings | 1-2hrs |
| **File Decryption** (6 files) | `decryption-success.test.ts`<br/>`decryption-failure.test.ts`<br/>`file-selection.test.ts`<br/>`progress-tracking.test.ts`<br/>`state-management.test.ts`<br/>`decryption-validation.test.ts` | • FileSelection + DecryptionResult types<br/>• ProgressUpdate handling<br/>• CommandError fixes | 2-3hrs |
| **Key Generation** (5 files) | `key-generation-success.test.ts`<br/>`key-generation-failure.test.ts`<br/>`progress-tracking.test.ts`<br/>`tauri-integration.test.ts`<br/>`passphrase-validation.test.ts` | • GenerateKeyResponse type<br/>• ProgressUpdate imports<br/>• Mock command updates | 2-3hrs |

**Total: 13 files, ~6 hours**

---

## 🚀 **EXECUTION PHASES**

### **Phase 1: Quick Wins** (12 files, ~1.5hrs)
*Target: 90-min focused session*

1. **Batch A1: ErrorCode-only files** (6 files, 30min)
   - Simple find/replace: `api-types` → `bindings`
   - Files: DecryptPage, EncryptPage, encryption-validation, environment-specific, passphrase-validation

2. **Batch A2: CommandError files** (4 files, 45min)
   - Import change + CommandError structure fixes
   - Files: form-submission-tauri-api, tauri-safe, decryption-validation

3. **Batch A3: ProgressUpdate files** (4 files, 45min)
   - Check if ProgressUpdate exists in bindings, handle accordingly
   - Files: DecryptProgress, ProgressBar, useProgressTracking, tauri-mocks

### **Phase 2: YubiKey Migration** (4 files, ~2hrs)
*Target: Single focused session*

1. **YubiKeyDevice → YubiKeyStateInfo conversion**
2. **Mock data structure updates**
3. **Property mapping fixes**

### **Phase 3: Hook Integration** (13 files, ~6hrs)
*Target: 3 sessions, 2hrs each*

**Session 1**: File Encryption hooks (4 files)
**Session 2**: File Decryption hooks (6 files)
**Session 3**: Key Generation hooks (3 files)

---

## 🔍 **MISSING TYPE ANALYSIS**

### **Confirmed Available in bindings.ts:**
✅ `CommandError` - exists
✅ `ErrorCode` - exists
✅ `ProtectionMode` - exists
✅ `DecryptionResult` - exists
✅ `GenerateKeyResponse` → `GenerateKeyMultiResponse` (updated name)
✅ `FileSelection` - exists
✅ `KeyMetadata` - exists

### **Missing/Need Investigation:**
❓ `ProgressUpdate` - may be missing, needs backend regeneration
❓ `YubiKeyDevice` - replaced with `YubiKeyStateInfo`

---

## 📋 **DELETION CANDIDATES** (Remove Low-Value Tests)

During migration, identify and remove tests that are:
- Testing static text/labels
- Testing CSS classes/styling
- Testing component rendering without logic
- Brittle snapshot tests of UI structure

**Estimate**: ~20-30% of test code can be safely removed, improving maintainability.

---

## 🎯 **SUCCESS METRICS**

- [ ] All 29 test files migrated or removed
- [ ] `npm run build` passes without api-types imports
- [ ] Test suite passes with bindings.ts
- [ ] Reduced test maintenance burden
- [ ] Maintained functional test coverage

**Total Effort**: ~10 hours across 3-4 focused sessions
**Timeline**: 1 week with normal development pace