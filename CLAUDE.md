# CLAUDE.md

_Agent-specific guidance for Claude Code_

## Quick Agent Onboarding

1. **Start Here** → `/context.md` (2-minute project overview)
2. **Find Commands** → `/docs/common/tools.ai.md` (agent-optimized command patterns)
3. **Domain Deep Dive** → `/docs/[domain]/context.md` based on your task

## Critical Agent Rules
### Backward compatibility
- Unless otherwise asked, do not create any backward compability code as a shortcut to make the things work! It's a form of technical debt!
- Unless it is part of a standard design pattern, do not create files like V2, enhanced, adapter etc for patch work which introduce more bug, more tech debt, and maintainability issues in the code.

### Before ANY Coding Task

**MANDATORY**: Read `/docs/architecture/context.md` for tech stack, check existing patterns with `rg`, then WebFetch official docs if unclear or working on any bug fix.

### Before ANY Commit

```bash
make validate  # MUST PASS - mirrors CI exactly
```

### Speed Optimization

- Frontend changes only: `make validate-ui` (~30s)
- Backend changes only: `make validate-rust` (~1-2min)
- Mixed changes: Use full `make validate`

## Navigation Map

| Working On             | Go To                                              |
| ---------------------- | -------------------------------------------------- |
| Architecture decisions | `/docs/architecture/context.md`                    |
| Frontend/Backend code  | `/docs/engineering/context.md`                     |
| UI/UX design           | `/docs/product/context.md`                         |
| Commands & workflows   | `/docs/context/foundation/development-workflow.md` |
| Security requirements  | `/docs/common/security-foundations.md`             |
| Quality standards      | `/docs/common/quality-standards.md`                |
| Context usage          | `/docs/common/context-usage.ai.md`                 |

## Agent-Specific Patterns

### Generate TypeScript Types
- Read docs/common/api-command-registration.md for command registration process
- Must register new commands in both collect_commands! and tauri::generate_handler! macros

### Debug Mode

```bash
RUST_LOG=debug cargo tauri dev
```

## Context Maintenance

**⚠️ CRITICAL: Tasks are NOT complete until documentation is updated!**

See `/docs/common/definition-of-done.md` for MANDATORY updates:

1. Update `/docs/project-plan.md` - mark items complete
2. Update `/docs/context/current/*` - document decisions & completions
3. Update relevant `/docs/{domain}/context.md` based on work type
4. Commit with notes about documentation updates

---

_This lean guide eliminates duplication. All detailed information lives in the context system._
