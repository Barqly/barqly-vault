# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

**IMPORTANT**: Always use `zsh` when running shell commands. This project is developed on macOS with zsh as the default shell.

## Development Commands

### Quick Start
```zsh
# IMPORTANT: Always run validation before committing
make validate            # Comprehensive validation (mirrors CI exactly)

# Development
make ui                  # Start UI development server
make app                 # Start Tauri desktop app

# Alternative npm commands
npm run ui               # Frontend dev server (cd src-ui && npm run dev)
npm run app              # Desktop app (cd src-tauri && cargo tauri dev)
```

### Testing
```zsh
# Frontend tests
cd src-ui && npm test                    # Run tests in watch mode
cd src-ui && npm run test:run           # Run tests once
cd src-ui && npm run test:ui            # Run tests with UI

# Run a single test file
cd src-ui && npm test -- FileSelectionButton.test.tsx

# Backend tests
cd src-tauri && cargo test              # Run all tests
cd src-tauri && cargo test crypto::     # Run module tests
cd src-tauri && cargo test test_name    # Run specific test
```

### Code Quality
```zsh
# CRITICAL: Run before every commit to ensure CI passes
make validate            # Runs all checks exactly as CI does

# Individual checks
cd src-ui && npm run lint               # ESLint
cd src-ui && npx prettier --check .     # Prettier check
cd src-ui && npx tsc --noEmit          # TypeScript check
cd src-tauri && cargo fmt --check      # Rust formatting
cd src-tauri && cargo clippy --all-targets --all-features -- -D warnings
```

### Quick Fixes
```zsh
# Auto-fix formatting
cd src-ui && npx prettier --write .
cd src-tauri && cargo fmt

# Fix ESLint issues (when possible)
cd src-ui && npm run lint -- --fix
```

### Build Commands
```zsh
# Production builds
make build               # Frontend build (cd src-ui && npm run build)
make app-build          # Desktop app build (cd src-tauri && cargo tauri build)

# Preview builds
make preview            # Preview UI build
make app-preview        # Preview desktop app build
```

## Architecture Overview

### Project Structure
```
barqly-vault/                   # Monorepo root
├── src-ui/                     # React/TypeScript frontend
│   ├── src/
│   │   ├── components/         # UI components (forms, layout, ui)
│   │   ├── hooks/             # Custom React hooks
│   │   ├── pages/             # Route pages (Setup, Encrypt, Decrypt)
│   │   └── lib/               # API types and utilities
│   └── __tests__/             # Frontend test files
├── src-tauri/                  # Rust backend
│   ├── src/
│   │   ├── commands/          # Tauri command handlers
│   │   ├── crypto/            # Age encryption operations
│   │   ├── file_ops/          # File operations and archiving
│   │   ├── storage/           # Key storage management
│   │   └── logging/           # Cross-platform logging
│   └── tests/                 # Backend tests (unit, integration, smoke)
├── scripts/                    # Build and validation scripts
├── Makefile                   # Primary development commands
└── CLAUDE.md                  # This file
```

### Tech Stack
- **Backend**: Rust with Tauri v2, age-encryption, tar, serde, thiserror, zeroize
- **Frontend**: React 18, TypeScript 5.x (strict), Tailwind CSS v4, Shadcn/ui, Zustand, React Router v7
- **Build Tools**: Vite, Cargo
- **Testing**: Vitest (frontend), Rust built-in testing (backend)
- **Node.js**: v22.17.0 LTS

### Key Architectural Patterns

#### 1. Tauri Command Architecture
All UI-backend communication happens through Tauri commands:
- Commands defined in `src-tauri/src/commands/`
- TypeScript types auto-generated from Rust structures
- Example: `generate_key`, `encrypt_files`, `decrypt_archive`

#### 2. Encryption Workflow
```
Encrypt: Files → Staging → TAR Archive → Age Encryption → .age file
Decrypt: .age file → Age Decrypt → Extract TAR → Verify Manifest → Output files
```

#### 3. Key Management
- Keys stored in platform-specific directories
- Naming convention: `barqly-<label>.agekey.enc`
- Private keys always encrypted with passphrase
- Public keys can be shared safely

#### 4. Error Handling Pattern
- Comprehensive error types in Rust (`thiserror`)
- User-friendly error messages
- Structured error responses to frontend
- Progress tracking for long operations

### Frontend Architecture (src-ui/)

#### Key Hooks
- `useKeyGeneration`: Manages age key creation with passphrase
- `useFileEncryption`: Handles file/folder encryption workflow
- `useFileDecryption`: Manages decryption operations
- `useProgressTracking`: Tracks operation progress with real-time updates

#### Pages
- `/setup`: Key generation and management
- `/encrypt`: File selection and encryption
- `/decrypt`: Archive decryption

#### State Management
- Local component state with React hooks
- No global state management (intentional for security)
- Form state managed per component

### Backend Architecture (src-tauri/)

#### Core Modules
- `commands/`: Tauri command handlers (bridge between UI and backend)
- `crypto/`: Age encryption operations and key management
- `file_ops/`: File archiving, staging, and manifest generation
- `storage/`: Secure key storage and configuration management
- `logging/`: Cross-platform logging system

#### Security Features
- All crypto operations use audited `age` library
- Memory zeroization for sensitive data (`zeroize` crate)
- Constant-time operations where applicable
- No network operations (fully offline)
- CSP headers restrict web content in Tauri windows

### Testing Strategy
- **Frontend**: Component tests, hook tests, integration tests
- **Backend**: Unit tests, integration tests, smoke tests
- **Coverage Target**: >80% for security-critical code
- **Test Data**: Use fixtures in `tests/common/fixtures.rs`

## Important Guidelines

### Security First
- NEVER store unencrypted private keys
- Always use `zeroize` for sensitive data in Rust
- Validate all user input before processing
- Use constant-time comparisons for crypto operations

### Cross-Platform Considerations
- Test on macOS, Windows, and Linux
- Use platform-specific paths correctly:
  - macOS: `~/Library/Application Support/barqly-vault/`
  - Windows: `%APPDATA%\barqly-vault\`
  - Linux: `~/.config/barqly-vault/`

### Commit Workflow
1. Make changes
2. Run `make validate` (MUST PASS)
3. Commit with conventional format: `type(scope): description`
4. Types: feat, fix, docs, style, refactor, test, chore
5. Reference issue numbers when applicable

### Performance Targets
- Startup time: <2 seconds
- Encryption speed: >10MB/s
- Memory usage: <200MB typical
- File size: Optimized for <100MB (Bitcoin custody use case)

### Common Development Tasks

#### Adding a New Tauri Command
1. Define command in `src-tauri/src/commands/`
2. Add to command list in `src-tauri/src/lib.rs`
3. Generate TypeScript types: `cd src-tauri && cargo build --features generate-types`
4. Use in frontend via `@tauri-apps/api/core`

#### Adding a New React Component
1. Create component in appropriate `src-ui/src/components/` subdirectory
2. Add tests in `src-ui/src/__tests__/components/`
3. Follow existing patterns for props and styling
4. Use Tailwind CSS classes, avoid inline styles

#### Debugging
- Frontend: Browser DevTools (inspect Tauri window)
- Backend: `RUST_LOG=debug cargo tauri dev`
- Logging: Check platform-specific log locations

## Validation Checklist
Before pushing code, ensure:
- [ ] `make validate` passes (mirrors CI exactly)
- [ ] New code has appropriate tests
- [ ] Security implications reviewed
- [ ] Cross-platform compatibility verified
- [ ] Documentation updated if needed
- [ ] Commit message follows conventions