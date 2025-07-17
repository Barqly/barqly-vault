# Barqly Vault Validation System

This document describes the validation reminder system that helps prevent CI failures.

## 🎯 Overview

The validation system consists of:
- **Pre-commit hooks** that remind about local validation before commits
- **Local validation scripts** for manual checks
- **CI/CD integration** that mirrors local validation

## 🔧 Setup

### Initial Setup
```bash
# Make setup script executable
chmod +x scripts/setup-hooks.sh

# Install pre-commit hooks
./scripts/setup-hooks.sh
```

### Manual Installation
```bash
# Copy pre-commit hook
cp scripts/pre-commit .git/hooks/pre-commit

# Make executable
chmod +x .git/hooks/pre-commit
```

## 🚀 How It Works

### Pre-commit Hook
The pre-commit hook displays a reminder before each commit:

```
🔍 Barqly Vault Pre-commit Validation
=====================================

📦 Rust project detected.

💡 REMINDER: Consider running local validation before pushing:
   cd src-tauri && cargo fmt && cargo clippy && cargo test

⏱️  This saves time by preventing CI failures (4-5 min cycles).

📝 Proceeding with commit...
```

**What it does:**
- Detects if Rust files are being committed
- Displays a helpful reminder about local validation
- Provides the exact commands to run
- Explains the time-saving benefit
- Always proceeds with the commit

### Manual Validation Steps
```bash
# Manual validation (recommended before pushing)
cd src-tauri
cargo fmt --check    # Formatting
cargo clippy         # Linting
cargo test           # Tests
```

## 🛠️ Usage

### Recommended Workflow
```bash
# 1. Edit code...

# 2. Stage changes
git add .

# 3. Commit (hook shows reminder)
git commit -m "feat: new feature"
# 💡 REMINDER: Consider running local validation before pushing...

# 4. Run validation manually (if needed)
cd src-tauri && cargo fmt && cargo clippy && cargo test

# 5. Push (CI should pass)
git push
```

### Quick Workflow
```bash
# For documentation or small changes
git add .
git commit -m "docs: update README"
# Hook shows reminder but proceeds
git push
```

### If CI Fails
```bash
# Fix the issues locally
cd src-tauri
cargo fmt          # Fix formatting
# Fix clippy issues manually
cargo test         # Fix failing tests

# Commit and push again
git add .
git commit -m "fix: resolve CI issues"
git push
```

### Emergency Bypass (Use Sparingly)
```bash
git commit --no-verify -m "emergency: bypass validation"
```

## 📋 Validation Checklist

Before pushing to CI, ensure:
- [ ] `cargo fmt --check` passes
- [ ] `cargo clippy` passes  
- [ ] `cargo test` passes
- [ ] All changes are committed

## 🎯 Benefits

1. **Simple & Reliable** - No interactive prompts or complex logic
2. **Educational** - Reminds about local validation benefits
3. **Non-blocking** - Never prevents commits, just reminds
4. **Time-saving** - Prevents 4-5 minute CI cycles for simple issues
5. **Team-friendly** - Works in all environments (IDE, terminal, CI)

## 🔄 Integration with ZenAI Rituals

This validation system supports the **shift-left validation** principle:
- **Gentle reminders** about local validation
- **Educational prompts** about best practices
- **Reduced feedback loops** by catching issues early
- **Non-intrusive** design that doesn't block workflow

## 📝 Maintenance

### Updating Hooks
```bash
# Edit scripts/pre-commit
# Reinstall
./scripts/setup-hooks.sh
```

### Adding New Validations
1. Edit `scripts/pre-commit`
2. Add new reminder messages
3. Test locally
4. Reinstall hooks
5. Update this documentation 