# Pull Request Template

## Description

Brief description of the changes and their purpose.

## Type of Change

- [ ] Bug fix (non-breaking change which fixes an issue)
- [ ] New feature (non-breaking change which adds functionality)
- [ ] Breaking change (fix or feature that would cause existing functionality to not work as expected)
- [ ] Security fix (addresses a security vulnerability)
- [ ] Documentation update
- [ ] Performance improvement
- [ ] Code refactoring

## Related Issues

Fixes #(issue number)

## Changes Made

- List the main changes
- Include technical details where relevant
- Mention any design decisions

## Testing

- [ ] Unit tests pass (`make test-rust`)
- [ ] Integration tests pass
- [ ] Manual testing completed
- [ ] Cross-platform testing (if applicable)

## Security Considerations

- [ ] No sensitive data exposed in logs
- [ ] Memory is properly zeroized for sensitive data
- [ ] Input validation is comprehensive
- [ ] No new security warnings from clippy

## Performance Impact

- [ ] Benchmarks show no regression
- [ ] Memory usage is within acceptable limits
- [ ] No blocking operations in async contexts

## Documentation

- [ ] Code is self-documenting with clear names
- [ ] rustdoc comments added/updated
- [ ] README updated (if needed)
- [ ] Architecture docs updated (if needed)

## Pre-submission Checklist

- [ ] `make validate-rust` passes
- [ ] Commits follow conventional format
- [ ] No merge conflicts
- [ ] Dependencies are justified and minimal

## Screenshots (if applicable)

Add any relevant screenshots for UI changes.

## Additional Notes

Any additional information that reviewers should know.
