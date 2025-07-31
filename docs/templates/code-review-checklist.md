# Code Review Checklist

## General Code Quality
- [ ] Code follows Rust coding standards (docs/common/rust-coding-standards.md)
- [ ] No clippy warnings or errors
- [ ] Code is properly formatted with rustfmt
- [ ] Clear and descriptive variable/function names
- [ ] DRY principle followed (no unnecessary duplication)
- [ ] Complex logic is well-commented

## Rust-Specific
- [ ] Proper error handling with Result<T, E>
- [ ] No unnecessary clones or allocations
- [ ] Appropriate use of borrowing vs ownership
- [ ] Lifetimes are correctly specified where needed
- [ ] No unsafe code without justification
- [ ] Pattern matching is exhaustive

## Security
- [ ] All user input is validated
- [ ] No hardcoded secrets or sensitive data
- [ ] Sensitive data is zeroized after use
- [ ] Cryptographic operations use constant-time comparisons
- [ ] File paths are properly sanitized
- [ ] No SQL injection or command injection vulnerabilities

## Tauri-Specific
- [ ] Commands properly validate inputs
- [ ] Errors are serialized correctly for frontend
- [ ] No blocking operations in async contexts
- [ ] State management is thread-safe
- [ ] CSP headers are appropriate

## Testing
- [ ] Adequate test coverage for new code
- [ ] Tests are meaningful (not just for coverage)
- [ ] Edge cases are tested
- [ ] Error conditions are tested
- [ ] Tests follow naming conventions
- [ ] No flaky tests introduced

## Performance
- [ ] No unnecessary loops or iterations
- [ ] Efficient data structures used
- [ ] No performance regressions in benchmarks
- [ ] Large operations are properly chunked
- [ ] Memory usage is reasonable

## Documentation
- [ ] Public APIs have rustdoc comments
- [ ] Complex algorithms are explained
- [ ] Security considerations documented
- [ ] Examples provided where helpful
- [ ] Changelog updated if needed

## Dependencies
- [ ] New dependencies are justified
- [ ] Dependencies are from reputable sources
- [ ] Version constraints are appropriate
- [ ] No duplicate functionality in dependencies
- [ ] Security audit passing for new dependencies

## Architecture
- [ ] Changes align with overall architecture
- [ ] Module boundaries are respected
- [ ] No circular dependencies introduced
- [ ] Interfaces remain stable (or breaking changes documented)
- [ ] Future extensibility considered

## Final Checks
- [ ] All CI checks pass
- [ ] No merge conflicts
- [ ] Commit history is clean
- [ ] PR description is comprehensive
- [ ] Ready for production deployment