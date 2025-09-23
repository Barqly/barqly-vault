# Barqly Vault - Master Context

_Your 2-minute orientation to the secure data vault system_

## What This Is

**Barqly Vault** - Desktop application for secure backup and restore of sensitive data & documents. Strong encryption running locally on your machine.

**Core Mission**: Enable secure data backup in under 90 seconds, recoverable decades later.

## Current State (January 2025)

- ✅ **Alpha Release Complete** - Three functional screens (Setup, Encrypt, Decrypt)
- ✅ **Core encryption** - Age encryption with passphrase protection
- ✅ **Key management** - Generate, store, manage encryption keys
- ✅ **File operations** - Encrypt/decrypt files and folders with manifest preservation
- ✅ **Cross-platform** - macOS, Windows, Linux via Tauri v2
- ✅ **UI/UX Implementation** - All three core screens with 90-second setup goal achieved
- ✅ **UI Consistency Optimization** - Visual and functional refinement across all screens
- 📋 **Next up** - Testing & QA, performance optimization, hardware wallet integration

## Navigation Map

| Task Domain           | Context Location                  | Key Focus                        |
| --------------------- | --------------------------------- | -------------------------------- |
| Architecture & Design | `/docs/architecture/context.md`   | Technology stack, security model |
| Features & UX         | `/docs/product/context.md`        | User journeys, encryption workflows |
| Code Implementation   | `/docs/engineering/context.md`    | Development patterns, testing    |
| Standards & Templates | `/docs/templates/context.md`      | ADDs, code templates             |
| Historical Decisions  | `/docs/retrospectives/context.md` | Past decisions, evolution        |

## Technical Stack

```yaml
frontend: "React 19.1 + TypeScript + Tailwind CSS + Shadcn/ui"
backend: "Rust Edition 2024 + Tauri v2 + age-encryption"
testing: "Vitest (frontend) + Rust tests (backend)"
platform: "Desktop (macOS, Windows, Linux)"
security: "Age encryption, local-only, zero network"
```

## Project Structure

```
barqly-vault/
├── src-ui/          # React frontend
├── src-tauri/       # Rust backend
├── docs/            # Domain-organized documentation
├── scripts/         # Build and automation
└── context.md       # You are here
```

## Core Principles

1. **Security First** - Protect user assets above all
2. **90-Second Goal** - Critical operations under 90 seconds
3. **Local-Only** - No mandatory network, user owns data
4. **Universal** - Works with any sensitive files including Bitcoin seeds, keys, documents
5. **Future-Proof** - Recoverable in 20+ years

## Essential Commands

```bash
make validate        # Before ANY commit - ensures CI passes
make validate-ui     # Frontend only (~30s)
make validate-rust   # Backend only (~1-2min)
make ui             # Start frontend dev server
make app            # Start Tauri desktop app
```

## Quality Gates

1. **Type Safety** - TypeScript strict, Rust compiler
2. **Linting** - ESLint, Prettier, Clippy
3. **Testing** - Unit, integration, smoke tests
4. **Security** - No exposed keys, memory zeroization
5. **Documentation** - ADDs for significant changes

## Context System Usage

**AI Agents** → `/docs/common/context-usage.ai.md`
**Humans** → `/docs/common/context-usage-guide.md`
**Commands** → `/docs/common/tools.ai.md`

## Quick References

| Document                                     | Purpose           |
| -------------------------------------------- | ----------------- |
| `/docs/common/security-foundations.md`       | Security model    |
| `/docs/common/quality-standards.md`          | Quality standards |
| `/docs/architecture/technology-decisions.md` | Tech decisions    |
| `/docs/product/user-journey.md`              | User journey      |
| `/docs/engineering/api-reference.md`         | API reference     |

## Active Development

- **Current Phase**: Post-alpha with hardware security integration in progress
- **Recent Achievement**: Rust Edition 2024 migration completed (January 2025)
  - ✅ Modern async patterns and let-chains implemented
  - ✅ All 462 backend tests passing with zero warnings
  - ✅ Future-ready for async generators and closures
- **Active Work**: YubiKey hardware integration (80-85% complete)
  - ✅ Backend implementation complete with multi-key registration
  - 🚧 UI refactoring and functional bug fixes remaining (~15%)
- **Next Milestone**: Complete YubiKey integration and release

---

_This context system eliminates the 25-35 minute "context reconstruction tax". Operational in under 5 minutes._
