# Error & Logging Architecture Design Blueprint

**Date:** 2025-10-02
**Status:** Design Phase
**Context:** Offline-first desktop application with future distributed capability

---

## Executive Summary

This blueprint defines a hybrid error and logging architecture that combines:
- **Numeric error taxonomy** for natural grouping and categorization
- **OTel semantic conventions** for structured logging and future observability
- **Rust type safety** via const catalog and trait-based conversions
- **Build-time validation** with zero runtime overhead

**Key Innovation:** Business error codes (numeric ranges) coexist with OTel severity levels, providing both operational categorization and standards compliance.

**Deployment Model:** Offline-first desktop app with local file logging, designed to evolve into distributed/connected mode without architectural changes.

---

## Design Principles

### 1. Centralized Error Catalog
- Single source of truth for all error codes and ranges
- Module-based organization (vault, crypto, yubikey, etc.)
- Compile-time validation (Rust consts, not runtime files)
- Self-documenting through numeric structure

### 2. Natural Grouping via Numeric Ranges
- Module identity encoded in code (1000500 = vault domain)
- Grep-friendly for operations (`grep "10005[0-9][0-9]"` = all vault)
- Visual clustering in logs
- Flexible expansion into reserved ranges

### 3. Separation of Concerns
- **Numeric code** = Business identifier ("what happened")
- **OTel severity** = Log filtering level (1-24 standard)
- **Severity class** = Business priority (critical/high/medium/low)
- All three coexist as independent attributes

### 4. Type Safety with Flexibility
- Rust const catalog (compile-time checked)
- Domain errors reference catalog codes
- Trait-based conversion to CommandError
- Zero runtime overhead

### 5. Mindful Error Design
- Friction by design: must allocate code before use
- Forces thoughtful error categorization
- Prevents "console.log hell"
- Encourages proper error handling

### 6. OTel Compatibility Without Overhead
- Use OTel semantic conventions (attribute naming)
- Compatible with future OTel SDK integration
- No OTel runtime dependencies until needed (offline app)
- Structured logs ready for export when distributed mode added

---

## Numeric Taxonomy Design

### Range Structure

```
Format: SMMMNNN
  S    = Severity (1-5)
  MMM  = Module (000-999)
  NNN  = Specific error (000-999)

Example: 1000501
  1    = Critical severity
  000  = Severity prefix
  5    = Domain layer
  01   = Vault domain
  (last digit varies per specific error)
```

### Severity Ranges

| Severity | Range | Use Case | OTel Mapping |
|----------|-------|----------|--------------|
| **Critical** | 1000000-1999999 | Data loss, crashes, security breaches | severity_number: 21-24 (FATAL) |
| **High** | 2000000-2999999 | Feature broken, user blocked | severity_number: 17-20 (ERROR) |
| **Medium** | 3000000-3999999 | Degraded UX, workarounds exist | severity_number: 13-16 (WARN) |
| **Low** | 4000000-4999999 | Cosmetic issues, minor bugs | severity_number: 9-12 (INFO) |
| **Info** | 5000000-5999999 | Operational events, normal flow | severity_number: 5-8 (DEBUG) |

### Module Allocation Strategy

**Allocation Guidelines:**
- **Default:** 50 codes per module (conservative)
- **Hot modules:** 100 codes (complex infrastructure with high error diversity)
- **Reserved:** 50% capacity kept for future growth

**Hot Module Criteria:**
- Complex state machines (YubiKey PTY, Age operations)
- External system integration (ykman, age-plugin)
- High error diversity (>30 distinct failure modes)

---

## Critical Range Allocation (1000000-1999999)

### Presentation Layer: Commands (1000100-1000499)

| Range | Module | Codes | Status | Notes |
|-------|--------|-------|--------|-------|
| 1000100-1000149 | Vault commands | 50 | Active | create, delete, list, set_current |
| 1000150-1000199 | Crypto commands | 50 | Active | encrypt, decrypt, status |
| 1000200-1000249 | Key Management commands | 50 | Active | generate, add, remove, list |
| 1000250-1000299 | File commands | 50 | Active | select, archive, manifest |
| 1000300-1000349 | RESERVED | 50 | Reserved | Future feature slot 1 |
| 1000350-1000399 | RESERVED | 50 | Reserved | Future feature slot 2 |
| 1000400-1000449 | RESERVED | 50 | Reserved | Future feature slot 3 |
| 1000450-1000499 | RESERVED | 50 | Reserved | Future feature slot 4 |

**Total Capacity:** 400 codes (200 active, 200 reserved)

---

### Domain Layer: Business Logic (1000500-1000999)

| Range | Module | Codes | Status | Notes |
|-------|--------|-------|--------|-------|
| 1000500-1000549 | Vault domain | 50 | Active | **Iteration 1 Focus** |
| 1000550-1000599 | Crypto domain | 50 | Active | Encryption/decryption rules |
| 1000600-1000649 | File domain | 50 | Active | Archive, manifest, validation |
| 1000650-1000699 | Key Management (shared) | 50 | Active | Registry, unified API |
| 1000700-1000749 | Passphrase domain | 50 | Active | Generation, validation |
| 1000750-1000799 | YubiKey domain | 50 | Active | Device, identity, state |
| 1000800-1000849 | RESERVED | 50 | Reserved | Future key type slot 1 |
| 1000850-1000899 | RESERVED | 50 | Reserved | Future key type slot 2 |
| 1000900-1000949 | RESERVED | 50 | Reserved | Future domain slot 1 |
| 1000950-1000999 | RESERVED | 50 | Reserved | Future domain slot 2 |

**Total Capacity:** 500 codes (300 active, 200 reserved)

---

### Infrastructure Layer (1001000-1002999)

#### Crypto Operations (1001000-1001199)

| Range | Module | Codes | Status | Notes |
|-------|--------|-------|--------|-------|
| 1001000-1001099 | Age library | 100 | Active | **Hot module** - encryption, decryption, recipient parsing |
| 1001100-1001149 | Rage CLI | 50 | Active | External age binary operations |
| 1001150-1001199 | RESERVED | 50 | Reserved | Future crypto engine |

#### Hardware Integration (1001200-1001549)

| Range | Module | Codes | Status | Notes |
|-------|--------|-------|--------|-------|
| 1001200-1001299 | YubiKey PTY | 100 | Active | **Hot module** - PTY state machine, touch detection |
| 1001300-1001349 | YKMan operations | 50 | Active | Device management, PIN, PIV |
| 1001350-1001399 | Age-plugin-yubikey | 50 | Active | Plugin communication |
| 1001400-1001499 | RESERVED | 100 | Reserved | Future hardware slot 1 |
| 1001500-1001549 | RESERVED | 50 | Reserved | Future hardware slot 2 |

#### File & Storage (1001550-1001849)

| Range | Module | Codes | Status | Notes |
|-------|--------|-------|--------|-------|
| 1001550-1001599 | Archive operations | 50 | Active | TAR creation, extraction |
| 1001600-1001649 | Manifest operations | 50 | Active | Create, verify, integrity |
| 1001650-1001699 | File validation | 50 | Active | Path, size, content checks |
| 1001700-1001749 | Registry persistence | 50 | Active | Key registry I/O |
| 1001750-1001799 | Vault persistence | 50 | Active | Vault metadata I/O |
| 1001800-1001849 | Key storage | 50 | Active | Encrypted key file I/O |

#### Network Operations (1001850-1001999) - Future

| Range | Module | Codes | Status | Notes |
|-------|--------|-------|--------|-------|
| 1001850-1001949 | RESERVED | 100 | Reserved | Future network feature (hot module) |
| 1001950-1001999 | RESERVED | 50 | Reserved | Future network support |

---

### Shared Infrastructure (1002000-1002999)

| Range | Module | Codes | Status | Notes |
|-------|--------|-------|--------|-------|
| 1002000-1002049 | Caching | 50 | Active | TTL/LRU cache operations |
| 1002050-1002099 | Progress tracking | 50 | Active | IPC progress updates |
| 1002100-1002149 | Path management | 50 | Active | User dirs, validation |
| 1002150-1002199 | Error handling | 50 | Active | ErrorHandler infrastructure |
| 1002200-1002249 | Logging | 50 | Active | Formatter, rotation |
| 1002250-1002299 | I/O utilities | 50 | Active | Atomic writes, file ops |
| 1002300-1002999 | RESERVED | 700 | Reserved | Future shared services |

**Total Capacity:** 1000 codes (300 active, 700 reserved)

---

## Summary: Critical Range Usage

| Category | Allocated | Used (Estimated) | Reserved | Total Capacity |
|----------|-----------|------------------|----------|----------------|
| Commands | 200 | ~30-40 | 200 | 400 |
| Domains | 300 | ~50-70 | 200 | 500 |
| Infrastructure | 1300 | ~150-200 | 850 | 2150 |
| **Total Critical** | **1800** | **~250** | **1250** | **3050** |

**Reserved Capacity:** 70% (room for 3-4x growth)

---

## Architecture Components

### Component 1: Error Catalog (Build-Time)

**Location:** `src-tauri/src/errors/catalog/`

**Structure:**
```
errors/catalog/
├── mod.rs                    # Re-exports all modules
├── ALLOCATION.md             # Range allocation map (human-readable)
├── codes.rs                  # Aggregate re-exports
├── presentation/             # Command layer codes
│   ├── vault_commands.rs
│   ├── crypto_commands.rs
│   ├── key_commands.rs
│   └── file_commands.rs
├── domains/                  # Domain layer codes
│   ├── vault.rs
│   ├── crypto.rs
│   ├── file.rs
│   ├── key_management.rs
│   ├── passphrase.rs
│   └── yubikey.rs
├── infrastructure/           # Infrastructure codes
│   ├── age.rs
│   ├── yubikey_pty.rs
│   ├── ykman.rs
│   ├── archive.rs
│   ├── manifest.rs
│   └── persistence.rs
└── shared/                   # Shared infrastructure codes
    ├── caching.rs
    ├── progress.rs
    ├── paths.rs
    └── io.rs
```

**Example: vault.rs**
```rust
//! Vault Domain Error Codes
//!
//! Range Allocation:
//! - Critical: 1000500-1000549 (50 codes)
//! - High: 2000500-2000549 (50 codes)
//! - Medium: 3000500-3000549 (50 codes)
//! - Low: 4000500-4000549 (50 codes)
//!
//! Last Updated: 2025-10-02
//! Codes Used: 7 critical, 3 high
//! Codes Available: 43 critical, 47 high

/// Critical vault errors (1000500-1000549)
pub mod critical {
    /// Vault not found in storage
    pub const NOT_FOUND: u32 = 1000501;

    /// Vault creation failed due to filesystem error
    pub const CREATION_FAILED: u32 = 1000502;

    /// Vault metadata corrupted
    pub const CORRUPTED: u32 = 1000503;

    /// Vault deletion failed (data at risk)
    pub const DELETION_FAILED: u32 = 1000504;

    // Last assigned: 1000504
    // Available: 1000505-1000549 (45 codes)
}

/// High priority vault errors (2000500-2000549)
pub mod high {
    /// Vault name contains invalid characters
    pub const NAME_INVALID: u32 = 2000501;

    /// Vault already exists with this name
    pub const ALREADY_EXISTS: u32 = 2000502;

    /// Vault key limit exceeded
    pub const KEY_LIMIT_EXCEEDED: u32 = 2000503;

    // Last assigned: 2000503
    // Available: 2000504-2000549 (46 codes)
}
```

---

### Component 2: DomainError Trait

**Location:** `src-tauri/src/errors/traits.rs`

**Purpose:** Bridge between domain errors and presentation layer with automatic:
- Error code extraction from catalog
- Severity classification
- OTel-compatible structured logging
- CommandError conversion

**Trait Definition:**
```rust
pub trait DomainError: std::error::Error + Send + Sync {
    /// Get numeric error code from catalog
    fn error_code(&self) -> u32;

    /// Get severity classification (critical/high/medium/low)
    fn severity_class(&self) -> &'static str {
        let code = self.error_code();
        match code {
            1000000..=1999999 => "critical",
            2000000..=2999999 => "high",
            3000000..=3999999 => "medium",
            4000000..=4999999 => "low",
            _ => "info",
        }
    }

    /// Get OTel severity number (1-24 scale)
    fn otel_severity(&self) -> u8 {
        match self.severity_class() {
            "critical" => 21, // FATAL
            "high" => 17,     // ERROR
            "medium" => 13,   // WARN
            "low" => 9,       // INFO
            _ => 5,           // DEBUG
        }
    }

    /// Get module name from code
    fn module(&self) -> &'static str {
        let code = self.error_code();
        let module_id = (code % 1000000) / 1000;

        match module_id {
            // Domain layer (500-799)
            500..=549 => "vault",
            550..=599 => "crypto",
            600..=649 => "file",
            650..=699 => "key_management",
            700..=749 => "passphrase",
            750..=799 => "yubikey",

            // Infrastructure (1000-1999)
            1000..=1099 => "age",
            1200..=1299 => "yubikey_pty",
            1300..=1349 => "ykman",
            1750..=1799 => "vault_persistence",

            _ => "unknown",
        }
    }

    /// Get user-friendly message
    fn user_message(&self) -> String {
        // Default: use Display impl
        self.to_string()
    }

    /// Get recovery guidance for user
    fn recovery_guidance(&self) -> Option<String>;

    /// Is this error recoverable by user action?
    fn is_recoverable(&self) -> bool;

    /// Convert to CommandError with full context
    fn to_command_error(&self) -> CommandError {
        // Map numeric code to ErrorCode enum
        let error_code_enum = self.map_to_error_code();

        let mut cmd_err = CommandError::operation(
            error_code_enum,
            self.user_message()
        );

        if let Some(guidance) = self.recovery_guidance() {
            cmd_err = cmd_err.with_recovery_guidance(guidance);
        }

        if !self.is_recoverable() {
            cmd_err = cmd_err.not_user_actionable();
        }

        cmd_err
    }

    /// Map numeric code to ErrorCode enum (for frontend compatibility)
    fn map_to_error_code(&self) -> crate::types::ErrorCode {
        use crate::types::ErrorCode;
        use crate::errors::catalog::codes::critical;

        match self.error_code() {
            // Vault errors
            code if code == critical::domains::vault::NOT_FOUND => ErrorCode::VaultNotFound,
            code if code == critical::domains::vault::CREATION_FAILED => ErrorCode::StorageFailed,

            // Default fallback
            _ => match self.severity_class() {
                "critical" => ErrorCode::InternalError,
                "high" => ErrorCode::InvalidInput,
                _ => ErrorCode::UnexpectedError,
            }
        }
    }
}
```

---

### Component 3: Domain Error Implementation Pattern

**Example: VaultError**

```rust
// vault/domain/errors.rs
use crate::errors::catalog::codes;

#[derive(Debug, thiserror::Error)]
pub enum VaultError {
    #[error("Vault '{vault_id}' not found")]
    NotFound { vault_id: String },

    #[error("Vault creation failed: {reason}")]
    CreationFailed { reason: String },

    #[error("Vault '{name}' already exists")]
    AlreadyExists { name: String },

    #[error("Invalid vault name: '{name}'")]
    InvalidName { name: String },
}

impl crate::errors::DomainError for VaultError {
    fn error_code(&self) -> u32 {
        match self {
            Self::NotFound { .. } => codes::critical::domains::vault::NOT_FOUND,
            Self::CreationFailed { .. } => codes::critical::domains::vault::CREATION_FAILED,
            Self::AlreadyExists { .. } => codes::high::domains::vault::ALREADY_EXISTS,
            Self::InvalidName { .. } => codes::high::domains::vault::NAME_INVALID,
        }
    }

    fn recovery_guidance(&self) -> Option<String> {
        match self {
            Self::NotFound { .. } => Some("Verify vault exists or create new vault".to_string()),
            Self::CreationFailed { .. } => Some("Check disk space and permissions".to_string()),
            Self::AlreadyExists { .. } => Some("Choose a different vault name".to_string()),
            Self::InvalidName { .. } => Some("Use only alphanumeric characters and dashes".to_string()),
        }
    }

    fn is_recoverable(&self) -> bool {
        matches!(self, Self::InvalidName { .. } | Self::AlreadyExists { .. })
    }
}
```

---

### Component 4: Structured Logging Standard

**Standard Pattern:**
```rust
use crate::errors::DomainError;

match vault_service.create(name).await {
    Ok(vault) => {
        info!(
            vault.id = %vault.id,
            vault.name = %vault.name,
            operation = "vault_create",
            "Vault created successfully"
        );
        Ok(vault)
    }
    Err(e) => {
        error!(
            error.code = e.error_code(),                    // 1000501
            error.type = std::any::type_name_of_val(&e),    // "VaultError"
            error.severity_class = e.severity_class(),      // "critical"
            error.module = e.module(),                      // "vault"
            vault.name = %name,
            severity_number = e.otel_severity(),            // 21 (FATAL)
            "{}", e                                         // "Vault 'backup' not found"
        );
        Err(e.to_command_error())
    }
}
```

**Field Naming Conventions (OTel-Inspired):**

**Error Attributes:**
- `error.code` - Numeric catalog code
- `error.type` - Rust type name
- `error.severity_class` - Business classification
- `error.module` - Module/component name
- `error.message` - Error message (in log body)

**Domain Entities (dot notation):**
- `vault.id`, `vault.name`, `vault.key_count`
- `key.id`, `key.label`, `key.type`
- `file.path`, `file.size`, `file.count`
- `yubikey.serial`, `yubikey.slot`, `yubikey.state`

**Operations:**
- `operation` - Operation name (vault_create, key_generate)
- `operation.duration_ms` - Timing information

**OTel Standard:**
- `severity_number` - OTel 1-24 scale
- `severity_text` - ERROR/WARN/INFO/DEBUG (auto from level)

---

## OTel Semantic Conventions Alignment

### Our Approach vs OTel Standard

| Attribute | OTel Spec | Our Implementation | Rationale |
|-----------|-----------|-------------------|-----------|
| **Severity** | severity_number (1-24) | ✅ Mapped via otel_severity() | Standards compliant |
| **Error Type** | error.type (string) | ✅ Rust type name | OTel compatible |
| **Error Code** | - (not in spec) | error.code (numeric) | Our extension |
| **Service** | service.name | ❌ Not yet (add when OTel SDK) | Future |
| **Trace Context** | trace_id, span_id | ⏳ Ready but not extracted yet | Phase 2 |

**Key Insight:** Our numeric codes are **business metadata**, not OTel standard. They coexist as custom attributes.

**OTel Log Record:**
```json
{
  "timestamp": "2025-10-02T14:30:45-07:00",
  "severity_number": 21,
  "severity_text": "ERROR",
  "body": "Vault 'backup-2024' not found",
  "attributes": {
    "error.code": 1000501,              ← Our extension
    "error.type": "VaultError",
    "error.severity_class": "critical",  ← Our extension
    "error.module": "vault",
    "vault.id": "backup-2024"
  },
  "trace_id": "...",  // When OTel SDK added
  "span_id": "..."    // When OTel SDK added
}
```

---

## Local Timezone Implementation

### Current State
```rust
// logging/formatter.rs:106
let now = chrono::Utc::now();
write!(writer, "{}", now.to_rfc3339())?;
// Output: 2025-10-02T21:30:45Z
```

### Target State
```rust
let now = chrono::Local::now();
write!(writer, "{}", now.to_rfc3339())?;
// Output: 2025-10-02T14:30:45-07:00
//                              ^^^^^^ timezone offset preserved
```

**Benefits:**
- User sees their local time in logs
- Offset preserved (can convert to UTC if needed)
- No timezone confusion when debugging
- Aligns with user mental model

**Implementation:** 1-line change in formatter.rs

---

## Log Rotation Strategy

### Requirements
- Desktop app, local logs only
- No centralized log aggregation (yet)
- User machine disk space considerations
- Support debugging across sessions

### Rotation Policy

**Trigger:** Size-based (10MB threshold)
**Retention:** 7 most recent files
**Total Disk:** ~70MB maximum
**Compression:** None (simplicity over space)

**File Naming:**
```
~/Library/Application Support/com.Barqly.Vault/logs/
├── barqly-vault.log                    # Current (active)
├── barqly-vault-20251002-143045.log    # Yesterday
├── barqly-vault-20251001-091523.log    # 2 days ago
├── barqly-vault-20250930-154832.log    # 3 days ago
├── barqly-vault-20250929-102341.log    # 4 days ago
├── barqly-vault-20250928-165429.log    # 5 days ago
├── barqly-vault-20250927-134756.log    # 6 days ago
└── barqly-vault-20250926-183012.log    # 7 days ago (will be deleted on next rotation)
```

**Rotation Logic:**
```rust
fn setup_logging() -> Result<()> {
    let log_path = get_log_path()?; // barqly-vault.log

    // Check if current log exceeds threshold
    if log_path.exists() {
        let size = fs::metadata(&log_path)?.len();
        if size > 10_000_000 {  // 10MB
            // Archive current log with timestamp
            let timestamp = chrono::Local::now().format("%Y%m%d-%H%M%S");
            let archive_name = format!("barqly-vault-{}.log", timestamp);
            let archive_path = log_path.parent().unwrap().join(archive_name);

            fs::rename(&log_path, &archive_path)?;

            // Cleanup: keep only 7 most recent
            cleanup_old_logs(log_path.parent().unwrap(), 7)?;
        }
    }

    // Continue with normal logging setup
    // ...
}
```

**Why Not Rotate on Startup:**
- User may start app multiple times per day → many small files
- Debugging often spans multiple app sessions → fragmented logs
- No control over max disk usage (user could start 100 times)

**Why Size-Based:**
- Predictable disk usage (7 × 10MB = 70MB max)
- Logs naturally span multiple sessions (better for debugging)
- Self-limiting (old logs auto-cleanup)

---

## Benefits of Hybrid Approach

### 1. Operational Benefits

**Grep-Friendly Categorization:**
```bash
# All vault domain errors (any severity)
grep "1000[5][0-9][0-9]" logs/

# All critical errors (any module)
grep "^.*1[0-9]{6}" logs/

# Specific error across all sessions
grep "1000501" logs/*.log

# All Age infrastructure errors
grep "10010[0-9][0-9]" logs/
```

**vs Current (ErrorCode enum):**
```bash
# Have to search by string
grep "VaultNotFound" logs/  # What if Display message changes?
```

### 2. Maintenance Benefits

**Adding New Error:**

**Before (Manual):**
1. Add ErrorCode enum variant
2. Add match arm in error_recovery.rs
3. Add match arm in each command
4. Add match arm in error handler
5. Update tests
**Total:** 5 locations, easy to miss one

**After (Catalog):**
1. Add const to catalog: `pub const NEW_ERROR: u32 = 1000505;`
2. Add domain error variant
3. Add to error_code() match
**Total:** 3 locations, trait handles rest

### 3. Type Safety Benefits

**Compile-Time Validation:**
```rust
// Typo in code reference
error.code = catalog::vault::NOT_FOOUND  // ← Compile error!

// vs Runtime string codes
error.code = "1000510"  // ← Typo not caught, runtime error
```

**Exhaustiveness Checking:**
```rust
impl DomainError for VaultError {
    fn error_code(&self) -> u32 {
        match self {
            Self::NotFound { .. } => codes::vault::NOT_FOUND,
            // Compiler enforces all variants matched
        }
    }
}
```

### 4. Evolution Benefits

**Current State (Offline Desktop):**
- Simple file logging
- Local timezone
- No distributed tracing
- Numeric codes for categorization

**Future State (Connected/Distributed):**
- Add OTel SDK (tracing-opentelemetry)
- Export to Jaeger/Grafana
- Distributed request tracing
- **No code changes needed** - logs already structured!

**Migration Path:**
```rust
// Current (offline):
tracing_subscriber::registry()
    .with(file_layer)
    .with(stderr_layer)
    .try_init()?;

// Future (connected):
tracing_subscriber::registry()
    .with(OpenTelemetryLayer::new(tracer))  // ← Add this
    .with(file_layer)
    .with(stderr_layer)
    .try_init()?;

// Logs already have structured fields - just start exporting!
```

---

## Rust Edition 2024 Compatibility

### Modern Error Handling Patterns

**Our approach aligns with Rust 2024 best practices:**

1. **thiserror for domain errors** ✅
   - Each domain has typed error enum
   - Compiler-validated Display messages
   - Proper Error trait implementation

2. **Trait-based abstraction** ✅
   - DomainError trait unifies behavior
   - Generic error handling in commands
   - Extensible to new domains

3. **Const-based configuration** ✅
   - Zero runtime overhead
   - Compile-time validation
   - IDE autocomplete support

4. **Structured logging** ✅
   - tracing crate (de facto standard)
   - #[instrument] for automatic spans
   - Structured fields for machine parsing

**NOT using:** anyhow (we need typed domain errors for different handling)

---

## Build-Time Catalog Generation (Optional)

### If External File Preferred

**Source Format (pipe-delimited text):**
```
# errors.catalog
# Severity|Code|Module|Variant|Message|Recovery

# Critical: Vault Domain
critical|1000501|vault|not_found|Vault not found|Verify vault exists or create new vault
critical|1000502|vault|creation_failed|Vault creation failed|Check disk space and permissions
critical|1000503|vault|corrupted|Vault metadata corrupted|Restore from backup

# High: Vault Domain
high|2000501|vault|name_invalid|Vault name has invalid characters|Use only alphanumeric and dashes
high|2000502|vault|already_exists|Vault already exists|Choose a different name
```

**build.rs (generates Rust code):**
```rust
// Reads errors.catalog at build time
// Generates: errors/catalog/codes.rs

fn main() {
    generate_error_catalog("errors.catalog", "src/errors/catalog/codes.rs");

    // Tell cargo to rerun if catalog changes
    println!("cargo:rerun-if-changed=errors.catalog");
}

fn generate_error_catalog(input: &str, output: &str) {
    let entries = parse_catalog(input);

    let code = generate_rust_code(&entries);
    // Output:
    // pub mod vault {
    //     pub const NOT_FOUND: u32 = 1000501;
    //     pub const CREATION_FAILED: u32 = 1000502;
    // }

    fs::write(output, code).unwrap();
}
```

**Benefits:**
- Human-friendly source (easy to edit, review)
- Git-friendly (simple text file, clean diffs)
- Compile-time code generation
- Type-safe Rust usage
- Can validate ranges, duplicates at build time

**Trade-off:**
- Extra build step
- Requires build.rs maintenance

**Recommendation:** **Start with pure Rust consts** (simpler), add build generation if catalog grows >200 codes.

---

## Benefits Summary

### vs Current Approach (Unstructured ErrorCode)

| Aspect | Current | With Catalog | Benefit |
|--------|---------|--------------|---------|
| **Error location** | Grep enum name | Grep numeric code | Module encoded in code |
| **Categorization** | Manual tagging | Automatic (from range) | Self-organizing |
| **Boilerplate** | 425 LOC match statements | Trait auto-converts | -90% code |
| **Consistency** | Per-command patterns | Trait enforces | Uniform handling |
| **Type safety** | Enum only | Enum + numeric + trait | Multi-layer validation |
| **Future-proof** | Enum grows unbounded | Ranges plan for growth | Scalable |

### vs Pure OTel (error.type strings)

| Aspect | Pure OTel | Our Hybrid | Benefit |
|--------|-----------|------------|---------|
| **Standards** | 100% OTel | 95% OTel + custom codes | Compliant + practical |
| **Categorization** | Manual attributes | Automatic (from code) | Less verbose |
| **Grep-ability** | Search strings | Search numbers | Faster, cleaner |
| **Overhead** | SDK required | SDK optional | Lighter for offline |
| **Evolution** | Ready now | Ready when needed | Pragmatic |

### vs Enterprise Numeric Codes (Runtime lookup)

| Aspect | Runtime File | Build-Time Const | Benefit |
|--------|--------------|------------------|---------|
| **Flexibility** | Easy to change | Requires recompile | Trade-off for safety |
| **Performance** | File I/O + parsing | Zero overhead | Faster |
| **Safety** | Runtime errors | Compile errors | Catch bugs early |
| **Editing** | Any text editor | IDE with Rust | Better tooling |

---

## Operational Guide

### Adding a New Error Code

**Scenario:** Need to add "Vault decryption failed" error

**Step 1: Review Range Allocation**
```
Check: errors/catalog/ALLOCATION.md
Vault domain critical: 1000500-1000549
Last used: 1000504
Next available: 1000505
```

**Step 2: Identify Correct Module**
- Layer: Domain (vault business logic)
- Severity: Critical (decryption failure = data unavailable)
- Module: vault
- Range: 1000500-1000549 ✅

**Step 3: Assign Code**
```rust
// errors/catalog/domains/vault.rs
pub mod critical {
    pub const NOT_FOUND: u32 = 1000501;
    pub const CREATION_FAILED: u32 = 1000502;
    pub const CORRUPTED: u32 = 1000503;
    pub const DELETION_FAILED: u32 = 1000504;
    pub const DECRYPTION_FAILED: u32 = 1000505;  // ← NEW

    // Last assigned: 1000505
    // Available: 1000506-1000549 (44 codes)
}
```

**Step 4: Add Domain Error Variant**
```rust
// vault/domain/errors.rs
#[derive(Debug, thiserror::Error)]
pub enum VaultError {
    // ... existing variants

    #[error("Vault decryption failed: {reason}")]
    DecryptionFailed { reason: String },  // ← NEW
}
```

**Step 5: Map to Catalog Code**
```rust
impl DomainError for VaultError {
    fn error_code(&self) -> u32 {
        match self {
            // ... existing mappings
            Self::DecryptionFailed { .. } => codes::critical::domains::vault::DECRYPTION_FAILED,  // ← NEW
        }
    }

    fn recovery_guidance(&self) -> Option<String> {
        match self {
            // ... existing guidance
            Self::DecryptionFailed { .. } => Some("Ensure correct key and passphrase are used".to_string()),  // ← NEW
        }
    }
}
```

**Step 6: Update ErrorCode Mapping**
```rust
impl DomainError for VaultError {
    fn map_to_error_code(&self) -> ErrorCode {
        match self.error_code() {
            // ... existing mappings
            code if code == catalog::vault::critical::DECRYPTION_FAILED => ErrorCode::DecryptionFailed,  // ← NEW
            _ => ErrorCode::InternalError,
        }
    }
}
```

**Step 7: Update Tests**
```rust
#[test]
fn test_vault_error_codes() {
    let err = VaultError::DecryptionFailed { reason: "bad key".to_string() };
    assert_eq!(err.error_code(), 1000505);
    assert_eq!(err.severity_class(), "critical");
    assert_eq!(err.module(), "vault");
}
```

**Total Locations:** 3 files (catalog, domain error, tests)
**Time:** ~10 minutes

---

### Modifying Existing Error Code

**Scenario:** Change message for "Vault not found"

**What NOT to change:** Numeric code (1000501)
**What CAN change:** Message, recovery guidance, severity (if reclassified)

**Step 1: Find Current Definition**
```bash
grep -r "1000501" src-tauri/src/errors/catalog/
# Result: errors/catalog/domains/vault.rs:10
```

**Step 2: Update Message (in domain error)**
```rust
// vault/domain/errors.rs
#[error("Vault '{vault_id}' not found")]  // OLD
#[error("Vault '{vault_id}' does not exist in storage")]  // NEW
NotFound { vault_id: String },
```

**Step 3: Update Recovery Guidance**
```rust
impl DomainError for VaultError {
    fn recovery_guidance(&self) -> Option<String> {
        match self {
            Self::NotFound { .. } => Some("Verify vault exists or create new vault".to_string()),  // Update here
        }
    }
}
```

**Step 4: Run Tests**
```bash
cargo test vault::domain::errors
```

**Important:** Numeric code NEVER changes (1000501 is permanent). Only message/guidance can evolve.

---

### Claiming Reserved Range

**Scenario:** Adding new feature requiring error codes

**Step 1: Estimate Needs**
- New feature: "Hardware key - Titan"
- Commands: ~8 codes
- Domain: ~10 codes
- Infrastructure: ~30 codes
- **Total:** ~50 codes

**Step 2: Find Available Reserved Range**
```
Check: errors/catalog/ALLOCATION.md

Available:
  Commands: 1000300-1000349 (RESERVED)  ✅
  Domains: 1000800-1000849 (RESERVED)   ✅
  Infrastructure: 1001400-1001499 (RESERVED, 100 codes)  ✅
```

**Step 3: Claim and Document**
```markdown
# errors/catalog/ALLOCATION.md

| Range | Module | Status | Date Claimed |
|-------|--------|--------|--------------|
| 1000300-1000349 | Titan commands | Active | 2026-03-15 |
| 1000800-1000849 | Titan domain | Active | 2026-03-15 |
| 1001400-1001499 | Titan infrastructure | Active | 2026-03-15 |
```

**Step 4: Create Catalog Module**
```rust
// errors/catalog/domains/titan.rs
pub mod critical {
    // Range: 1000800-1000849 (50 codes)
    pub const DEVICE_NOT_FOUND: u32 = 1000801;
    pub const AUTH_FAILED: u32 = 1000802;
    // ...
}
```

**Step 5: Implement Domain Error**
```rust
// key_management/titan/domain/errors.rs
#[derive(Debug, thiserror::Error)]
pub enum TitanError {
    #[error("Titan device not found")]
    DeviceNotFound,
}

impl DomainError for TitanError {
    fn error_code(&self) -> u32 {
        use crate::errors::catalog::codes::critical::domains::titan;
        match self {
            Self::DeviceNotFound => titan::DEVICE_NOT_FOUND,
        }
    }
}
```

---

## Migration Strategy: Incremental Rollout

### Phase 1: Foundation (Week 1)
- Create catalog structure
- Implement DomainError trait
- Implement for **Vault domain only** (Iteration 1)
- Update vault commands to use trait
- Validate pattern works

### Phase 2: Domain Rollout (Weeks 2-3)
- Implement for Crypto domain
- Implement for File domain
- Implement for Key Management domains (passphrase, yubikey, shared)
- One domain per day with validation

### Phase 3: Infrastructure (Week 4)
- Age operations
- YubiKey PTY
- Persistence layers
- Shared infrastructure

### Phase 4: Logging Enhancement (Week 5)
- Standardize all logging calls (structured fields)
- Add local timezone
- Implement log rotation
- Clean up unstructured logs

### Phase 5: Instrumentation (Week 6+)
- Add #[instrument] to all managers
- Add spans to services
- Enable request tracing

**Total: ~6 weeks incremental work**
**Can ship after each phase**

---

## Future Enhancements

### When Distributed Mode Added

**Add OTel SDK:**
```rust
// Add dependencies:
opentelemetry = "0.24"
opentelemetry-otlp = "0.17"
tracing-opentelemetry = "0.25"

// Modify logging/mod.rs:
let tracer = init_otel_tracer();
let otel_layer = OpenTelemetryLayer::new(tracer);

tracing_subscriber::registry()
    .with(otel_layer)  // ← Add trace export
    .with(file_layer)
    .with(stderr_layer)
    .try_init()?;
```

**Result:**
- Traces export to Grafana/Jaeger
- Error codes visible in trace UI
- Distributed request correlation
- **No application code changes** - logging already structured!

---

### When Metrics Needed

**Add metrics layer:**
```rust
// Count errors by code
error_count{error_code="1000501", module="vault", severity="critical"}

// Operation duration
operation_duration{operation="vault_create", success="false"}
```

**Benefit:** Numeric codes perfect for metrics (cardinality-friendly)

---

## Anti-Patterns to Avoid

### ❌ DON'T: Encode Too Much in Code

**Bad:**
```
1000501 = Vault not found
1000502 = Vault not found (deleted)
1000503 = Vault not found (corrupted)
1000504 = Vault not found (migrated)
```

**Better:**
```
1000501 = Vault not found
  → Use context: NotFound { vault_id, reason: NotFoundReason }
```

**Why:** Codes explode, context fields scale better

---

### ❌ DON'T: Change Codes After Assignment

**Bad:**
```rust
// 2025: pub const NOT_FOUND: u32 = 1000501;
// 2026: pub const NOT_FOUND: u32 = 2000501;  // ← Changed severity!
```

**Why:** Breaks log analysis, metrics, error tracking

**If severity changes:**
- Create NEW code: `pub const NOT_FOUND_HIGH: u32 = 2000501;`
- Deprecate old: `#[deprecated] pub const NOT_FOUND_OLD: u32 = 1000501;`
- Migrate gradually

---

### ❌ DON'T: Bypass Catalog

**Bad:**
```rust
error!(error.code = 9999999, "Random error");  // ← Not in catalog!
```

**Enforce:**
```rust
// Catalog consts are only source
error!(error.code = catalog::vault::NOT_FOUND, "...");  // ✅
```

---

## Success Criteria

### Phase 1 (Iteration 1: Vault Domain)

**Must Have:**
- [ ] Catalog structure created
- [ ] Vault error codes allocated (critical + high ranges)
- [ ] DomainError trait implemented and tested
- [ ] VaultError implements trait
- [ ] Vault commands use trait (no manual match)
- [ ] Logging shows error.code in structured format
- [ ] Local timezone in logs
- [ ] Basic log rotation (10MB, 7 files)
- [ ] All tests passing
- [ ] Documentation complete

**Metrics:**
- Reduced boilerplate: ~100 LOC removed from vault commands
- Error codes allocated: ~10-15 codes (out of 100 available)
- Logging consistency: 100% of vault errors logged with error.code

**Review Questions:**
- Is catalog easy to maintain?
- Is 50-code allocation sufficient?
- Is logging pattern clean and consistent?
- Easy to add new codes?
- Pattern ready to replicate?

---

## Appendices

### Appendix A: Full Range Map

See "Numeric Taxonomy Design" section above for complete allocation.

### Appendix B: OTel References

**Semantic Conventions:**
- Log Data Model: https://opentelemetry.io/docs/specs/otel/logs/data-model/
- Exception Attributes: https://opentelemetry.io/docs/specs/semconv/exceptions/
- Error Attributes: https://opentelemetry.io/docs/specs/semconv/attributes-registry/error/

**Severity Mapping:**
- OTel Severity Numbers: 1-24 scale
- Our mapping: critical=21, high=17, medium=13, low=9, info=5

### Appendix C: Rust Edition 2024 Best Practices

**Error Handling:**
- thiserror for typed errors (library pattern)
- Trait-based abstraction for common behavior
- Context-rich error variants

**Logging:**
- tracing for structured logging
- #[instrument] for automatic spans
- Const-based configuration (zero runtime cost)

---

## Document Control

**Version:** 1.0
**Status:** Design Blueprint
**Next:** Implementation Plan (see error-logging-implementation-plan.md)
**Review:** After Iteration 1 complete

---

*This architecture balances pragmatism (offline desktop app) with future-proofing (distributed mode ready) while maintaining enterprise-grade error categorization and Rust type safety.*
