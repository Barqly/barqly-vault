# Backend Code Refactoring Checklist

*Analysis Date: August 7, 2025*

## Executive Summary

Several backend files significantly exceed our 300-line maximum standard. This document provides a prioritized refactoring plan to improve code maintainability.

## File Size Analysis

### 🔴 CRITICAL - Files Over 1000 Lines (Immediate Action Required)

#### 1. `src/commands/crypto_commands.rs` - **1435 lines** ⚠️
**Current State**: 378% over limit  
**Issues**: Single file handling all crypto-related commands
**Refactoring Strategy**:
- [x] Split into separate command modules:
  - [x] `key_generation_commands.rs` (~300 lines)
  - [x] `encryption_commands.rs` (~400 lines)
  - [x] `decryption_commands.rs` (~400 lines)
  - [x] `validation_commands.rs` (~200 lines)
  - [x] Keep shared types in `crypto_commands.rs` (~135 lines)

#### 2. `src/commands/types.rs` - **1297 lines** ⚠️
**Current State**: 332% over limit  
**Issues**: All command types in single file
**Refactoring Strategy**:
- [x] Split by domain:
  - [x] `types/error_types.rs` (~250 lines)
  - [x] `types/crypto_types.rs` (~300 lines)
  - [x] `types/file_types.rs` (~250 lines)
  - [x] `types/storage_types.rs` (~200 lines)
  - [x] `types/progress_types.rs` (~200 lines)
  - [x] Keep common types in `types/mod.rs` (~97 lines)

### 🟡 WARNING - Files Over 300 Lines (Action Required)

#### 3. `src/file_ops/manifest.rs` - **537 lines** ✅ COMPLETED
**Current State**: 79% over limit
**Refactoring Strategy**:
- [x] Split into archive_manifest module:
  - [x] `archive_manifest/types.rs` (58 lines)
  - [x] `archive_manifest/verification.rs` (137 lines)
  - [x] `archive_manifest/operations.rs` (231 lines)
  - [x] `archive_manifest/tests.rs` (129 lines)
  - [x] `archive_manifest/mod.rs` (20 lines)

#### 4. `src/file_ops/archive.rs` - **499 lines** ✅ COMPLETED
**Current State**: 66% over limit
**Refactoring Strategy**:
- [x] Renamed to archive_operations for clarity (vs archive_manifest)
- [x] Split into focused modules:
  - [x] `archive_operations/creation.rs` (259 lines)
  - [x] `archive_operations/extraction.rs` (134 lines)
  - [x] `archive_operations/mod.rs` (11 lines)
- [x] Extracted shared `calculate_file_hash` to `utils.rs` (43 lines)
- [x] Moved tests to `tests/unit/file_ops/archive_tests.rs` (81 lines)

#### 5. `src/commands/crypto/encryption.rs` - **410 lines** ✅ COMPLETED (August 7, 2025)
**Previous State**: 37% over limit
**Refactoring Strategy**:
- [x] Split shared utilities into `file_helpers.rs` module:
  - [x] `file_helpers.rs` (136 lines) - Shared file operation utilities
  - [x] `encryption.rs` (293 lines) - Core encryption command (now under 300!)
- [x] Functions moved to file_helpers:
  - [x] `create_file_selection_atomic` (also eliminates duplication with file_commands.rs)
  - [x] `validate_output_directory` (already used by decryption)
  - [x] `read_archive_file_safely`
  - [x] `cleanup_temp_file` (already used by decryption)
- [x] Updated decryption.rs to use shared file_helpers module

#### 6. `src/storage/cache.rs` - **405 lines**
**Current State**: 35% over limit
**Refactoring Strategy**:
- [x] Split LRU implementation to generic utility (~150 lines)
- [x] Extract metrics collection (~100 lines)
- [x] Target: ~155 lines remaining

#### 6. `src/storage/key_store.rs` - **393 lines**
**Current State**: 31% over limit
**Refactoring Strategy**:
- [ ] Extract key validation logic (~100 lines)
- [ ] Move metadata handling to separate module (~100 lines)
- [ ] Target: ~193 lines remaining

#### 7. `src/commands/file_commands.rs` - **388 lines**
**Current State**: 29% over limit
**Refactoring Strategy**:
- [ ] Split into file selection and file operation commands (~194 lines each)
- [ ] Target: Two files under 200 lines each

#### 8. `src/storage/paths.rs` - **333 lines**
**Current State**: 11% over limit
**Refactoring Strategy**:
- [ ] Extract validation logic to separate validator (~100 lines)
- [ ] Target: ~233 lines remaining

### ✅ ACCEPTABLE - Files Within Limits (No Action Required)

| File | Lines | Status |
|------|-------|--------|
| `src/file_ops/staging.rs` | 284 | ⚠️ Warning zone |
| `src/commands/storage_commands.rs` | 266 | ⚠️ Warning zone |
| `src/logging/mod.rs` | 261 | ⚠️ Warning zone |
| `src/file_ops/selection.rs` | 236 | ⚠️ Warning zone |
| `src/file_ops/validation.rs` | 226 | ⚠️ Warning zone |
| Other files | <200 | ✅ Optimal |

## Test Files Analysis

### 🔴 Test Files Exceeding 500 Lines

#### 1. `tests/unit/commands/validation_tests.rs` - **1288 lines**
**Refactoring Strategy**:
- [ ] Group by command type (crypto, file, storage)
- [ ] Create separate test modules per domain
- [ ] Target: 4 files of ~300 lines each

#### 2. `tests/integration/storage_integration_tests.rs` - **595 lines**
**Refactoring Strategy**:
- [ ] Split into key_store and cache integration tests
- [ ] Target: 2 files of ~300 lines each

#### 3. `tests/integration/file_ops_integration_tests.rs` - **595 lines**
**Refactoring Strategy**:
- [ ] Separate archive, manifest, and selection tests
- [ ] Target: 3 files of ~200 lines each

## Implementation Priority

### Phase 1 - Critical (Sprint 1)
1. [ ] Refactor `crypto_commands.rs` (1435 lines)
2. [ ] Refactor `types.rs` (1297 lines)

### Phase 2 - High Priority (Sprint 2)
3. [x] Refactor `manifest.rs` (537 lines) - COMPLETED
4. [ ] Refactor `archive.rs` (499 lines)
5. [ ] Refactor `cache.rs` (405 lines)

### Phase 3 - Medium Priority (Sprint 3)
6. [ ] Refactor `key_store.rs` (393 lines)
7. [ ] Refactor `file_commands.rs` (388 lines)
8. [ ] Refactor `paths.rs` (333 lines)

### Phase 4 - Test Cleanup (Sprint 4)
9. [ ] Refactor test files over 500 lines

## Success Metrics

- [ ] No source files exceed 300 lines
- [ ] No test files exceed 500 lines
- [ ] Average file size: 150-200 lines
- [ ] Improved module cohesion
- [ ] Clearer separation of concerns
- [ ] All tests passing after refactoring
- [ ] No performance degradation

## Notes for AI Agents

When refactoring:
1. **Check file size BEFORE adding new code**
2. **Plan module extraction if approaching 200 lines**
3. **NEVER allow files over 300 lines**
4. **Preserve all functionality and tests**
5. **Update imports in dependent files**
6. **Run `make validate` after each refactoring**

## Tracking

This checklist will be updated as refactoring progresses. Mark items complete as they are finished and update line counts after each refactoring.

---

*Total files needing refactoring: 8 source files, 3+ test files*  
*Estimated effort: 2-3 days of focused refactoring*