# Recent Technical Decisions

**Period:** Last 30 days  
**Last Updated:** 2025-08-07

## UI Implementation Decisions (January 2025)

### Testing Strategy for UI Components
**Decision:** Comprehensive mock isolation for all async operations
**Rationale:** Prevents test flakiness and race conditions
**Implementation:** Created testing-ui-standards.md with patterns
**Result:** All 374+ tests passing reliably

### Three-Screen Alpha Release
**Decision:** Focus on core user journey (Setup → Encrypt → Decrypt)
**Rationale:** Deliver working MVP for user validation
**Trade-off:** Deferred advanced features for core functionality
**Result:** Functional alpha with 90-second setup achieved

### Drag-Drop Context Pattern
**Decision:** Use React Context API for drag-drop state
**Learning:** Context can fail silently if not properly wrapped
**Solution:** Comprehensive error boundaries and provider validation
**Documentation:** retrospectives/drag-drop-context-failure.md

## Architecture Decisions

### Cache Implementation (This Week)
**Decision:** LRU cache with 5-minute TTL for key operations  
**Rationale:** 86.7% performance improvement with automatic invalidation  
**Impact:** Significantly improved UI responsiveness  

### Progress Debouncing Strategy
**Decision:** Timer-based debouncing with 100ms intervals  
**Rationale:** Reduce IPC overhead by 80-90% during long operations  
**Trade-off:** Slight delay in updates vs. massive performance gain  

### Test Organization
**Decision:** Hierarchical test structure (unit/integration/smoke)  
**Rationale:** Better organization and maintenance than embedded tests  
**Result:** Clearer coverage understanding, easier debugging  

## Implementation Choices

### Error Handling Enhancement
**Decision:** Extended CommandError with recovery guidance  
**Implementation:** Operation-specific guidance for Bitcoin custody use cases  
**User Impact:** Clear, actionable next steps for each error scenario  

### Component Lazy Loading
**Decision:** React.lazy() for all page components  
**Trade-off:** Slightly more complex routing for faster initial load  
**Result:** Improved bundle splitting and startup performance  

### Pre-commit Validation
**Decision:** Full `make validate` in git hooks  
**Philosophy:** Shift-left approach - catch issues before commit  
**Developer Impact:** 95% CI readiness, no integration surprises  

## Process Improvements

### Test Cleanup Pattern
**Decision:** Drop trait for automatic test resource cleanup  
**Problem Solved:** ~1090 legacy test keys accumulating  
**Implementation:** TestCleanup automatically registers and cleans  

### Development Commands
**Decision:** Cross-platform Rust examples for dev tools  
**Commands Added:** dev-reset, dev-keys, bench, clean-keys  
**Benefit:** Consistent developer experience across platforms  

## Deferred Decisions

### VSCode Tasks Configuration
**Status:** Deferred to next sprint  
**Reason:** Pre-commit hooks provide sufficient automation  
**Revisit:** When team size increases  

### Test Data Generators
**Status:** Deferred - current fixtures sufficient  
**Reason:** Existing test data meets current needs  
**Revisit:** When test complexity increases  

### Configuration Module (Milestone 2.4)
**Status:** Deferred - not blocking current work  
**Reason:** Current hardcoded defaults working well  
**Revisit:** Before public release  

## Security Decisions

### Password Visibility Delay
**Decision:** 500ms delay on toggle to prevent shoulder surfing  
**Implementation:** Simple timeout in PassphraseVisibilityToggle  
**User Impact:** Subtle but effective security enhancement  

### Production DevTools
**Decision:** Completely disabled in production builds  
**Configuration:** tauri.conf.json "devtools": false  
**Security Benefit:** Prevents debugging attack vectors  

## Performance Targets Met

| Metric | Target | Achieved |
|--------|--------|----------|
| Cache Performance | 10-20% improvement | 86.7% |
| Progress Updates | Reduce by 50% | 80-90% |
| Test Cleanup | Manual process | Fully automated |
| CI Alignment | 80% passing | 95% ready |