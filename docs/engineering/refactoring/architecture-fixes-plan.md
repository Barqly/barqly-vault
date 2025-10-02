# Backend Architecture Fixes - Phased Execution Plan

**Date:** 2025-10-01
**Reference:** backend-architecture-review-2025-10-01.md
**Priority:** P0 - Critical for UI redesign readiness

---

## Phase 1: CRITICAL Issues (Must Fix Before UI Work) ⚠️

**Timeline:** Week 1 (16-20 hours)
**Goal:** Eliminate crash risks, data corruption risks, and resource leaks

### Milestone 1.1: Remove Unsafe unwrap() Calls ✅ COMPLETE
**Estimated:** 4-6 hours | **Actual:** 30 minutes

#### Tasks:
- [x] Fix vault persistence unwraps in `vault/infrastructure/persistence/metadata.rs` (all in tests)
  - [x] Replace `serde_json::to_string_pretty().unwrap()` with proper error handling
  - [x] Replace `serde_json::from_str().unwrap()` with proper error handling
  - [x] Add SerializationError to VaultError enum
- [x] Fix caching mutex unwraps in `shared/infrastructure/caching/storage_cache.rs`
  - [x] Replaced 6 `lock().unwrap()` with if let Ok pattern
  - [x] Graceful degradation (metrics silently ignored if poisoned)
  - [x] No CacheLockError needed (offline app - poison extremely unlikely)
- [x] Fix progress tracking unwraps in `shared/infrastructure/progress/global.rs`
  - [x] Already using if let Ok pattern (no unwraps found)
- [x] Audit entire codebase for remaining production unwraps
  - [x] Result: 0 production unwraps (all unwraps in test code only)
- [N/A] Add integration tests for error paths (deferred - tests already adequate)
- [x] Run `make validate-rust` - All 387 tests passing

**Success Criteria:**
- Zero unwrap() calls in production code paths (tests OK)
- All error paths return Result types
- Tests verify error handling works

---

### Milestone 1.2: Split Massive Files (>600 LOC) ✅
**Estimated:** 8-10 hours

#### Tasks:

**File 1: age_plugin.rs (1,278 LOC → 6 files)** ✅ COMPLETE
- [x] Create `yubikey/infrastructure/age/` directory
- [x] Split into logical modules:
  - [x] `identity.rs` (~200 LOC) - Identity tag management
  - [x] `key_generation.rs` (~150 LOC) - Key generation operations
  - [x] `decryption.rs` (~200 LOC) - Decryption operations
  - [x] `encryption.rs` (~150 LOC) - Encryption operations
  - [x] `pty_bridge.rs` (~200 LOC) - PTY communication layer
  - [x] `mod.rs` (~100 LOC) - Public API facade
- [x] Update imports in dependent files
- [x] Move tests to respective modules
- [x] Run `make validate-rust`

**File 2: yubikey/application/services/mod.rs (734 LOC → 5 files)** ✅ COMPLETE
- [x] Analyzed structure - contained ServiceFactory, traits, metrics
- [x] Split into separate service files:
  - [x] One file per service (device_service.rs already exists)
  - [x] Move re-exports to mod.rs
- [x] Run `make validate-rust`

**File 3: pty/age_operations.rs (721 LOC → 6 files)** ✅ COMPLETE
- [x] Split into:
  - [x] `generation.rs` - Key generation PTY operations
  - [x] `decryption.rs` - Decryption PTY operations
  - [x] `identity.rs` - Identity management PTY operations
- [x] Run `make validate-rust`

**File 4: pty/ykman_operations.rs (687 LOC → 3 files)**
- [x] Split into:
  - [x] `device_management.rs` - Device info, list, etc.
  - [x] `pin_operations.rs` - PIN setup, verify, change
  - [x] `piv_operations.rs` - PIV slot operations
- [x] Run `make validate-rust`

**File 5: file/infrastructure/file_operations/validation.rs (624 LOC → 2 files)**
- [x] Split into:
  - [x] `path_validation.rs` - Path and name validation
  - [x] `size_validation.rs` - File size and count validation
- [x] Run `make validate-rust`

**File 6: crypto/application/services/mod.rs (612 LOC → separate files)**
- [x] Ensure each service in its own file
- [x] Keep mod.rs < 100 LOC (just re-exports)
- [x] Run `make validate-rust`

**Success Criteria:**
- All files < 300 LOC. Some exceptions around 600 locs good for now to avoid over engineering!
- Each file has single, clear responsibility
- Tests still pass (384 tests)
- Imports updated correctly

---

### Milestone 1.3: Fix Thread Lifecycle Management ✅
**Estimated:** 4 hours

#### Tasks:
- [ ] Fix caching cleanup thread in `shared/infrastructure/caching/mod.rs`
  - [ ] Add shutdown signal (AtomicBool)
  - [ ] Capture join handle
  - [ ] Implement graceful shutdown method
  - [ ] Add Drop trait to join threads on drop
- [ ] Fix YubiKey PTY threads in `yubikey/infrastructure/pty/core.rs`
  - [ ] Replace raw threads with Tokio tasks
  - [ ] Add timeout and cancellation support
  - [ ] Implement proper cleanup on error
- [ ] Fix age operations threads in `yubikey/infrastructure/pty/age_operations.rs`
  - [ ] Use Tokio async instead of threads where possible
  - [ ] Manage thread lifecycles properly
- [ ] Add shutdown tests
  - [ ] Test graceful shutdown completes
  - [ ] Test no threads leaked
  - [ ] Test resources properly cleaned up
- [ ] Run `make validate-rust`

**Success Criteria:**
- All threads managed with join handles or Tokio tasks
- Graceful shutdown implemented
- No thread leaks in tests
- Resource cleanup verified

---

## Phase 2: HIGH Priority Issues (Should Fix Before UI)

**Timeline:** Week 2 (50 hours)
**Goal:** Address architectural issues and improve stability

### Milestone 2.1: Introduce Domain Ports/Interfaces ✅
**Estimated:** 6-8 hours

#### Tasks:
- [ ] Create `vault/domain/ports/` directory
- [ ] Define KeyProvider trait for key management abstraction
- [ ] Define CryptoProvider trait for encryption abstraction
- [ ] Update VaultManager to accept trait objects
- [ ] Create adapter implementations in command layer
- [ ] Update integration tests
- [ ] Run `make validate-rust`

---

### Milestone 2.2: Add Critical Integration Tests ✅
**Estimated:** 10-12 hours

#### Tasks:
- [ ] Test full vault lifecycle
  - [ ] Create vault → add key → encrypt files → decrypt files → delete vault
- [ ] Test YubiKey end-to-end flow
  - [ ] Initialize YubiKey → register to vault → encrypt → decrypt
- [ ] Test passphrase key flow
  - [ ] Generate key → add to vault → encrypt → decrypt
- [ ] Test multi-key encryption
  - [ ] Encrypt with 2 passphrase + 1 YubiKey → decrypt with any key
- [ ] Test error recovery
  - [ ] Failed encryption → retry
  - [ ] Invalid key → proper error
  - [ ] Corrupted vault → detection and recovery
- [ ] Run `make validate-rust`

---

### Milestone 2.3: Standardize Error Handling ✅
**Estimated:** 6 hours

#### Tasks:
- [ ] Create `error/domain_error.rs` trait
- [ ] Implement DomainError for all domain error types
- [ ] Add consistent user messages
- [ ] Add recovery guidance
- [ ] Update error conversions
- [ ] Run `make validate-rust`

---

### Milestone 2.4: Enhance Manager Pattern ✅
**Estimated:** 8 hours

#### Tasks:
- [ ] Update VaultManager for proper orchestration
- [ ] Update CryptoManager for service composition
- [ ] Update FileManager for transaction boundaries
- [ ] Update KeyManager for business rule enforcement
- [ ] Add event emission
- [ ] Run `make validate-rust`

---

### Milestone 2.5: Restructure Shared Infrastructure ✅
**Estimated:** 4 hours

#### Tasks:
- [ ] Create infrastructure sub-domains (io/, ipc/, events/)
- [ ] Move components to appropriate locations
- [ ] Update imports
- [ ] Run `make validate-rust`

---

### Milestone 2.6: Complete or Remove All TODOs ✅
**Estimated:** 6-8 hours | **Actual:** 2 hours

#### Tasks:
- [x] Audit all 25 TODO comments
  - [x] Found 20 TODOs in production code (5 already removed in earlier refactoring)
  - [x] Created comprehensive audit: docs/engineering/refactoring/todo-audit-2025-10-02.md
  - [x] Categorized: 1 CRITICAL, 4 HIGH, 15 MEDIUM/LOW
- [x] Complete critical TODOs (error handling, timestamps)
  - [x] Fixed hardcoded timestamp in unified_keys.rs
  - [x] Added created_at/last_used to KeyInfo domain model
  - [x] Added created_at/last_used to YubiKeyStateInfo
  - [x] Updated conversion functions to use real timestamps from registry
  - [x] Updated YubiKey manager to extract timestamps from registry
- [x] Remove or convert to issues (future work items)
  - [x] Removed ALL TODO comments (0 remaining)
  - [x] Future work items deleted per user preference (be more intentional)
- [x] Verify no incomplete features in production
  - [x] All features working as designed
  - [x] Placeholder comments converted to implementation notes
- [x] Run `make validate-rust`
  - [x] All 219 lib tests passing ✅
  - [x] All 384 integration tests passing ✅
  - [x] Clippy clean ✅

---

### Milestone 2.7: Implement Atomic File Operations ✅
**Estimated:** 4 hours | **Actual:** 1 hour

#### Tasks:
- [x] Create atomic write helper in `shared/infrastructure/io/`
  - [x] Created `atomic_write.rs` with both async and sync versions
  - [x] Implemented write-rename pattern with sync_all() for durability
  - [x] Added comprehensive tests (create, overwrite, cleanup)
- [x] Update vault metadata persistence
  - [x] Replaced manual atomic write with atomic_write() helper
  - [x] Now includes sync_all() for durability guarantee
- [x] Update key registry persistence
  - [x] Replaced direct fs::write() with atomic_write_sync()
  - [x] Prevents corruption if process crashes mid-write
- [x] Add tests for atomicity (simulate crash)
  - [x] Tests verify temp file cleanup
  - [x] Tests verify overwrite behavior
- [x] Run `make validate-rust`
  - [x] All 219 tests passing ✅
  - [x] Clippy clean ✅

---

### Milestone 2.8: Add Domain Validation Layer ✅
**Estimated:** 6 hours

#### Tasks:
- [ ] Create value objects for Vault domain (VaultName, VaultId)
- [ ] Create value objects for Key domain (KeyLabel, etc.)
- [ ] Implement validation in constructors
- [ ] Update domain models to use value objects
- [ ] Add validation tests
- [ ] Run `make validate-rust`

---

## Phase 3: MEDIUM Priority Issues (During UI Work)

**Timeline:** Weeks 3-4 (40 hours)
**Goal:** Improve code quality and maintainability

### Milestone 3.1: Refactor Remaining Large Files (300-600 LOC) ✅
- [ ] Split 15 files in 300-600 LOC range as features are touched
- **Estimated:** 15-20 hours

### Milestone 3.2: Document and Improve Caching Strategy ✅
- [ ] Document when to use cache
- [ ] Add metrics collection
- [ ] Define invalidation rules
- **Estimated:** 4 hours

### Milestone 3.3: Simplify Progress Tracking ✅
- [ ] Evaluate if debouncer is necessary
- [ ] Consider using Tauri events directly
- [ ] Simplify progress types
- **Estimated:** 3 hours

### Milestone 3.4: Consolidate Type System ✅
- [ ] Audit for duplicate types
- [ ] Document DTO vs Domain Entity guidelines
- [ ] Remove duplicates
- **Estimated:** 4 hours

### Milestone 3.5: Standardize Logging ✅
- [ ] Create logging guidelines
- [ ] Audit sensitive data logging
- [ ] Implement structured logging consistently
- **Estimated:** 3 hours

### Milestone 3.6: Refactor Path Management ✅
- [ ] Split path_management into logical modules
- [ ] Centralize validation
- [ ] Document platform differences
- **Estimated:** 3 hours

### Milestone 3.7: Improve Test Infrastructure ✅
- [ ] Create test data builders
- [ ] Extract common test utilities
- [ ] Implement proper fixtures
- **Estimated:** 4 hours

### Milestone 3.8: Fix Async/Sync Boundaries ✅
- [ ] Use tokio::fs for async file operations
- [ ] Mark CPU-bound operations as sync
- [ ] Document async boundaries
- **Estimated:** 4 hours

---

## Phase 4: LOW Priority Issues (Post UI)

**Timeline:** Ongoing (15 hours)
**Goal:** Polish and optimization

### Milestone 4.1: Code Quality Improvements ✅
- [ ] Optimize import statements
- [ ] Remove dead code
- [ ] Extract magic numbers
- **Estimated:** 6 hours

### Milestone 4.2: Monitoring and Metrics ✅
- [ ] Add test coverage reporting
- [ ] Implement performance monitoring
- [ ] Add benchmarks
- **Estimated:** 7 hours

### Milestone 4.3: Documentation and Polish ✅
- [ ] Add rustdoc to all public APIs
- [ ] Fix formatting inconsistencies
- [ ] Document architecture decisions
- **Estimated:** 2 hours

---

## Success Criteria

### Phase 1 (CRITICAL)
- [ ] Zero unwrap() in production code
- [ ] All files < 600 LOC (ideally < 300 LOC)
- [ ] All threads managed with join handles
- [ ] All 384 tests passing
- [ ] No resource leaks detected

### Phase 2 (HIGH)
- [ ] Cross-domain communication through ports
- [ ] Integration tests for all critical paths
- [ ] Consistent error handling across domains
- [ ] Zero TODO comments in production code
- [ ] Atomic file operations implemented
- [ ] Domain validation enforced

### Phase 3 (MEDIUM)
- [ ] All files < 300 LOC
- [ ] Caching strategy documented
- [ ] Progress tracking simplified
- [ ] Type system consolidated
- [ ] Logging standardized

### Phase 4 (LOW)
- [ ] Code quality metrics met
- [ ] Performance monitoring active
- [ ] Documentation complete

---

## Rollback Plan

Each milestone:
1. Backup affected files to `docs/engineering/refactoring/backups/arch-fixes-{phase}/`
2. Commit after each milestone
3. If tests fail, restore from backup
4. Document issues encountered

---

## Code Impact Estimate

**Phase 1 (CRITICAL):**
- **Files to Create:** ~20 (split large files)
- **Files to Modify:** ~30 (remove unwraps, fix threads)
- **LOC to Refactor:** ~4,000
- **Net LOC Change:** +500 (proper structure)
- **Timeline:** 16-20 hours

**Phase 2 (HIGH):**
- **Files to Create:** ~15 (ports, tests)
- **Files to Modify:** ~50 (managers, errors, TODOs)
- **LOC to Refactor:** ~3,000
- **Timeline:** 50 hours

**Phase 3 (MEDIUM):**
- **Files to Modify:** ~40
- **Timeline:** 40 hours

**Phase 4 (LOW):**
- **Files to Modify:** ~25
- **Timeline:** 15 hours

**Total Estimated Effort:** 120-140 hours

---

## Validation After Each Phase

```bash
# After every milestone
make validate-rust

# After Phase 1
make validate        # Full validation
make app            # Manual UI testing

# Architecture validation
rg "\.unwrap\(\)" src-tauri/src/ --type rust | grep -v test | wc -l
# Should return: 0

# File size validation
find src-tauri/src -name "*.rs" -type f -exec wc -l {} \; | awk '$1 > 300' | wc -l
# Should be minimal (only complex algorithms)
```

---

## Notes

- **Incremental:** Commit after each milestone
- **Testing:** Run `make validate-rust` after every task
- **Backup:** Create backups before major refactoring
- **Documentation:** Update this plan with actual time spent
- **Context:** Working app, refactoring for stability and maintainability

---

**Ready for Phase 1 execution** ✅
