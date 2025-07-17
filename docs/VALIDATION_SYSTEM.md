# Barqly Vault Validation System

## 🚀 Quick Start (For New Developers)
1. **Install the pre-commit hook:**
   ```bash
   chmod +x scripts/setup-hooks.sh
   ./scripts/setup-hooks.sh
   ```
2. **Every time you commit,** the hook will automatically run:
   ```bash
   cargo fmt --check    # Formatting validation
   cargo clippy         # Linting validation  
   cargo test           # Test validation
   ```
3. **If any validation fails,** the commit is blocked until you fix the issues!

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
- **Pre-commit hooks** that automatically validate code quality before commits
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

Every commit triggers automatic validation:
```
🔍 Barqly Vault Pre-commit Validation
=====================================
📦 Rust project detected. Running validation...
🎨 Running cargo fmt...
✅ Formatting check passed
🔍 Running cargo clippy...
✅ Clippy check passed
🧪 Running tests...
✅ All tests passed

🎉 All validation checks passed!
📝 Proceeding with commit...
```

- **Blocks commits** if any validation fails
- **Shows clear error messages** with fix instructions
- **Proceeds only** when all checks pass

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

### Successful Commit
```bash
# Edit code...
git add .
git commit -m "feat: new feature"
# Hook runs validation automatically
# ✅ All checks pass
# 📝 Commit proceeds
git push
```

### Failed Validation
```bash
git add .
git commit -m "feat: new feature"
# ❌ Formatting issues found!
# 💡 Run 'cargo fmt' to fix formatting
# Commit is blocked

# Fix the issues
cargo fmt
git add .
git commit -m "feat: new feature"
# ✅ All checks pass
# 📝 Commit proceeds
```

---

## 🛡️ Validation Checklist
- [ ] `cargo fmt --check` passes
- [ ] `cargo clippy` passes
- [ ] `cargo test` passes
- [ ] All changes are committed

---

## 💡 If Validation Fails
- **Formatting issues:** Run `cargo fmt` to fix
- **Clippy issues:** Fix the linting problems shown
- **Test failures:** Fix the failing tests
- **Re-commit:** The hook will validate again

---

## 🧑‍💻 Feedback & Improvements
- If you find a better way or spot an error, **please update this doc for the next engineer!**
- We value continuous improvement—no cargo culting!

---

## 🔄 Integration with ZenAI Rituals
- **Automated validation** before every commit
- **Fail-fast approach** to catch issues early
- **Reduced feedback loops** by preventing bad commits
- **Consistent quality** across all team members 