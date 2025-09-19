# Session Checkpoint - Mid-Session Snapshot

Create a checkpoint to preserve progress without ending the session, optimized for agent handoffs.

## Instructions

Create a checkpoint file with optional target agent specification: `{ARG}`

## Step 1: Parse Target Agent (if provided)

If `{ARG}` is provided, set as Target Agent using these mappings:
- `sbe` → sr-backend-engineer
- `jbe` → jr-backend-engineer  
- `sfe` → sr-frontend-engineer
- `jfe` → jr-frontend-engineer
- `sa` or `arch` → system-architect
- `po` → product-owner
- `zm` or `zen` → zenmaster
- `re` → research-engineer
- `devops` or `do` → devops-engineer
- `ux` or `uxd` → ux-designer
- `qa` → qa-engineer
- Full agent names also work

If `{ARG}` is empty, set Target Agent as "N/A" (normal checkpoint)

## Step 2: Create Checkpoint File

1. **Filename Format**: `ssc{DD}{MM}.{n}.md` where:
   - DD = current day of month (01-31)
   - MM = current month (01-12)
   - n = counter starting at 1. Check if file exists. If yes, increment to 2, 3, etc. NEVER overwrite existing files.

2. **Location**: Save in `./tbd/` folder (create if it doesn't exist)

## Template

```markdown
# Session Checkpoint #{n}
**Date:** [Current system timestamp]
**File:** ssc{DD}{MM}.{n}.md
**Session Status:** In Progress
**Current Agent:** [Agent who created this checkpoint]
**Target Agent:** [{ARG} if provided, otherwise "N/A"]

## ✅ Completed So Far
- [What's been accomplished since session start or last checkpoint]
- [Include specific problems solved]
- [Files successfully modified]

## 🚧 Currently Working On
[What we're in the middle of right now - the active task]

## 🔄 Handoff Context (if Target Agent specified)
### What {ARG} Needs to Know:
- [Specific requirements or constraints for target agent]
- [Decisions that affect their work]
- [Dependencies or blockers]

### Requested Actions for {ARG}:
1. [Specific task 1 for target agent]
2. [Specific task 2 for target agent]
3. [Specific task 3 for target agent]

### Interface Contracts:
```typescript
// Any API contracts or interfaces defined
```

## 📝 Working Notes
- [Important observations made]
- [Key decisions taken]
- [Patterns identified]
- [Things that work/don't work]

## 💾 Code State
### Current Working Code:
```
[The current version that's working or being tested]
```

### Placeholder Code Needing Implementation:
```
// Code with TODO comments for target agent
// @{ARG}: implement this endpoint
// @{ARG}: add error handling here
```

### Next Modification Planned:
[What we're about to try next]

## ⚠️ Watch Out For
- [Any gotchas discovered]
- [Things to remember]
- [Constraints identified]

## 🔖 Resume Point
**To continue from here:** [Specific instruction on where/how to resume]
**For agent handoff:** "@{ARG} read tbd/ssc{DD}{MM}.{n}.md"
**Context needed:** [What the agent needs to know to continue]
**Next command to run:** [If applicable]
```

## Step 3: Display Confirmation

After creating checkpoint:

If Target Agent specified:
```
✅ Handoff checkpoint created: tbd/ssc{DD}{MM}.{n}.md
🎯 Target: {ARG}
📋 Quick handoff: "@{ARG} read tbd/ssc{DD}{MM}.{n}.md"
```

If no Target Agent:
```
✅ Checkpoint saved: tbd/ssc{DD}{MM}.{n}.md
Work continues...
```

## Usage Examples

### Normal checkpoint:
`/ssc` - Saves progress, no target agent

### Agent handoff:
- `/ssc sbe` - Checkpoint for sr-backend-engineer
- `/ssc jfe` - Checkpoint for jr-frontend-engineer
- `/ssc sa` - Checkpoint for system-architect
- `/ssc ux` - Checkpoint for ux-designer

### Workflow:
1. Frontend completes work: `/ssc sbe`
2. Outputs: "@sr-backend-engineer read tbd/ssc1312.1.md"
3. Backend loads only relevant context from file

## Execution

1. Parse `{ARG}` for target agent
2. If handoff, focus checkpoint on what target agent needs
3. Keep brief but include all handoff requirements
4. Mark code needing attention with @{target-agent} comments
5. Include interface contracts for coordination
6. Show quick handoff command for easy copy-paste

This avoids verbose in-chat explanations and preserves context efficiently.