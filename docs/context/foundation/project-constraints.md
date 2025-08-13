# Project Constraints

**Security, performance, and operational requirements**

## Security Requirements

### Core Security Principles

- **Offline-only**: No network operations permitted
- **Memory safety**: Zeroize sensitive data on drop
- **Defense in depth**: Multiple security layers
- **Least privilege**: Minimal permissions required
- **Audit trail**: Comprehensive logging

### Cryptographic Standards

```rust
// Required algorithms
Age encryption:     ChaCha20-Poly1305 (AEAD)
Key derivation:     scrypt (N=2^15, r=8, p=1)
File integrity:     SHA-256 checksums
Random generation:  OS CSPRNG only
```

### Security Boundaries

- No remote code execution
- No dynamic library loading
- No eval() or equivalent
- No external resource fetching
- CSP headers enforced

### Threat Mitigations

| Threat             | Mitigation            | Implementation     |
| ------------------ | --------------------- | ------------------ |
| Memory extraction  | Zeroization           | `zeroize` crate    |
| Weak passwords     | Strength requirements | zxcvbn validation  |
| Path traversal     | Input sanitization    | Strict validation  |
| Timing attacks     | Constant-time ops     | `constant_time_eq` |
| Clipboard snooping | Auto-clear            | 30-second timeout  |

## Performance Requirements

### Hard Limits

```yaml
Startup time: < 3.0 seconds (max)
Memory (idle): < 200 MB
Memory (active): < 500 MB
Bundle size: < 50 MB
Response time: < 200ms (UI interactions)
```

### Performance Targets

```yaml
Startup time:        < 1.5 seconds (target)
Encryption speed:    > 20 MB/s
Memory (idle):       < 120 MB (target)
File size support:   Up to 100 MB typical
Concurrent ops:      Single operation at a time
```

### Optimization Priorities

1. **Startup performance** - User's first impression
2. **Memory efficiency** - Long-running application
3. **Encryption speed** - Core functionality
4. **UI responsiveness** - Perceived performance
5. **Bundle size** - Download/install experience

## Platform Requirements

### Supported Platforms

```yaml
macOS:
  minimum: 10.15 (Catalina)
  tested: 11.0+ (Big Sur+)
  arch: x64, arm64 (M1/M2)

Windows:
  minimum: Windows 10 1803
  tested: Windows 10/11
  arch: x64

Linux:
  minimum: Ubuntu 20.04 LTS
  tested: Ubuntu, Debian, Fedora
  arch: x64
```

### Platform Features

- Native file dialogs required
- System key storage integration
- Platform-specific paths respected
- Native window decorations

## Quality Standards

### Code Coverage Requirements

| Component         | Minimum | Target |
| ----------------- | ------- | ------ |
| Crypto operations | 90%     | 95%    |
| File operations   | 80%     | 90%    |
| Error handling    | 85%     | 90%    |
| UI components     | 70%     | 80%    |
| Utilities         | 60%     | 70%    |

### Definition of Done

- [ ] Tests pass (>80% coverage)
- [ ] `make validate` passes
- [ ] Documentation updated
- [ ] Security review completed
- [ ] Performance targets met
- [ ] Cross-platform tested

### Error Handling

- All errors must have recovery guidance
- User-friendly messages required
- Technical details in logs only
- No stack traces in production
- Graceful degradation preferred

## Development Constraints

### Technology Choices

```yaml
Backend:
  language: Rust (safety, performance)
  framework: Tauri v2 (security, size)
  crypto: age (modern, audited)

Frontend:
  language: TypeScript (type safety)
  framework: React 18 (ecosystem)
  styling: Tailwind CSS (consistency)

Testing:
  backend: Built-in Rust tests
  frontend: Vitest (speed)
  e2e: Tauri testing (future)
```

### Dependency Rules

- Security-critical deps: Audited only
- Version pinning: For crypto libraries
- License compliance: MIT/Apache/BSD only
- Update frequency: Monthly security patches
- Tree shaking: Required for frontend

### API Stability

- Tauri commands: Stable interface
- No breaking changes without migration
- Backward compatibility for configs
- Forward compatibility for files

## Operational Constraints

### Resource Limits

```yaml
CPU usage:
  idle: < 1%
  active: < 25% (single core)

Disk I/O:
  read: Streaming for large files
  write: Atomic operations only
  temp: Clean up immediately

Network:
  allowed: None (offline-only)
  future: Update checks only
```

### File System

- Maximum file: 2GB (technical limit)
- Typical usage: <100MB (Bitcoin custody)
- Archive format: TAR with GZIP
- Manifest: JSON with SHA-256
- Path length: OS limits respected

### User Experience

- Single window application
- No background processes
- No auto-start on boot
- No phone-home telemetry
- Explicit user consent for all operations

## Bitcoin Custody Focus

### Use Case Optimization

```yaml
Primary files:
  - Wallet descriptors (.json)
  - Seed phrase backups (.txt)
  - Extended keys (.txt)
  - Multisig configs (.json)

Typical size: 1-10 KB per file
Total bundle: <1 MB usually
Encryption time: <1 second
```

### Recovery Scenarios

- Hardware wallet replacement
- Estate planning / inheritance
- Geographic backup distribution
- Time-locked recovery setup
- Emergency access procedures

## Compliance & Standards

### Security Standards

- OWASP Top 10 compliance
- NIST guidelines for key management
- Industry crypto best practices
- No regulatory compliance required

### Accessibility

- WCAG 2.1 Level AA target
- Keyboard navigation complete
- Screen reader compatible
- High contrast support
- Focus indicators visible

### Privacy

- No data collection
- No analytics/telemetry
- No cloud services
- No user tracking
- Local-only operation

## Future Considerations

### Planned Enhancements

- QR code generation/scanning
- Hardware wallet integration
- Shamir secret sharing
- Time-locked encryption
- Multi-party computation

### Deferred Features

- Cloud backup (privacy concerns)
- Mobile apps (security complexity)
- Browser extension (attack surface)
- Network sync (offline principle)
- Auto-update (security review needed)

## Non-Functional Requirements

### Reliability

- 99.9% operation success rate
- Graceful failure handling
- Data integrity guaranteed
- No data loss scenarios
- Atomic operations only

### Maintainability

- Clean code principles
- Comprehensive documentation
- Automated testing
- Clear error messages
- Modular architecture

### Scalability

- Not a primary concern (desktop app)
- Single-user focused
- No concurrent user support needed
- File count: Reasonable limits (1000s)
- Performance linear with file size
