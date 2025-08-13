# Commit Message Template

## Format

```
<type>(<scope>): <subject>

<body>

<footer>
```

## Types

- **feat**: New feature implementation
- **fix**: Bug fix
- **docs**: Documentation changes
- **style**: Code style changes (formatting, missing semicolons, etc.)
- **refactor**: Code refactoring without changing functionality
- **test**: Adding or updating tests
- **chore**: Maintenance tasks, dependency updates
- **perf**: Performance improvements
- **security**: Security-related changes

## Scopes (Examples)

- **crypto**: Encryption/decryption module
- **storage**: Key storage module
- **file-ops**: File operations module
- **commands**: Tauri commands
- **ui**: Frontend components
- **validation**: Input validation
- **build**: Build system changes

## Subject

- Use imperative mood ("add" not "added" or "adds")
- Don't capitalize first letter
- No period at the end
- Limit to 50 characters

## Body

- Explain what and why (not how)
- Wrap at 72 characters
- Reference issues and PRs

## Footer

- Breaking changes: `BREAKING CHANGE: <description>`
- Issue references: `Fixes #123`, `Closes #456`

## Examples

### Simple feature

```
feat(crypto): add support for multiple recipients

Enable encryption for multiple age public keys simultaneously.
This allows secure sharing of files with multiple parties.

Closes #123
```

### Security fix

```
security(storage): prevent timing attacks in passphrase comparison

Use constant-time comparison for passphrase validation to prevent
timing-based attacks. All cryptographic comparisons now use the
subtle crate's ConstantTimeEq trait.

Security-Audit: PASS
Fixes #CVE-2024-XXXX
```

### Breaking change

```
refactor(commands): rename encrypt_files to encrypt_archive

Rename the Tauri command to better reflect that it creates an
encrypted archive rather than encrypting files individually.

BREAKING CHANGE: Frontend code must update the command name
from encrypt_files to encrypt_archive in all invoke() calls.
```
