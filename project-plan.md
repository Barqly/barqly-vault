# Barqly Vault Project Plan

## Project Overview
Barqly Vault is a cross-platform desktop application for secure file encryption using the `age` encryption standard, built with Tauri and Rust.

## Development Principles
- **Security First**: All cryptographic operations must be audited and follow best practices
- **User Experience**: Simple, intuitive interface hiding complexity
- **Cross-Platform**: Consistent behavior across macOS, Windows, and Linux
- **Testability**: Comprehensive unit and integration tests
- **Documentation**: Clear code documentation and user guides
- **Modularity**: Clean separation of concerns with well-defined interfaces

## Technology Stack
- **Frontend**: Tauri + React + TypeScript
- **Backend**: Rust
- **Encryption**: age (via Rust crate or CLI)
- **Build System**: Cargo + Tauri CLI
- **Testing**: Jest (frontend), Rust built-in tests (backend)
- **CI/CD**: GitHub Actions

## Project Structure
```
barqly-vault/
├── src-tauri/          # Rust backend
│   ├── src/
│   │   ├── main.rs
│   │   ├── commands/   # Tauri commands
│   │   ├── crypto/     # Encryption logic
│   │   ├── storage/    # Key & config management
│   │   └── utils/      # Helper functions
│   ├── Cargo.toml
│   └── tauri.conf.json
├── src-ui/             # React frontend
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── hooks/
│   │   ├── utils/
│   │   └── App.tsx
│   ├── package.json
│   └── tsconfig.json
├── tests/              # Integration tests
├── docs/               # Documentation
└── scripts/            # Build & deployment scripts
```

## Design Decisions & Clarifications

### Key Management UX
- **Dropdown Display**: Show only key labels in the dropdown for clean UX
- **Key Selection Feedback**: Display full public key below dropdown when a key is selected
- **Future Enhancement**: Add QR code display in the right panel for easy key sharing

### Manifest File Strategy
- **Dual Storage**: Manifest stored both inside encrypted bundle AND optionally outside
- **Purpose**: Contains metadata and content hashes for pre-decryption integrity verification
- **Future Enhancement**: Add digital signatures for tamper detection

### Error Handling Approach
- **User-Friendly Messages**: Clear, actionable error messages for common scenarios:
  - "Wrong key selected - please choose the correct encryption key"
  - "File appears corrupted - integrity check failed"
  - "Passphrase incorrect - please try again"
- **Recovery Guidance**: Provide next steps for each error type

### File Selection UX Design
- **Dual Mode Selection**:
  - **Folder Mode**: User selects entire folder for encryption (no individual files allowed)
  - **File Mode**: User selects individual files (no folders allowed)
- **Drag-and-Drop Support**: Available in both modes
- **Bitcoin Custody Focus**: Optimized for output descriptors, wallet databases, access keys
- **Consistency**: Maintains folder structure across platforms for reliable restoration

### Progress Indication
- **Lightweight Progress**: Simple progress bar for encryption/decryption operations
- **Size Constraints**: Optimized for Bitcoin custody files (typically <100MB total)
- **Use Case**: Primarily for wallet restoration scenarios, not bulk file storage

## Milestones

### Milestone 1: Project Foundation & Setup
**Goal**: Establish project structure, development environment, and core architecture

- [x] 1.1: Initialize Tauri project with React + TypeScript template
- [x] 1.2: Set up project folder structure following Rust best practices
- [x] 1.3: Configure ESLint, Prettier, and Rust formatting tools
- [x] 1.4: Set up Git repository with proper .gitignore
- [x] 1.5: Create initial CI/CD pipeline with GitHub Actions
- [ ] 1.6: Set up development documentation (README, CONTRIBUTING)
- [ ] 1.7: Configure Tauri security settings and CSP
- [ ] 1.8: Implement basic logging infrastructure

### Milestone 2: Core Rust Modules
**Goal**: Build the foundational Rust modules for crypto, storage, and file operations

- [ ] 2.1: Create crypto module with age integration
  - [ ] 2.1.1: Evaluate age crate vs CLI approach
  - [ ] 2.1.2: Implement key generation functionality
  - [ ] 2.1.3: Implement encryption/decryption functions
  - [ ] 2.1.4: Add passphrase protection for private keys
- [ ] 2.2: Create storage module for key management
  - [ ] 2.2.1: Define key storage structure
  - [ ] 2.2.2: Implement cross-platform path handling
  - [ ] 2.2.3: Add key listing and retrieval functions
  - [ ] 2.2.4: Implement secure key deletion
- [ ] 2.3: Create file operations module
  - [ ] 2.3.1: Implement file/folder selection logic
  - [ ] 2.3.2: Create staging area management
  - [ ] 2.3.3: Implement tar archive creation
  - [ ] 2.3.4: Add manifest generation
- [ ] 2.4: Create config module
  - [ ] 2.4.1: Define configuration schema
  - [ ] 2.4.2: Implement config persistence
  - [ ] 2.4.3: Add migration support for future updates
- [ ] 2.5: Write comprehensive unit tests for all modules
- [ ] 2.6: Create module documentation with examples

### Milestone 3: Tauri Command Bridge
**Goal**: Create the API layer between frontend and backend

- [ ] 3.1: Design Tauri command interface
- [ ] 3.2: Implement setup commands
  - [ ] 3.2.1: generate_key command
  - [ ] 3.2.2: list_keys command
  - [ ] 3.2.3: validate_passphrase command
- [ ] 3.3: Implement encryption commands
  - [ ] 3.3.1: encrypt_files command
  - [ ] 3.3.2: create_manifest command
  - [ ] 3.3.3: get_encryption_status command
- [ ] 3.4: Implement decryption commands
  - [ ] 3.4.1: decrypt_file command
  - [ ] 3.4.2: verify_manifest command
- [ ] 3.5: Add error handling and validation
- [ ] 3.6: Implement progress reporting for long operations
- [ ] 3.7: Write integration tests for all commands

### Milestone 4: Frontend Foundation
**Goal**: Build the React/TypeScript frontend structure

- [ ] 4.1: Set up React Router for navigation
- [ ] 4.2: Create base UI components
  - [ ] 4.2.1: Layout components (Header, TabBar, StatusBar)
  - [ ] 4.2.2: Form components (Input, Button, Dropdown)
  - [ ] 4.2.3: Feedback components (Alert, Progress, Modal)
- [ ] 4.3: Implement state management (Context API or Zustand)
- [ ] 4.4: Create custom hooks for Tauri commands
- [ ] 4.5: Set up theme system with CSS variables
- [ ] 4.6: Implement responsive design
- [ ] 4.7: Add accessibility features (ARIA labels, keyboard nav)
- [ ] 4.8: Write component tests with React Testing Library

### Milestone 5: Setup Tab Implementation
**Goal**: Complete the key generation and setup workflow

- [ ] 5.1: Create Setup page component structure
- [ ] 5.2: Implement key generation form
  - [ ] 5.2.1: Key label input with validation
  - [ ] 5.2.2: Passphrase input with strength indicator
  - [ ] 5.2.3: Passphrase confirmation with matching validation
- [ ] 5.3: Implement key generation flow
  - [ ] 5.3.1: Loading state during generation
  - [ ] 5.3.2: Success state with public key display
  - [ ] 5.3.3: Copy-to-clipboard functionality
- [ ] 5.4: Add backup reminder workflow
  - [ ] 5.4.1: Checkbox confirmation UI
  - [ ] 5.4.2: Navigation lock until confirmed
- [ ] 5.5: Implement "Show Key Folder" functionality
- [ ] 5.6: Add error handling and user feedback
- [ ] 5.7: Write end-to-end tests for setup flow

### Milestone 6: Encrypt Tab Implementation
**Goal**: Build the file encryption workflow

- [ ] 6.1: Create Encrypt page component structure
- [ ] 6.2: Implement key selection dropdown
  - [ ] 6.2.1: Load available keys from storage
  - [ ] 6.2.2: Display key labels and metadata
- [ ] 6.3: Implement file/folder selection
  - [ ] 6.3.1: Native file picker integration
  - [ ] 6.3.2: Drag-and-drop support
  - [ ] 6.3.3: Selected items list with remove option
- [ ] 6.4: Implement output configuration
  - [ ] 6.4.1: Destination directory selector
  - [ ] 6.4.2: Custom bundle name input
  - [ ] 6.4.3: Default naming with timestamp
- [ ] 6.5: Create encryption execution flow
  - [ ] 6.5.1: Progress indication
  - [ ] 6.5.2: Success/failure feedback
  - [ ] 6.5.3: Manifest preview option
- [ ] 6.6: Add staging area management
- [ ] 6.7: Write end-to-end tests for encryption flow

### Milestone 7: Decrypt Tab Implementation
**Goal**: Build the file decryption workflow

- [ ] 7.1: Create Decrypt page component structure
- [ ] 7.2: Implement .age file selection
  - [ ] 7.2.1: File picker for .age files
  - [ ] 7.2.2: Drag-and-drop support
- [ ] 7.3: Implement key selection
  - [ ] 7.3.1: Auto-detect matching key if possible
  - [ ] 7.3.2: Manual key selection dropdown
- [ ] 7.4: Implement passphrase input
  - [ ] 7.4.1: Secure input field
  - [ ] 7.4.2: Show/hide password toggle
- [ ] 7.5: Implement output folder selection
- [ ] 7.6: Create decryption execution flow
  - [ ] 7.6.1: Progress indication
  - [ ] 7.6.2: Success/failure feedback
  - [ ] 7.6.3: Extracted files preview
- [ ] 7.7: Add integrity verification
- [ ] 7.8: Write end-to-end tests for decryption flow

### Milestone 8: Polish & Error Handling
**Goal**: Refine UX and handle edge cases

- [ ] 8.1: Implement comprehensive error handling
  - [ ] 8.1.1: Network/filesystem errors
  - [ ] 8.1.2: Encryption/decryption failures
  - [ ] 8.1.3: Invalid input handling
- [ ] 8.2: Add loading states and animations
- [ ] 8.3: Implement toast notifications
- [ ] 8.4: Add confirmation dialogs for destructive actions
- [ ] 8.5: Create help tooltips and inline documentation
- [ ] 8.6: Implement keyboard shortcuts
- [ ] 8.7: Add telemetry (opt-in, privacy-respecting)
- [ ] 8.8: Performance optimization

### Milestone 9: Testing & Security Audit
**Goal**: Ensure reliability and security

- [ ] 9.1: Complete unit test coverage (>80%)
- [ ] 9.2: Write integration test suite
- [ ] 9.3: Perform security audit
  - [ ] 9.3.1: Review crypto implementation
  - [ ] 9.3.2: Check for timing attacks
  - [ ] 9.3.3: Validate input sanitization
  - [ ] 9.3.4: Review file permissions
- [ ] 9.4: Conduct penetration testing
- [ ] 9.5: Performance testing with large files
- [ ] 9.6: Cross-platform compatibility testing
- [ ] 9.7: Create test documentation

### Milestone 10: Documentation & Release
**Goal**: Prepare for public release

- [ ] 10.1: Write user documentation
  - [ ] 10.1.1: Getting started guide
  - [ ] 10.1.2: Feature documentation
  - [ ] 10.1.3: Troubleshooting guide
- [ ] 10.2: Create developer documentation
  - [ ] 10.2.1: Architecture overview
  - [ ] 10.2.2: API documentation
  - [ ] 10.2.3: Contributing guidelines
- [ ] 10.3: Set up release automation
  - [ ] 10.3.1: Version bumping scripts
  - [ ] 10.3.2: Changelog generation
  - [ ] 10.3.3: Binary signing setup
- [ ] 10.4: Create distribution packages
  - [ ] 10.4.1: macOS .dmg with notarization
  - [ ] 10.4.2: Windows .exe with signing
  - [ ] 10.4.3: Linux AppImage/deb/rpm
- [ ] 10.5: Set up update mechanism
- [ ] 10.6: Create marketing materials
- [ ] 10.7: Prepare GitHub repository for open source

## Testing Strategy

### Unit Tests
- Rust: Built-in test framework with `cargo test`
- TypeScript: Jest with React Testing Library
- Coverage target: >80%

### Integration Tests
- Tauri command testing
- End-to-end workflows
- Cross-platform behavior

### Security Tests
- Fuzzing for input validation
- Timing attack analysis
- Memory safety verification

## Development Workflow

1. **Feature Development**
   - Create feature branch
   - Implement with TDD approach
   - Document as you code
   - Submit PR with tests

2. **Code Review Process**
   - Automated CI checks
   - Security review for crypto changes
   - UX review for frontend changes
   - Performance review for large changes

3. **Release Process**
   - Version bump (semantic versioning)
   - Update changelog
   - Run full test suite
   - Build and sign binaries
   - Create GitHub release
   - Update documentation

## Risk Mitigation

1. **Crypto Implementation**: Use well-tested libraries, avoid rolling own crypto
2. **Data Loss**: Implement atomic operations, extensive testing
3. **Cross-Platform Issues**: Regular testing on all platforms
4. **User Errors**: Clear UX, confirmation dialogs, undo capabilities
5. **Performance**: Benchmark with large files, optimize critical paths

## Success Metrics

- Zero critical security vulnerabilities
- <2s startup time
- Support for files up to 10GB
- 99.9% successful encryption/decryption rate
- <100MB application size
- 5-star user experience rating

## Timeline Estimate

- **Phase 1** (Milestones 1-3): 3-4 weeks
- **Phase 2** (Milestones 4-7): 4-5 weeks  
- **Phase 3** (Milestones 8-10): 3-4 weeks

**Total**: 10-13 weeks for MVP

## Next Steps

1. Review and approve project plan
2. Set up development environment
3. Begin Milestone 1 implementation
4. Establish weekly progress reviews 