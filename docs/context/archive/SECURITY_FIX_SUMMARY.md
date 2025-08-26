# Security Fix: Path Traversal Vulnerability in Archive Extraction

## Vulnerability Details
- **Severity**: HIGH
- **Category**: Path Traversal (CWE-22)
- **Location**: `src-tauri/src/file_ops/archive_operations/extraction.rs`
- **Lines**: 76-83 (before fix)

## The Problem
The archive extraction code was directly using paths from tar entries without validation. This allowed malicious archives containing entries with paths like `../../../etc/passwd` to write files outside the intended output directory, potentially overwriting system files.

## Attack Scenario
1. Attacker creates a malicious encrypted archive with path traversal entries
2. User decrypts the archive via the `decrypt_data` Tauri command
3. Files are extracted outside the intended directory, potentially overwriting critical system files

## The Fix

### 1. Path Validation
Added validation to detect common path traversal patterns before extraction:
- Detects patterns like `..`, `../`, `..\`, etc.
- Detects URL-encoded traversal attempts (`%2e%2e`, etc.)
- Blocks Windows-style traversal (`..\\`)

### 2. Directory Containment Check
Ensures extracted files remain within the output directory:
- Canonicalizes the output directory path
- Validates that the resolved extraction path starts with the output directory
- Prevents symbolic link attacks and other path resolution vulnerabilities

### 3. Comprehensive Testing
Added extensive security tests to verify the fix:
- Tests for parent directory traversal (`../etc/passwd`)
- Tests for absolute paths (`/etc/passwd`)
- Tests for encoded traversal patterns
- Tests for Windows-style paths
- Tests for multiple traversal patterns
- Ensures legitimate nested paths still work correctly

## Code Changes

### Modified Files
1. `/src-tauri/src/file_ops/archive_operations/extraction.rs` - Added path validation logic
2. `/src-tauri/src/file_ops/validation.rs` - Made `contains_traversal_attempt` function public
3. `/src-tauri/src/file_ops/mod.rs` - Exported path validation function
4. `/src-tauri/tests/unit/file_ops/archive_tests.rs` - Added comprehensive security tests

### Key Implementation Details
```rust
// Validate path for security - prevent directory traversal attacks
if contains_traversal_attempt(&path) {
    return Err(FileOpsError::PathValidationFailed {
        path: path.clone(),
        reason: "Directory traversal attempt detected in archive entry".to_string(),
    });
}

// Ensure the resolved path is still within the output directory
let canonical_output_dir = output_dir.canonicalize().unwrap_or_else(|_| output_dir.to_path_buf());
// ... additional validation logic ...

if !canonical_parent.starts_with(&canonical_output_dir) {
    return Err(FileOpsError::PathValidationFailed {
        path: output_path.clone(),
        reason: "Archive entry would extract outside of output directory".to_string(),
    });
}
```

## Testing
All tests pass successfully:
- 10 security-specific tests added
- Tests verify malicious archives are properly rejected
- Tests ensure legitimate nested paths continue to work
- All existing functionality remains intact

## Validation
- ✅ `cargo fmt` - Code formatted according to project standards
- ✅ `cargo clippy` - No linting issues
- ✅ `cargo test` - All 427 tests pass (including new security tests)
- ✅ `make validate-rust` - Full Rust validation suite passes

## Impact
- **Security**: Prevents path traversal attacks during archive extraction
- **Compatibility**: No breaking changes to existing functionality
- **Performance**: Minimal overhead from path validation
- **User Experience**: Transparent to users - malicious archives are rejected with clear error messages

## Recommendations
1. This fix should be deployed as a security update
2. Users should update to the patched version immediately
3. Consider adding additional security measures such as:
   - Archive content scanning before extraction
   - Sandbox extraction in a temporary directory first
   - File type validation to prevent executable extraction

## References
- [CWE-22: Path Traversal](https://cwe.mitre.org/data/definitions/22.html)
- [OWASP Path Traversal](https://owasp.org/www-community/attacks/Path_Traversal)