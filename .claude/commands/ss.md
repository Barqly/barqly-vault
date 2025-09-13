# Save this file as: .claude/commands/session-summary.md

Create a comprehensive session summary document to preserve context before clearing the chat.

## Instructions

Please create a session summary file with the following specifications:

1. **Filename Format**: `ss{DD}{MM}.{n}.md` where:
   - DD = day of month (01-31)
   - MM = month (01-12)  
   - n = counter (1, 2, 3...) for multiple summaries in a day

2. **Location**: Save in `./tbd/` folder (create if it doesn't exist)

3. **Template Structure** - Include these sections:

### Session Summary Template

```markdown
# Session Summary
**Date:** [Current date and time]
**Session ID:** [Filename]
**Project:** [Project name]

## 🎯 Primary Objective
[What was the main goal of this session?]

## 📁 Files Modified/Referenced
- List all files we worked on or discussed
- Include their paths relative to project root
- Note which ones were modified vs just referenced

## 🔍 Problem Statement
### Initial Issue:
[Describe the original problem]

### Root Cause (if identified):
[What was causing the issue]

## ✅ Solutions Attempted
[Document each attempt with:]
- Approach taken
- Why we thought it would work
- Result/outcome
- Code snippets if relevant

## 🎉 Working Solution
[If found, document the final working solution]
- Implementation details
- Why it works
- Key code changes

## 🔧 Current State
- **Resolved Issues:**
  - List what's been fixed
  
- **Pending Issues:**
  - List what still needs work
  
- **Blockers:**
  - Any blockers identified

## 💡 Observations & Insights
- Key learnings from this session
- Patterns noticed
- Gotchas discovered

## 🔄 Refactoring Opportunities
[Things to improve when time permits]
- Component/file name
- What could be improved
- Priority level

## 📝 Code Context
[Preserve important code snippets]

### Key Configuration:
[Any config changes or important settings]

### Critical Functions/Methods:
[Core logic we worked on]

### Environment/Dependencies:
[Package versions, env vars, etc.]

## 🚀 Next Steps
1. Clear action items for next session
2. What to tackle first
3. Any research needed

## 🔗 Related Resources
- Previous session: [Link to previous summary if exists]
- Documentation: [Any docs referenced]
- Issues/PRs: [Related tickets]

## 💭 Additional Notes
[Any other context that might be helpful]

## 🤖 Context for Claude
[Special section for Claude-specific context]
- Understanding of the problem domain
- Approaches that definitely don't work
- User preferences discovered
- Technical constraints identified
```

## Execution Steps

When this command is invoked:

1. Check current date and determine the filename (ss{DD}{MM}.{n}.md)
2. Create the `tbd` directory if it doesn't exist
3. Find the next available counter for today
4. Create the file with the filled template based on our current conversation
5. Include:
   - All files we've discussed or modified
   - All error messages encountered
   - All solutions attempted with their outcomes
   - Current working solution if any
   - Any patterns or insights discovered
   - Clear next steps

6. After creating, show me the file path and key sections of the summary
7. Remind me that I can share this file in a new chat to continue where we left off

Please execute this now and create a comprehensive summary of our current session.