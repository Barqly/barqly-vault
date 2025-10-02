# Error & Logging Implementation Plan

**Date:** 2025-10-02
**Reference:** error-logging-arch-design-blueprint.md
**Strategy:** Incremental rollout, starting with Vault domain

---

## Overview

This plan implements the hybrid error/logging architecture defined in the blueprint through iterative, domain-by-domain rollout.

**Approach:**
- **Iteration 1:** Vault domain (proof of concept)
- **Refine:** Based on learnings
- **Rollout:** Apply pattern to remaining 6 domains
- **Enhance:** Instrumentation and logging standardization

---

## Phase 1: Foundation - Vault Domain (Iteration 1) ⭐

**Goal:** Complete working pattern for one domain end-to-end
**Timeline:** 8-10 hours
**Success:** Vault domain uses catalog, trait works, logging standardized

---

### Milestone 1.1: Create Catalog Infrastructure ✅

**Estimated:** 2 hours

#### Tasks:

**1.1.1: Analyze and Design Range Allocation**
- [ ] Review all current errors across domains
- [ ] Count errors by module and severity
- [ ] Design range allocation (50 codes default, 100 for hot modules)
- [ ] Create range allocation map
- [ ] Document expansion strategy

**1.1.2: Create Catalog Structure**
- [ ] Create `src-tauri/src/errors/` directory
- [ ] Create `errors/catalog/` subdirectory
- [ ] Create `errors/catalog/ALLOCATION.md` (range allocation map)
- [ ] Create `errors/catalog/mod.rs` (module orchestration)
- [ ] Create `errors/catalog/codes.rs` (aggregate re-exports)

**1.1.3: Create Vault Error Codes**
- [ ] Create `errors/catalog/domains/vault.rs`
- [ ] Analyze current VaultError enum (7 variants)
- [ ] Allocate codes:
  - Critical: 1000500-1000549 (vault domain)
  - High: 2000500-2000549 (vault domain)
- [ ] Define consts for each error
- [ ] Document last assigned code in comments
- [ ] Export from codes.rs

**Success Criteria:**
- Catalog structure exists
- Vault has codes allocated (critical + high ranges)
- Range allocation documented
- All module files compile

---

### Milestone 1.2: Implement DomainError Trait ✅

**Estimated:** 2-3 hours

#### Tasks:

**1.2.1: Create DomainError Trait**
- [ ] Create `errors/traits.rs`
- [ ] Define `DomainError` trait with methods:
  - `error_code() -> u32` (from catalog)
  - `severity_class() -> &'static str` (auto from code range)
  - `otel_severity() -> u8` (map to OTel 1-24)
  - `module() -> &'static str` (parse from code)
  - `user_message() -> String` (default to Display)
  - `recovery_guidance() -> Option<String>` (trait method)
  - `is_recoverable() -> bool` (trait method)
  - `to_command_error() -> CommandError` (auto conversion)
  - `map_to_error_code() -> ErrorCode` (numeric → enum)
- [ ] Add comprehensive doc comments
- [ ] Create module_from_code() helper
- [ ] Create severity_from_code() helper

**1.2.2: Create ErrorCode Mapping**
- [ ] Update `types/error_code.rs` (add metadata if needed)
- [ ] Create reverse mapping (numeric code → ErrorCode enum)
- [ ] Handle unmapped codes gracefully (default to InternalError)

**1.2.3: Add Tests**
- [ ] Test severity_class() extraction
- [ ] Test otel_severity() mapping
- [ ] Test module() extraction
- [ ] Test to_command_error() conversion
- [ ] Test map_to_error_code() mapping

**Success Criteria:**
- DomainError trait compiles
- Helper methods tested
- Ready to implement for VaultError

---

### Milestone 1.3: Implement DomainError for VaultError ✅

**Estimated:** 2 hours

#### Tasks:

**1.3.1: Backup and Update VaultError**
- [ ] Backup: `vault/domain/errors.rs` to refactoring/backups/
- [ ] Review current VaultError enum (7 variants)
- [ ] Keep existing variants unchanged (COPY → ADJUST)
- [ ] Add `use crate::errors::catalog::codes;` import

**1.3.2: Implement error_code() Method**
- [ ] Implement `error_code()` matching each variant to catalog const
- [ ] Map NotFound → codes::critical::domains::vault::NOT_FOUND
- [ ] Map CreationFailed → codes::critical::domains::vault::CREATION_FAILED
- [ ] Map AlreadyExists → codes::high::domains::vault::ALREADY_EXISTS
- [ ] Map InvalidName → codes::high::domains::vault::NAME_INVALID
- [ ] Document mapping in comments

**1.3.3: Implement recovery_guidance() Method**
- [ ] Copy existing recovery guidance from current commands
- [ ] Map each variant to user-friendly guidance
- [ ] Ensure guidance is actionable

**1.3.4: Implement is_recoverable() Method**
- [ ] Classify each error as recoverable or not
- [ ] NotFound: false (cannot recover)
- [ ] InvalidName: true (user can fix)
- [ ] AlreadyExists: true (user can choose different name)

**1.3.5: Add Tests**
- [ ] Test error_code() returns correct numeric code
- [ ] Test severity_class() returns correct class
- [ ] Test module() returns "vault"
- [ ] Test to_command_error() conversion
- [ ] Test recovery_guidance() returns expected text
- [ ] Run `cargo test vault::domain::errors`

**Success Criteria:**
- VaultError implements DomainError trait
- All methods return correct values
- Tests passing
- No regressions in existing vault functionality

---

### Milestone 1.4: Update Vault Commands to Use Trait ✅

**Estimated:** 1-2 hours

#### Tasks:

**1.4.1: Identify Manual Conversion Locations**
- [ ] Backup `commands/vault/vault_management.rs`
- [ ] Find all VaultError → CommandError conversions
- [ ] Count lines of boilerplate (estimate: ~80-100 LOC)

**1.4.2: Replace with Trait Conversion**
- [ ] Replace manual match statements with `.to_command_error()`
- [ ] Example:
  ```rust
  // BEFORE (25 lines):
  Err(e) => Err(Box::new(CommandError {
      code: match e { ... },
      message: e.to_string(),
      recovery_guidance: Some(match e { ... }),
      ...
  }))

  // AFTER (1 line):
  Err(e) => Err(Box::new(e.to_command_error()))
  ```
- [ ] Update create_vault command
- [ ] Update delete_vault command
- [ ] Update list_vaults command
- [ ] Update set_current_vault command

**1.4.3: Verify Error Responses**
- [ ] Check error codes in responses match catalog
- [ ] Verify recovery guidance preserved
- [ ] Ensure user_actionable flag correct
- [ ] Run `cargo test commands::vault`

**Success Criteria:**
- Manual conversion code removed (~80-100 LOC deleted)
- Vault commands use trait conversion
- Error responses unchanged (same codes, messages)
- All tests passing
- No regressions

---

### Milestone 1.5: Standardize Vault Logging ✅

**Estimated:** 2-3 hours

#### Tasks:

**1.5.1: Update Logging Pattern in Vault Services**
- [ ] Backup vault service files
- [ ] Find all error!, warn!, info! calls in vault/
- [ ] Convert to structured format:
  ```rust
  // BEFORE:
  error!("Failed to create vault: {}", e);

  // AFTER:
  error!(
      error.code = e.error_code(),
      error.type = std::any::type_name_of_val(&e),
      error.severity_class = e.severity_class(),
      error.module = "vault",
      vault.name = %name,
      severity_number = e.otel_severity(),
      "Vault creation failed"
  );
  ```
- [ ] Update VaultManager error logging
- [ ] Update VaultService error logging
- [ ] Update VaultRepository error logging
- [ ] Update vault persistence error logging

**1.5.2: Standardize Success Logging**
- [ ] Add structured fields to success logs:
  ```rust
  info!(
      vault.id = %vault.id,
      vault.name = %vault.name,
      operation = "vault_create",
      "Vault created successfully"
  );
  ```
- [ ] Update all vault operation info! calls
- [ ] Ensure consistent field naming

**1.5.3: Add Local Timezone**
- [ ] Backup `logging/formatter.rs`
- [ ] Change `Utc::now()` to `Local::now()`
- [ ] Verify RFC3339 output includes offset
- [ ] Test log output format
- [ ] Update formatter tests if any

**Success Criteria:**
- All vault error logs have error.code
- All vault logs use structured fields
- Local timezone in timestamps
- Consistent field naming (vault.id, vault.name, etc.)
- Tests passing

---

### Milestone 1.6: Implement Basic Log Rotation ✅

**Estimated:** 1-2 hours

#### Tasks:

**1.6.1: Design Rotation Logic**
- [ ] Define rotation policy:
  - Trigger: Log file > 10MB
  - Archive with timestamp: barqly-vault-{timestamp}.log
  - Keep: 7 most recent files
  - Delete: Files older than 7th
- [ ] Design cleanup strategy

**1.6.2: Implement Rotation**
- [ ] Create `logging/rotation.rs` module
- [ ] Implement `rotate_if_needed(log_path)` function
- [ ] Implement `cleanup_old_logs(log_dir, keep_count)` function
- [ ] Add to logging init (before creating file appender)
- [ ] Test with various file sizes

**1.6.3: Add Tests**
- [ ] Test rotation at 10MB threshold
- [ ] Test cleanup keeps correct count
- [ ] Test archive naming with timestamp
- [ ] Verify no data loss during rotation

**Success Criteria:**
- Log rotation working on app startup
- 10MB threshold enforced
- 7 files retained
- Old files deleted automatically
- Tests passing

---

### Milestone 1.7: Documentation and Review ✅

**Estimated:** 1 hour

#### Tasks:

**1.7.1: Update Documentation**
- [ ] Update `errors/catalog/ALLOCATION.md` with actual codes used
- [ ] Document Vault error codes (with examples)
- [ ] Create usage examples in blueprint
- [ ] Update this plan with actuals vs estimates

**1.7.2: Create Usage Guide**
- [ ] Document how to add new Vault error
- [ ] Document how to modify existing error
- [ ] Document logging pattern for vault operations
- [ ] Create troubleshooting guide

**1.7.3: Prepare for Review**
- [ ] Run full validation: `make validate-rust`
- [ ] Test vault operations manually
- [ ] Generate metrics:
  - LOC removed (boilerplate)
  - Codes allocated
  - Logging coverage
- [ ] List review questions for refinement

**Success Criteria:**
- Documentation complete
- All tests passing
- Manual testing successful
- Ready for review and refinement

---

## Phase 1 Validation

### Before Starting

```bash
# Baseline current state
cargo test vault::domain::errors
cargo test commands::vault

# Count current boilerplate
rg "match.*VaultError" src-tauri/src/commands/vault/ | wc -l
```

### After Each Milestone

```bash
# Validate compilation
cargo clippy --all-targets -- -D warnings

# Run tests
cargo test vault

# Verify no regressions
make validate-rust
```

### After Phase 1 Complete

```bash
# Full validation
make validate-rust

# Check log output
tail -50 ~/Library/Application\ Support/com.Barqly.Vault/logs/barqly-vault.log

# Verify error codes in logs
grep "error.code" ~/Library/Application\ Support/com.Barqly.Vault/logs/barqly-vault.log

# Test manual vault operations
cargo run  # Create vault, trigger errors, check logs
```

---

## Review Questions (After Phase 1)

### Architecture
- [ ] Is catalog structure maintainable?
- [ ] Is 50-code allocation per module sufficient?
- [ ] Are range allocations logical?
- [ ] Is module extraction from code working correctly?

### Developer Experience
- [ ] Is it easy to add new error codes?
- [ ] Is DomainError trait intuitive to implement?
- [ ] Are error messages user-friendly?
- [ ] Is recovery guidance helpful?

### Logging
- [ ] Is structured logging pattern clean?
- [ ] Are field names consistent?
- [ ] Is local timezone readable?
- [ ] Is log rotation working well?

### Technical
- [ ] Any performance issues?
- [ ] Compile time acceptable?
- [ ] Test coverage sufficient?
- [ ] Documentation clear?

**Refinement:** Address concerns before Phase 2 rollout

---

## Phase 2: Domain Rollout (After Phase 1 Refinement)

**Scope:** Apply proven pattern to remaining domains

### Milestone 2.1: Crypto Domain ✅
**Estimated:** 4-5 hours

- [ ] Allocate codes for CryptoError (1000550-1000599)
- [ ] Create catalog/domains/crypto.rs
- [ ] Implement DomainError for CryptoError
- [ ] Update crypto commands
- [ ] Standardize crypto logging
- [ ] Tests

### Milestone 2.2: File Domain ✅
**Estimated:** 4-5 hours

- [ ] Allocate codes for FileError (1000600-1000649)
- [ ] Create catalog/domains/file.rs
- [ ] Implement DomainError for FileError
- [ ] Update file commands
- [ ] Standardize file logging
- [ ] Tests

### Milestone 2.3: Key Management Domains ✅
**Estimated:** 8-10 hours

**YubiKey Domain:**
- [ ] Allocate codes (1000750-1000799)
- [ ] Create catalog/domains/yubikey.rs
- [ ] Implement DomainError for YubiKeyError
- [ ] Update yubikey commands
- [ ] YubiKeyError already has good structure - preserve
- [ ] Tests

**Passphrase Domain:**
- [ ] Allocate codes (1000700-1000749)
- [ ] Create catalog/domains/passphrase.rs
- [ ] Implement DomainError for PassphraseError
- [ ] Update passphrase commands
- [ ] Preserve existing is_recoverable(), recovery_guidance()
- [ ] Tests

**Shared Key Management:**
- [ ] Allocate codes (1000650-1000699)
- [ ] Create catalog/domains/key_management.rs
- [ ] Implement for KeyManagementError
- [ ] Tests

**Estimated Total:** 16-20 hours

---

## Phase 3: Infrastructure Layer (After Phase 2)

**Scope:** Infrastructure error codes and logging

### Milestone 3.1: Age Operations ✅
**Estimated:** 3-4 hours

- [ ] Allocate codes (1001000-1001099, hot module = 100 codes)
- [ ] Create catalog/infrastructure/age.rs
- [ ] Review crypto/infrastructure/crypto_errors.rs
- [ ] Map errors to codes
- [ ] Standardize age operation logging (currently has good structured logging)
- [ ] Tests

### Milestone 3.2: YubiKey Infrastructure ✅
**Estimated:** 5-6 hours

**YubiKey PTY (Hot Module):**
- [ ] Allocate codes (1001200-1001299, 100 codes)
- [ ] Create catalog/infrastructure/yubikey_pty.rs
- [ ] Map PTY errors to codes
- [ ] Standardize PTY logging

**YKMan Operations:**
- [ ] Allocate codes (1001300-1001349)
- [ ] Create catalog/infrastructure/ykman.rs
- [ ] Map ykman errors to codes

**Age-Plugin-YubiKey:**
- [ ] Allocate codes (1001350-1001399)
- [ ] Create catalog/infrastructure/age_plugin.rs

### Milestone 3.3: Storage & Persistence ✅
**Estimated:** 3-4 hours

- [ ] Vault persistence (1001750-1001799)
- [ ] Registry persistence (1001700-1001749)
- [ ] Key storage (1001800-1001849)
- [ ] Archive/manifest operations (1001550-1001649)
- [ ] Validation (1001650-1001699)

**Estimated Total:** 11-14 hours

---

## Phase 4: Logging Standardization (After Phase 3)

**Scope:** Convert all logging to structured format

### Milestone 4.1: Standardize Service Layer Logging ✅
**Estimated:** 6-8 hours

- [ ] Audit all service layer logs (count unstructured)
- [ ] Create logging pattern guide
- [ ] Convert unstructured logs to structured:
  - `info!("Created staging area")` → `info!(file.path = %path, "Created staging area")`
- [ ] Apply standard field names
- [ ] Ensure all errors logged with error.code
- [ ] Tests

### Milestone 4.2: Standardize Manager Layer Logging ✅
**Estimated:** 2-3 hours

- [ ] Add logging to all managers (currently minimal)
- [ ] Use structured fields consistently
- [ ] Add operation context

### Milestone 4.3: Command Layer Logging ✅
**Estimated:** 2-3 hours

- [ ] Ensure all commands have #[instrument]
- [ ] Add structured success logging
- [ ] Standardize error logging

**Estimated Total:** 10-14 hours

---

## Phase 5: Instrumentation (Optional Enhancement)

**Scope:** Add spans for request tracing

### Milestone 5.1: Manager Instrumentation ✅
**Estimated:** 4-5 hours

- [ ] Add #[instrument] to all manager methods
- [ ] Define span fields (vault_id, key_id, etc.)
- [ ] Test span creation

### Milestone 5.2: Service Instrumentation ✅
**Estimated:** 6-8 hours

- [ ] Add #[instrument] to all service methods
- [ ] Ensure parent-child span relationships
- [ ] Test request flow tracing

**Estimated Total:** 10-13 hours

---

## Rollback Plan

### Per Milestone
1. **Backup:** Copy affected files to `docs/engineering/refactoring/backups/error-logging-{milestone}/`
2. **Commit:** Commit after each milestone
3. **Rollback:** If tests fail, `git reset --hard {last_good_commit}`
4. **Restore:** Copy from backup if needed

### Full Phase Rollback
```bash
# Find last commit before Phase 1
git log --oneline | grep "before error-logging"

# Reset to that commit
git reset --hard {commit_hash}
```

---

## Code Impact Estimate

### Phase 1: Vault Domain (Iteration 1)

**Files to Create:**
- `errors/catalog/` structure (5-6 new files)
- `errors/traits.rs` (1 new file)
- `errors/catalog/ALLOCATION.md` (1 doc)
- `logging/rotation.rs` (1 new file)

**Files to Modify:**
- `vault/domain/errors.rs` (add trait impl)
- `commands/vault/vault_management.rs` (remove boilerplate)
- `logging/formatter.rs` (local timezone)
- `logging/mod.rs` (add rotation)
- Vault services (~5 files for logging)

**LOC Impact:**
- **Added:** ~300 LOC (catalog + trait + rotation)
- **Removed:** ~100 LOC (command boilerplate)
- **Modified:** ~50 LOC (logging updates)
- **Net:** +150 LOC

**Timeline:** 8-10 hours

---

### Phase 2-3: Remaining Domains + Infrastructure

**Files to Create:**
- Catalog modules (~15 new files)

**Files to Modify:**
- Domain error files (~10 files)
- Command files (~15 files)
- Service files (~30 files for logging)

**LOC Impact:**
- **Added:** ~800 LOC (catalog entries)
- **Removed:** ~400 LOC (boilerplate)
- **Modified:** ~200 LOC (logging)
- **Net:** +200 LOC

**Timeline:** 40-50 hours

---

## Success Metrics

### After Phase 1

**Quantitative:**
- [ ] Boilerplate reduced: ~100 LOC removed from vault commands
- [ ] Error codes allocated: 7-10 codes (vault domain)
- [ ] Logging coverage: 100% of vault operations have error.code
- [ ] Test coverage: No reduction in test count
- [ ] Performance: No measurable overhead

**Qualitative:**
- [ ] Catalog easy to navigate
- [ ] Adding new error takes <10 minutes
- [ ] Logs are more readable
- [ ] Error tracking is easier

---

### After Full Rollout

**Quantitative:**
- [ ] Boilerplate reduced: ~400 LOC removed
- [ ] Error codes allocated: ~250 codes across all domains
- [ ] Logging coverage: 100% structured logging
- [ ] Instrumentation: 80%+ functions have spans

**Qualitative:**
- [ ] Consistent error handling across all domains
- [ ] Easy to add new domains
- [ ] Logs support debugging effectively
- [ ] OTel-ready for future distributed mode

---

## Risk Assessment

### Technical Risks

**Risk 1: Trait Overhead**
- **Concern:** Virtual dispatch for trait methods
- **Mitigation:** Most methods return primitives (u32, &str), minimal overhead
- **Validation:** Benchmark error conversions

**Risk 2: Catalog Maintenance**
- **Concern:** 50 files × 50 codes = complex
- **Mitigation:** Module-based organization, clear naming
- **Validation:** Review after iteration 1

**Risk 3: Breaking Changes**
- **Concern:** Error codes change, frontend breaks
- **Mitigation:** Maintain ErrorCode enum as compatibility layer
- **Validation:** Integration tests for error responses

### Rollout Risks

**Risk 1: Pattern Not Scalable**
- **Concern:** Works for Vault, fails for complex YubiKey
- **Mitigation:** Iteration 1 proves pattern, refine before rollout
- **Contingency:** Can adjust trait/catalog design

**Risk 2: Time Estimate Too Optimistic**
- **Concern:** 8-10 hours for Phase 1 too low
- **Mitigation:** Iteration 1 gives real data, adjust plan
- **Contingency:** Can extend timeline or reduce scope

---

## Iteration 1 Detailed Plan

### Pre-Implementation

**1. Analyze Current Vault Errors**
```bash
# Find all VaultError usage
rg "VaultError::" src-tauri/src/
rg "enum VaultError" src-tauri/src/ -A 20

# Count command conversion boilerplate
rg "match.*VaultError" src-tauri/src/commands/vault/ -A 30

# Count vault logging calls
rg "error!\|warn!\|info!\|debug!" src-tauri/src/services/vault/ | wc -l
```

**2. Design Vault Code Allocation**

Based on analysis, allocate:
- Critical: 1000500-1000504 (5 codes initially)
- High: 2000500-2000503 (4 codes initially)
- Reserved: 1000505-1000549 (45 codes), 2000504-2000549 (46 codes)

**3. Document Allocation**

Update ALLOCATION.md with vault allocation and usage tracking.

---

### Implementation Sequence

**Day 1 (4-5 hours):**
1. Create catalog structure
2. Allocate Vault codes
3. Implement DomainError trait
4. Tests

**Day 2 (4-5 hours):**
5. Implement trait for VaultError
6. Update vault commands
7. Update vault logging
8. Add log rotation
9. Documentation

**Total: 8-10 hours**

---

### Post-Implementation Review

**Questions to Answer:**
1. Was 50-code allocation sufficient for Vault?
2. Is catalog structure maintainable?
3. Is DomainError trait easy to implement?
4. Did we reduce boilerplate significantly?
5. Is structured logging cleaner?
6. Any pain points in the process?

**Refinements:**
- Adjust allocation strategy if needed
- Simplify trait if too complex
- Update logging pattern if verbose
- Fix any rough edges

**Then:** Apply refined pattern to other 6 domains

---

## Integration with Existing Architecture

### No Breaking Changes

**Preserved:**
- ✅ ErrorCode enum (frontend compatibility)
- ✅ CommandError struct (Tauri bridge)
- ✅ Domain error enums (just add trait impl)
- ✅ Existing error messages (kept in thiserror)
- ✅ Recovery guidance (moved to trait)

**Added:**
- ✅ Numeric error codes (new dimension)
- ✅ DomainError trait (unified behavior)
- ✅ Structured logging (enhanced, not replaced)
- ✅ Catalog (central registry)

**Removed:**
- ✅ Manual error conversion match statements (boilerplate)
- ✅ Duplicated recovery guidance (now in trait)

---

## Appendices

### Appendix A: Example Vault Error Allocation

**Critical Errors (1000500-1000549):**
```
1000501: Vault not found
1000502: Vault creation failed (filesystem error)
1000503: Vault metadata corrupted
1000504: Vault deletion failed
1000505: Vault decryption failed
1000506-1000549: AVAILABLE (44 codes)
```

**High Errors (2000500-2000549):**
```
2000501: Vault name has invalid characters
2000502: Vault already exists
2000503: Vault key limit exceeded
2000504: Vault is empty (no keys)
2000505-2000549: AVAILABLE (45 codes)
```

### Appendix B: Sample Catalog File

See `errors/catalog/domains/vault.rs` in blueprint for complete example.

### Appendix C: Before/After Code Comparison

**Before (Manual Conversion - 25 lines):**
```rust
match manager.create_vault(input.name, input.description).await {
    Ok(vault_summary) => Ok(CreateVaultResponse { vault: vault_summary }),
    Err(e) => Err(Box::new(CommandError {
        code: match e {
            VaultError::InvalidName(_) => ErrorCode::InvalidInput,
            VaultError::AlreadyExists(_) => ErrorCode::VaultAlreadyExists,
            _ => ErrorCode::StorageFailed,
        },
        message: e.to_string(),
        details: None,
        recovery_guidance: Some(match e {
            VaultError::InvalidName(_) => "Enter a valid vault name".to_string(),
            VaultError::AlreadyExists(_) => "Choose a different vault name".to_string(),
            _ => "Check disk space and permissions".to_string(),
        }),
        user_actionable: true,
        trace_id: None,
        span_id: None,
    })),
}
```

**After (Trait Conversion - 5 lines):**
```rust
match manager.create_vault(input.name, input.description).await {
    Ok(vault_summary) => Ok(CreateVaultResponse { vault: vault_summary }),
    Err(e) => Err(Box::new(e.to_command_error())),
}
```

**Reduction:** 20 lines → 80% less code

---

## Notes

- **Incremental:** Commit after each milestone
- **Testing:** Run tests after every change
- **Backup:** Create backups before refactoring
- **Documentation:** Keep ALLOCATION.md updated with actual usage
- **Validation:** `make validate-rust` after each phase

---

**Ready for Phase 1 execution** after blueprint review and approval.
