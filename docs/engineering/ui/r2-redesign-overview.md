# Barqly Vault R2 UI Redesign Overview

**Purpose:** Central context document for week-long R2 UI redesign effort
**Timeline:** ~1 week iterative implementation
**Status:** Phase 0 - Foundation Setup

---

## Core Principles

### 1. Minimalist Aesthetic
- Clean, uncluttered interface inspired by Sparrow Wallet
- Focus on essential information
- Progressive disclosure for advanced features
- No scrollbars, maximize screen real estate

### 2. Cache-First Architecture
- Instant performance through VaultContext global cache
- Synchronous UI updates, async backend persistence
- No loading spinners for navigation
- See: `/docs/engineering/refactoring/ui/cache-first-architecture.md`

### 3. Component-Level Thinking
- Single source of truth for state
- Atomic updates prevent flickering
- Components < 150-200 LOC
- Workflow hooks for complex logic

### 4. Recovery-First Design
- Recovery integrated into normal flows (not separate mode)
- Encrypted bundles include manifest + keys
- "Newer wins" conflict resolution
- Guided discovery for unknown vaults

---

## Architecture Decisions

### State Management
- **VaultContext:** Global vault/key cache (existing)
- **UIContext:** UI preferences (new - sidebar, theme)
- **Workflow Hooks:** Screen-specific logic (existing pattern)
- No external state libraries (keep React built-in)

### Navigation Structure
- Collapsible left sidebar (Sparrow-inspired)
- Top bar for status indicators
- Vault Hub as default landing
- Quick access to all screens

### Component Hierarchy
```
src-ui/src/
├── hooks/              # Workflow hooks
├── contexts/           # Global state
├── components/
│   ├── common/        # Shared (UniversalHeader)
│   ├── layout/        # Containers (Sidebar, AppContainer)
│   ├── ui/            # Reusable (Cards, Buttons)
│   └── [feature]/     # Feature-specific
└── pages/             # Screen components
```

### Backend Integration
- All commands through `bindings.ts`
- Respect: UI → Commands → Manager → Service
- No direct backend calls
- Run `make generate-bindings` for type updates

---

## Visual Design System

### Color Tokens
Based on `/docs/architecture/frontend/ui-color-token-map.md`:
- **Primary:** Blue-600 (#2563EB) for CTAs and active states
- **Neutrals:** Slate palette for text and borders
- **Badges:** Green (passphrase), Purple (YubiKey)
- **Background:** Gradient from gray-50 to white

### Typography
- **Headings:** slate-800, font-semibold
- **Body:** slate-700
- **Secondary:** slate-500
- **Icons:** slate-400 (muted), blue-600 (active)

### Layout Patterns
- Max width: 960px (AppPrimaryContainer)
- Consistent spacing: space-y-6
- Button placement: Secondary left, Primary right
- Progressive cards for multi-step flows

---

## Implementation Phases

### Phase 0: Foundation ✅ (In Progress)
- Documentation structure
- Dependency audit
- Component backups

### Phase 1: Navigation
- Collapsible sidebar
- Status indicators
- UIContext for preferences

### Phase 2: Manage Keys
- Card-based UI (table as advanced)
- Inline management
- YubiKey detection

### Phase 3: Vault Hub
- Visual vault cards
- Inline creation
- Drag-to-attach keys

### Phase 4: Encrypt + Recovery
- Bundle manifest/keys
- Recovery info panel
- Visual confirmation

### Phase 5: Decrypt + Recovery
- Auto-detect unknown vaults
- Key discovery flow
- Manifest restoration

### Phase 6: Polish
- Apply color tokens
- Dark mode support
- Keyboard navigation
- Error/empty states

---

## Key Features

### Vault-Centric Architecture
- Vaults as primary containers
- Many-to-many vault-key relationships
- Up to 4 keys per vault (1 passphrase + 3 YubiKeys)
- Keys exist independently

### Recovery Features
- Encrypted bundles include everything needed
- Automatic manifest restoration
- Key discovery assistance
- No separate recovery mode

### Performance Optimizations
- Cache-first reads (instant)
- Explicit mutations only
- Synchronous state updates
- No auto-refresh effects

---

## Development Guidelines

### Code Quality
- Components < 150-200 LOC
- Extract sub-components when needed
- Use workflow hooks for state
- Backup before refactoring

### Testing Strategy
- Use `--no-verify` during development
- Disable failing tests temporarily
- Manual testing after each phase
- Full validation before release

### Documentation
- Update phase plans after completion
- Daily handoff documents
- Track decisions and blockers
- Maintain this overview current

---

## Session Context Management

### Daily Workflow
1. **Morning:** Read previous handoff doc
2. **Work:** Implement phase tasks
3. **Evening:** Create handoff with:
   - Completed items
   - Current blockers
   - Next steps
   - Key decisions
   - Files changed

### Context Documents
- This overview (always current)
- Phase-specific plans
- Daily handoffs in `/daily/`
- Architecture docs for reference

### Commands for Continuity
- `/ssd` - Create detailed session snapshot
- `/ssc` - Create quick transition summary
- `/ssn` - Resume from previous session

---

## Current Status

**Phase:** 0 - Foundation Setup
**Date Started:** 2025-10-08
**Current Task:** Creating documentation structure
**Next:** Dependency audit and backups

**Recent Decisions:**
- Use collapsible sidebar (Sparrow-inspired)
- Keep workflow hooks pattern
- Skip simple/advanced toggle
- Recovery integrated in normal flows

---

## References

- `/docs/engineering/refactoring/ui/cache-first-architecture.md`
- `/docs/engineering/refactoring/ui/refactoring-guidelines.md`
- `/docs/architecture/frontend/ui-color-token-map.md`
- `/docs/architecture/frontend/api-interfaces-backend.md`
- `/docs/engineering/refactoring/centralized-architecture-design.md`

---

_This document is the source of truth for R2 UI redesign. Update after each phase._