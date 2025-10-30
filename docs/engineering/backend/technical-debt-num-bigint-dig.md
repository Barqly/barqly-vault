# Technical Debt: num-bigint-dig Future Incompatibility

**ID**: TD-2025-002
**Component**: Transitive dependency (yubikey → rsa → num-bigint-dig)
**Type**: Future Rust compatibility
**Impact**: Low - Build warning only, no functional impact
**Effort**: 1 day (when upstream updates available)
**Priority**: P3
**Discovered**: 2025-10-30 (R2 Final Build)

## Issue Description

The `num-bigint-dig` crate version 0.8.4 contains code that will be rejected by a future version of Rust. This is a transitive dependency coming through:

```
barqly-vault → yubikey v0.8.0 → rsa v0.9.8 → num-bigint-dig v0.8.4
```

## Current State

- **Functional Impact**: None - the code works correctly
- **Warning Only**: Shows during compilation as future incompatibility warning
- **Cannot Fix Now**: We're using the latest stable versions of all direct dependencies

## Investigation Results

1. **Direct Dependency**: `yubikey` v0.8.0 (latest stable)
2. **RSA Crate Status**:
   - Current: rsa v0.9.8 (used by yubikey)
   - Available: rsa v0.10.0-rc.9 (release candidate, not stable)
3. **Root Cause**: Waiting for stable release of rsa v0.10.0

## Mitigation Strategy

### Short Term (R2 Release)
- Accept the warning - it doesn't affect functionality
- Document the issue for tracking

### Long Term (R2.1 or Later)
1. Monitor `rsa` crate for v0.10.0 stable release
2. Monitor `yubikey` crate for update to use rsa v0.10.0
3. Update dependencies when available
4. Verify all YubiKey functionality after update

## Monitoring Actions

- [ ] Check monthly for rsa v0.10.0 stable release
- [ ] Check monthly for yubikey crate updates
- [ ] Subscribe to yubikey crate releases on GitHub

## Risk Assessment

- **Security Risk**: None - no known vulnerabilities
- **Compatibility Risk**: Low - future Rust versions will reject, but we have time
- **Maintenance Risk**: Low - actively maintained dependencies

## Resolution Criteria

This debt item is resolved when:
1. `cargo build --release` produces no future incompatibility warnings
2. All tests pass with updated dependencies
3. YubiKey functionality is verified working

## Related Links

- [rsa crate](https://crates.io/crates/rsa)
- [yubikey crate](https://crates.io/crates/yubikey)
- [num-bigint-dig crate](https://crates.io/crates/num-bigint-dig)

---

*Last Updated: 2025-10-30*