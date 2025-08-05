# context-usage.ai.md

*Agent-optimized context system reference*

## Context Loading Order
```yaml
fresh_start:
  1_read: "/context.md"                    # 2 min - project overview
  2_identify: "task domain"                # architecture|product|engineering|operations
  3_read: "/docs/{domain}/context.md"      # 3-5 min - domain specific
  4_start: "working"                       # sufficient context achieved
```

## File Navigation Map
```yaml
contexts:
  master: "/context.md"
  architecture: "/docs/architecture/context.md"
  product: "/docs/product/context.md"
  engineering: "/docs/engineering/context.md"
  operations: "/docs/operations/context.md"
  
active_work:
  current_sprint: "/docs/context/current/active-sprint.md"
  priorities: "/docs/context/current/immediate-priorities.md"
  blockers: "/docs/context/current/known-issues.md"
  recent: "/docs/context/current/recent-decisions.md"

detailed_specs:
  security: "/docs/common/security-foundations.md"
  quality: "/docs/common/quality-standards.md"  
  tech_decisions: "/docs/architecture/technology-decisions.md"
  api_reference: "/docs/engineering/api-reference.md"
```

## Update Triggers
```yaml
immediate_updates:
  - sprint_completion
  - major_architecture_decision
  - blocking_issue_discovered
  - milestone_completed

daily_updates:
  - task_progress
  - priority_changes
  - handoff_preparation

weekly_updates:
  - archive_completed_work
  - accuracy_review
  - evolution_documentation
```

## Agent-Specific Patterns

### ZenMaster
```yaml
primary_files: ["/context.md", "/docs/project-plan.md", "all domain contexts"]
update_responsibility: ["master context", "coordinate domain updates", "archive sprints"]
```

### System Architect  
```yaml
primary_files: ["/docs/architecture/context.md", "technology-decisions.md", "ADDs"]
update_responsibility: ["architecture context", "decision documentation", "tech stack"]
```

### Engineers
```yaml
primary_files: ["/docs/engineering/context.md", "api-reference.md", "quality-standards.md"]
update_responsibility: ["implementation status", "api docs", "known issues"]
```

### Product Owner
```yaml
primary_files: ["/docs/product/context.md", "user-journey.md", "roadmap.md"]
update_responsibility: ["feature specs", "requirements", "roadmap progress"]
```

## Context Update Protocol
```yaml
update_format:
  agent: "{agent_type}"
  timestamp: "ISO-8601"
  file: "{filepath}"
  changes: ["bullet points"]
  rationale: "one line why"
  impact: ["affected areas"]
```

## Archival Rules
```yaml
archive_when:
  - sprint_completed
  - decision_superseded
  - feature_deprecated
  
archive_location:
  sprints: "/docs/context/archive/completed-sprints/{year}-q{quarter}-sprint-{number}/"
  decisions: "/docs/context/evolution/decision-chains/{feature}.md"
  deprecated: "/docs/context/archive/superseded/{original-name}-{date}.md"
```

## Evolution Chain Template
```yaml
evolution_chain:
  current_state:
    description: "active implementation"
    location: "file path"
    
  history:
    - version: "v1"
      approach: "what was tried"
      superseded_because: "why changed"
      
  key_decisions:
    - decision: "what was decided"
      rationale: "why decided"
      
  preserved_knowledge:
    - "still relevant insights"
```

## Quick Commands
```bash
# Find all contexts
find docs -name "context.md" -type f

# Check freshness
grep -r "Last Updated" docs/*/context.md

# Archive sprint
mv docs/context/current/active-sprint.md docs/context/archive/completed-sprints/

# Update context  
git add docs/context/ && git commit -m "docs(context): {update description}"
```

## Context Quality Metrics
```yaml
freshness:
  master_context: "weekly update required"
  domain_context: "sprint update required"
  current_work: "daily update required"
  
accuracy:
  documented_vs_actual: ">95% alignment"
  update_lag: "<24 hours"
  
efficiency:
  context_load_time: "<2 minutes"
  handoff_success_rate: ">90%"
```