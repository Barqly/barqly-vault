# Session Checkpoint - Mid-Session Snapshot

Create a checkpoint to preserve progress without ending the session.

## Instructions

Create a checkpoint file with the following specifications:

1. **Filename Format**: `ssc{DD}{MM}.{n}.md` where:
   - DD = day of month (01-31)
   - MM = month (01-12)
   - n = counter (1, 2, 3...) for multiple checkpoints in a day

2. **Location**: Save in `./tbd/` folder (create if it doesn't exist)

3. **Purpose**: Save progress mid-session to prevent context loss, create restore points during complex work

## Template

```markdown
# Session Checkpoint #{n}
**Date:** [Timestamp]
**File:** ssc{DD}{MM}.{n}.md
**Session Status:** In Progress

## ✅ Completed So Far
- [What's been accomplished since session start or last checkpoint]
- [Include specific problems solved]
- [Files successfully modified]

## 🚧 Currently Working On
[What we're in the middle of right now - the active task]

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

### Next Modification Planned:
[What we're about to try next]

## ⚠️ Watch Out For
- [Any gotchas discovered]
- [Things to remember]
- [Constraints identified]

## 🔖 Resume Point
**To continue from here:** [Specific instruction on where/how to resume]
**Context needed:** [What Claude needs to know to continue]
**Next command to run:** [If applicable]
```

## Execution

When creating the checkpoint:
1. This is a CHECKPOINT, not a full summary
2. Keep it brief - just enough to resume work if interrupted
3. Focus on STATE rather than history
4. Include only the most recent/relevant code
5. Can create multiple checkpoints in one session
6. Each checkpoint is a snapshot at that moment in time

After creating, show the file path and confirm checkpoint saved. Remind that work continues without interruption.