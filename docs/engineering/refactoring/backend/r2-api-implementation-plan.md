# R2 Backend API Implementation Plan

**Purpose**: Implement missing backend APIs for R2 UI redesign
**Scope**: Three critical APIs blocking R2 release
**Duration**: ~3 days (2 developers working in parallel)
**Priority**: High - Blocking R2 UI Release

---

## Phase 1: Key Lifecycle Foundation (Day 1 Morning) ✅ COMPLETED

### Milestone 1.1: Unified Key Status System
**Goal**: Create single source of truth for key lifecycle management

#### Tasks:
- [x] Create `KeyLifecycleStatus` enum in `shared/domain/models/key_lifecycle.rs`
- [x] Add `status` field to Key Registry structure
- [x] Add `status_history` array for audit trail
- [x] Create state machine for valid transitions
- [x] Update KeyEntry serialization/deserialization
- [x] Write unit tests for state transitions

### Milestone 1.2: Registry Migration
**Goal**: Migrate existing keys to new status system

#### Tasks:
- [x] Create migration logic to add status field
- [x] Map existing keys to appropriate status (Active/PreActivation/Orphaned)
- [x] Preserve backward compatibility with existing registry
- [x] Test with production registry samples

---

## Phase 2: Vault Statistics API (Day 1 Afternoon)

### Milestone 2.1: Data Aggregation Service
**Goal**: Aggregate vault statistics from manifest and registry

#### Tasks:
- [ ] Create `VaultStatisticsService` in `vault/application/services/`
- [ ] Read manifest file for encryption history
- [ ] Calculate vault status based on encryption_count
- [ ] Aggregate key statistics from registry
- [ ] Cache results for performance

### Milestone 2.2: Command Implementation
**Goal**: Expose vault statistics via Tauri command

#### Tasks:
- [ ] Create `get_vault_statistics` command in `commands/vault/`
- [ ] Define request/response types with proper validation
- [ ] Add error handling for missing manifests
- [ ] Generate TypeScript bindings
- [ ] Write integration tests

---

## Phase 3: Attach Key to Vault API (Day 2 Morning)

### Milestone 3.1: Key Attachment Logic
**Goal**: Implement universal key attachment mechanism

#### Tasks:
- [ ] Extend `KeyManager` with `attach_orphaned_key` method
- [ ] Validate key exists and is attachable
- [ ] Check vault key limits (max 4 keys)
- [ ] Update key status to Active
- [ ] Update vault manifest with new key

### Milestone 3.2: Command Implementation
**Goal**: Expose key attachment via Tauri command

#### Tasks:
- [ ] Create `attach_key_to_vault` command in `commands/key_management/`
- [ ] Add validation for key-vault compatibility
- [ ] Handle edge cases (already attached, vault full)
- [ ] Generate TypeScript bindings
- [ ] Write integration tests

---

## Phase 4: Import Key File API (Day 2 Afternoon - Day 3 Morning)

### Milestone 4.1: File Import Infrastructure
**Goal**: Parse and validate .enc key files

#### Tasks:
- [ ] Create `KeyImportService` in `key_management/application/services/`
- [ ] Implement .enc file parser
- [ ] Validate file format and integrity
- [ ] Extract key metadata
- [ ] Check for duplicate keys

### Milestone 4.2: Security Validation
**Goal**: Ensure imported keys are safe and valid

#### Tasks:
- [ ] Verify age key format
- [ ] Validate passphrase if provided
- [ ] Check key isn't compromised
- [ ] Sanitize metadata labels
- [ ] Create import audit log

### Milestone 4.3: Command Implementation
**Goal**: Expose key import via Tauri command

#### Tasks:
- [ ] Create `import_key_file` command in `commands/key_management/`
- [ ] Support dry-run validation mode
- [ ] Handle immediate vault attachment
- [ ] Generate TypeScript bindings
- [ ] Write comprehensive tests

---

## Phase 5: Integration & Testing (Day 3 Afternoon)

### Milestone 5.1: End-to-End Testing
**Goal**: Verify all APIs work together

#### Tasks:
- [ ] Test complete key lifecycle flow
- [ ] Test vault statistics with real data
- [ ] Test edge cases and error conditions
- [ ] Performance testing with large registries
- [ ] Security testing for import function

### Milestone 5.2: Frontend Integration
**Goal**: Connect APIs to R2 UI

#### Tasks:
- [ ] Update bindings.ts with new APIs
- [ ] Remove mock data from UI components
- [ ] Test with actual backend responses
- [ ] Fix any integration issues
- [ ] Update UI error handling

---

## Success Criteria

1. ✅ All three APIs implemented and tested
2. ✅ Key lifecycle status tracking working
3. ✅ Vault statistics show real data (no mocks)
4. ✅ Orphaned keys can be reattached
5. ✅ External .enc files can be imported
6. ✅ All existing functionality still works
7. ✅ Performance acceptable (<100ms response)
8. ✅ Security validation passes

---

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| Breaking existing registry | Backward compatibility layer |
| State conflicts | Single source of truth (KeyLifecycleStatus) |
| Import security issues | Validation & sanitization |
| Performance degradation | Caching layer for statistics |

---

## Developer Assignment

**Developer 1 (Senior Backend Engineer):**
- Phase 1: Key Lifecycle Foundation
- Phase 3: Attach Key to Vault
- Phase 5.1: Testing

**Developer 2 (Backend Engineer):**
- Phase 2: Vault Statistics
- Phase 4: Import Key File
- Phase 5.2: Frontend Integration

---

## Dependencies

- Existing DDD architecture patterns
- Key Registry structure
- Vault Manifest format
- Frontend R2 UI implementation

---

## Notes

- Follow existing DDD patterns (no layer mixing)
- Keep files under 250-300 LOC
- Use existing error handling patterns
- Update documentation after each phase
- Run `make validate` before committing

---

*Last Updated: 2025-01-11*