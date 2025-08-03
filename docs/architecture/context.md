# Architecture Domain Context

**Domain**: Architecture  
**Purpose**: System design, technical blueprints, and implementation patterns  
**Created**: 2025-08-03  
**Status**: Active

## Executive Summary

The Architecture domain serves as the technical foundation for Barqly Vault, defining a security-first desktop application built with Tauri v2, Rust backend, and React/TypeScript frontend. This domain bridges business requirements with implementation details, providing blueprints for secure Bitcoin custody backup and restoration using age encryption.

## Domain Scope

### What This Domain Covers
- System architecture and technology stack decisions
- Tauri command bridge design and API contracts
- Module blueprints for crypto, storage, and file operations
- Frontend architecture with TypeScript type safety
- Cross-platform implementation patterns
- Security boundaries and threat models

### What This Domain Doesn't Cover
- Detailed implementation code (see Engineering domain)
- Testing strategies and QA processes (see QA domain)
- User interface mockups (see Design domain)
- Performance metrics (see `/docs/common/quality-standards.md`)
- Project timelines (see Project Management domain)

## Knowledge Map

### Core Architecture Documents

#### System Foundation
- **[system-architecture.md](./system-architecture.md)** - Complete technical architecture
  - Technology stack: Tauri v2 + Rust + React
  - Module architecture: crypto, storage, file_ops
  - Data flow: encryption/decryption workflows
  - Security considerations and threat model

#### Backend Architecture
- **[Backend Blueprints](./backend/)** - Rust module specifications
  - **Milestone 2**: Core module implementations
    - [blueprint-milestone2.md](./backend/blueprint-milestone2.md) - Rust modules overview
    - [blueprint-milestone2-task3.md](./backend/blueprint-milestone2-task3.md) - File operations detail
  - **Milestone 3**: Tauri command bridge
    - [blueprint-milestone3.md](./backend/blueprint-milestone3.md) - Bridge architecture
    - [Setup commands](./backend/blueprint-milestone3-task3.1.md)
    - [Encryption commands](./backend/blueprint-milestone3-task3.2.md)
    - [Decryption commands](./backend/blueprint-milestone3-task3.3.md)
    - [Integration testing](./backend/blueprint-milestone3-task3.4.md)

#### Frontend Architecture
- **[Frontend Specifications](./frontend/)** - TypeScript/React patterns
  - [api-interfaces-backend.md](./frontend/api-interfaces-backend.md) - Complete API documentation
  - [api-quick-reference.md](./frontend/api-quick-reference.md) - Command reference
  - [type-system-analysis.md](./frontend/type-system-analysis.md) - TypeScript patterns
  - [ux-engineer-onboarding.md](./frontend/ux-engineer-onboarding.md) - Frontend guide

### Key Architectural Decisions

#### 1. Tauri v2 Framework
```rust
// Command-based architecture
#[tauri::command]
async fn encrypt_files(
    key_id: String,
    file_paths: Vec<String>,
) -> Result<String, CommandError>
```
**Rationale**: Native performance, small bundle size, security sandbox

#### 2. Age Encryption
```rust
use age::{Encryptor, Recipient};
// Direct library usage instead of CLI
```
**Rationale**: Audited library, simple API, perfect for Bitcoin custody

#### 3. TypeScript Type Generation
```typescript
// Auto-generated from Rust types
import { CommandResponse, ErrorCode } from './generated/types';
```
**Rationale**: Single source of truth, compile-time safety

#### 4. Staging Area Pattern
```rust
// All operations use temporary staging
pub fn create_staging_area() -> Result<StagingArea>
```
**Rationale**: Atomic operations, rollback capability, data integrity

## Architectural Patterns

### Security Patterns
1. **Defense in Depth**
   - Input validation at UI layer
   - Command validation in Tauri bridge
   - Path safety checks in file operations
   - Memory zeroization for sensitive data

2. **Least Privilege**
   - No network permissions
   - Restricted file system access
   - Sandboxed operations

### Design Patterns
1. **Command Pattern** - All UI-backend communication
2. **Repository Pattern** - Key storage abstraction
3. **Factory Pattern** - Staging area creation
4. **Observer Pattern** - Progress tracking

### Error Handling Strategy
```typescript
interface CommandError {
  code: ErrorCode;
  message: string;
  recovery_guidance?: string;
  user_actionable: boolean;
}
```

## Integration Points

### Cross-Domain Dependencies

#### With Engineering Domain
- Implementation of architectural blueprints
- Code quality standards
- Performance optimization

#### With Technology Standards
- Technology validation results
- Security evaluation findings
- Performance benchmarks

#### With QA Domain
- Testing requirements from architecture
- Integration test specifications
- Security test scenarios

#### With Design Domain
- UI component architecture
- User flow implementations
- Accessibility requirements

## Technology Stack Summary

### Backend Stack
- **Runtime**: Tauri v2 (latest stable)
- **Language**: Rust (memory safety, performance)
- **Encryption**: age-encryption crate
- **Archiving**: tar + flate2 (TAR.GZ)
- **Serialization**: serde + serde_json
- **Error Handling**: thiserror + anyhow
- **Logging**: tracing with OpenTelemetry
- **Memory Safety**: zeroize

### Frontend Stack
- **Framework**: React 18 LTS
- **Language**: TypeScript 5.x (strict mode)
- **Styling**: Tailwind CSS v4 + Shadcn/ui
- **State**: Zustand (lightweight, TypeScript-friendly)
- **Routing**: React Router v6
- **Build**: Vite with Tauri integration

## Quick Reference

### Command Categories
1. **Setup Commands** - Key generation, management
2. **Encryption Commands** - File selection, archiving, encryption
3. **Decryption Commands** - Archive decryption, extraction
4. **Storage Commands** - Key persistence, configuration
5. **Progress Commands** - Operation tracking

### Module Responsibilities
- **Crypto Module**: Age encryption, key management, passphrase protection
- **Storage Module**: Cross-platform paths, key persistence, configuration
- **File Ops Module**: Staging, archiving, manifest generation
- **Command Module**: Tauri bridge, error translation, validation

### Performance Targets
- Startup: <2 seconds
- Key generation: <1 second
- Encryption: >10MB/s
- Memory: <200MB typical
- File limit: 100MB (Bitcoin custody optimization)

## Action Items for Developers

### Getting Started
1. Review [system-architecture.md](./system-architecture.md) for overview
2. Study relevant backend blueprints for your module
3. Check [api-interfaces-backend.md](./frontend/api-interfaces-backend.md) for API contracts
4. Follow patterns in [type-system-analysis.md](./frontend/type-system-analysis.md)

### When Implementing
1. Use staging area pattern for all file operations
2. Generate TypeScript types from Rust definitions
3. Include structured logging with OpenTelemetry
4. Write tests following the test-as-documentation philosophy
5. Validate all inputs at command boundary

### Security Checklist
- [ ] Input validation implemented
- [ ] Path traversal protection added
- [ ] Sensitive data zeroized
- [ ] Error messages sanitized
- [ ] Permissions checked

## Domain Maintenance

### Update Triggers
- New architectural decisions
- Technology stack changes
- Security model updates
- API contract modifications
- Pattern refinements

### Review Schedule
- Weekly: Blueprint progress
- Sprint: API contract updates
- Monthly: Architecture health check

## Related Resources

### External Dependencies
- [Age Encryption Spec](https://age-encryption.org)
- [Tauri v2 Documentation](https://v2.tauri.app)
- [React 18 Patterns](https://react.dev)

### Internal References
- Technology Decisions: [`/docs/architecture/technology-decisions.md`](technology-decisions.md)
- Security Foundations: [`/docs/common/security-foundations.md`](../common/security-foundations.md)
- Quality Standards: [`/docs/common/quality-standards.md`](../common/quality-standards.md)
- Historical Research: [`/docs/archive/project-transition-30pct/`](../archive/project-transition-30pct/)
- Engineering: Implementation guides
- QA: Testing specifications
- Design: UI/UX patterns

---

*This context document synthesizes knowledge from 14 architecture files. For detailed specifications, refer to linked documents. For implementation, coordinate with Engineering domain.*