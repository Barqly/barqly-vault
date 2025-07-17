# Barqly Vault Validation System

## 🚀 Quick Start (For New Developers)
1. **Install the pre-commit hook:**
   ```bash
   chmod +x scripts/setup-hooks.sh
   ./scripts/setup-hooks.sh
   ```
2. **Every time you commit,** you'll see a reminder to run:
   ```bash
   cd src-tauri && cargo fmt && cargo clippy && cargo test
   ```
3. **If you see a reminder,** just follow the instructions before pushing!

---

## ❓ Why Validation Matters
- **Saves time:** Prevents 4-5 minute CI failures for simple issues.
- **Ensures quality:** Keeps code clean, linted, and tested.
- **Team consistency:** Everyone follows the same process.
- **Security:** Catches issues before they reach production.

---

## 🪟 Windows Users
- The pre-commit hook is a Bash script. On Windows, use Git Bash or WSL for full compatibility.
- If you use Windows-only tools, run the manual validation commands before pushing.

---

## 🎯 Overview

The validation system consists of:
- **Pre-commit hooks** that remind about local validation before commits
- **Local validation scripts** for manual checks
- **CI/CD integration** that mirrors local validation

---

## 🔧 Setup

### Initial Setup
```bash
chmod +x scripts/setup-hooks.sh
./scripts/setup-hooks.sh
```

### Manual Installation
```bash
cp scripts/pre-commit .git/hooks/pre-commit
chmod +x .git/hooks/pre-commit
```

---

## 🚦 How It Works

Every commit triggers a reminder:
```
🔍 Barqly Vault Pre-commit Validation
=====================================
📦 Rust project detected.

💡 REMINDER: Consider running local validation before pushing:
   cd src-tauri && cargo fmt && cargo clippy && cargo test

⏱️  This saves time by preventing CI failures (4-5 min cycles).

📝 Proceeding with commit...
```

- **Never blocks your commit.**
- **Just a friendly nudge!**

---

## 🛠️ Manual Validation Steps
```bash
cd src-tauri
cargo fmt --check    # Formatting
cargo clippy         # Linting
cargo test           # Tests
```

---

## 📝 Usage Example

### Recommended Workflow
```bash
# Edit code...
git add .
git commit -m "feat: new feature"
# Reminder appears
cd src-tauri && cargo fmt && cargo clippy && cargo test
git push
```

### For Docs/Small Changes
```bash
git add .
git commit -m "docs: update README"
# Reminder appears, commit proceeds
git push
```

---

## 🛡️ Validation Checklist
- [ ] `cargo fmt --check` passes
- [ ] `cargo clippy` passes
- [ ] `cargo test` passes
- [ ] All changes are committed

---

## 💡 If CI Fails
- Fix issues locally (see error message)
- Run validation steps above
- Commit and push again

---

## 🧑‍💻 Feedback & Improvements
- If you find a better way or spot an error, **please update this doc for the next engineer!**
- We value continuous improvement—no cargo culting!

---

## 🔄 Integration with ZenAI Rituals
- **Gentle reminders** about local validation
- **Educational prompts** about best practices
- **Reduced feedback loops** by catching issues early
- **Non-intrusive** design that doesn't block workflow 