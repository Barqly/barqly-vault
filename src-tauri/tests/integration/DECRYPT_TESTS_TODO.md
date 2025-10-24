# Integration Tests Need Updating for New Decrypt Behavior

**Date:** 2025-10-18
**Status:** 7 tests failing - Need to update for optional output_dir

---

## Failing Tests

1. `decrypt_directory_tests::should_validate_decrypt_input_with_non_existent_directory`
2. `decrypt_directory_tests::should_validate_decrypt_input_with_existing_directory`
3. `decrypt_directory_tests::test_decrypt_matches_encrypt_validation_behavior`
4. `decrypt_directory_tests::test_timestamp_based_directory_pattern`
5. `validation_tests::crypto_validation_tests::test_decrypt_data_input_validation_success`
6. `validation_tests::task_3_4_command_tests::test_decrypt_data_input_validation_success`
7. `validation_tests::task_3_4_command_tests::test_decrypt_data_input_unicode_paths`

---

## Why They Fail

**Old Behavior (Tests Written For):**
- `output_dir` was required String
- Tests used TempDir paths (system temp, outside user home)
- No path safety validation

**New Behavior (Current Implementation):**
- `output_dir` is optional (backend generates default)
- Path safety validation requires paths within user home
- TempDir paths (`/tmp/`, `/var/`) are rejected for security

---

## How to Fix

### Option A: Update Tests to Use User Home Paths

Replace TempDir usage:
```rust
// OLD (fails validation):
let temp_dir = TempDir::new().unwrap();
let output = temp_dir.path().join("output");

// NEW (passes validation):
let home = UserDirs::new()
    .and_then(|d| Some(d.home_dir().to_path_buf()))
    .expect("Cannot get home");
let output = home.join("test-barqly-output").join("nested");
// Remember to cleanup after test!
```

### Option B: Test Both Behaviors

**Test 1:** Default path generation (output_dir: None)
```rust
let input = DecryptDataInput {
    encrypted_file: "test.age".to_string(),
    key_id: "key".to_string(),
    passphrase: "pass".to_string(),
    output_dir: None,  // Backend generates default
};
```

**Test 2:** Custom safe path (output_dir: Some(...))
```rust
let home = get_home_dir();
let custom = home.join("my-recovery");
let input = DecryptDataInput {
    output_dir: Some(custom.to_string_lossy().to_string()),
    // ...
};
```

**Test 3:** Unsafe path rejected
```rust
let input = DecryptDataInput {
    output_dir: Some("/etc/test".to_string()),
    // ...
};
assert!(input.validate().is_err(), "Should reject system paths");
```

---

## Priority

**Low** - These are integration tests for old behavior
**Current State:** Core functionality works (308 unit tests pass)
**Impact:** Only affects test suite, not production code

---

## Next Steps

1. Update all 7 tests to use user home paths
2. Add tests for new behavior (None generates default)
3. Add tests for path safety validation
4. Remove timestamp-based tests (old pattern)

**Estimated:** 1 hour to fix all tests properly
