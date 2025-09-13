# Detailed Session Summary

Create a comprehensive session summary to preserve full context for complex sessions.

## Instructions

Create TWO files as specified below:

## File 1: Detailed Summary

1. **Filename Format**: `ssd{DD}{MM}.{n}.md` where:
   - DD = current day of month from system date (01-31)
   - MM = current month from system date (01-12)
   - n = counter starting at 1. Check if file exists. If yes, increment to 2, 3, etc. NEVER overwrite existing files.

2. **Location**: Save in `./tbd/` folder (create if it doesn't exist)

3. **Get Current Date**: Use system date/time for all timestamps, not cached or previous dates

### Detailed Summary Template:

```markdown
# Detailed Session Summary
**Date:** [Current system date and time - use actual current timestamp]
**File:** ssd{DD}{MM}.{n}.md
**Project:** [Project name]
**Duration:** [Approximate session length if known]

## 🎯 Primary Objective
[Comprehensive description of what we set out to accomplish]

## 📁 Files Modified/Referenced
### Modified Files:
- `[filepath]` - [What was changed and why]
- `[filepath]` - [What was changed and why]

### Referenced/Read Files:
- `[filepath]` - [Why it was relevant]
- `[filepath]` - [Why it was relevant]

## 🔍 Problem Statement
### Initial Issue:
[Detailed description of the original problem]
- Symptoms observed
- Error messages encountered
- Expected vs actual behavior

### Root Cause Analysis:
[If identified, explain what was actually causing the issue]
- Why it occurred
- How we discovered it
- Why it wasn't obvious initially

## ✅ Solutions Attempted
### Attempt 1: [Approach Name]
**Hypothesis:** [Why we thought this would work]
**Implementation:**
```
[Code tried]
```
**Result:** [What happened]
**Why it failed:** [If applicable]

### Attempt 2: [Approach Name]
**Hypothesis:** [Why we thought this would work]
**Implementation:**
```
[Code tried]
```
**Result:** [What happened]
**Why it failed:** [If applicable]

[Continue for all significant attempts]

## 🎉 Working Solution
### Final Implementation:
```
[Complete working code]
```

### Why It Works:
[Detailed explanation of why this solution resolves the issue]

### Trade-offs:
- [Any compromises made]
- [Performance considerations]
- [Maintainability aspects]

## 🔧 Current State
### Resolved Issues:
- [x] [Issue 1 - include brief solution]
- [x] [Issue 2 - include brief solution]
- [x] [Issue 3 - include brief solution]

### Pending Issues:
- [ ] [Issue 1 - include current status]
- [ ] [Issue 2 - include current status]

### Known Limitations:
- [Current limitations of the solution]
- [Edge cases not handled]

### Active Blockers:
- [What's preventing further progress]

## 💡 Observations & Insights
### Key Learnings:
- [Important technical insights gained]
- [Patterns discovered]
- [Better approaches identified]

### Gotchas Discovered:
- [Tricky issues others might encounter]
- [Non-obvious behaviors]
- [Documentation gaps found]

### User Preferences Noted:
- [Coding style preferences]
- [Workflow preferences]
- [Communication preferences]

## 🔄 Refactoring Opportunities
### High Priority:
1. **File:** `[filepath]`
   - **Issue:** [What needs improvement]
   - **Suggested Fix:** [How to improve it]
   - **Impact:** [Why it matters]

### Medium Priority:
1. **File:** `[filepath]`
   - **Issue:** [What needs improvement]
   - **Suggested Fix:** [How to improve it]

### Low Priority:
1. **File:** `[filepath]`
   - **Issue:** [What could be better]
   - **Suggested Fix:** [Nice to have improvement]

## 📝 Code Context
### Critical Configuration:
```
[Important config that must be preserved]
```

### Key Functions/Methods:
```
[Core logic that was developed or modified]
```

### Environment Setup:
```
[Dependencies, versions, environment variables]
```

### Test Cases:
```
[Any test cases written or test scenarios identified]
```

## 🚀 Next Steps
### Immediate (Next Session):
1. [First thing to tackle]
2. [Second priority]
3. [Third priority]

### Short-term (Next Few Sessions):
- [Broader goals]
- [Features to implement]

### Long-term Considerations:
- [Architectural improvements]
- [Technical debt to address]

## 🔗 Related Resources
### Previous Sessions:
- [Link to previous related summaries]

### External Documentation:
- [Relevant documentation URLs]
- [Stack Overflow threads referenced]
- [GitHub issues related]

### Internal Documentation:
- [Project docs updated or needing update]

## 💭 Additional Context
### Discussion Highlights:
[Important points from our conversation]

### Decision Rationale:
[Why certain approaches were chosen over others]

### Alternative Approaches Considered:
[Other valid approaches we discussed but didn't pursue]

## 🤖 Context for Claude
### Domain Understanding:
[Key domain concepts Claude learned]

### Technical Constraints:
[Constraints that affect solution options]

### Approaches That Don't Work:
[Dead ends to avoid in future sessions]

### Effective Patterns:
[Patterns that work well in this codebase]

### User's Development Workflow:
[How the user prefers to work]

---
*Detailed session summary completed*
*This summary contains full context for session handoff or continuation*
*To resume: Use /ssn command after /clear*
```

## File 2: Quick Start Summary

1. **Filename Format**: `ssd{DD}{MM}.{n}-quick.md` (use same date and counter as detailed summary)
2. **Location**: Save in `./tbd/` folder

### Quick Start Template:

```markdown
# Quick Start - Session Continuation
**Full Summary:** ssd{DD}{MM}.{n}.md
**Created:** [Current system timestamp]

## 🎯 Where We Left Off
[One sentence summary of current state]

## 🚀 Immediate Next Steps
1. [First concrete action]
2. [Second concrete action]
3. [Third concrete action]

## ⚠️ Critical Context
- [Most important thing to remember]
- [Key gotcha to avoid]
- [Current blocker if any]

## 📂 Active Files
- `[filepath]` - [current state/why important]
- `[filepath]` - [current state/why important]

## 💻 Last Working Code
```
[Last working implementation]
```

## 🔧 Next Code Change Planned
[What we were about to implement]
```

## Execution

When this command is executed:

1. **CHECK SYSTEM DATE**: Get the current date from the system (not from memory or previous context)
2. **CREATE BOTH FILES**: 
   - Write the detailed summary to `tbd/ssd{DD}{MM}.{n}.md`
   - Write the quick start to `tbd/ssd{DD}{MM}.{n}-quick.md`
3. **VERIFY FILES CREATED**: Confirm both files were written successfully
4. **DISPLAY CONFIRMATION**:
   ```
   ✅ Created TWO session summary files:
   📄 Detailed: tbd/ssd{DD}{MM}.{n}.md
   📋 Quick Start: tbd/ssd{DD}{MM}.{n}-quick.md
   
   Ready for /clear when you want to start fresh.
   Use /ssn in the new session to load context.
   ```

## Important Notes

- ALWAYS create BOTH files - do not just display in terminal
- ALWAYS use current system date, not cached or previous dates
- NEVER overwrite existing files - always increment counter
- Include EVERYTHING significant from the session in the detailed summary
- Keep quick start concise but actionable