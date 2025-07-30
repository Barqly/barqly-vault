# Version Recommendations for Barqly Vault

**Date**: January 30, 2025  
**Current State**: All dependencies stable, no critical updates required  
**Recommendation**: Proceed with current versions, plan updates strategically  

## Current vs Recommended Versions

### 🟢 Keep Current (No Update Needed)

| Package | Current | Rationale |
|---------|---------|-----------|
| React | 18.3.1 | Stable, React 19 too new for production |
| Rust | 2021 Edition | Latest stable edition |
| Age | 0.10 | Latest stable, well-tested |
| Tailwind CSS | 4.1.11 | Already on latest v4 |
| Tauri | 2.0 | Latest major version |

### 🟡 Update When Convenient (Minor/Patch)

| Package | Current | Recommended | Type | Effort |
|---------|---------|-------------|------|---------|
| @tauri-apps/plugin-dialog | 2.3.1 | 2.3.2 | Patch | 5 min |
| @testing-library/jest-dom | 6.6.3 | 6.6.4 | Patch | 5 min |
| eslint | 9.31.0 | 9.32.0 | Minor | 10 min |
| lucide-react | 0.525.0 | 0.534.0 | Minor | 10 min |
| react-router-dom | 7.7.0 | 7.7.1 | Patch | 5 min |
| tw-animate-css | 1.3.5 | 1.3.6 | Patch | 5 min |
| TypeScript | 5.6.3 | 5.8.3 | Minor | 30 min |

**Total Update Time**: ~1 hour

### 🔵 Evaluate for Future (Major Updates)

| Package | Current | Available | Breaking Changes | Recommendation |
|---------|---------|-----------|------------------|----------------|
| React | 18.3.1 | 19.1.1 | Ref callbacks, deprecations | Wait 3-6 months |
| Vite | 6.3.5 | 7.0.6 | Build config changes | Evaluate benefits |
| @types/react | 18.3.23 | 19.1.9 | Type definitions | Update with React |
| @types/react-dom | 18.3.7 | 19.1.7 | Type definitions | Update with React |

## Update Strategy by Priority

### Priority 1: Security Updates (Immediate)
```bash
# No security updates currently required ✅
npm audit # Shows 0 vulnerabilities
```

### Priority 2: Patch Updates (This Week)
```bash
# Safe, backward-compatible updates
npm update @tauri-apps/plugin-dialog@2.3.2
npm update @testing-library/jest-dom@6.6.4
npm update react-router-dom@7.7.1
npm update tw-animate-css@1.3.6
```

### Priority 3: Minor Updates (Next Sprint)
```bash
# Review changelog before updating
npm update eslint@9.32.0
npm update lucide-react@0.534.0
npm update typescript@5.8.3

# After TypeScript update, verify:
make validate-ui
```

### Priority 4: Major Updates (3-6 Months)

#### React 18 → 19 Migration Plan
1. **Wait for ecosystem stability** (3 months minimum)
2. **Review breaking changes**:
   - Ref callback return values
   - Deprecated APIs removal
   - Concurrent features changes
3. **Update in stages**:
   - Development environment first
   - Component library compatibility check
   - Full application testing
4. **Expected effort**: 2-3 days

#### Vite 6 → 7 Migration Plan
1. **Evaluate performance gains**
2. **Check plugin compatibility**
3. **Review configuration changes**
4. **Expected effort**: 1 day

## Version Pinning Strategy

### Production Dependencies
```json
{
  "dependencies": {
    "react": "18.3.1",          // Pin major.minor.patch
    "age": "0.10",              // Pin major.minor
    "@tauri-apps/api": "^2.7.0" // Allow minor updates
  }
}
```

### Development Dependencies
```json
{
  "devDependencies": {
    "eslint": "^9.32.0",        // Allow minor updates
    "typescript": "~5.8.0",     // Allow patch updates only
    "vite": "6.3.5"            // Pin until evaluated
  }
}
```

## Rust Dependencies Strategy

### Current Cargo.toml Approach ✅
- Using exact versions for critical deps (age = "0.10")
- Allowing compatible updates for utilities (log = "0.4")
- Security libraries pinned (zeroize = "1.8")

### Recommendations
1. Run `cargo update` monthly for compatible updates
2. Review `cargo outdated` quarterly
3. Pin exact versions for crypto libraries
4. Allow minor updates for dev dependencies

## Testing Strategy for Updates

### Before Any Update
1. Run full test suite: `make test`
2. Create git branch: `git checkout -b update/package-name`
3. Update single package at a time
4. Run validation: `make validate`

### After Update
1. Manual testing of affected features
2. Performance comparison (if applicable)
3. Security scan: `npm audit`
4. Document any behavior changes

## Automation Recommendations

### 1. Dependabot Configuration
```yaml
# .github/dependabot.yml
version: 2
updates:
  - package-ecosystem: "npm"
    directory: "/src-ui"
    schedule:
      interval: "weekly"
    groups:
      patches:
        update-types: ["patch"]
      minor:
        update-types: ["minor"]
    
  - package-ecosystem: "cargo"
    directory: "/src-tauri"
    schedule:
      interval: "weekly"
```

### 2. Update Script
```bash
#!/bin/bash
# scripts/check-updates.sh
echo "Checking for updates..."
cd src-ui && npm outdated
cd ../src-tauri && cargo outdated
```

## Long-term Version Management

### Quarterly Review Checklist
- [ ] Run security audits (npm audit, cargo-audit)
- [ ] Check for major version releases
- [ ] Review deprecation warnings
- [ ] Evaluate new features vs stability
- [ ] Update development dependencies
- [ ] Test on all target platforms

### Annual Technology Review
- [ ] Assess alternative technologies
- [ ] Review security best practices
- [ ] Evaluate performance requirements
- [ ] Consider new platform targets
- [ ] Plan major migrations

## Conclusion

The current dependency versions are well-chosen and stable. No immediate updates are required for security or functionality. The recommended approach is:

1. **Continue with current versions** for production release
2. **Apply patch updates** during next maintenance window
3. **Evaluate minor updates** in next sprint
4. **Plan major updates** for Q2 2025

This conservative approach ensures stability for the Bitcoin custody use case while maintaining security through regular reviews.