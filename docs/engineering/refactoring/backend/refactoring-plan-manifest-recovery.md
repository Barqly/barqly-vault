# Manifest & Recovery System Refactoring Plan - R2

**Status:** Planning Phase
**Priority:** P0 - Critical for R2 Release
**Dependencies:** Backend DDD Refactoring Phase 1 (Complete)
**Related:** `arch-decisions.md`, `centralized-architecture-design.md`

---

## Phase 1: Foundation & Schema (P0 - Critical)

### Milestone 1: Device Identity & Label Sanitization ✅ COMPLETE
- [x] Create device UUID generation service
  - [x] Generate UUID v4 on first launch
  - [x] Read system hostname for machine_label
  - [x] Create `device.json` in non-sync location
  - [x] Add persistence layer for device identity
- [x] Enhance label sanitization in `user_vaults.rs`
  - [x] Add emoji removal logic
  - [x] Add invalid character replacement (→ hyphens)
  - [x] Add multiple hyphen collapse
  - [x] Add leading/trailing hyphen trim
  - [x] Add 200 char limit enforcement
  - [x] Add reserved name checking (Windows: CON, PRN, etc.)
  - [x] Add leading dot prevention
  - [x] Return both sanitized and display label
  - [x] Update all callers to use new signature (backward compatible API maintained)
- [x] Add tests for sanitization edge cases
  - [x] Unicode/emoji handling
  - [x] Path traversal attempts
  - [x] Reserved names
  - [x] Length limits
  - [x] Cross-platform compatibility

### Milestone 2: Manifest Schema Updates ✅ COMPLETE
- [x] Update `VaultMetadata` struct in `metadata.rs`
  - [x] Add `schema: String` field
  - [x] Add `label: String` field (display name)
  - [x] Add `sanitized_name: String` field
  - [x] Add `manifest_version: u32` field
  - [x] Add `last_encrypted_at: DateTime<Utc>` field
  - [x] Add `last_encrypted_by` struct with machine_id and machine_label
  - [x] Add `selection_type: SelectionType` enum (folder | files)
  - [x] Add `base_path: Option<String>` field
  - [x] Add `VaultFileEntry` struct for file listings
  - [x] Add `files: Vec<VaultFileEntry>` field
  - [x] Add optional `integrity` struct for hashes
  - [x] Preserve legacy `version: String` field for compatibility
- [x] Update `RecipientInfo` struct
  - [x] Add `key_filename` to Passphrase variant
  - [x] Add `piv_slot` to YubiKey variant
  - [x] Add `identity_tag` to YubiKey variant
  - [x] Add `firmware_version` to YubiKey variant
  - [x] Verify created_at timestamp exists
  - [x] Structure matches registry KeyEntry exactly
- [x] Add manifest versioning logic
  - [x] `increment_version()` method
  - [x] `compare_version()` helper
  - [x] Initialize version = 1 for new vaults
  - [x] `new_r2()` constructor with all fields
  - [x] Legacy `new()` preserved for backward compatibility
- [x] Add serialization/deserialization tests
  - [x] Version increment test
  - [x] Version comparison test
  - [x] Schema validation test
  - [x] Backward compatibility (legacy new() works)
  - [x] All existing tests updated and passing

### Milestone 3: Manifest Storage Location Migration ✅ COMPLETE
- [x] Create new vaults directory structure
  - [x] Add `get_vaults_manifest_dir()` helper
  - [x] Create `~/Library/.../vaults/` folder
  - [x] Add manifest path generation using sanitized names
- [x] Update manifest persistence operations
  - [x] Change `get_vault_manifest_path()` to use non-sync vaults/
  - [x] Add `get_vault_external_manifest_path()` (deprecated, R1 compat)
  - [x] Atomic_write() already used in existing code
- [x] Add backup directory structure
  - [x] Create `get_manifest_backups_dir()` helper
  - [x] Add `get_manifest_backup_path()` with timestamp
  - [x] Add `generate_backup_timestamp()` utility
- [x] Migration from R1 external manifests
  - [x] Deprecated function preserved for R1 compatibility
  - [x] New code uses non-sync location automatically

---

## Phase 2: Version Control & Conflict Resolution (P0 - Critical)

### Milestone 4: Version Comparison Logic ✅ COMPLETE
- [x] Create version comparison service
  - [x] Compare bundle.version vs local.version
  - [x] Compare bundle.last_encrypted_at vs local.last_encrypted_at
  - [x] Implement tiebreaker logic (timestamp)
  - [x] Add logging for version conflicts
- [x] Implement "newer wins" resolution
  - [x] Bundle newer → backup local, replace with bundle
  - [x] Bundle older → keep local, warn user
  - [x] Same version → use timestamp tiebreaker
  - [x] Add user-facing warning messages via get_conflict_message()
- [x] Add version comparison tests
  - [x] Bundle newer scenario
  - [x] Bundle older scenario
  - [x] Same version scenario
  - [x] Missing local manifest scenario
  - [x] All scenarios with backup verification

### Milestone 5: Manifest Backup System ✅ COMPLETE
- [x] Implement backup before overwrite
  - [x] Create backup with timestamp (in backup_and_replace)
  - [x] Save to backups/manifest/ folder
  - [x] Log backup creation
- [x] Add retention policy (keep last 5)
  - [x] cleanup_old_backups() method
  - [x] Count existing backups per vault
  - [x] Delete oldest when > 5
  - [x] Handle backup cleanup errors gracefully (warn, don't fail)
- [x] Add backup restoration capability
  - [x] list_backups() - List available backups
  - [x] restore_from_backup() - Restore with validation
  - [x] Validate restored manifest
- [x] Add backup system tests
  - [x] test_backup_retention_policy (7 versions → 5 kept)
  - [x] test_restore_from_backup (restore and verify)
  - [x] test_list_backups_empty (empty vault)

---

## Phase 3: Encryption & Decryption Flow Updates (P0 - Critical)

### Milestone 6: Payload Staging Enhancement ✅ COMPLETE
- [x] Create RECOVERY.txt generation service
  - [x] RecoveryTxtService with dynamic generation
  - [x] Extract vault metadata (version, machine, timestamps)
  - [x] List all recipients with YubiKey/passphrase details
  - [x] Generate vault-specific recovery instructions
  - [x] Add file count and total size
  - [x] Format with headers and sections for readability
  - [x] 4 tests (passphrase-only, yubikey, hybrid, format_size)
- [x] Create PayloadStagingService for complete vault bundles
  - [x] create_vault_payload() orchestrates full bundle creation
  - [x] Stage user files (preserve hierarchy)
  - [x] Add manifest JSON to staging
  - [x] Copy all .agekey.enc files from keys directory
  - [x] Generate and add RECOVERY.txt
  - [x] Create TAR from complete staging
  - [x] Automatic cleanup (TempDir auto-deletes)
- [x] Enhanced StagingArea utility methods
  - [x] add_file_content() for manifest/RECOVERY.txt
  - [x] copy_file_to_staging() for .enc files
- [x] Made create_tar_gz() public for external use
- [x] Added VaultError::OperationFailed variant
- [x] 2 tests passing (service creation, payload with manifest)

### Milestone 7: Clean Encryption Architecture (REVISED SCOPE) ✅ COMPLETE

**Architectural Decision:** Create clean services in vault domain instead of modifying
existing crypto services (which were 486 lines and violated < 300 LOC guideline).

**New Services (vault/application/services/):**

- [x] Create `VaultMetadataService` (304 LOC)
  - [x] load_or_create_manifest() - Load from non-sync or create new
  - [x] build_from_vault_and_registry() - Construct VaultMetadata
  - [x] increment_version_and_save() - Version bump + atomic save
  - [x] save_manifest() - Atomic write to non-sync location
  - [x] registry_entry_to_recipient() - Convert KeyEntry to RecipientInfo
  - [x] 3 tests passing

- [x] Create `VaultBundleEncryptionService` (276 LOC)
  - [x] orchestrate_vault_encryption() - Main entry point
  - [x] Load/create VaultMetadata with versioning
  - [x] build_file_entries() with SHA256 hashing
  - [x] Use PayloadStagingService for complete bundle
  - [x] Multi-recipient encryption via crypto infrastructure
  - [x] Save updated manifest to non-sync
  - [x] 1 test passing

- [x] Delete vault_encryption_service.rs (486 lines, wrong domain)
  - [x] Removed module declaration and exports
  - [x] Updated EncryptionService with TODO for wiring

- [x] Remove ALL backward compatibility code
  - [x] Deleted VaultMetadata legacy new() method
  - [x] Renamed new_r2() → new() (no version in names!)
  - [x] Deleted deprecated get_vault_external_manifest_path()
  - [x] Removed all R1/R2/legacy comments from class names
  - [x] Updated all test helpers to use full new() signature

**Rationale:**
- Proper domain separation (vault ops in vault domain, not crypto)
- Each service < 300 LOC (maintainable)
- Clean R2 implementation without legacy baggage
- Old code stable (no regressions)
- Easier to test and extend

### Milestone 8: Decryption Flow Updates
- [ ] Update `DecryptionOrchestrationService`
  - [ ] Decrypt and extract to temp
  - [ ] Read manifest from extracted files
  - [ ] Check if local manifest exists
  - [ ] Perform version comparison
  - [ ] Handle "newer wins" logic
  - [ ] Backup local manifest if replacing
  - [ ] Restore manifest to non-sync if missing
  - [ ] Restore .agekey.enc files if present
  - [ ] Trigger bootstrap merge if recovery
  - [ ] Extract files with hierarchy preservation
  - [ ] Optional: Verify file hashes
- [ ] Update `ManifestVerificationService`
  - [ ] Remove external manifest copy logic
  - [ ] Read manifest from extracted files
  - [ ] Verify against actual extracted files
  - [ ] Support relative path verification
- [ ] Add decryption flow tests
  - [ ] Normal decrypt (local manifest exists)
  - [ ] True recovery (no local manifest)
  - [ ] Newer bundle scenario
  - [ ] Older bundle scenario
  - [ ] Folder hierarchy restoration

---

## Phase 4: Bootstrap & Registry Integration (P0 - Critical)

### Milestone 9: Bootstrap Service Creation
- [ ] Create new `BootstrapService`
  - [ ] Load or generate device.json
  - [ ] Scan ~/Library/.../vaults/ for manifests
  - [ ] Load all manifest files
  - [ ] Load or create key registry
  - [ ] Perform additive merge (manifests → registry)
  - [ ] Detect connected YubiKeys
  - [ ] Add YubiKeys to registry if missing
  - [ ] Atomically save updated registry
  - [ ] Log merge operations
- [ ] Integrate bootstrap at app startup
  - [ ] Call from main.rs initialization
  - [ ] Handle bootstrap errors gracefully
  - [ ] Log bootstrap completion
- [ ] Add bootstrap tests
  - [ ] Empty state (no manifests or registry)
  - [ ] Existing registry + new manifests
  - [ ] Multiple manifests with overlapping keys
  - [ ] Unattached keys preservation
  - [ ] YubiKey detection and merge

### Milestone 10: Registry Merge Logic
- [ ] Implement additive merge algorithm
  - [ ] Extract recipients from each manifest
  - [ ] Check if key exists in registry
  - [ ] Add key if missing (never remove)
  - [ ] Preserve unattached keys
  - [ ] Handle duplicate labels
  - [ ] Maintain registry structure
- [ ] Add merge idempotency
  - [ ] Running merge multiple times = same result
  - [ ] Handle interrupted merges
  - [ ] Atomic registry updates
- [ ] Add merge tests
  - [ ] Single manifest merge
  - [ ] Multiple manifest merge
  - [ ] Duplicate key handling
  - [ ] Unattached key preservation

---

## Phase 5: Testing & Validation (P0 - Critical)

### Milestone 11: Unit Tests
- [ ] Label sanitization tests (all edge cases)
- [ ] Version comparison tests (all scenarios)
- [ ] Manifest schema serialization tests
- [ ] Device UUID generation tests
- [ ] Backup creation and retention tests
- [ ] RECOVERY.txt generation tests
- [ ] Path sanitization tests
- [ ] Atomic write failure handling tests

### Milestone 12: Integration Tests
- [ ] Full encryption → decryption cycle
- [ ] Multi-recipient encryption
- [ ] Bootstrap merge from scratch
- [ ] Version conflict resolution
- [ ] Manifest backup and restore
- [ ] Device UUID persistence
- [ ] Registry rebuild from manifests
- [ ] Folder hierarchy preservation

### Milestone 13: End-to-End Recovery Tests
- [ ] New machine recovery scenario
  - [ ] Only .age file available
  - [ ] No local state (manifests or registry)
  - [ ] Decrypt with passphrase key from bundle
  - [ ] Verify manifest restored
  - [ ] Verify registry rebuilt
  - [ ] Verify files extracted correctly
- [ ] Multi-device sync scenario
  - [ ] Encrypt on machine A (version 1)
  - [ ] Encrypt on machine B (version 2)
  - [ ] Decrypt version 2 on machine A
  - [ ] Verify "newer wins" applied
  - [ ] Verify backup created
- [ ] Accidental rollback protection
  - [ ] Encrypt version 3
  - [ ] Decrypt old version 1
  - [ ] Verify local manifest preserved
  - [ ] Verify warning logged
- [ ] YubiKey integration
  - [ ] Encrypt with YubiKey
  - [ ] Include in manifest
  - [ ] Decrypt with YubiKey
  - [ ] Verify YubiKey metadata preserved

### Milestone 14: Regression Testing
- [ ] All existing tests pass (384+)
- [ ] R1 functionality preserved
  - [ ] Passphrase-only vaults still work
  - [ ] Basic encryption/decryption unchanged
  - [ ] File selection unchanged
- [ ] Performance benchmarks maintained
  - [ ] Encryption speed
  - [ ] Decryption speed
  - [ ] Startup time
- [ ] Cross-platform validation
  - [ ] macOS
  - [ ] Windows
  - [ ] Linux

---

## Phase 6: Polish & Enhancements (P1 - Nice to Have)

### Milestone 15: Integrity Hash System
- [ ] Add manifest.integrity field
  - [ ] Calculate files_hash (SHA256 of all file hashes)
  - [ ] Calculate manifest_hash (SHA256 of manifest)
  - [ ] Store in manifest
- [ ] Compute hashes on encryption
  - [ ] Hash each file during staging
  - [ ] Aggregate into files_hash
  - [ ] Hash final manifest (excluding integrity field)
- [ ] Verify hashes on decryption (optional)
  - [ ] Re-hash extracted files
  - [ ] Compare with manifest hashes
  - [ ] Warn if mismatch detected
  - [ ] Continue extraction even if mismatch
- [ ] Add integrity tests
  - [ ] Hash calculation accuracy
  - [ ] Tamper detection
  - [ ] Graceful degradation on mismatch

### Milestone 16: Enhanced Error Handling
- [ ] Add specific error types
  - [ ] VersionConflictError
  - [ ] ManifestCorruptedError
  - [ ] DeviceUUIDError
  - [ ] SanitizationError
- [ ] Add error recovery guidance
  - [ ] User-friendly error messages
  - [ ] Suggested remediation steps
  - [ ] Logging for debugging
- [ ] Add error handling tests
  - [ ] Corrupted manifests
  - [ ] Missing device.json
  - [ ] Filesystem permission errors
  - [ ] Atomic write failures

### Milestone 17: Migration Tooling
- [ ] Create R1 → R2 migration utility
  - [ ] Detect R1 vaults automatically
  - [ ] Batch convert manifests
  - [ ] Move to non-sync location
  - [ ] Re-encrypt with manifest in bundle
  - [ ] Validate migration success
- [ ] Add migration progress tracking
  - [ ] Count total vaults to migrate
  - [ ] Report progress per vault
  - [ ] Handle migration errors
  - [ ] Allow retry on failure
- [ ] Add migration tests
  - [ ] Single vault migration
  - [ ] Batch vault migration
  - [ ] Partial migration (some vaults already R2)
  - [ ] Migration rollback on error

---

## Success Criteria

### Functionality
- [ ] Single `.age` file enables full vault recovery
- [ ] No data loss in any version conflict scenario
- [ ] Manifest version tracking prevents accidental rollback
- [ ] Exact folder hierarchy preserved in recovery
- [ ] Registry rebuilds deterministically from manifests
- [ ] Bootstrap merge runs successfully on every app start
- [ ] Device UUID persists across app restarts

### Quality
- [ ] All 384+ existing tests pass
- [ ] New tests added for all new functionality
- [ ] Code coverage > 80% for new code
- [ ] No regressions in R1 functionality
- [ ] Label sanitization handles all edge cases
- [ ] Atomic writes prevent any data corruption

### Performance
- [ ] Encryption time impact < 5% (manifest staging overhead)
- [ ] Decryption time impact < 5% (version comparison overhead)
- [ ] App startup time impact < 200ms (bootstrap merge)
- [ ] Manifest file size < 100KB for 1000 files

### Security
- [ ] Manifests never synced to cloud (non-sync location)
- [ ] No secrets exposed in manifests (public keys only)
- [ ] Atomic writes prevent partial state exposure
- [ ] Backups secured with same permissions as originals

### UX
- [ ] "Newer wins" resolves conflicts automatically
- [ ] Clear warnings for version mismatches
- [ ] Recovery instructions generated correctly
- [ ] No additional user prompts for normal operations

---

## Code Impact Estimate

**Files to Create:** ~8 new files
- `services/shared/infrastructure/device_identity.rs`
- `services/shared/infrastructure/label_sanitization.rs`
- `services/vault/application/services/bootstrap_service.rs`
- `services/vault/application/services/version_comparison_service.rs`
- `services/vault/application/services/backup_service.rs`
- `services/vault/application/services/recovery_txt_service.rs`
- `services/vault/domain/models/device_info.rs`
- `services/vault/domain/models/version_info.rs`

**Files to Modify:** ~15 files
- `services/vault/infrastructure/persistence/metadata.rs` (schema updates)
- `services/shared/infrastructure/path_management/user_vaults.rs` (sanitization)
- `services/crypto/application/services/encryption_service.rs` (payload staging)
- `services/crypto/application/services/decryption_orchestration_service.rs` (version logic)
- `services/crypto/application/services/archive_orchestration_service.rs` (staging)
- `services/crypto/application/services/manifest_verification_service.rs` (remove external)
- `services/key_management/shared/registry.rs` (merge logic)
- `src-tauri/src/main.rs` (bootstrap integration)
- Commands layer (thin updates for new DTOs)
- Multiple test files

**LOC to Add:** ~2,000 LOC
- Schema updates: ~200 LOC
- Version logic: ~400 LOC
- Bootstrap service: ~300 LOC
- Payload staging: ~400 LOC
- Label sanitization: ~200 LOC
- Tests: ~500 LOC

**LOC to Modify:** ~1,500 LOC
- Manifest persistence: ~300 LOC
- Encryption flow: ~400 LOC
- Decryption flow: ~400 LOC
- Path management: ~200 LOC
- Registry operations: ~200 LOC

**Timeline Estimate:** 40-50 hours across 17 milestones
- Phase 1 (Foundation): ~10 hours
- Phase 2 (Version Control): ~8 hours
- Phase 3 (Encryption/Decryption): ~12 hours
- Phase 4 (Bootstrap): ~6 hours
- Phase 5 (Testing): ~10 hours
- Phase 6 (Polish): ~4 hours

---

## Dependencies & Risks

**Dependencies:**
- Backend DDD refactoring complete ✅
- Existing atomic_write() function working ✅
- Key registry structure finalized ✅
- YubiKey integration stable ✅

**Risks:**
- **Migration complexity** - R1 vaults need careful conversion
- **Performance impact** - Bootstrap merge on every startup
- **Testing coverage** - Many edge cases to validate
- **Cross-platform** - Path handling differences

**Mitigations:**
- Incremental implementation with milestone validation
- Performance profiling at each phase
- Comprehensive test suite before release
- Platform-specific testing on CI

---

**Priority**: P0 - Blocking for R2 release
**Dependencies**: Backend refactoring Phase 1 complete
**Owner**: Backend Engineer (TBD)
**Reviewer**: Mohammad Nauman
**Timeline**: 6-8 weeks for complete implementation and testing
