# Frontend Code Refactoring Checklist

*Analysis Date: January 8, 2025*

## Executive Summary

Multiple frontend files exceed our newly established line limits for frontend code. This document provides a prioritized refactoring plan to improve code maintainability and align with modern React best practices.

## Source Code File Size Analysis

### =4 CRITICAL - Files Over Maximum Limits (Immediate Action Required)

#### 1. `src/pages/EncryptPage.tsx` - **143 lines** ✅ COMPLETED �
**Previous State**: 592 lines (295% over limit)  
**Current State**: 143 lines - WITHIN LIMIT  
**Refactoring Completed**:
- [x] Extracted encryption workflow logic to `useEncryptionWorkflow` hook (207 lines)
- [x] Created `StepIndicator` component (59 lines)
- [x] Created `EncryptionHeader` component (41 lines)
- [x] Created `EncryptionSteps` component (154 lines)
- [x] Created `EncryptionActions` component (90 lines)
- [x] Created `HelpSection` component (31 lines)
- [x] **Result**: Main component reduced from 592 to 143 lines (76% reduction)

#### 2. `src/pages/DecryptPage.tsx` - **140 lines** ✅ COMPLETED �
**Previous State**: 465 lines (210% over limit)  
**Current State**: 140 lines - WITHIN LIMIT  
**Refactoring Completed**:
- [x] Extracted decryption workflow to `useDecryptionWorkflow` hook (221 lines)
- [x] Created `DecryptionHeader` component (35 lines)
- [x] Created `DecryptionProgressBar` component (47 lines)
- [x] Created `DecryptionForm` component (122 lines)
- [x] Created `DecryptionReadyPanel` component (114 lines)
- [x] **Result**: Main component reduced from 465 to 140 lines (70% reduction)

#### 3. `src/components/common/FileDropZone.tsx` - **372 lines** �
**Current State**: 148% over component limit  
**Issues**: Complex drag-and-drop logic mixed with UI
**Refactoring Strategy**:
- [ ] Extract drag-and-drop logic to custom hook (~120 lines)
- [ ] Create separate file validation utility (~80 lines)
- [ ] Split UI into smaller components (~60 lines each)
- [ ] Target: Main component ~110 lines

#### 4. `src/lib/api-types.ts` - **340 lines** �
**Current State**: 36% over TypeScript module limit (250 lines max)  
**Issues**: All API types in single file
**Refactoring Strategy**:
- [ ] Split by domain:
  - [ ] `api-types/crypto.ts` (~100 lines)
  - [ ] `api-types/file.ts` (~80 lines)
  - [ ] `api-types/storage.ts` (~80 lines)
  - [ ] `api-types/common.ts` (~80 lines)

#### 5. `src/components/forms/KeyGenerationForm.tsx` - **340 lines** �
**Current State**: 127% over component limit  
**Issues**: Form logic, validation, and UI mixed
**Refactoring Strategy**:
- [ ] Extract form logic to custom hook (~100 lines)
- [ ] Move validation to separate module (~60 lines)
- [ ] Create sub-components for form sections (~60 lines each)
- [ ] Target: Main component ~120 lines

### =� WARNING - Files Exceeding Optimal Limits (Action Required)

#### 6. `src/hooks/useFileDecryption.ts` - **333 lines**
**Current State**: 33% over TypeScript module limit (250 lines)
**Refactoring Strategy**:
- [ ] Extract error handling logic (~80 lines)
- [ ] Move file operations to utility (~80 lines)
- [ ] Target: ~170 lines remaining

#### 7. `src/hooks/useFileEncryption.ts` - **315 lines**
**Current State**: 26% over TypeScript module limit
**Refactoring Strategy**:
- [ ] Extract progress tracking logic (~70 lines)
- [ ] Move validation logic (~60 lines)
- [ ] Target: ~185 lines remaining

#### 8. `src/pages/SetupPage.tsx` - **313 lines**
**Current State**: 109% over component limit
**Refactoring Strategy**:
- [ ] Extract setup wizard logic to custom hook (~100 lines)
- [ ] Create separate step components (~60 lines each)
- [ ] Target: Main component ~140 lines

#### 9. `src/hooks/useKeyGeneration.ts` - **297 lines**
**Current State**: 19% over TypeScript module limit
**Refactoring Strategy**:
- [ ] Extract key validation logic (~60 lines)
- [ ] Move error handling (~40 lines)
- [ ] Target: ~197 lines remaining

#### 10. `src/components/forms/KeySelectionDropdown.tsx` - **267 lines**
**Current State**: 78% over component limit
**Refactoring Strategy**:
- [ ] Extract dropdown logic to custom hook (~80 lines)
- [ ] Create separate option components (~40 lines)
- [ ] Target: Main component ~140 lines

#### 11. `src/components/ui/error-message.tsx` - **265 lines**
**Current State**: 77% over component limit
**Refactoring Strategy**:
- [ ] Extract error formatting logic (~70 lines)
- [ ] Create error type components (~50 lines each)
- [ ] Target: Main component ~145 lines

#### 12. `src/components/encrypt/FileDropZone.tsx` - **260 lines**
**Current State**: 73% over component limit
**Refactoring Strategy**:
- [ ] Extract file handling to custom hook (~80 lines)
- [ ] Split UI components (~40 lines each)
- [ ] Target: Main component ~140 lines

### � MONITOR - Files Approaching Limits

| File | Lines | Status | Risk |
|------|-------|--------|------|
| `src/components/ui/progress-bar.tsx` | 244 | Near limit | Medium |
| `src/components/encrypt/EncryptionSuccess.tsx` | 218 | Warning zone | Low |
| `src/lib/tauri-safe.ts` | 213 | Acceptable | Low |
| `src/components/forms/PassphraseInput.tsx` | 206 | Warning zone | Low |
| `src/lib/logger.ts` | 197 | Acceptable | Low |
| `src/components/ui/success-message.tsx` | 197 | Warning zone | Low |

###  ACCEPTABLE - Files Within Optimal Limits

Files under 150 lines for components and under 200 lines for modules are considered well-structured and require no immediate action.

## Test Files Analysis

### =4 Test Files Exceeding Maximum (300 Lines)

#### 1. `__tests__/pages/DecryptPage.test.tsx` - **582 lines**
**Refactoring Strategy**:
- [ ] Split into unit and integration tests
- [ ] Group by feature (form, validation, submission)
- [ ] Target: 3 files of ~190 lines each

#### 2. `__tests__/hooks/useKeyGeneration/tauri-integration.test.ts` - **474 lines**
**Refactoring Strategy**:
- [ ] Separate API mocking from integration tests
- [ ] Split by operation type
- [ ] Target: 2 files of ~240 lines each

#### 3. `__tests__/hooks/tauri-api-integration.test.ts` - **474 lines**
**Refactoring Strategy**:
- [ ] Group by API endpoint
- [ ] Extract mock utilities
- [ ] Target: 2 files of ~240 lines each

#### 4. `__tests__/pages/SetupPage.test.tsx` - **467 lines**
**Refactoring Strategy**:
- [ ] Split wizard steps into separate test files
- [ ] Extract test utilities
- [ ] Target: 3 files of ~160 lines each

#### 5. `__tests__/regression/form-submission-tauri-api.test.tsx` - **466 lines**
**Refactoring Strategy**:
- [ ] Group by form type
- [ ] Extract shared test helpers
- [ ] Target: 2 files of ~230 lines each

### =� Test Files in Warning Zone (300-400 Lines)

| File | Lines | Action |
|------|-------|--------|
| `__tests__/pages/EncryptPage.test.tsx` | 418 | Split by feature |
| `__tests__/components/forms/PassphraseInput.test.tsx` | 407 | Extract test utilities |
| `__tests__/components/ui/ErrorMessage.test.tsx` | 405 | Group by error type |
| `__tests__/lib/environment/platform.test.ts` | 394 | Split by platform |
| `__tests__/components/ui/SuccessMessage.test.tsx` | 369 | Group by message type |
| `__tests__/components/forms/KeyGenerationForm.test.tsx` | 363 | Split validation tests |
| `__tests__/components/forms/FileSelectionButton.test.tsx` | 357 | Extract mock helpers |
| `__tests__/components/ui/ProgressBar.test.tsx` | 348 | Group by progress type |
| `__tests__/components/forms/KeySelectionDropdown.test.tsx` | 317 | Split interaction tests |
| `__tests__/components/encrypt/FileDropZone.test.tsx` | 312 | Extract drag-drop tests |
| `__tests__/components/ui/LoadingSpinner.test.tsx` | 309 | Group by state |
| `__tests__/hooks/useFileEncryption/encryption-failure.test.ts` | 302 | Consolidate error tests |

## Implementation Priority

### Phase 1 - Critical Page Components (Sprint 1)
1. [x] Refactor `EncryptPage.tsx` (592 lines → 143 lines) ✅ COMPLETED
2. [x] Refactor `DecryptPage.tsx` (465 lines → 140 lines) ✅ COMPLETED
3. [ ] Refactor `SetupPage.tsx` (313 lines)

### Phase 2 - Complex Components (Sprint 2)
4. [ ] Refactor `FileDropZone.tsx` (372 lines)
5. [ ] Refactor `KeyGenerationForm.tsx` (340 lines)
6. [ ] Refactor `KeySelectionDropdown.tsx` (267 lines)

### Phase 3 - Hooks and Services (Sprint 3)
7. [ ] Refactor `useFileDecryption.ts` (333 lines)
8. [ ] Refactor `useFileEncryption.ts` (315 lines)
9. [ ] Refactor `useKeyGeneration.ts` (297 lines)
10. [ ] Split `api-types.ts` (340 lines)

### Phase 4 - UI Components (Sprint 4)
11. [ ] Refactor `error-message.tsx` (265 lines)
12. [ ] Refactor `FileDropZone.tsx` in encrypt folder (260 lines)
13. [ ] Monitor and refactor warning-zone components

### Phase 5 - Test Cleanup (Sprint 5)
14. [ ] Refactor test files over 300 lines
15. [ ] Extract shared test utilities
16. [ ] Consolidate mock helpers

## Success Metrics

- [ ] No React components exceed 150 lines
- [ ] No TypeScript modules exceed 250 lines
- [ ] No test files exceed 300 lines
- [ ] Average component size: 60-100 lines
- [ ] Improved component reusability
- [ ] All tests passing after refactoring
- [ ] No performance degradation
- [ ] Bundle size remains under 5MB target

## Notes for AI Agents

When refactoring frontend code:
1. **Check component size BEFORE adding new features**
2. **Plan extraction if approaching 100 lines for components**
3. **NEVER allow components over 150 lines**
4. **Extract custom hooks for complex logic**
5. **Create sub-components for repeated UI patterns**
6. **Preserve all functionality and tests**
7. **Update imports in dependent files**
8. **Run `make validate-ui` after each refactoring**
9. **Consider React best practices (hooks, composition, single responsibility)**
10. **Maintain TypeScript type safety throughout**

## Refactoring Patterns

### Component Refactoring Pattern
```typescript
// Before: Monolithic component (300+ lines)
const LargeComponent = () => {
  // All logic here
}

// After: Composition pattern
const useComponentLogic = () => { /* Extract hook */ }
const ComponentHeader = () => { /* Sub-component */ }
const ComponentBody = () => { /* Sub-component */ }
const ComponentFooter = () => { /* Sub-component */ }

const RefactoredComponent = () => {
  const logic = useComponentLogic();
  return (
    <>
      <ComponentHeader {...logic} />
      <ComponentBody {...logic} />
      <ComponentFooter {...logic} />
    </>
  );
}
```

## Tracking

This checklist will be updated as refactoring progresses. Mark items complete as they are finished and update line counts after each refactoring.

---

*Total files needing refactoring: 12+ source files, 17+ test files*  
*Estimated effort: 4-5 days of focused refactoring*  
*Priority: Focus on page components first as they impact user experience most directly*