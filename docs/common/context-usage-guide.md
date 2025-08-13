# Context Usage Guide

_Practical instructions for using and maintaining the Barqly Vault context management system_

## Quick Onboarding: Your First 5 Minutes

### For AI Agents Starting Fresh

1. **Read `/context.md`** (2 minutes) - Get project overview and current state
2. **Identify your task domain** - Architecture, Product, Engineering, Operations, etc.
3. **Read domain context** at `/docs/[domain]/context.md` (2-3 minutes)
4. **Start working** - You now have sufficient context for productive work

### For Humans Starting New AI Chats

Share these files with your AI assistant based on the task:

**General Development:**

```
Please read: /context.md
```

**Domain-Specific Work:**

```
Please read: /context.md
Then read: /docs/engineering/context.md
```

**Complex Multi-Domain Work:**

```
Please read: /context.md
Primary focus: /docs/architecture/context.md
Also reference: /docs/engineering/context.md
```

## Understanding the Context System

### Three-Layer Architecture

**Layer 1: Master Context** (`/context.md`)

- 2-minute project orientation
- Current development state
- Navigation to specialized contexts
- Essential commands and workflows

**Layer 2: Domain Contexts** (`/docs/*/context.md`)

- Architecture, Product, Engineering, Operations, etc.
- 3-5 minute focused reading per domain
- Links to detailed specifications
- Domain-specific patterns and standards

**Layer 3: Detailed Documentation** (`/docs/*/`)

- Full specifications and designs
- Implementation details
- Historical decisions and rationale
- Referenced only when needed

### Context Directory Structure

```
barqly-vault/
├── context.md                    # Master entry point (START HERE)
├── CLAUDE.md                      # AI assistant instructions
├── docs/
│   ├── common/
│   │   ├── context-usage-guide.md    # This file
│   │   └── context-rituals-standards.md  # Strategy document
│   ├── architecture/
│   │   └── context.md            # Architecture domain context
│   ├── product/
│   │   └── context.md            # Product domain context
│   ├── engineering/
│   │   └── context.md            # Engineering domain context
│   ├── operations/
│   │   └── context.md            # Operations domain context
│   └── context/                  # Advanced infrastructure
│       ├── current/              # Active work tracking
│       ├── foundation/           # Core project knowledge
│       └── archive/              # Historical context
```

## Role-Specific Usage Patterns

### ZenMaster (Orchestration AI)

**Primary Contexts:**

- `/context.md` - Overall project state
- `/docs/project-plan.md` - Milestone tracking
- All domain contexts for cross-functional coordination

**Maintenance Responsibilities:**

- Update `/context.md` after major milestones
- Coordinate domain context updates with specialists
- Archive completed sprint information
- Maintain project-plan.md milestone status

### System Architect

**Primary Contexts:**

- `/docs/architecture/context.md` - Architecture patterns
- `/docs/architecture/technology-decisions.md` - Tech choices
- `/docs/common/security-foundations.md` - Security model

**Maintenance Responsibilities:**

- Update architecture context after design decisions
- Document ADDs in `/docs/architecture/decisions/`
- Maintain technology stack documentation
- Update security considerations

### Frontend/Backend Engineers

**Primary Contexts:**

- `/docs/engineering/context.md` - Development patterns
- `/docs/common/quality-standards.md` - Code standards
- API documentation and interfaces

**Maintenance Responsibilities:**

- Update implementation status in domain context
- Document new patterns or utilities
- Maintain API documentation
- Update known issues and workarounds

### Product Owner

**Primary Contexts:**

- `/docs/product/context.md` - Features and requirements
- `/docs/product/user-journey.md` - User workflows
- `/docs/product/roadmap.md` - Product planning

**Maintenance Responsibilities:**

- Update feature specifications
- Maintain requirements documentation
- Update roadmap based on progress
- Document user feedback and iterations

### UX Designer

**Primary Contexts:**

- `/docs/product/ux-design/` - Design specifications
- `/docs/product/user-personas.md` - User profiles
- Component mockups and wireframes

**Maintenance Responsibilities:**

- Update design specifications
- Document design decisions and rationale
- Maintain component library documentation
- Archive superseded designs with evolution notes

### QA Engineer

**Primary Contexts:**

- `/docs/engineering/context.md` - Testing approach
- `/docs/common/quality-standards.md` - Quality gates
- Test plans and coverage reports

**Maintenance Responsibilities:**

- Update test coverage information
- Document known issues and bugs
- Maintain test plan documentation
- Update regression test suites

## When to Update Context Files

### Immediate Updates (Same Day)

- **Sprint completion** - Move items from active to completed
- **Major decisions** - Architecture changes, technology choices
- **Blocking issues** - New critical bugs or impediments
- **Milestone completion** - Update project state and progress

### Daily Updates

- **Active work status** - Progress on current tasks
- **Priority changes** - Reordering of immediate work
- **New discoveries** - Important findings affecting approach
- **Handoff preparation** - Context for agent transitions

### Weekly Updates

- **Sprint planning** - New sprint goals and tasks
- **Retrospective insights** - Lessons learned and improvements
- **Documentation review** - Accuracy check and cleanup
- **Archive old content** - Move completed work to archives

### Sprint/Milestone Updates

- **Master context** - Overall project state and progress
- **Domain contexts** - Significant changes in each area
- **Project plan** - Milestone status and timeline updates
- **Evolution chains** - Document major decision progressions

## Best Practices

### Writing Effective Context

**DO:**

- Keep entries concise and scannable
- Use bullet points for quick consumption
- Include "why" not just "what"
- Date significant updates
- Link to detailed docs for depth
- Use clear section headers

**DON'T:**

- Duplicate detailed specifications
- Include implementation code
- Leave outdated information unmarked
- Create deep nesting (>3 levels)
- Mix current and historical without labels
- Forget to update after changes

### Context Hygiene

**Daily Rituals:**

1. Review `/docs/context/current/active-sprint.md`
2. Update task progress if changed
3. Flag any new blockers or issues
4. Prepare handoff context if needed

**Weekly Rituals:**

1. Archive completed sprint items
2. Update domain contexts with significant changes
3. Review and update priorities
4. Clean up outdated temporary notes

**Sprint Rituals:**

1. Full context accuracy review
2. Archive previous sprint artifacts
3. Update master context with state changes
4. Document lessons learned in retrospectives

### Making Context Updates

**For AI Agents:**

```markdown
## Context Update Proposal

**Agent:** Frontend Engineer
**Date:** 2025-01-28
**File:** /docs/engineering/context.md

**Changes:**

- Updated React Router from v6 to v7
- Added new useFileEncryption hook
- Marked setup screen as complete

**Rationale:**
Router upgrade required for new navigation features.
New hook centralizes encryption workflow logic.
Setup screen passed all acceptance criteria.

**Impact:**

- Other components may need router updates
- Encryption workflow now standardized
- QA can begin setup screen regression testing
```

**For Humans:**

1. Make changes directly to context files
2. Include date stamps for significant updates
3. Move old content to archives, don't delete
4. Update both master and domain contexts as needed
5. Commit with clear message: `docs(context): update engineering context for router v7 upgrade`

## Maintenance Procedures

### Daily Maintenance (5 minutes)

```bash
# 1. Check current work status
cat docs/context/current/active-sprint.md

# 2. Update any completed tasks
# Edit the file to move items from "In Progress" to "Completed"

# 3. Note any new blockers
# Add to docs/context/current/known-issues.md if critical

# 4. Commit if changes made
git add docs/context/
git commit -m "docs(context): daily status update"
```

### Weekly Maintenance (15 minutes)

```bash
# 1. Review all domain contexts
find docs -name "context.md" -type f

# 2. Archive completed work
# Move from current/ to archive/completed-sprints/

# 3. Update priorities
# Edit docs/context/current/immediate-priorities.md

# 4. Clean up stale information
# Mark outdated sections or move to archives

# 5. Update master context if needed
# Edit /context.md with significant state changes
```

### Sprint Maintenance (30 minutes)

```bash
# 1. Full context audit
# Compare documented state to actual project state

# 2. Update project plan
# Edit docs/project-plan.md with milestone progress

# 3. Archive sprint artifacts
mkdir -p docs/context/archive/completed-sprints/2025-q1-sprint-3
# Move completed sprint docs

# 4. Document evolution chains
# Create docs/context/evolution/decision-chains/[feature].md
# for major architectural decisions

# 5. Update all domain contexts
# Ensure each reflects current domain state

# 6. Create sprint retrospective
# Document in docs/retrospectives/
```

### Archival vs. Update Decision Tree

```
Is the information still actively needed?
├── YES → Update in place
│   └── Add timestamp and note changes
└── NO → Will it provide historical context?
    ├── YES → Archive with metadata
    │   ├── Move to appropriate archive folder
    │   ├── Add note about why superseded
    │   └── Link from evolution chain if applicable
    └── NO → Delete (rare - usually keep for history)
```

## Document Evolution Handling

### Creating Evolution Chains

When a feature or decision evolves significantly:

```markdown
# /docs/context/evolution/decision-chains/encryption-workflow.md

## Current State (Active)

Single-step encryption with automatic key selection

- Implementation: src-tauri/src/commands/encrypt.rs
- Specification: docs/architecture/encryption-design.md

## Evolution History

1. **v1: Manual key selection** (2024-11)
   - Required users to explicitly choose keys
   - Superseded: Too complex for non-technical users
2. **v2: Two-step with confirmation** (2024-12)
   - Added preview before encryption
   - Superseded: Unnecessary friction for small files
3. **v3: Smart auto-selection** (2025-01)
   - Auto-selects most recent key
   - Current: Balances security and usability

## Key Decisions

- Why auto-selection: 90% of users have single key
- Why keep manual option: Power users need control
- Why single step: Reduced time-to-encrypt by 60%

## Preserved Knowledge

- User research from v1 still guides error messages
- Performance benchmarks from v2 inform optimization
- Security review from all versions shapes current model
```

### Referencing Historical Context

```markdown
# In current documentation

The current encryption workflow uses smart key selection
(see [evolution history](../context/evolution/decision-chains/encryption-workflow.md)
for why we moved from manual selection).
```

## Troubleshooting

### Common Issues

**"Context feels out of date"**

- Run weekly maintenance procedure
- Check last update timestamps in files
- Compare with actual project state
- Update immediately if drift detected

**"Too much context to read"**

- Ensure using layer approach (master → domain → detail)
- Check if detailed specs are embedded instead of referenced
- Archive information not needed for current work
- Use domain contexts for focused work

**"Can't find historical decision"**

- Check `/docs/context/evolution/decision-chains/`
- Look in `/docs/retrospectives/` for milestone decisions
- Search archives at `/docs/context/archive/`
- Check ADDs at `/docs/architecture/decisions/`

**"Context conflicts between agents"**

- ZenMaster has authority to resolve conflicts
- Domain expert has authority within their domain
- Escalate to human Manager if unclear
- Document resolution in evolution chain

## Context Quality Checklist

### Before Starting Work

- [ ] Read appropriate context level (master/domain/detail)
- [ ] Check "Last Updated" timestamps
- [ ] Verify current sprint/priorities alignment
- [ ] Note any known issues or blockers

### During Work

- [ ] Update status as tasks progress
- [ ] Document significant decisions immediately
- [ ] Flag new blockers or issues discovered
- [ ] Prepare handoff context for transitions

### After Completing Work

- [ ] Update task status in context
- [ ] Document any new patterns or utilities
- [ ] Archive completed items appropriately
- [ ] Update domain context if significant changes
- [ ] Commit context updates with clear messages

## Advanced Topics

### Multi-Repository Projects

For projects spanning multiple repositories:

1. Maintain master context in primary repo
2. Create repo-specific contexts in each
3. Use references between repos
4. Synchronize during sprint planning

### Long-Running Projects

For projects over 6 months:

1. Quarterly context health audits
2. Annual archive consolidation
3. Evolution chain summaries
4. Context refactoring as needed

### Team Scaling

As team grows:

1. Assign domain context owners
2. Establish update protocols
3. Regular sync meetings
4. Automated freshness checks

## Summary

The context management system enables efficient AI-human collaboration by:

- **Reducing startup time** from 25+ minutes to <2 minutes
- **Maintaining accuracy** through regular updates
- **Preserving history** via intelligent archiving
- **Supporting handoffs** with structured context
- **Scaling naturally** with project growth

Remember: Context is a living system. Keep it current, concise, and correct.

---

_For the complete context management strategy and theory, see `/docs/common/context-rituals-standards.md`_
