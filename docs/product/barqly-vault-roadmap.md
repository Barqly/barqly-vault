# Barqly Vault Product Roadmap

## Vision
Secure, user-friendly file encryption for Bitcoin custody and sensitive data protection, recoverable decades later.

## MVP Phases

### ✅ MVP 1: Core Encryption (Completed)
**Goal**: 90-second setup, simple encrypt/decrypt workflow

#### Features
- **Setup Screen**: Generate age encryption keys with passphrase protection
- **Encrypt Screen**: Drag-and-drop file/folder encryption
- **Decrypt Screen**: Simple vault decryption with passphrase
- **Cross-platform**: macOS, Windows, Linux support via Tauri v2

#### Status
- ✅ Alpha release complete
- ✅ Three functional screens implemented
- ✅ 90-second setup goal achieved
- ✅ Age encryption integration working

---

### 📋 MVP 2: Manifest & Digital Signatures (Next)
**Goal**: Verify file integrity and authenticity years later

#### Features
- **Archive Manifest**: Track encrypted file contents and structure
- **Digital Signatures**: Sign manifests for tamper detection
- **Verification UI**: Visual confirmation of integrity
- **Manifest Viewer**: See vault contents without decryption

#### Timeline
- Development: 4-6 weeks
- Testing: 2 weeks
- Release: Q1 2025

#### Key Benefits
- Detect file corruption before critical recovery
- Prove authenticity of encrypted backups
- Preview vault contents safely

---

### 🔑 MVP 3: YubiKey Integration (Future)
**Goal**: Hardware security key support for enhanced protection

#### Features
- **Multiple Protection Modes**: Passphrase, YubiKey, or both
- **Multi-Recipient Encryption**: One vault, multiple keys
- **YubiKey Management**: Add/remove hardware keys
- **Smart Recovery**: Fallback between methods seamlessly

#### Timeline
- Development: 8-10 weeks
- Testing: 2 weeks
- Release: Q2 2025

#### Key Benefits
- Hardware-backed security
- Convenient PIN-based decryption
- Multiple recovery methods
- Enterprise-ready features

---

## Post-MVP Features (Backlog)

### Enhanced Features
- **Key Backup & Export**: USB/QR code backup workflows
- **Cloud Integration**: Optional secure cloud backup
- **Batch Operations**: Encrypt/decrypt multiple vaults
- **Scheduled Encryption**: Automatic backup workflows
- **Vault Collections**: Organize related vaults

### Enterprise Features
- **Team Management**: Shared vaults with access control
- **Audit Logging**: Compliance and tracking
- **Policy Enforcement**: Mandatory backup requirements
- **SSO Integration**: Corporate authentication

### Advanced Security
- **Shamir Secret Sharing**: Split keys among trustees
- **Hardware Wallet Support**: Ledger, Trezor integration
- **Plausible Deniability**: Hidden vaults
- **Quantum-Resistant**: Post-quantum cryptography

---

## Success Metrics

### MVP 1 (Current)
- ✅ Setup time: <90 seconds
- ✅ Encryption success rate: >99%
- ✅ Cross-platform compatibility: 3 OS

### MVP 2 (Target)
- Manifest generation: <2 seconds
- Signature verification: <500ms
- Zero false positives on integrity checks

### MVP 3 (Target)
- YubiKey setup: <5 minutes
- Hardware key adoption: 20% of users
- Recovery success rate: >99%

---

## Development Principles

1. **Security First**: Never compromise on encryption
2. **User Experience**: Simple enough for non-technical users
3. **Future-Proof**: Recoverable in 20+ years
4. **Local-First**: No mandatory network requirements
5. **Open Standards**: Use established cryptography (age)

---

## Release Strategy

### Alpha → Beta → Production
- **Alpha**: Core team testing (current)
- **Beta**: Limited external testing
- **Production**: Public release with support

### Platform Priority
1. macOS (primary development)
2. Windows (parallel testing)
3. Linux (community supported)

---

## Risk Management

### Technical Risks
- Age format changes → Version pinning
- Platform compatibility → Extensive testing
- Data loss → Multiple backup strategies

### User Adoption Risks
- Complexity → Progressive disclosure
- Trust → Open source, auditable
- Support → Comprehensive documentation

---

## Timeline Summary

```
2024 Q4: MVP 1 Development ✅
2025 Q1: MVP 1 Polish & MVP 2 Development
2025 Q2: MVP 2 Release & MVP 3 Development
2025 Q3: MVP 3 Release & Enhancement Phase
2025 Q4: Enterprise Features
```

---

*Last Updated: January 2025*
*Status: MVP 1 Complete, MVP 2 In Planning*