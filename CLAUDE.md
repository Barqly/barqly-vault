# CLAUDE.md

*Agent-specific guidance for Claude Code*

## Quick Agent Onboarding

1. **Start Here** → `/context.md` (2-minute project overview)
2. **Find Commands** → `/docs/common/tools.ai.md` (agent-optimized command patterns)
3. **Domain Deep Dive** → `/docs/[domain]/context.md` based on your task

## Critical Agent Rules

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

| Working On | Go To |
|------------|-------|
| Architecture decisions | `/docs/architecture/context.md` |
| Frontend/Backend code | `/docs/engineering/context.md` |
| UI/UX design | `/docs/product/context.md` |
| Commands & workflows | `/docs/context/foundation/development-workflow.md` |
| Security requirements | `/docs/common/security-foundations.md` |
| Quality standards | `/docs/common/quality-standards.md` |
| Context usage | `/docs/common/context-usage.ai.md` |

## Agent-Specific Patterns

### Generate TypeScript Types
After adding new Tauri commands:
```bash
cd src-tauri && cargo build --features generate-types
```

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

*This lean guide eliminates duplication. All detailed information lives in the context system.*