# Quality Standards

*Extracted from 30% transition assessment - Evaluation domain insights*

## Definition of Done

### Code Complete
- [ ] Feature implements all acceptance criteria
- [ ] Unit tests written and passing (>80% coverage for critical paths)
- [ ] Integration tests for cross-module interactions
- [ ] Code reviewed and approved by team
- [ ] Documentation updated (inline comments, API docs)

### Quality Validated
- [ ] `make validate` passes (mirrors CI exactly)
- [ ] No security vulnerabilities (`cargo audit`, `npm audit`)
- [ ] Performance benchmarks met or exceeded
- [ ] Error handling comprehensive and tested
- [ ] Memory safety verified (no leaks, proper zeroization)

### Ready for Production
- [ ] User-facing documentation complete
- [ ] Accessibility requirements met (WCAG 2.1 AA)
- [ ] Cross-platform testing completed (macOS, Windows, Linux)
- [ ] Monitoring and logging implemented
- [ ] Rollback plan documented

## Quality Metrics and Targets

### Code Coverage Requirements
| Component | Minimum Coverage | Target Coverage | Notes |
|-----------|-----------------|-----------------|--------|
| Cryptographic operations | 90% | 95% | Security critical |
| File operations | 80% | 90% | Core functionality |
| UI components | 70% | 80% | User interactions |
| Utilities | 60% | 70% | Helper functions |
| Error handling | 85% | 90% | Reliability critical |

### Performance Requirements
| Metric | Minimum | Target | Maximum |
|--------|---------|---------|---------|
| Startup time | 2.0s | 1.5s | 3.0s |
| Encryption speed | 10 MB/s | 20 MB/s | - |
| Memory usage (idle) | - | 120MB | 200MB |
| Memory usage (active) | - | 200MB | 500MB |
| UI response time | - | 100ms | 200ms |
| Bundle size | - | 5MB | 50MB |

### Reliability Standards
- **Error rate**: <0.1% of operations
- **Crash rate**: <0.01% of sessions  
- **Data loss**: Zero tolerance
- **Recovery time**: <5 seconds from error
- **Availability**: 99.9% (local app)

## Technical Debt Philosophy

### Investment Decision Framework
**Accept debt when:**
- Time-to-market is critical for user safety
- Proof of concept needed for validation
- External dependency requires workaround
- Clear payback timeline exists (<3 months)

**Reject debt when:**
- Security would be compromised
- Data integrity at risk
- User experience significantly degraded
- Maintenance cost exceeds development time

### Debt Tracking and Management
```markdown
## Technical Debt Record
**ID**: TD-2025-001
**Component**: File selection UI
**Type**: Performance optimization
**Impact**: Medium - 200ms delay on large directories
**Effort**: 2 days
**Priority**: P2
**Payback**: Improved UX for power users
**Decision**: Accept - schedule for next sprint
```

### Debt Reduction Strategy
1. **20% rule** - Allocate 20% of sprint to debt reduction
2. **Boy Scout rule** - Leave code better than found
3. **Refactor on touch** - Improve when modifying
4. **Debt sprints** - Quarterly focused cleanup
5. **Sunset planning** - Schedule obsolete code removal

## Testing Standards

### Test Types and Coverage
| Test Type | Purpose | Coverage Target | Frequency |
|-----------|---------|-----------------|-----------|
| Unit | Component logic | 80% | Every commit |
| Integration | Module interaction | 70% | Every commit |
| E2E | User workflows | Critical paths | Daily |
| Performance | Speed/memory | Baselines | Weekly |
| Security | Vulnerability | 100% critical | Every commit |
| Smoke | Deployment | Basic flows | Every release |

### Test Quality Principles
- **Fast** - Unit tests <10ms, integration <100ms
- **Isolated** - No test dependencies or order
- **Repeatable** - Same result every run
- **Self-validating** - Clear pass/fail
- **Timely** - Written with or before code

### Testing Best Practices
```rust
// Descriptive test names
#[test]
fn encrypt_file_with_valid_key_succeeds() { }

// Clear Arrange-Act-Assert
#[test]
fn test_key_generation() {
    // Arrange: Set up test data
    let passphrase = "test-pass";
    
    // Act: Execute the operation
    let result = generate_key(passphrase);
    
    // Assert: Verify expectations
    assert!(result.is_ok());
}

// Property-based testing for edge cases
#[quickcheck]
fn prop_encrypt_decrypt_roundtrip(data: Vec<u8>) -> bool {
    let encrypted = encrypt(&data).unwrap();
    let decrypted = decrypt(&encrypted).unwrap();
    data == decrypted
}
```

## Continuous Improvement

### Quality Feedback Loops
1. **Build metrics** - Track build times, failure rates
2. **Test metrics** - Coverage trends, flaky tests
3. **Performance metrics** - Regression detection
4. **User metrics** - Error rates, performance
5. **Developer metrics** - Cycle time, review time

### Quality Gates
**Pre-commit**: `make validate-ui` or `make validate-rust`
**Pre-push**: `make validate`
**Pull Request**: Full CI pipeline
**Pre-release**: Security scan, performance test
**Post-release**: Monitor metrics, user feedback

### Improvement Process
1. **Measure** - Establish baselines
2. **Analyze** - Identify bottlenecks
3. **Improve** - Implement changes
4. **Verify** - Confirm improvement
5. **Standardize** - Update practices

## Code Organization Standards

### Backend File Size Guidelines
**Purpose**: Maintain readable, maintainable, and testable code by limiting file complexity.

| File Type | Optimal Lines | Warning | Maximum | Action Required |
|-----------|--------------|---------|---------|-----------------|
| **Source Code** | 150-200 | 200-300 | 300 | Split into modules |
| **Test Files** | 200-300 | 300-500 | 500 | Group by feature |
| **Config Files** | No limit | - | - | Keep organized |
| **Generated Code** | No limit | - | - | Exclude from analysis |

### Frontend File Size Guidelines
**Purpose**: Optimize component-based architecture for readability, reusability, and performance.

| File Type | Optimal Lines | Warning | Maximum | Action Required |
|-----------|--------------|---------|---------|-----------------|
| **React Components (TSX/JSX)** | 40-80 | 80-150 | 150 | Extract child components |
| **TypeScript Modules** | 100-150 | 150-250 | 250 | Split by concern |
| **Service/API Files** | 150-200 | 200-300 | 300 | Separate endpoints |
| **Utility/Helper Files** | 100-200 | 200-300 | 300 | Group by functionality |
| **Type Definitions** | No limit | - | - | Keep organized |
| **Test Files** | 200-400 | 400-600 | 600 | Split by feature/component |
| **CSS/SCSS Files** | Performance-based | - | - | Split by route/feature |
| **Tailwind Components** | 50-100 | 100-150 | 150 | Use composition |

**Special Considerations:**
- **Hooks**: Custom hooks should be 20-50 lines, extract complex logic
- **Context Providers**: Keep under 100 lines, delegate logic to hooks
- **Styled Components**: Focus on performance over line count
- **Index Files**: Exports only, no logic

### When to Split Files
**Split immediately when:**
- File exceeds 300 lines (hard limit)
- Multiple unrelated responsibilities present
- Scrolling required to understand logic flow
- New developers struggle to understand purpose

**Refactoring Strategies:**
- **Extract modules** - Group related functions
- **Separate concerns** - Split by responsibility
- **Create utilities** - Extract common helpers
- **Use traits/interfaces** - Define contracts separately

### AI Agent Directive
```yaml
before_coding:
  - check: "Will this change push file over 200 lines?"
  - if_yes: "Plan refactoring BEFORE adding code"
  - if_over_300: "MUST split file - no exceptions"
```

## Code Review Standards

### Review Checklist
- [ ] Functionality correct and complete
- [ ] Tests adequate and passing
- [ ] Security implications considered
- [ ] Performance impact acceptable
- [ ] Code follows project standards
- [ ] Documentation updated
- [ ] No obvious technical debt introduced
- [ ] **Files under 300 lines** (split if exceeded)

### Review Philosophy
- **Constructive** - Focus on code, not person
- **Specific** - Provide actionable feedback
- **Educational** - Share knowledge
- **Timely** - Review within 24 hours
- **Thorough** - Check logic, not just syntax