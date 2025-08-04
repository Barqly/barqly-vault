# Barqly Vault - Master Context

*Your 2-minute orientation to the Bitcoin custody vault system*

## What This Is
**Barqly Vault** is a desktop application for secure file encryption, designed specifically for Bitcoin custody workflows. Think of it as a digital vault where private keys and sensitive documents are protected with military-grade encryption, all running locally on your machine.

**Core Mission**: Enable anyone to securely store Bitcoin keys and documents in under 90 seconds, with confidence that even decades later, they can recover their assets.

## Current State (January 2025)
- ✅ **Core encryption engine** - Age encryption with passphrase protection
- ✅ **Key management** - Generate, store, and manage encryption keys
- ✅ **File operations** - Encrypt files/folders into portable `.age` archives
- ✅ **Cross-platform** - macOS, Windows, Linux support via Tauri
- 🚧 **In progress** - Batch operations, key backup workflows
- 📋 **Next up** - Hardware wallet integration, cloud backup options

## Quick Start for AI Agents

### "I need to work on..."

**Architecture & System Design** → `/docs/architecture/context.md`
- Technology decisions, security model, component design
- Key doc: `/docs/architecture/technology-decisions.md`

**Features & User Experience** → `/docs/product/context.md`
- User journeys, feature specifications, roadmap
- Bitcoin custody workflows and requirements

**Code Implementation** → `/docs/engineering/context.md`
- Development patterns, testing strategies, code standards
- Frontend (React/TypeScript) and Backend (Rust/Tauri) guides

**CI/CD & Operations** → `/docs/operations/context.md`
- GitHub Actions, release process, monitoring
- Cross-platform build and distribution

**Standards & Templates** → `/docs/templates/context.md`
- ADDs, code templates, documentation formats
- Standardized patterns for consistency

**Team Learning** → `/docs/retrospectives/context.md`
- Past decisions, lessons learned, evolution history
- Why certain approaches were chosen or changed

## Technical Foundation

### Stack at a Glance
```
Frontend:  React 18 + TypeScript + Tailwind CSS + Shadcn/ui
Backend:   Rust + Tauri v2 + age-encryption
Testing:   Vitest (frontend) + Rust tests (backend)
Platform:  Desktop (macOS, Windows, Linux)
Security:  Age encryption, local-only, zero network dependency
```

### Project Structure
```
barqly-vault/
├── src-ui/          # React frontend
├── src-tauri/       # Rust backend
├── docs/            # Domain-organized documentation
├── scripts/         # Build and automation
└── context.md       # You are here
```

## Core Principles

1. **Security First** - Every decision prioritizes protecting user assets
2. **90-Second Goal** - Critical operations must be completable in 90 seconds
3. **Local-Only** - No mandatory network operations, user owns their data
4. **Bitcoin-Ready** - Optimized for seed phrases, private keys, custody docs
5. **Future-Proof** - Files encrypted today must be recoverable in 20+ years

## Development Workflow

### Essential Commands
```bash
# Before ANY commit - ensures CI will pass
make validate

# Quick validation by domain
make validate-ui     # Frontend only (~30s)
make validate-rust   # Backend only (~1-2min)

# Development
make ui             # Start frontend dev server
make app            # Start Tauri desktop app
```

### Quality Gates
Every change must pass:
1. **Type Safety** - TypeScript strict mode, Rust compiler
2. **Linting** - ESLint, Prettier, Clippy
3. **Testing** - Unit, integration, and smoke tests
4. **Security** - No exposed keys, memory zeroization
5. **Documentation** - ADDs for significant changes

## How to Use This Context System

### For Fresh AI Chats
1. Start with this document for orientation
2. Navigate to relevant domain context based on task
3. Reference specific documents as needed
4. Check `/docs/retrospectives/` for historical decisions

### For Ongoing Work
1. Update domain contexts as you make changes
2. Document decisions in ADDs (`/docs/architecture/decisions/`)
3. Keep this master context current with state changes
4. Add learnings to retrospectives after significant milestones

### For Context Reconstruction
If you lose context or start fresh:
1. Read this document (2 minutes)
2. Read relevant domain context (3-5 minutes)
3. You're ready to work - no 25-minute reconstruction needed

## Key Documents for Deep Dives

- **Security Model**: `/docs/common/security-foundations.md`
- **Quality Standards**: `/docs/common/quality-standards.md`
- **Tech Decisions**: `/docs/architecture/technology-decisions.md`
- **User Journey**: `/docs/product/user-journey.md`
- **API Reference**: `/docs/engineering/api-reference.md`

## Active Development Focus

**Current Sprint**: Enhancing batch operations and key backup workflows
**Next Milestone**: v1.0 release with complete Bitcoin custody workflow
**Long-term Vision**: Become the standard for self-custody key management
**Project Tracking**: See `/docs/project-plan.md` for detailed milestones and task status

## Need Help?

- **Development questions** → Check `/docs/engineering/context.md`
- **Architecture decisions** → See `/docs/architecture/context.md` and ADDs
- **Historical context** → Browse `/docs/retrospectives/context.md`
- **Standards & patterns** → Reference `/docs/templates/context.md`

---

*This context system is designed to eliminate the "context reconstruction tax" that typically costs 25-35 minutes per fresh chat. With this structure, you're operational in under 5 minutes.*

**Last Updated**: January 2025 | **Version**: Post-core-architecture phase