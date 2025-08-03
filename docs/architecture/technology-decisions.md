# Technology Decisions

*Extracted from 30% transition assessment - Research domain insights*

## Core Technology Choices

### Desktop Framework: Tauri over Electron
**Decision**: Use Tauri v2 for desktop application framework  
**Rationale**:
- **70% less memory usage** (~120MB vs 300MB+ for Electron)
- **34x smaller bundle size** (2.5MB vs 85MB typical Electron)
- **Native security sandboxing** without bundling Chromium
- **2-3x faster startup time** (~1.5s vs 3-5s)
- **Rust backend** provides memory safety for cryptographic operations

### Encryption: Age over GPG
**Decision**: Use Age encryption library for all cryptographic operations  
**Rationale**:
- **Purpose-built simplicity** - designed specifically for file encryption
- **Modern cryptography** - ChaCha20-Poly1305 AEAD, no legacy baggage
- **Audited and minimal** - smaller attack surface than GPG
- **Developer-friendly** - clear API, hard to misuse
- **Forward secrecy** - each operation uses unique keys

### Language: Rust for Security-Critical Operations
**Decision**: Implement all backend/crypto operations in Rust  
**Rationale**:
- **Memory safety guarantees** prevent entire classes of vulnerabilities
- **Zero-cost abstractions** maintain performance while ensuring safety
- **Ownership model** prevents use-after-free and data races
- **Ecosystem support** - mature cryptographic libraries (zeroize, secrecy)
- **Cross-platform** compilation with consistent behavior

## Performance Baselines

### Achieved Metrics
- **Startup time**: <1.5 seconds (requirement: <2s)
- **Encryption speed**: 15-20 MB/s (requirement: >10MB/s)
- **Memory usage**: 120-150MB baseline (requirement: <200MB)
- **Bundle size**: 2.5MB installer (requirement: <50MB)
- **UI responsiveness**: Consistent 60 FPS

### Performance Principles
- **Stream processing** over bulk loading for large files
- **Async operations** to maintain UI responsiveness
- **Zero-copy operations** where possible in Rust
- **Lazy loading** for UI components and features
- **Build-time optimization** over runtime (Tailwind CSS v4)

## Cross-Platform Validation

### Platform Priorities
1. **macOS** (primary) - Native WebKit, fastest performance
2. **Windows** - WebView2 (Chromium), good compatibility
3. **Linux** - WebKitGTK, distribution variance acceptable

### Platform-Specific Considerations
- **Secure storage paths** vary by OS (respect platform conventions)
- **Memory management** differs (test on each platform)
- **File system behaviors** require abstraction layer
- **Code signing** requirements per platform

## Technology Stack Principles

### Selection Criteria
1. **Security first** - audited libraries, no experimental crypto
2. **Minimal dependencies** - reduce supply chain risk
3. **Active maintenance** - avoid abandoned projects
4. **Performance adequate** - meet requirements, not chase benchmarks
5. **Developer experience** - maintainable over clever

### Upgrade Philosophy
- **Security updates**: Apply immediately
- **Minor versions**: Monthly evaluation
- **Major versions**: Quarterly planning with migration path
- **Breaking changes**: Require explicit justification

## Build and Development Tools

### Frontend Stack
- **React 18**: Mature, extensive ecosystem, team familiarity
- **TypeScript strict mode**: Catch errors at compile time
- **Vite**: Fast builds, modern bundling, excellent DX
- **Tailwind CSS v4**: 5x faster builds, zero runtime overhead

### Backend Stack
- **Tokio**: Async runtime for I/O operations
- **Serde**: Serialization with type safety
- **Thiserror**: Ergonomic error handling
- **Tracing**: Structured logging and diagnostics

## Future-Proofing Decisions

### Abstraction Layers
- **Tauri commands** abstract UI-backend communication
- **Repository pattern** for key storage flexibility
- **Plugin architecture** for future features
- **Version negotiation** for forward compatibility

### Technology Debt Management
- **Document alternatives** considered and rejected
- **Benchmark before optimizing** - avoid premature optimization
- **Regular dependency audits** - quarterly review cycle
- **Migration paths** planned before major updates