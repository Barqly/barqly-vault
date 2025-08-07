# Context Archive

**Purpose:** Historical context that may be referenced but is not immediately relevant to current development.

## Archive Organization

### Directory Structure
```
archive/
├── completed-sprints/    # Completed sprint contexts
├── completed-milestones/ # Completed milestone blueprints & contexts
├── decision-chains/      # Superseded technical decisions
├── superseded/          # Outdated documentation
└── ux-design-iterations/ # Historical UX design iterations
    ├── setup-screen/    # Setup screen design evolution
    ├── encrypt-screen/  # Encrypt screen design evolution
    └── decrypt-screen/  # Decrypt screen design evolution
```

## When to Archive

### From Current to Archive
Move context when:
- Sprint completes (after retrospective)
- Decision is superseded by new approach
- Priority changes significantly
- Information becomes outdated (>30 days)
- Milestone fully completes

### Archive Naming Convention
```
# Sprint contexts
sprints/YYYY-MM/sprint-{number}-{name}.md

# Decision records
decisions/YYYY-MM-DD-{decision-title}.md

# Milestone contexts
milestones/milestone-{number}-{name}.md
```

## When to Reference Archive

### Look in Archive for:
- Historical decision rationale
- Previous implementation attempts
- Lessons learned from past sprints
- Pattern evolution over time
- Root cause of current constraints

### Don't Use Archive for:
- Current development guidance
- Active technical decisions
- Present sprint priorities
- Current known issues
- Active workflow instructions

## Archive Management

### Archiving Process
1. Complete sprint/milestone retrospective
2. Move relevant files from `/current/` to `/archive/`
3. Update archive index (this file)
4. Create new current context for next sprint

### Archive Retention
- **Sprints**: Keep for 6 months
- **Decisions**: Keep indefinitely (learning value)
- **Milestones**: Keep indefinitely (project history)

## Current Archive Contents

### Completed Milestones (August 2025)
- **7 milestone blueprints** archived with implementation references
- See `/completed-milestones/README.md` for implementation locations

### UX Design Iterations (August 2025)
- **Setup Screen**: 14 iteration documents from initial requirements to final spec
- **Encrypt Screen**: 4 iteration documents tracking design evolution
- **Decrypt Screen**: 4 iteration documents including backend requirements
- All iterations preserved for design decision traceability

### Recent Sprints
*Active development - sprints not yet formalized*

### Superseded Decisions
*All technical decisions currently active*

## Search Tips

### Finding Historical Context
```bash
# Search all archive files
grep -r "search term" docs/context/archive/

# Find by date
find docs/context/archive -name "*2024-12*"

# List all decision records
ls docs/context/archive/decisions/
```

### Cross-Reference Points
- Retrospectives: `/docs/retrospectives/`
- Full project history: `/docs/project-plan.md`
- Architecture decisions: `/docs/architecture/`

## Archive Index

### Quick Links to Key Archives
*This section will be populated as content is archived*

<!-- Example format:
### December 2024
- [Sprint 15 - Encryption Refactor](sprints/2024-12/sprint-15-encryption.md)
- [Decision - Cache Strategy](decisions/2024-12-15-cache-strategy.md)

### Milestone Archives
- [Milestone 2 - Core Modules](milestones/milestone-2-core-modules.md)
-->

## Guidelines for Archival

### What Makes Good Archive Content
- Complete context with beginning and end
- Decisions with full rationale
- Lessons learned clearly stated
- References to related documents
- Date stamps and version info

### What Shouldn't Be Archived
- Work in progress
- Temporary notes
- Duplicate information
- Outdated without learning value
- Personal development notes

## Future Archive Structure

As the project grows, consider:
- Quarterly rollups of sprint contexts
- Annual decision summaries
- Major version transition guides
- Performance benchmark history
- Security audit records

---

*Archive updated: 2025-08-07*  
*Next review: After next major milestone completion*