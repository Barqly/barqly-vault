# Test Suite Recovery Plan

## Executive Summary

The barqly-vault test suite is experiencing 24+ TypeScript errors following Setup Screen UX improvements. While the desktop application remains functional, the test suite requires systematic fixes to restore CI/CD compliance. This document provides a comprehensive recovery plan.

## Current State Analysis

### What Happened
1. **Frontend Engineer** implemented Setup Screen improvements based on UX Designer recommendations
2. **Hook interfaces evolved** during implementation but tests weren't updated
3. **Validation was bypassed** using `--no-verify` flag to commit changes
4. **TypeScript strict mode** is catching interface mismatches between tests and implementation

### Impact Assessment
- **Desktop App**: Fully functional ✅
- **Test Suite**: 24+ TypeScript errors ❌
- **CI/CD Pipeline**: Blocked ❌
- **Development Velocity**: Impaired ⚠️

## Root Cause Analysis

### 1. **Hook Interface Evolution**
The hooks evolved during Setup Screen implementation, but test mocks weren't updated:

**Example Evolution in `useFileEncryption`:**
```typescript
// Tests expect (old interface):
interface UseFileEncryptionReturn {
  setRecipient: (recipient: string) => void;
  setOutputLocation: (path: string) => void;
  encryptFiles: () => Promise<void>;  // No parameters
}

// Actual implementation (new interface):
interface UseFileEncryptionReturn {
  encryptFiles: (keyId: string, outputPath: string, outputName?: string) => Promise<void>;
  // No setRecipient or setOutputLocation - parameters passed directly
}
```

### 2. **ProgressUpdate Type Changes**
The `ProgressUpdate` interface was enhanced with required fields not present in test mocks:
```typescript
// Test mocks use:
{ progress: number; message: string; }

// Actual type requires:
{
  operation_id: string;
  progress: number;
  message: string;
  timestamp: string;
  // ... optional fields
}
```

### 3. **API Method Signature Changes**
Several Tauri commands changed signatures:
- `selectArchive` → `selectEncryptedFile` (in `useFileDecryption`)
- `decryptArchive` → `decryptFile`
- Function parameters moved from state setters to direct method arguments

### 4. **Test Mock Strategy Outdated**
Tests use outdated mocking patterns that don't reflect current hook implementations.

## Error Categories

### Category 1: Hook Interface Mismatches (High Priority)
**Files Affected:**
- `tauri-api-integration.test.ts`

**Errors:**
- Missing properties: `selectArchive`, `selectFiles`, `setRecipient`, `setOutputLocation`
- Type mismatches in hook returns
- Function signature mismatches

**Root Cause:** Hook interfaces evolved but test expectations weren't updated.

### Category 2: Type Definition Mismatches (Medium Priority)
**Files Affected:**
- `SetupPage.test.tsx`
- Progress tracking tests

**Errors:**
- ProgressUpdate missing required properties
- Type assertions failing

**Root Cause:** Type definitions enhanced but test fixtures not updated.

### Category 3: Platform/Environment Issues (Low Priority)
**Files Affected:**
- `platform.test.ts`
- `tauri-safe.test.ts`

**Errors:**
- Function calls with wrong argument counts
- Implicit 'any' types
- Unknown error types

**Root Cause:** Test utilities using outdated API signatures.

## Step-by-Step Fix Plan

### Phase 1: Update Hook Test Interfaces (Priority 1)
**Time Estimate:** 2-3 hours

1. **Update `tauri-api-integration.test.ts`:**
   ```typescript
   // Fix useFileEncryption tests
   - await fileEncResult.result.current.selectFiles('Files')
   + await fileEncResult.result.current.selectFiles('Files')
   
   - fileEncResult.result.current.setRecipient('age1test')
   - fileEncResult.result.current.setOutputLocation('/output')
   - await fileEncResult.result.current.encryptFiles()
   + await fileEncResult.result.current.encryptFiles('age1test', '/output')
   
   // Fix useFileDecryption tests
   - await fileDecResult.result.current.selectArchive()
   + await fileDecResult.result.current.selectEncryptedFile()
   
   - await fileDecResult.result.current.decryptArchive()
   + await fileDecResult.result.current.decryptFile()
   ```

2. **Update test expectations to match actual hook returns**

3. **Remove references to deprecated methods**

### Phase 2: Fix Type Definitions (Priority 2)
**Time Estimate:** 1-2 hours

1. **Create proper ProgressUpdate mocks:**
   ```typescript
   const mockProgressUpdate: ProgressUpdate = {
     operation_id: 'test-op-123',
     progress: 0.5,
     message: 'Processing...',
     timestamp: new Date().toISOString()
   };
   ```

2. **Update all progress-related test fixtures**

3. **Ensure type consistency across test files**

### Phase 3: Update Platform Tests (Priority 3)
**Time Estimate:** 1 hour

1. **Fix function signatures in `platform.test.ts`**
2. **Add proper type annotations in `tauri-safe.test.ts`**
3. **Update error handling expectations**

### Phase 4: Validation & Cleanup (Priority 4)
**Time Estimate:** 1 hour

1. **Run incremental validations:**
   ```bash
   # After each phase
   make test-ui
   
   # After all fixes
   make validate-ui
   make validate
   ```

2. **Remove unused imports and dead code**

3. **Update test documentation**

## Testing Strategy

### Incremental Fix Approach
1. **Fix one test file at a time**
2. **Run `npm test -- <filename>` after each fix**
3. **Commit working changes frequently**
4. **Use `make test-ui` for quick validation**

### Validation Checkpoints
- After Phase 1: All hook tests should pass
- After Phase 2: Type checking should pass
- After Phase 3: All unit tests should pass
- After Phase 4: Full validation should pass

## Prevention Recommendations

### 1. **Enforce Pre-commit Hooks**
```bash
# Never use --no-verify
git commit -m "message"  # This runs validation
```

### 2. **Update Tests During Development**
- When changing hook interfaces, update tests immediately
- Run `make test-ui` frequently during development
- Consider TDD for interface changes

### 3. **Type Generation Strategy**
```bash
# Regenerate types when Rust APIs change
cd src-tauri && cargo build --features generate-types
```

### 4. **Documentation Requirements**
- Document hook interface changes in PR descriptions
- Update test documentation when APIs change
- Maintain a CHANGELOG for breaking changes

### 5. **CI/CD Improvements**
- Add pre-merge validation requirements
- Create automated test update reminders
- Implement breaking change detection

## Quick Reference Commands

```bash
# Development workflow
make test-ui              # Quick frontend test run (~10-20s)
make validate-ui          # Full frontend validation (~30s)
make validate            # Complete validation (mirrors CI)

# Debugging specific tests
cd src-ui && npm test -- tauri-api-integration.test.ts
cd src-ui && npm test -- --reporter=verbose

# Fix formatting issues
cd src-ui && npx prettier --write .
cd src-ui && npm run lint -- --fix
```

## Success Criteria

1. ✅ All TypeScript errors resolved
2. ✅ `make validate` passes completely
3. ✅ No test logic changes - only interface updates
4. ✅ Desktop app functionality unchanged
5. ✅ CI/CD pipeline restored

## Timeline Estimate

- **Total Time:** 5-7 hours
- **Phase 1:** 2-3 hours (highest impact)
- **Phase 2:** 1-2 hours
- **Phase 3:** 1 hour
- **Phase 4:** 1 hour

## Next Steps

1. QA Engineer should start with Phase 1 fixes
2. Run incremental tests after each change
3. Document any additional issues discovered
4. Update this plan if new error patterns emerge
5. Create follow-up tasks for prevention measures

## Appendix: Common Fix Patterns

### Pattern 1: Hook Method Signature Updates
```typescript
// Old pattern
result.current.setRecipient(value);
result.current.encryptFiles();

// New pattern
result.current.encryptFiles(recipient, outputPath);
```

### Pattern 2: Progress Update Mocks
```typescript
// Old mock
{ progress: 0.5, message: 'test' }

// New mock
{
  operation_id: 'test-123',
  progress: 0.5,
  message: 'test',
  timestamp: new Date().toISOString()
}
```

### Pattern 3: Method Renames
```typescript
// Old names → New names
selectArchive → selectEncryptedFile
decryptArchive → decryptFile
```

This plan provides a systematic approach to fixing all test errors while maintaining the functional desktop application. The QA Engineer should follow this plan sequentially for best results.