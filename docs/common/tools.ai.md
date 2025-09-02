# tools.ai.md

_Agent-optimized command patterns and intent mappings_

## Validation Hierarchy

```yaml
validation:
  before_commit: "make validate" # Full validation (2-3 min)
  frontend_only: "make validate-ui" # ~30s
  backend_only: "make validate-rust" # ~1-2min

quick_checks:
  frontend_tests: "make test-ui" # ~10-20s
  backend_tests: "make test-rust" # ~1min
  all_tests: "make test" # ~2-3min
```

## Intent Mappings

```yaml
common_tasks:
  "start development": "make app"
  "start frontend only": "make ui"
  "validate before commit": "make validate"
  "quick test iteration": "make test-ui"
  "fix all formatting": "cd src-ui && npx prettier --write . && cd ../src-tauri && cargo fmt"
  "clean environment": "make dev-reset"
  "generate test keys": "make dev-keys"
```

## Tauri-Specific Operations

```yaml
tauri_commands:
  add_new_command:
    1: "Create file in src-tauri/src/commands/"
    2: "Register in src-tauri/src/lib.rs"
    3: "cd src-tauri && cargo build --features generate-types"

  debug_mode: "RUST_LOG=debug cargo tauri dev"

  type_generation: "cd src-tauri && cargo build --features generate-types"
```

## Test Patterns

```yaml
specific_tests:
  frontend_file: "cd src-ui && npm test -- [filename]"
  frontend_watch: "cd src-ui && npm test"
  backend_module: "cd src-tauri && cargo test [module]::"
  backend_single: "cd src-tauri && cargo test [test_name]"
```

## Performance Optimization

```yaml
parallel_execution:
  # Run validation in parallel
  validate_all: "make validate-ui & make validate-rust & wait"

  # Watch mode development
  terminal_1: "make ui"
  terminal_2: "cd src-tauri && cargo watch -x test"
  terminal_3: "cd src-ui && npm test"
```

## Error Recovery

```yaml
common_fixes:
  frontend_wont_start:
    - "cd src-ui && rm -rf node_modules package-lock.json"
    - "cd src-ui && npm install"

  rust_compilation_errors:
    - "cd src-tauri && cargo clean"
    - "cd src-tauri && cargo build"

  test_artifacts_cleanup:
    - "make clean-keys"
    - "make dev-reset"
```

## Platform Paths

```yaml
key_storage_locations:
  macos: "~/Library/Application Support/barqly-vault/"
  windows: "%APPDATA%\\barqly-vault\\"
  linux: "~/.config/barqly-vault/"
```

## Release Engineering

```yaml
release_commands:
  # Current three-tier tagging convention with incremental versioning:
  # - alpha: v{VERSION}-alpha.{N} - Development checkpoints (NO CI/CD trigger)
  # - beta: v{VERSION}-beta.{N} - Testing builds (triggers full CI/CD)
  # - production: v{VERSION} - Final releases (manual promotion only)
  
  # Alpha development checkpoints (no build)
  alpha_checkpoint: "git tag v0.3.0-alpha.1 && git push origin v0.3.0-alpha.1"
  alpha_iteration: "git tag v0.3.0-alpha.2 && git push origin v0.3.0-alpha.2"
  
  # Beta releases with full CI/CD builds
  beta_testing: "git tag v0.3.0-beta.1 && git push origin v0.3.0-beta.1"
  beta_iteration: "git tag v0.3.0-beta.2 && git push origin v0.3.0-beta.2"
  
  # Production promotion (no rebuild - reuses beta artifacts)
  promote_beta: "make promote-beta FROM=0.3.0-beta.2 TO=0.3.0"
  promote_beta_alt: "./scripts/cicd/promote-beta.sh --from 0.3.0-beta.2 --to 0.3.0"
  
  # Production publication (manual security gate)
  publish_production: "make publish-prod VERSION=0.3.0"
  publish_production_alt: "./scripts/cicd/publish-production.sh 0.3.0"
  
  # List available betas for promotion
  list_betas: "./scripts/cicd/promote-beta.sh --list"
  
  # Manual workflow dispatch (testing only)
  manual_selective:
    command: |
      gh workflow run release.yml \
        -f version=0.3.0 \
        -f selective_build=true \
        -f build_macos_intel=false \
        -f build_macos_arm=true \
        -f build_linux=true \
        -f build_windows=false

platform_matrix:
  macos_intel: "x86_64-apple-darwin"
  macos_arm: "aarch64-apple-darwin"
  linux: "x86_64-unknown-linux-gnu"
  windows: "x86_64-pc-windows-msvc"

artifacts_generated:
  macos: ["*.dmg"]  # Signed & notarized DMGs only
  windows: ["*.msi", "*.zip"]  # MSI installer + standalone ZIP
  linux: ["*_amd64.deb", "*.x86_64.rpm", "*_amd64.AppImage", "*x86_64.tar.gz"]
```

## Quick Reference

```yaml
# Task priority for different scenarios
frontend_change: ["make validate-ui", "make test-ui"]
backend_change: ["make validate-rust", "make test-rust"]
mixed_changes: ["make validate", "make test"]
before_push: ["make validate", "npm audit", "cargo audit"]

# Release cycle workflow
before_beta: ["make validate", "git tag v{version}-alpha.{N}"] # checkpoint
create_beta: ["git tag v{version}-beta.1", "monitor CI/CD build"]
promote_to_prod: ["make promote-beta FROM={version}-beta.{N} TO={version}"]
publish_release: ["make publish-prod VERSION={version}"]

# Monitoring and troubleshooting
check_releases: ["gh release list --limit 10"]
check_workflows: ["gh run list --workflow=release.yml --limit 5"]
check_betas: ["./scripts/cicd/promote-beta.sh --list"]
```
