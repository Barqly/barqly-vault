# Barqly Vault Refactoring Roadmap

## Executive Summary

This roadmap outlines prioritized architectural improvements for Barqly Vault, focusing on enhancing security, maintainability, and scalability while preserving the existing strong foundation. All recommendations are ordered by risk/reward ratio.

## Refactoring Priority Matrix

| Priority      | Impact | Effort  | Risk | Timeline   |
|---------------|--------|---------|------|------------|
| P0 - Critical | High   | Low-Med | Low  | Sprint 1   |
| P1 - High     | High   | Medium  | Low  | Sprint 2-3 |
| P2 - Medium   | Medium | Medium  | Low  | Sprint 4-5 |
| P3 - Low      | Low    | High    | Med  | Future     |

## P0: Critical Security Improvements (Sprint 1 - 2 weeks)

### 1. Implement Secure File Deletion
**Impact:** Prevents sensitive data recovery
**Effort:** 3 days
**Risk:** Low

```rust
// src-tauri/src/file_ops/secure_delete.rs
pub trait SecureDelete {
    fn secure_delete(&self) -> Result<(), FileOpsError>;
}

impl SecureDelete for Path {
    fn secure_delete(&self) -> Result<(), FileOpsError> {
        // 1. Overwrite with random data (3 passes)
        // 2. Rename file to random name
        // 3. Truncate to 0
        // 4. Delete file
        // 5. Platform-specific secure commands
    }
}
```

### 2. Add Rate Limiting for Passphrase Validation
**Impact:** Prevents brute force attacks
**Effort:** 2 days
**Risk:** Low

```rust
// src-tauri/src/security/rate_limiter.rs
pub struct RateLimiter {
    attempts: Arc<Mutex<HashMap<String, AttemptInfo>>>,
}

impl RateLimiter {
    pub fn check_rate_limit(&self, key: &str) -> Result<(), SecurityError> {
        // Exponential backoff: 1s, 2s, 4s, 8s, 16s...
    }
}
```

### 3. Disable DevTools in Production
**Impact:** Prevents runtime inspection
**Effort:** 1 hour
**Risk:** None

```json
// tauri.conf.json
{
  "app": {
    "windows": [{
      "devtools": false  // Production only
    }]
  }
}
```

### 4. Implement Constant-Time Comparisons
**Impact:** Prevents timing attacks
**Effort:** 1 day
**Risk:** Low

```rust
// Cargo.toml
subtly = "2.5"

// src-tauri/src/crypto/timing_safe.rs
use subtle::ConstantTimeEq;

pub fn verify_passphrase(provided: &[u8], expected: &[u8]) -> bool {
    provided.ct_eq(expected).into()
}
```

## P1: High Priority Architecture Improvements (Sprint 2-3 - 3 weeks)

### 1. Introduce Trait-Based Abstractions
**Impact:** Improves testability and flexibility
**Effort:** 1 week
**Risk:** Low

```rust
// src-tauri/src/crypto/traits.rs
pub trait KeyProvider {
    fn generate_keypair(&self) -> Result<KeyPair>;
    fn encrypt(&self, data: &[u8], recipient: &PublicKey) -> Result<Vec<u8>>;
    fn decrypt(&self, data: &[u8], key: &PrivateKey) -> Result<Vec<u8>>;
}

pub trait KeyStorage {
    fn save_key(&self, label: &str, key: &[u8]) -> Result<PathBuf>;
    fn load_key(&self, label: &str) -> Result<Vec<u8>>;
    fn list_keys(&self) -> Result<Vec<KeyInfo>>;
}

// Implementations
pub struct AgeKeyProvider;
impl KeyProvider for AgeKeyProvider { ... }

pub struct FileKeyStorage;
impl KeyStorage for FileKeyStorage { ... }
```

### 2. Implement Dependency Injection
**Impact:** Enables better testing and modularity
**Effort:** 3 days
**Risk:** Low

```rust
// src-tauri/src/app_state.rs
pub struct AppState {
    key_provider: Arc<dyn KeyProvider>,
    key_storage: Arc<dyn KeyStorage>,
    rate_limiter: Arc<RateLimiter>,
    config: Arc<RwLock<Config>>,
}

// In commands
#[tauri::command]
pub async fn generate_key(
    state: State<'_, AppState>,
    input: GenerateKeyInput,
) -> CommandResponse<GenerateKeyResponse> {
    let key_provider = &state.key_provider;
    // Use injected dependencies
}
```

### 3. Add Audit Logging
**Impact:** Security forensics and compliance
**Effort:** 4 days
**Risk:** Low

```rust
// src-tauri/src/audit/mod.rs
#[derive(Serialize)]
pub struct AuditEvent {
    timestamp: DateTime<Utc>,
    event_type: AuditEventType,
    user_action: String,
    result: AuditResult,
    metadata: HashMap<String, String>,
}

pub trait AuditLogger {
    fn log_event(&self, event: AuditEvent) -> Result<()>;
}

// Log security-relevant events
audit_logger.log_event(AuditEvent {
    event_type: AuditEventType::KeyGeneration,
    user_action: "Generated new keypair".to_string(),
    result: AuditResult::Success,
    metadata: [("label", label.to_string())].into(),
});
```

### 4. Complete Configuration Module
**Impact:** Removes hardcoded values
**Effort:** 2 days
**Risk:** Low

```rust
// src-tauri/src/config/mod.rs
#[derive(Serialize, Deserialize, Clone)]
pub struct Config {
    pub security: SecurityConfig,
    pub storage: StorageConfig,
    pub ui: UiConfig,
}

#[derive(Serialize, Deserialize, Clone)]
pub struct SecurityConfig {
    pub max_passphrase_attempts: u32,
    pub rate_limit_window_secs: u64,
    pub min_passphrase_length: usize,
    pub require_secure_delete: bool,
}
```

## P2: Medium Priority Enhancements (Sprint 4-5 - 3 weeks)

### 1. Add Domain Model Layer
**Impact:** Better business logic organization
**Effort:** 1 week
**Risk:** Medium

```rust
// src-tauri/src/domain/mod.rs
pub mod key_management {
    pub struct KeyManager {
        provider: Arc<dyn KeyProvider>,
        storage: Arc<dyn KeyStorage>,
    }
    
    impl KeyManager {
        pub fn create_key_with_policy(
            &self,
            request: CreateKeyRequest,
        ) -> Result<KeyCreated> {
            // Business logic, validation, policies
        }
    }
}

pub mod encryption_workflow {
    pub struct EncryptionWorkflow {
        key_manager: Arc<KeyManager>,
        file_processor: Arc<FileProcessor>,
    }
}
```

### 2. Implement Runtime Integrity Verification
**Impact:** Detects tampering
**Effort:** 1 week
**Risk:** Medium

```rust
// src-tauri/src/security/integrity.rs
pub struct IntegrityChecker {
    expected_hash: [u8; 32],
}

impl IntegrityChecker {
    pub fn verify_binary_integrity(&self) -> Result<(), SecurityError> {
        let current_hash = self.calculate_binary_hash()?;
        if !current_hash.ct_eq(&self.expected_hash).into() {
            return Err(SecurityError::IntegrityViolation);
        }
        Ok(())
    }
}
```

### 3. Add Key Rotation Capability
**Impact:** Long-term security
**Effort:** 4 days
**Risk:** Medium

```rust
// src-tauri/src/crypto/rotation.rs
pub trait KeyRotation {
    fn rotate_key(
        &self,
        old_key: &PrivateKey,
        new_key: &PublicKey,
    ) -> Result<RotationResult>;
    
    fn re_encrypt_archive(
        &self,
        archive: &Path,
        old_key: &PrivateKey,
        new_key: &PublicKey,
    ) -> Result<PathBuf>;
}
```

### 4. Enhance Error Recovery
**Impact:** Better user experience
**Effort:** 3 days
**Risk:** Low

```rust
// src-tauri/src/recovery/mod.rs
pub trait RecoveryStrategy {
    fn can_recover(&self, error: &CommandError) -> bool;
    fn recover(&self, error: &CommandError) -> Result<RecoveryAction>;
}

pub enum RecoveryAction {
    Retry { delay_ms: u64 },
    Cleanup { paths: Vec<PathBuf> },
    Rollback { checkpoint: String },
}
```

## P3: Low Priority Future Enhancements

### 1. Hardware Security Module Integration
**Impact:** Enhanced key security
**Effort:** 2 weeks
**Risk:** High

### 2. Plugin Architecture
**Impact:** Extensibility
**Effort:** 3 weeks
**Risk:** High

### 3. Advanced Cryptographic Features
- Multi-signature support
- Threshold encryption
- Post-quantum preparations

## Migration Strategy

### Phase 1: Security Hardening (Weeks 1-2)
1. Implement all P0 items
2. Deploy security patches
3. Update security documentation

### Phase 2: Architecture Evolution (Weeks 3-5)
1. Introduce abstractions incrementally
2. Migrate one module at a time
3. Maintain backward compatibility

### Phase 3: Feature Enhancement (Weeks 6-8)
1. Add new capabilities
2. Improve user experience
3. Performance optimizations

## Testing Strategy for Refactoring

### 1. Characterization Tests
```rust
// Before refactoring, capture current behavior
#[test]
fn characterize_encryption_behavior() {
    let result = encrypt_files(test_input());
    assert_snapshot!(result);
}
```

### 2. Parallel Implementation
- Run old and new implementations side-by-side
- Compare results for consistency
- Gradual migration with feature flags

### 3. Property-Based Testing
```rust
use proptest::prelude::*;

proptest! {
    #[test]
    fn encryption_roundtrip(data: Vec<u8>) {
        let encrypted = encrypt(&data)?;
        let decrypted = decrypt(&encrypted)?;
        prop_assert_eq!(data, decrypted);
    }
}
```

## Success Metrics

1. **Security Metrics**
   - Zero security regression
   - Pass security audit
   - Implement all P0 items

2. **Code Quality Metrics**
   - Maintain >80% test coverage
   - Reduce coupling metrics by 30%
   - Improve modularity score

3. **Performance Metrics**
   - No performance regression
   - Startup time <2s maintained
   - Memory usage stable

## Risk Mitigation

1. **Feature Flags**
   ```rust
   #[cfg(feature = "new-crypto-abstraction")]
   use crate::crypto::traits::KeyProvider;
   ```

2. **Incremental Rollout**
   - Deploy to internal testing first
   - Gradual rollout to users
   - Quick rollback capability

3. **Comprehensive Testing**
   - Unit tests for new code
   - Integration tests for workflows
   - End-to-end tests for critical paths

## Conclusion

This refactoring roadmap provides a clear path to enhance Barqly Vault's architecture while maintaining its strong security foundation. The prioritized approach ensures critical security improvements are addressed first, followed by architectural enhancements that improve long-term maintainability and extensibility.

Total estimated effort: 8-10 weeks for P0-P2 items
Recommended team size: 2-3 developers
Expected outcome: More secure, maintainable, and extensible architecture