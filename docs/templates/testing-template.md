# Testing Template

## Unit Test Template

```rust
#[cfg(test)]
mod tests {
    use super::*;
    use rstest::*;

    // Test fixture for common setup
    #[fixture]
    fn test_context() -> TestContext {
        TestContext::new()
    }

    #[rstest]
    #[case("valid_input", expected_output)]
    #[case("edge_case", expected_output)]
    fn test_function_name(
        #[case] input: &str,
        #[case] expected: ExpectedType,
        test_context: TestContext,
    ) {
        // Arrange
        let subject = SubjectUnderTest::new();
        
        // Act
        let result = subject.method(input);
        
        // Assert
        assert_eq!(result, expected);
    }

    #[test]
    fn test_error_condition() {
        // Arrange
        let subject = SubjectUnderTest::new();
        let invalid_input = "invalid";
        
        // Act
        let result = subject.method(invalid_input);
        
        // Assert
        assert!(result.is_err());
        assert_eq!(
            result.unwrap_err().to_string(),
            "Expected error message"
        );
    }

    #[test]
    #[should_panic(expected = "panic message")]
    fn test_panic_condition() {
        // Test code that should panic
    }
}
```

## Integration Test Template

```rust
// tests/integration/feature_name.rs
use barqly_vault_lib::*;
use tempfile::TempDir;

#[test]
fn test_end_to_end_workflow() {
    // Setup
    let temp_dir = TempDir::new().unwrap();
    let config = TestConfig::new(&temp_dir);
    
    // Execute workflow steps
    let step1_result = perform_step1(&config).unwrap();
    let step2_result = perform_step2(&step1_result).unwrap();
    let final_result = perform_step3(&step2_result).unwrap();
    
    // Verify outcomes
    assert!(final_result.is_successful());
    assert_eq!(final_result.data(), expected_data);
    
    // Cleanup handled by TempDir drop
}
```

## Security Test Template

```rust
#[test]
fn test_memory_zeroization() {
    let sensitive_data = SecretString::new("password123".to_string());
    let ptr = sensitive_data.expose_secret().as_ptr();
    
    // Use the sensitive data
    process_sensitive_data(&sensitive_data);
    
    // Drop should zeroize
    drop(sensitive_data);
    
    // Verify memory was cleared (in debug mode)
    #[cfg(debug_assertions)]
    unsafe {
        let cleared = std::slice::from_raw_parts(ptr, 11);
        assert!(cleared.iter().all(|&b| b == 0));
    }
}

#[test]
fn test_constant_time_comparison() {
    use std::time::Instant;
    
    let secret = "correct_password";
    let attempts = vec![
        "wrong",
        "correct_",
        "correct_passwor",
        "correct_password",
    ];
    
    let mut timings = Vec::new();
    
    for attempt in attempts {
        let start = Instant::now();
        let _ = constant_time_eq(secret.as_bytes(), attempt.as_bytes());
        timings.push(start.elapsed());
    }
    
    // Verify timing variance is minimal
    let max_timing = timings.iter().max().unwrap();
    let min_timing = timings.iter().min().unwrap();
    let variance = (max_timing.as_nanos() - min_timing.as_nanos()) as f64
        / min_timing.as_nanos() as f64;
    
    assert!(variance < 0.1, "Timing variance too high: {}", variance);
}
```

## Performance Test Template

```rust
use criterion::{black_box, criterion_group, criterion_main, Criterion};

fn bench_encryption(c: &mut Criterion) {
    let data = vec![0u8; 1024 * 1024]; // 1MB
    let key = generate_test_key();
    
    c.bench_function("encrypt_1mb", |b| {
        b.iter(|| {
            encrypt_data(black_box(&data), black_box(&key))
        })
    });
}

fn bench_key_generation(c: &mut Criterion) {
    c.bench_function("generate_age_key", |b| {
        b.iter(|| {
            generate_age_key()
        })
    });
}

criterion_group!(benches, bench_encryption, bench_key_generation);
criterion_main!(benches);
```

## Property-Based Test Template

```rust
use proptest::prelude::*;

proptest! {
    #[test]
    fn test_encrypt_decrypt_roundtrip(
        data: Vec<u8>,
        passphrase: String,
    ) {
        // Skip empty data
        prop_assume!(!data.is_empty());
        prop_assume!(!passphrase.is_empty());
        
        // Generate key with passphrase
        let key = generate_key_with_passphrase(&passphrase)?;
        
        // Encrypt
        let encrypted = encrypt_data(&data, &key)?;
        
        // Decrypt
        let decrypted = decrypt_data(&encrypted, &key, &passphrase)?;
        
        // Verify roundtrip
        prop_assert_eq!(data, decrypted);
    }
    
    #[test]
    fn test_path_sanitization_safety(path: String) {
        let sanitized = sanitize_path(&path);
        
        // Verify no path traversal
        prop_assert!(!sanitized.contains(".."));
        prop_assert!(!sanitized.contains("~"));
        prop_assert!(!sanitized.starts_with("/"));
        prop_assert!(!sanitized.contains("\\"));
    }
}
```

## Test Naming Conventions

- Unit tests: `test_<function>_<scenario>_<expected_outcome>`
- Integration tests: `test_<workflow>_end_to_end`
- Security tests: `test_security_<vulnerability>_prevented`
- Performance tests: `bench_<operation>_<size>`
- Property tests: `test_property_<invariant>`

## Test Organization

```
tests/
├── unit/
│   ├── crypto/
│   ├── storage/
│   └── file_ops/
├── integration/
│   ├── encryption_workflow.rs
│   ├── key_management.rs
│   └── cross_platform.rs
├── security/
│   ├── memory_safety.rs
│   └── input_validation.rs
├── performance/
│   └── benchmarks.rs
└── common/
    ├── fixtures.rs
    └── helpers.rs
```