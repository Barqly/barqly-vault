# Definition of Done

*Mandatory completion checklist for ALL tasks - enforced by agents and humans*

## CRITICAL: No Task is Complete Until Documentation is Updated

### 🔴 MANDATORY UPDATES (Every Task)

```yaml
required_updates:
  1_project_status:
    file: "/docs/project-plan.md"
    action: "Mark completed items with [x], update progress percentages"
    
  2_context_current:
    files:
      - "/docs/context/current/active-sprint.md"
      - "/docs/context/current/recent-decisions.md"
    action: "Add completed work, decisions made, approaches taken"
    
  3_master_context:
    file: "/context.md"
    action: "Update 'Current State' or 'Active Development' if significant"
    
  4_domain_context:
    file: "/docs/{domain}/context.md"
    action: "Update based on work domain (architecture/engineering/product)"
```

### 📋 Task Completion Protocol

```bash
# STEP 1: Complete the actual work
make validate  # Must pass

# STEP 2: Update project tracking
git diff docs/project-plan.md  # Show what tasks were completed

# STEP 3: Update context files
git diff docs/context/current/  # Show context updates

# STEP 4: Commit with proper message
git add -A
git commit -m "feat/fix/docs(scope): description

- Updated project-plan.md: marked X.Y.Z complete
- Updated active-sprint.md: added completion notes
- Updated {domain}/context.md: documented approach"
```

### 🤖 Agent Self-Verification Commands

```yaml
validate_documentation:
  check_project_plan:
    command: "grep -c '\\[x\\]' docs/project-plan.md"
    expectation: "Count should increase after task"
    
  check_recent_updates:
    command: "git diff --name-only docs/context/current/"
    expectation: "Should show modified files"
    
  check_commit_message:
    command: "git log -1 --pretty=%B | grep -c 'Updated'"
    expectation: "Should mention documentation updates"
```

### 📊 Update Triggers by Task Type

| Task Type | Required Updates | Optional Updates |
|-----------|-----------------|------------------|
| **Feature Implementation** | project-plan.md, active-sprint.md, engineering/context.md | architecture/technology-decisions.md |
| **Bug Fix** | known-issues.md, recent-decisions.md | retrospectives/ |
| **Architecture Change** | architecture/context.md, technology-decisions.md, ADDs | security-foundations.md |
| **Testing** | project-plan.md, quality-standards.md | test-strategy.md |
| **Documentation** | context.md, relevant domain contexts | all affected docs |
| **Refactoring** | recent-decisions.md, engineering/context.md | architecture/context.md |

### 🔄 Context Update Examples

#### After Implementing a Feature:
```markdown
# In /docs/context/current/active-sprint.md
## Completed This Sprint
- ✅ Implemented batch file encryption (2025-01-15)
  - Added parallel processing for multiple files
  - Performance: 10x improvement for >10 files
  - See: src-tauri/src/commands/batch.rs

# In /docs/engineering/context.md
## Recent Implementations
### Batch Operations (January 2025)
- Parallel encryption using Rayon
- Memory-efficient streaming for large files
- Progress tracking with debounced updates
```

#### After Fixing a Bug:
```markdown
# In /docs/context/current/known-issues.md
## Resolved Issues
- ~~File selection fails on Windows with spaces in path~~ (Fixed 2025-01-15)
  - Root cause: Improper path escaping
  - Solution: Added proper Windows path handling
  - Test: Added regression test in file_ops_test.rs
```

### 🚨 Enforcement Rules

1. **CI/CD Integration** (Future):
   ```yaml
   - name: Check Documentation Updates
     run: |
       if ! git diff --name-only | grep -E "docs/.*\.md|context\.md"; then
         echo "ERROR: No documentation updates found"
         exit 1
       fi
   ```

2. **Pre-commit Hook**:
   ```bash
   # Already enforced via make validate
   # Add documentation check to validation
   ```

3. **Agent Reminder**:
   ```yaml
   agent_instruction: |
     BEFORE marking any task complete:
     1. Run: make validate
     2. Update: docs/project-plan.md
     3. Update: docs/context/current/*
     4. Update: domain context.md
     5. Commit with documentation notes
   ```

### 📝 Documentation Quality Checklist

- [ ] **Accuracy**: Updates reflect actual changes made
- [ ] **Completeness**: All affected areas documented
- [ ] **Clarity**: Future agents can understand decisions
- [ ] **Timeliness**: Updated immediately, not batched
- [ ] **Searchability**: Use consistent terminology
- [ ] **Traceability**: Link to code files/commits

### 🔍 Verification Questions for Agents

Before closing any task, answer:
1. Did I update project-plan.md with completed items?
2. Did I update the current sprint status?
3. Did I document any decisions or trade-offs?
4. Did I update the relevant domain context?
5. Did I archive completed/obsolete information?
6. Can a new agent understand what I did from the docs?

### 🎯 Success Metrics

```yaml
documentation_health:
  context_freshness: "< 24 hours old"
  project_plan_accuracy: "> 95% up-to-date"
  decision_documentation: "100% of significant choices"
  handoff_success_rate: "> 90% without clarification"
```

### ⚡ Quick Reference for Common Updates

```bash
# After feature work
echo "- ✅ Implemented [feature] ($(date +%Y-%m-%d))" >> docs/context/current/active-sprint.md

# After bug fix
sed -i '' 's/\[ \]/\[x\]/' docs/project-plan.md  # Mark complete

# After architecture decision
echo "## Decision: [Title]" >> docs/architecture/decisions/$(date +%Y%m%d)-decision.md

# Archive old sprint
mv docs/context/current/active-sprint.md docs/context/archive/completed-sprints/
```

---

**REMEMBER**: A task without updated documentation is an INCOMPLETE task. The context system only works if EVERY agent maintains it.