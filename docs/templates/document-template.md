# Document Template

This template supports the ZenAI document lifecycle and context management system. Use the appropriate version based on your needs.

## Quick Reference

**Document States**: `draft` → `active` → `superseded` → `archived`
**Update Frequency**: `always`, `often`, `rarely`, `never`

---

## Minimal Header (For Existing Documents)

When updating an existing document during natural work, add only this header:

```markdown
---
status: active
updated: 2025-01-03
context: /project/feature-x
---

[existing content continues...]
```

---

## Full Template (For New Documents)

Use this complete template when creating new documents:

```markdown
---
# Required Metadata
status: draft              # draft | active | superseded | archived
type: guide               # guide | spec | decision | reference | procedure
created: 2025-01-03
updated: 2025-01-03
author: zenmaster

# Context Management
context: /project/feature-x    # Primary context path
related:                        # Related contexts (optional)
  - /architecture/patterns
  - /decisions/adr-042
supersedes: null               # Document this replaces (if any)
superseded_by: null            # Document that replaces this (if any)

# Maintenance Hints
update_frequency: often        # always | often | rarely | never
expires: null                  # Optional expiration date
tags: [encryption, security]  # Searchable tags
---

# Document Title

## Purpose
[One paragraph explaining why this document exists and what problem it solves]

## Status
**Current State**: Draft  
**Last Review**: 2025-01-03  
**Next Review**: 2025-02-03 (if applicable)

## Content

### Main Section
[Primary content goes here]

### Implementation Details
[Specific details, code examples, configurations]

## References

### Internal Documents
- [Related Document 1](../path/to/doc1.md) - Brief description
- [Related Document 2](../path/to/doc2.md) - Brief description

### External Resources
- [External Resource](https://example.com) - Why it's relevant

## History

### Change Log
- 2025-01-03: Initial draft created (author)
- [Future changes will be listed here]

### Migration Notes
[If this document replaces or consolidates others, note it here]
```

---

## Usage Guidelines

### When to Use Minimal Header
- Touching existing documents during regular work
- Making minor updates or corrections
- Documents not yet in the lifecycle system
- Quick fixes that don't warrant full migration

### When to Use Full Template
- Creating new documents from scratch
- Major rewrites or consolidations
- Establishing new architectural decisions
- Documents that will be frequently referenced

### Status Transitions

#### draft → active
- Content is complete and reviewed
- All placeholders filled in
- Ready for team consumption

#### active → superseded
- Newer document available
- Update `superseded_by` field
- Keep for historical reference

#### active → archived
- No longer relevant
- Technology deprecated
- Decision reversed

### Context Path Guidelines

Context paths follow the hierarchy in Context.md:
- `/project/*` - Project-specific contexts
- `/architecture/*` - System design contexts
- `/implementation/*` - Code-level contexts
- `/operations/*` - Runtime contexts
- `/decisions/*` - ADRs and design decisions

### Update Frequency Guide

- **always**: Living documents, updated with each relevant change
- **often**: Updated during sprints or major features
- **rarely**: Stable references, updated only when necessary
- **never**: Historical records, frozen in time

### Integration with Context.md

Documents using this template automatically integrate with the context system:
1. The `context` field links to the relevant Context.md section
2. Context.md references back to documents in its scope
3. Related contexts create a navigation graph
4. Tags enable cross-cutting concerns

### Migration Strategy Support

This template supports gradual migration:
1. Start with minimal headers on touched documents
2. Upgrade to full template when substantial changes needed
3. Track migration progress through status fields
4. Use supersedes/superseded_by for document evolution

---

## Examples

### Example 1: Minimal Header for Quick Update
```markdown
---
status: active
updated: 2025-01-03
context: /implementation/crypto
---

# Encryption Implementation Guide
[existing content...]
```

### Example 2: New Architecture Decision
```markdown
---
status: draft
type: decision
created: 2025-01-03
updated: 2025-01-03
author: system-architect
context: /decisions/adr-042
related:
  - /architecture/security
  - /implementation/crypto
update_frequency: rarely
tags: [architecture, security, encryption]
---

# ADR-042: Age Encryption for File Protection
[content...]
```

### Example 3: Living Configuration Document
```markdown
---
status: active
type: guide
created: 2025-01-01
updated: 2025-01-03
author: devops-engineer
context: /operations/deployment
update_frequency: always
tags: [deployment, ci-cd, configuration]
---

# Deployment Configuration Guide
[frequently updated content...]
```

---

## Automation Support

### VSCode Snippet
Add to `.vscode/project.code-snippets`:
```json
{
  "ZenAI Document Header": {
    "prefix": "docheader",
    "body": [
      "---",
      "status: ${1|draft,active|}",
      "updated: $CURRENT_YEAR-$CURRENT_MONTH-$CURRENT_DATE",
      "context: ${2:/project/}",
      "---",
      "",
      "$0"
    ]
  }
}
```

### Pre-commit Hook
Documents can be validated for required headers using git hooks (future implementation).

---

## Notes

- This template is designed to be lightweight enough for regular use
- Metadata fields are optional beyond the minimal set
- The template evolves with team needs
- Focus is on practical value, not bureaucracy
- Git history provides detailed change tracking; document history is for major milestones