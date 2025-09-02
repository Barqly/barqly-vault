# CI/CD Implementation Guide

**Created**: 2025-08-20  
**Updated**: 2025-09-02  
**Status**: Active Implementation Guide  
**Author**: System Architect

## Overview

This guide documents the implemented CI/CD system for Barqly Vault, focusing on the three-tier release process (alpha/beta/production) and operational procedures.

**For detailed release process steps, see [release-process.md](./release-process.md)**

## Current Implementation Status

### ✅ Implemented Components

1. **GitHub Actions Workflows**
   - `release.yml` - Beta-triggered builds with full cross-platform support
   - `deploy-docs.yml` - Automatic documentation deployment

2. **Release Scripts**
   - `scripts/cicd/promote-beta.sh` - Beta to production promotion
   - `scripts/cicd/publish-production.sh` - Production publication and docs update
   - `scripts/cicd/update-downloads.sh` - Download page generation
   - `scripts/cicd/generate-downloads.py` - Template-based page generation

3. **Automation Features**
   - macOS DMG notarization and code signing
   - Cross-platform artifact generation (macOS, Windows, Linux)
   - Automated file renaming during promotion
   - Documentation updates with version synchronization

### 🎯 Key Features

- **Cost-Efficient**: Only beta tags trigger expensive builds
- **Security-Compliant**: Manual publication maintains branch protection
- **Standardized**: Consistent file naming across all platforms
- **Automated**: Full build pipeline with minimal manual intervention

## Operational Workflow

### 1. Development Phase (Alpha Tags)

Create development checkpoints without triggering builds:

```bash
# Create alpha checkpoint
git tag v0.3.0-alpha.1
git push origin v0.3.0-alpha.1

# Continue development
git tag v0.3.0-alpha.2  
git push origin v0.3.0-alpha.2
```

**What happens**: Nothing automated - purely organizational markers

### 2. Testing Phase (Beta Tags)

Trigger full CI/CD pipeline for testing:

```bash
# Create beta release (triggers full build)
git tag v0.3.0-beta.1
git push origin v0.3.0-beta.1
```

**What happens automatically**:
1. GitHub Actions `release.yml` workflow triggers
2. Cross-platform builds (macOS Intel/ARM, Windows, Linux)
3. macOS DMG notarization and code signing
4. Creates beta draft release with all artifacts
5. Auto-creates production draft release (`v0.3.0`)

### 3. Beta Testing & Iteration

```bash
# If issues found, create new beta
git tag v0.3.0-beta.2
git push origin v0.3.0-beta.2

# Monitor releases
gh release list --limit 10
```

### 4. Production Promotion

Promote stable beta to production:

```bash
# List available betas
make promote-beta --list
# OR: ./scripts/cicd/promote-beta.sh --list

# Promote specific beta
make promote-beta FROM=0.3.0-beta.2 TO=0.3.0
# OR: ./scripts/cicd/promote-beta.sh --from 0.3.0-beta.2 --to 0.3.0
```

**What happens**:
1. Downloads all artifacts from beta release
2. Renames files to remove "-beta" suffix
3. Creates/updates production tag
4. Creates production draft release with standardized naming

### 5. Production Publication

Publish production release and update documentation:

```bash
# Publish to production
make publish-prod VERSION=0.3.0
# OR: ./scripts/cicd/publish-production.sh 0.3.0
```

**What happens**:
1. Converts GitHub draft to published release
2. Updates `public-docs/downloads/index.html` with new version
3. Updates `scripts/cicd/downloads/data.json` with release data
4. Commits and pushes documentation changes
5. Triggers automatic documentation deployment

## Repository Configuration

### Branch Protection Rules

The `main` branch has the following protection rules:

- ✅ Require pull request reviews
- ✅ Require status checks to pass before merging
- ✅ Require branches to be up to date before merging
- ✅ Include administrators in restrictions

**Why**: Maintains security while allowing manual publication scripts to bypass for documentation updates

### Required GitHub Secrets

```yaml
# Apple Developer Program (for macOS signing)
APPLE_CERTIFICATE_P12         # Base64 encoded .p12 certificate
APPLE_CERTIFICATE_PASSWORD    # Certificate password
APPLE_DEVELOPER_ID            # Developer ID Application
APPLE_API_KEY                 # App Store Connect API key
APPLE_API_KEY_ID             # API key ID
APPLE_API_ISSUER_ID          # API issuer ID

# Tauri (for app updates)
TAURI_SIGNING_PRIVATE_KEY    # For update mechanism

# Windows (optional, for signed releases)
WINDOWS_CERTIFICATE          # Base64 encoded .pfx
WINDOWS_CERTIFICATE_PASSWORD # Certificate password
```

## File Naming Conventions

### Beta Artifacts (Auto-Generated)
```
barqly-vault-{VERSION}-beta.{N}-macos-arm64.dmg
barqly-vault-{VERSION}-beta.{N}-macos-x86_64.dmg
barqly-vault-{VERSION}-beta.{N}-x64.msi
barqly-vault-{VERSION}-beta.{N}-windows-x64.zip
barqly-vault-{VERSION}-beta.{N}-1_amd64.deb
barqly-vault-{VERSION}-beta.{N}-1.x86_64.rpm
barqly-vault-{VERSION}-beta.{N}-1_amd64.AppImage
barqly-vault-{VERSION}-beta.{N}-x86_64.tar.gz
```

### Production Artifacts (After Promotion)
```
barqly-vault-{VERSION}-macos-arm64.dmg
barqly-vault-{VERSION}-macos-x86_64.dmg
barqly-vault-{VERSION}-x64.msi
barqly-vault-{VERSION}-windows-x64.zip
barqly-vault-{VERSION}-1_amd64.deb
barqly-vault-{VERSION}-1.x86_64.rpm
barqly-vault-{VERSION}-1_amd64.AppImage
barqly-vault-{VERSION}-x86_64.tar.gz
checksums.txt (regenerated)
```

## Platform-Specific Details

### macOS
- **Separate builds** for Intel (x86_64) and Apple Silicon (aarch64)
- **Code signing** with Developer ID certificates
- **Notarization** via Apple App Store Connect API
- **DMG distribution** for both architectures

### Windows
- **MSI installer** for standard installation
- **ZIP archive** for portable deployment
- **Optional code signing** with Authenticode certificates

### Linux
- **AppImage** for universal compatibility
- **.deb packages** for Debian/Ubuntu
- **.rpm packages** for RedHat/Fedora
- **.tar.gz archives** for manual installation

## Monitoring and Maintenance

### Weekly Tasks
- Monitor GitHub Actions usage and costs
- Review release metrics and build times
- Clean up old draft releases if needed

### Monthly Tasks
- Update GitHub Actions runner versions
- Review and optimize caching strategies
- Audit security certificates expiration

### Key Metrics
- **Build Time**: Target <30 minutes for full release
- **Success Rate**: Target >95% for beta builds
- **Cost**: Stay within GitHub Actions free tier limits

## Troubleshooting

### Common Issues

#### 1. Beta Build Failures
```bash
# Check workflow logs
gh run list --workflow=release.yml --limit 5

# View specific run
gh run view <run-id> --log
```

#### 2. Promotion Failures
```bash
# Verify beta release exists
gh release view v0.3.0-beta.1

# Check available artifacts
gh release view v0.3.0-beta.1 --json assets
```

#### 3. Publication Issues
```bash
# Verify draft release exists
gh release view v0.3.0

# Check branch protection status
gh api repos/barqly/barqly-vault/branches/main/protection
```

### Emergency Procedures

#### Rollback Release
```bash
# Delete problematic release
gh release delete v0.3.0 --yes

# Delete tag
git tag -d v0.3.0
git push origin --delete v0.3.0
```

#### Manual Documentation Update
```bash
# Update downloads directly
./scripts/cicd/update-downloads.sh 0.3.0

# Commit changes
git add public-docs/ scripts/cicd/downloads/
git commit -m "docs: manual update for v0.3.0"
git push origin main
```

## Quick Reference Commands

```bash
# Development
git tag v0.3.0-alpha.1 && git push origin v0.3.0-alpha.1

# Beta testing
git tag v0.3.0-beta.1 && git push origin v0.3.0-beta.1

# Production promotion
make promote-beta FROM=0.3.0-beta.2 TO=0.3.0

# Production publication  
make publish-prod VERSION=0.3.0

# Monitoring
gh release list --limit 10
gh run list --workflow=release.yml --limit 5
```

## Security Considerations

### Branch Protection Compliance
- Manual publication maintains branch protection rules
- No GitHub bot permissions required for production releases
- Human approval gate for all public releases

### Code Signing
- All macOS builds are notarized via Apple Developer Program
- Windows builds can be optionally signed with Authenticode
- Linux builds include SHA256 checksums for verification

### Secrets Management
- All sensitive credentials stored in GitHub Secrets
- Certificate expiration monitoring
- Regular credential rotation (annually)

---

*This implementation guide reflects the current operational CI/CD system. Updates should be made as the system evolves.*