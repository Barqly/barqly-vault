# CI/CD Implementation Guide

**Quick Start Guide for Transitioning to the New CI/CD Architecture**

## Current State Analysis

### Existing Workflows
1. **build-linux.yml** - Manual trigger + tag-based Linux builds
2. **deploy-docs.yml** - Auto-deploy documentation to GitHub Pages

### Issues Identified
- Builds triggering on every push (resource waste)
- Both workflows sometimes building unnecessarily
- No intelligent path filtering
- Missing cross-platform testing

## Migration Steps

### Step 1: Test New Workflows (Safe)

First, test the new workflows alongside existing ones:

```bash
# 1. Keep existing workflows but rename them
mv .github/workflows/build-linux.yml .github/workflows/build-linux.yml.backup
mv .github/workflows/deploy-docs.yml .github/workflows/deploy-docs.yml.backup

# 2. The new workflows are already created:
# - ci-smart-pipeline.yml (intelligent CI)
# - release.yml (comprehensive releases)
# - deploy-docs.yml (keep as-is, it's already optimized)

# 3. Restore deploy-docs.yml as it's already well-configured
mv .github/workflows/deploy-docs.yml.backup .github/workflows/deploy-docs.yml
```

### Step 2: Configure Repository Settings

#### Branch Protection Rules

1. Go to Settings → Branches
2. Add rule for `main` branch:
   - ✅ Require pull request reviews
   - ✅ Require status checks to pass:
     - `CI Summary`
     - `Frontend Validation`
     - `Rust Validation`
   - ✅ Require branches to be up to date
   - ✅ Include administrators (optional)

#### Secrets Configuration

Add these secrets in Settings → Secrets and variables → Actions:

```yaml
# Required for releases (optional for development)
TAURI_SIGNING_PRIVATE_KEY    # For update mechanism

# macOS (optional, for signed releases)
APPLE_CERTIFICATE             # Base64 encoded .p12
APPLE_CERTIFICATE_PASSWORD   # Certificate password
APPLE_SIGNING_IDENTITY       # Developer ID Application
APPLE_ID                      # Apple ID for notarization
APPLE_PASSWORD                # App-specific password
APPLE_TEAM_ID                # Team ID

# Windows (optional, for signed releases)
WINDOWS_CERTIFICATE           # Base64 encoded .pfx
WINDOWS_CERTIFICATE_PASSWORD # Certificate password
```

### Step 3: Test the Workflows

#### Test CI Pipeline

```bash
# Create a test branch
git checkout -b test/ci-pipeline

# Make a small change to trigger CI
echo "// CI test" >> src-tauri/src/main.rs

# Commit and push
git add .
git commit -m "test: verify CI pipeline"
git push origin test/ci-pipeline

# Create a PR to see the CI in action
```

#### Test Manual Triggers

1. Go to Actions tab
2. Select "Smart CI Pipeline"
3. Click "Run workflow"
4. Choose options:
   - Platforms: all
   - Build type: debug
   - Run tests: true

#### Test Release Pipeline

```bash
# Create a test tag (use beta for safety)
git tag v0.1.0-beta.1
git push origin v0.1.0-beta.1

# This will trigger the release workflow
# Check Actions tab to monitor progress
```

### Step 4: Optimization Tips

#### Reducing Build Times

1. **Use Path Filters Effectively**
   ```yaml
   # In your PR, if you only changed docs:
   # The CI will skip Rust/Frontend validation automatically
   ```

2. **Manual Control for Expensive Operations**
   ```bash
   # Use labels on PRs to control builds
   # Add label: "skip-ci" to skip CI
   # Add label: "full-build" to force all platforms
   ```

3. **Cache Warming**
   ```bash
   # Run a manual build weekly to keep caches warm
   # Schedule this in the workflow or manually
   ```

## Quick Answers to Your Questions

### Q1: "Is firing on every push standard practice?"

**Answer**: No, it's not optimal. The new architecture uses:
- **Pull Request triggers** for development (more controlled)
- **Main branch triggers** only after PR merge (production readiness)
- **Tag triggers** for releases (explicit control)
- **Manual triggers** for special cases (maximum flexibility)

### Q2: "How to build only changed code?"

**Answer**: Implemented via path filtering:
```yaml
# The new CI automatically detects:
- Frontend changes → runs only frontend validation
- Rust changes → runs only Rust validation
- Doc changes → skips code validation entirely
- Uses dorny/paths-filter for intelligent detection
```

### Q3: "Universal distribution for Linux/Windows?"

**Answer**: 
- **Linux**: AppImage is closest to universal (works on most distros)
- **Windows**: MSIX for modern Windows, MSI for compatibility
- **Strategy**: Build multiple formats, let users choose

### Q4: "Cross-platform testing without machines?"

**Answer**: Multiple solutions implemented:
1. **GitHub Actions** - Free runners for all platforms
2. **Container testing** - Linux variants via Docker
3. **Future options**:
   - BrowserStack (free for open source)
   - Self-hosted runners on your PopOS machine
   - Community testing via beta releases

## Monitoring and Maintenance

### Weekly Tasks
- Review Action run times in Insights → Actions
- Check cache hit rates
- Update dependencies if needed

### Monthly Tasks
- Review and optimize slow jobs
- Clean up old workflow runs
- Update runner versions if available

### Metrics to Track
- Average CI time: Target < 5 minutes for PRs
- Release build time: Target < 30 minutes for all platforms
- Cache hit rate: Target > 80%
- Monthly minute usage: Stay under 2000 (free tier)

## Troubleshooting

### Common Issues and Solutions

1. **"Workflow not triggering"**
   ```bash
   # Check path filters
   # Ensure changes match trigger paths
   # Verify branch protection settings
   ```

2. **"Build failing on Linux"**
   ```bash
   # Usually missing dependencies
   # Check the apt-get install section
   # May need to add more libraries
   ```

3. **"Cache not working"**
   ```bash
   # Check cache keys
   # Ensure paths are correct
   # Verify restore-keys fallback
   ```

4. **"Releases not publishing"**
   ```bash
   # Check secrets configuration
   # Verify tag format (v*.*.*)
   # Ensure permissions are set
   ```

## Cost Estimation

With the optimized pipeline:

| Scenario | Minutes/Month | Cost |
|----------|---------------|------|
| 10 PRs/week | ~200 | Free |
| Daily builds | ~600 | Free |
| 2 releases | ~60 | Free |
| **Total** | **~860** | **$0** |

Well within GitHub's free tier (2,000 minutes)!

## Next Steps

1. **Week 1**: Test new CI pipeline with PRs
2. **Week 2**: Test release pipeline with beta tag
3. **Week 3**: Add platform-specific tests
4. **Week 4**: Enable security scanning
5. **Month 2**: Consider code signing setup

## Quick Commands Reference

```bash
# Run CI locally (approximate)
make validate        # Full validation
make validate-ui     # Frontend only
make validate-rust   # Backend only

# Create a release
git tag v1.0.0
git push origin v1.0.0

# Manual workflow trigger via CLI
gh workflow run ci-smart-pipeline.yml \
  -f platforms=all \
  -f build_type=release \
  -f run_tests=true

# Check workflow status
gh run list --workflow=ci-smart-pipeline.yml

# Download artifacts
gh run download <run-id>
```

## Summary

The new CI/CD architecture provides:
- ✅ Smart triggers (no more waste)
- ✅ Selective building (only what changed)
- ✅ Cross-platform support (all major OS)
- ✅ Automated testing (quality gates)
- ✅ Cost-efficient (stays in free tier)
- ✅ Manual control when needed

Start with the CI pipeline for PRs, then gradually adopt the release pipeline. The architecture is designed to grow with your project!

---

*For detailed architecture documentation, see [cicd-pipeline-architecture.md](./cicd-pipeline-architecture.md)*