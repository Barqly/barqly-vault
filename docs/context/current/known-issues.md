# Known Issues & Workarounds

**Last Updated:** 2025-08-07  
**Status:** Active tracking

## Current Blockers

### None Critical
All critical issues resolved in Milestone 12.

## Active Issues

### 1. Configuration Module Not Implemented
**Impact:** Using hardcoded defaults  
**Workaround:** Current defaults work for all use cases  
**Plan:** Implement in future sprint (Milestone 2.4)  
**Priority:** Low - not blocking any features  

### 2. VSCode Tasks Not Configured
**Impact:** Missing IDE integration  
**Workaround:** Use Makefile commands directly  
**Plan:** Create tasks.json when team grows  
**Priority:** Low - pre-commit hooks sufficient  

### 3. Test Data Generators Missing
**Impact:** Manual test data creation  
**Workaround:** Current fixtures adequate  
**Plan:** Implement TestDataBuilder pattern later  
**Priority:** Low - existing fixtures work well  

## Recently Resolved

### ✅ UI Test Failures (FIXED - January 2025)
**Previous:** Multiple test failures due to async race conditions
**Solution:** Comprehensive mock isolation patterns
**Documentation:** `/docs/engineering/testing-ui-standards.md`
**Result:** All 374+ tests passing reliably

### ✅ Drag-Drop Context Issues (FIXED - January 2025)
**Previous:** Context API failing silently
**Solution:** Proper provider wrapping and error boundaries
**Documentation:** `/docs/retrospectives/drag-drop-context-failure.md`

### ✅ Test Key Accumulation (FIXED)
**Previous:** ~1090 legacy test keys accumulating  
**Solution:** Drop trait cleanup pattern implemented  
**Command:** `make clean-keys` for manual cleanup  

### ✅ CI Build Failures (FIXED)
**Previous:** 20% failure rate due to local/CI mismatch  
**Solution:** Pre-commit hooks with `make validate`  
**Result:** 95% CI readiness achieved  

### ✅ Slow Key Operations (FIXED)
**Previous:** Noticeable UI lag on key listing  
**Solution:** LRU cache with 5-minute TTL  
**Result:** 86.7% performance improvement  

### ✅ Excessive Progress Updates (FIXED)
**Previous:** ~50 IPC calls per operation  
**Solution:** Timer-based debouncing (100ms)  
**Result:** 80-90% reduction in IPC calls  

## Platform-Specific Issues

### macOS
- No known issues
- All features working as expected

### Windows
- Path handling tested and working
- Key storage in %APPDATA% validated

### Linux
- Configuration directory uses XDG standards
- All tests passing on Ubuntu/Debian

## Development Environment Issues

### Node.js Version
**Requirement:** v22.17.0 LTS  
**Check:** `node --version`  
**Fix:** Use nvm/fnm to install correct version  

### Rust Toolchain
**Requirement:** Latest stable  
**Check:** `rustc --version`  
**Fix:** `rustup update stable`  

### Tauri CLI
**Requirement:** v2.x  
**Check:** `cargo tauri --version`  
**Fix:** `cargo install tauri-cli@2`  

## Common Development Problems

### Problem: Frontend dev server won't start
```bash
# Solution
cd src-ui && npm install
npm run dev
```

### Problem: Rust compilation errors
```bash
# Solution
cd src-tauri && cargo clean
cargo build
```

### Problem: Tests leaving artifacts
```bash
# Solution
make clean-keys
make dev-reset
```

### Problem: Git hooks not running
```bash
# Solution
chmod +x .git/hooks/pre-commit
# Or reinstall:
make setup-hooks
```

## Performance Considerations

### Memory Usage
**Target:** <200MB idle, <500MB active  
**Current:** Within targets  
**Monitor:** Activity Monitor / Task Manager  

### Encryption Speed
**Target:** >10MB/s  
**Current:** Exceeding target  
**Test:** `make bench`  

### Startup Time
**Target:** <2 seconds  
**Current:** Meeting target with lazy loading  

## Debugging Tips

### Enable Verbose Logging
```bash
RUST_LOG=debug cargo tauri dev
```

### Check Platform Paths
```bash
# macOS
ls ~/Library/Application\ Support/barqly-vault/

# Windows (PowerShell)
ls $env:APPDATA\barqly-vault\

# Linux
ls ~/.config/barqly-vault/
```

### Inspect Tauri Window
- Right-click in app window
- Select "Inspect Element" (dev builds only)

## Getting Help

### Documentation
- [CLAUDE.md](/CLAUDE.md) - Primary dev reference
- [Project Plan](../project-plan.md) - Milestone details
- [Retrospectives](../retrospectives/) - Learning history

### Quick Fixes
```bash
make validate     # Check everything
make clean-keys   # Clean test artifacts
make dev-reset    # Full reset
```