# Barqly Vault - Master Context

_Your 2-minute orientation to the Bitcoin custody vault system_

## What This Is

**Barqly Vault** - Desktop application for secure file encryption, designed for Bitcoin custody workflows. Military-grade encryption running locally on your machine.

**Core Mission**: Enable secure Bitcoin key storage in under 90 seconds, recoverable decades later.

## Current State (January 2025)

- ✅ **Alpha Release Complete** - Three functional screens (Setup, Encrypt, Decrypt)
- ✅ **Core encryption** - Age encryption with passphrase protection
- ✅ **Key management** - Generate, store, manage encryption keys
- ✅ **File operations** - Encrypt/decrypt files and folders with manifest preservation
- ✅ **Cross-platform** - macOS, Windows, Linux via Tauri v2
- ✅ **UI/UX Implementation** - All three core screens with 90-second setup goal achieved
- 📋 **Next up** - Testing & QA, performance optimization, hardware wallet integration

## Navigation Map

| Task Domain           | Context Location                  | Key Focus                        |
| --------------------- | --------------------------------- | -------------------------------- |
| Architecture & Design | `/docs/architecture/context.md`   | Technology stack, security model |
| Features & UX         | `/docs/product/context.md`        | User journeys, Bitcoin workflows |
| Code Implementation   | `/docs/engineering/context.md`    | Development patterns, testing    |
| CI/CD & Operations    | `/docs/operations/context.md`     | GitHub Actions, releases         |
| Standards & Templates | `/docs/templates/context.md`      | ADDs, code templates             |
| Historical Decisions  | `/docs/retrospectives/context.md` | Past decisions, evolution        |

## Technical Stack

```yaml
frontend: "React 19.1 + TypeScript + Tailwind CSS + Shadcn/ui"
backend: "Rust + Tauri v2 + age-encryption"
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
4. **Bitcoin-Ready** - Optimized for seeds, keys, custody docs
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

- **Current Phase**: Alpha release with core functionality complete
- **Recent Achievement**: All three functional screens implemented and tested
- **Next Milestone**: Testing & QA (4.2.5) - Unit, integration, E2E, accessibility
- **Project Tracking**: `/docs/project-plan.md`

---

_This context system eliminates the 25-35 minute "context reconstruction tax". Operational in under 5 minutes._

**Last Updated**: January 2025 | **Version**: Post-core-architecture phase
