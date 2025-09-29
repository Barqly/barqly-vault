# Resume from Previous Session

Load context from the most recent session summary and continue work, optionally with a specific agent.

## Instructions

## Step 1: Handle Agent Selection (if provided)

Check if an agent was specified: `{ARG}`

If `{ARG}` is provided:
- Switch to the `{ARG}` agent before loading context
- Agent name shortcuts:
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

If `{ARG}` is empty:
- Continue with current/default agent

## Step 2: Load Session Context

1. Find and read the most recent quick start file in `tbd/ssc*.md` or `tbd/ssd*-quick.md`
2. Also reference the corresponding detailed summary `tbd/ssd*.md` for full context
3. If multiple files exist, use the most recent one

## Step 3: Present Understanding and Wait

Present understanding filtered through the active agent's perspective:

```
🔄 Session Resumed
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🤖 Agent: [Current agent - either {ARG} or default]
📚 I've loaded the context from your previous session. Here's my understanding:

**What we were working on:**
[Brief summary of the main objective - from agent's perspective]

**Current state:**
[Where things stand - what's working, what's not]

**Key decisions/insights from last session:**
- [Important point 1]
- [Important point 2]
- [Important gotcha or constraint]

**Next steps we identified:**
1. [Step 1]
2. [Step 2]
3. [Step 3]

**Files in focus:**
- `[file]` - [why]
- `[file]` - [why]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ Ready to continue! Would you like me to:
- Proceed with the next step we identified?
- Address something specific first?
- Review anything from the previous session?

Waiting for your input before making any changes...
```

## Usage

- `/ssn` - Resume with current/default agent
- `/ssn sr-backend-engineer` - Resume with backend engineer agent
- `/ssn fe` - Resume with frontend engineer agent (using shortcut)

## Important

- Do NOT start coding immediately
- Do NOT make file changes without confirmation
- DO wait for user direction
- DO be ready to adjust based on user's current priorities
- The user might want to pivot or address something different first
- If agent switch fails, continue with current agent but notify user
- Agent switch (if any) happens BEFORE loading context to avoid waste