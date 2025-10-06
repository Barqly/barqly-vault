# Refactoring Guidelines

**Purpose:** Prevent regressions during refactoring. Past rewrites caused missing steps and hours of fixing.

---

## Golden Rules

### 1. COPY → ADJUST, Never Rewrite
❌ **DON'T:** Write code from scratch based on understanding
✅ **DO:** Copy exact code, adjust imports/visibility only

**Why:** Full rewrites lose edge cases, subtle logic, and proven patterns.

### 2. Always Backup First
```bash
cp {source_file} docs/engineering/refactoring/backups/{phase}/
```
**Before ANY refactoring.** Rollback is faster than debugging.

### 3. One File at a Time
- Refactor one file
- Validate (`make validate-rust`)
- User tests manually
- Commit
- Move to next file

**Never batch multiple files.** Isolates problems.

### 4. Preserve All Logic
When splitting files:
- Copy entire function bodies unchanged
- Keep all edge case handling
- Preserve error messages exactly
- Don't "improve" logic during refactoring
- Though we release R1, few weeks back, we do not have any users. We do not need to complicate our codebase by retaining the old code/classes for backward compatibility. Remove the old code if you have left due to backward compatibility. Its a major source of tech debt and confusion.
- Very important for naming of files: I do not want to have R1, R2, V1, V2 etc in the namoing of the
 files...thats a very bad way to pollute the code base. So, name classes/files appropriately.
- It is ok to mark something as TODO in the code while you are working on something and we need to revisit it later. But any TODO is a TECH DEBT. IF you add any TODO for later, make sure to add it in the plan tasks for that milestone/phase to make sure it is fixed right after immedately!
 
**Refactoring ≠ Rewriting.** Separate concerns.

### 5. Minimal Import Changes
Only adjust:
- `super::` → `crate::`
- Add `pub(super)` for shared helpers
- Update module paths

**Don't reorganize imports.** Preserve original structure.

---

## Step-by-Step Process

### Large File Splitting

1. **Read entire file** - understand structure
2. **Map sections** - identify logical boundaries
3. **Create empty targets** - all new files
4. **Copy code blocks** - exact, unchanged
5. **Adjust imports** - minimal changes
6. **Create mod.rs** - re-exports
7. **Update dependents** - import path changes
8. **Validate** - `make validate-rust`
9. **Commit** - one file per commit
10. **Delete original** - only after validation

### Extract Helper Functions

**When function > 250 LOC:**
1. Identify logical sections (loops, state machines)
2. Extract to helper with **exact code**
3. Pass all needed state as parameters
4. Call helper from original location
5. **Preserve all debug logs**

❌ **DON'T:** Rewrite logic "better"
✅ **DO:** Extract as-is, improve later

---

## Technology Stack

- **Rust Edition:** 2024
- **Rust Version:** 1.90+
- **Always:** Search for modern Rust patterns (2024+ docs)

---

## File Size Targets

- **Target:** < 300 LOC per file
- **Warning:** 300-600 LOC (needs attention)
- **Critical:** > 600 LOC (refactor immediately)

---

## Validation Requirements

After every change:
```bash
make validate-rust  # Format + Clippy + Tests
```

**All 384+ tests must pass.** No exceptions.

---

## Common Mistakes (Avoid These!)

### ❌ Full Rewrite
```rust
// WRONG - writing new logic
pub fn encrypt(data: &[u8]) -> Result<Vec<u8>> {
    // My new implementation
}
```

### ✅ Copy & Adjust
```rust
// RIGHT - copied from original lines 450-523
pub fn encrypt(
    encrypted_data: &[u8],
    serial: &Serial,
    pin: &Pin,
) -> YubiKeyResult<Vec<u8>> {
    // [EXACT CODE from original]
    // Only change: super::foo → crate::foo
}
```

---

## Debug Logging

- **Keep all logs during refactoring**
- Don't "clean up" or "simplify" logs
- Trimming logs is separate task

**Reason:** Logs are there for troubleshooting. User needs them.

---

## Testing Strategy

1. **Automated:** `make validate-rust` after every file
2. **Manual:** User tests UI flows after each file
3. **Integration:** Run full app (`make app`)

**Never skip manual testing.** Refactoring can break edge cases tests don't cover.

---

## Rollback Strategy

If anything breaks:
```bash
git reset --hard {last_good_commit}
# Restore from backup:
cp docs/engineering/refactoring/backups/{phase}/{file} src-tauri/src/{original_location}/
```

**Commit frequently.** Every file = 1 commit.

---

## Example: Splitting Large File

**File:** `foo.rs` (1,200 LOC)

**Map Sections:**
```
Lines 1-100:   Imports, structs, constants
Lines 101-400: Service A implementation
Lines 401-700: Service B implementation
Lines 701-1000: Helper functions
Lines 1001-1200: Tests
```

**Target:**
```
foo/
├── service_a.rs  (300 LOC) ← Copy lines 1-100 + 101-400
├── service_b.rs  (300 LOC) ← Copy lines 1-100 + 401-700
├── helpers.rs    (300 LOC) ← Copy lines 701-1000
└── mod.rs        (50 LOC)  ← Re-exports
```

**Tests:** Move to respective modules

---

## Key Learnings

1. **Context is precious** - Large rewrites burn context fast
2. **Tests lie** - They don't catch all behavioral changes
3. **User testing is critical** - UI flows reveal regressions
4. **Incremental wins** - Small, verified steps > big risky changes
5. **Preserve working code** - If it works, don't rewrite it

---

## This Document

**Update this** when you learn new anti-patterns or better approaches.

**Location:** `/docs/engineering/refactoring/refactoring-guidelines.md`

---

_Working code is sacred. Refactor to organize, not to rewrite._
