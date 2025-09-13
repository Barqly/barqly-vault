# Quick Session Summary - Current Issue

Create a quick, focused summary of the immediate problem/discussion for review or handoff.

## Instructions

Create a concise summary file with the following specifications:

1. **Filename Format**: `ssq{DD}{MM}.{n}.md` where:
   - DD = day of month (01-31)
   - MM = month (01-12)
   - n = counter (1, 2, 3...) for multiple quick summaries in a day

2. **Location**: Save in `./tbd/` folder (create if it doesn't exist)

3. **Purpose**: This is for getting a second opinion, handing off a problem, or quickly documenting a specific issue

## Template

```markdown
# Quick Session Summary - [Issue Title]
**Date:** [Current timestamp]
**File:** ssq{DD}{MM}.{n}.md
**Purpose:** Quick handoff/review

## 🎯 Current Goal
[What we're trying to achieve right now - be specific]

## ❌ The Problem
[The specific issue/error we're facing]

## 🔍 What We've Tried
1. [Attempt 1] 
   → Result: [What happened]
2. [Attempt 2] 
   → Result: [What happened]
3. [Attempt 3] 
   → Result: [What happened]

## 💻 Current Code/Error
```
[Relevant code snippet or exact error message]
```

## 🤔 Claude's Current Approach
[What Claude is currently suggesting or trying to do]

## ⚠️ Concerns/Blockers
- [Any red flags with the current approach]
- [What's preventing progress]
- [Potential risks identified]

## 💭 Need Input On
- [ ] Is this approach correct?
- [ ] Are there better alternatives?
- [ ] Am I missing something obvious?
- [ ] [Specific question needing answer]

## 📁 Key Files Involved
- [Only list the immediately relevant files]
- [Include file paths relative to project root]
```

## Execution

When creating the quick summary:
1. Focus ONLY on the current active problem
2. Keep it under 100 lines total
3. Be specific about what input/help is needed
4. Include the exact error message or problematic code
5. Make it easy for someone else to understand the issue quickly
6. Don't include historical context unless directly relevant to the current problem

After creating, show the file path and remind that this can be shared for review.