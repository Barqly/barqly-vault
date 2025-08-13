# Architecture Summary

**Quick reference for key architectural patterns and decisions**

## System Architecture

### Three-Layer Design

```
┌─────────────────────────────────────┐
│         Frontend (React/TS)         │ ← User Interface
├─────────────────────────────────────┤
│      Tauri Commands (Bridge)        │ ← API Layer
├─────────────────────────────────────┤
│         Backend (Rust)              │ ← Business Logic
└─────────────────────────────────────┘
```

### Module Organization

```
src-tauri/
├── commands/     # Tauri command handlers (API)
├── crypto/       # Age encryption operations
├── file_ops/     # File/archive management
├── storage/      # Key storage and config
└── logging/      # Cross-platform logging

src-ui/
├── components/   # Reusable UI components
├── pages/        # Route pages (Setup/Encrypt/Decrypt)
├── hooks/        # Custom React hooks
└── lib/          # Types and utilities
```

## Key Architectural Patterns

### 1. Command-Only Access Pattern

- UI never directly accesses Rust modules
- All communication through Tauri commands
- Type-safe contracts via TypeScript generation

### 2. Encryption Workflow Pipeline

```
Encrypt: Files → Staging → TAR → Age → .age file
Decrypt: .age → Age → TAR Extract → Verify → Files
```

### 3. Security-First Design

- Memory zeroization (`zeroize` crate)
- No network operations (fully offline)
- Platform-specific secure storage
- CSP headers and sandboxing

### 4. Progress Management

- Global state for long operations
- Debounced updates (100ms intervals)
- Real-time UI feedback

## Component Patterns

### Frontend Components (CVA Pattern)

```typescript
// Class Variance Authority for consistent styling
const variants = cva("base-classes", {
  variants: {
    size: { small: "...", large: "..." },
    intent: { primary: "...", danger: "..." },
  },
});
```

### Backend Error Handling

```rust
// Comprehensive error types with recovery guidance
pub enum CommandError {
    ValidationFailed { field, requirement, guidance },
    CryptoError { operation, details, recovery },
    // ... with user-friendly messages
}
```

### Testing Architecture

```
tests/
├── unit/        # Isolated component tests
├── integration/ # Workflow tests
├── smoke/       # Health checks
└── common/      # Shared fixtures
```

## Data Flow Patterns

### Key Generation Flow

1. UI: Collect label + passphrase
2. Command: `generate_key`
3. Backend: Age key generation
4. Storage: Encrypted save
5. UI: Display public key

### File Encryption Flow

1. UI: Select files/folder
2. Command: `encrypt_files`
3. Backend: Stage → Archive → Encrypt
4. Progress: Real-time updates
5. UI: Success with output path

### Cache Strategy

- LRU cache for key operations
- 5-minute TTL
- Automatic invalidation on changes
- 86.7% performance improvement

## Cross-Cutting Concerns

### Logging

- Structured with OpenTelemetry
- Platform-specific locations
- Debug/Info/Error levels

### Validation

- Frontend: Immediate user feedback
- Backend: Comprehensive checks
- Commands: Input sanitization

### Error Recovery

- User-friendly messages
- Specific recovery steps
- Operation context preserved

## Platform Considerations

### Storage Paths

```
macOS:   ~/Library/Application Support/barqly-vault/
Windows: %APPDATA%\barqly-vault\
Linux:   ~/.config/barqly-vault/
```

### Key Naming Convention

```
barqly-<label>.agekey.enc  # Private keys
barqly-<label>.pub         # Public keys (future)
```

## Performance Optimizations

### Implemented

- Component lazy loading (React.lazy)
- Progress debouncing (80-90% IPC reduction)
- LRU caching for frequent operations
- Efficient tar streaming

### Targets

- Startup: <2 seconds
- Encryption: >10MB/s
- Memory: <200MB idle
- Bundle: <50MB total

## Security Boundaries

### Trust Boundaries

1. User → Application (file selection)
2. Frontend → Backend (Tauri IPC)
3. Application → OS (file system)
4. Application → Crypto (age library)

### Defense Layers

1. Platform security (OS isolation)
2. Application sandbox (Tauri)
3. Language safety (Rust)
4. Cryptographic security (age)

## Quick Reference Links

- [Detailed Architecture Docs](../../architecture/)
- [Security Foundations](../security-foundations.md)
- [Testing Strategy](../../validation/comprehensive-test-strategy.md)
- [API Documentation](../../architecture/api-documentation.md)
