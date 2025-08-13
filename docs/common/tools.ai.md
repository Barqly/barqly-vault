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

## Quick Reference

```yaml
# Task priority for different scenarios
frontend_change: ["make validate-ui", "make test-ui"]
backend_change: ["make validate-rust", "make test-rust"]
mixed_changes: ["make validate", "make test"]
before_push: ["make validate", "npm audit", "cargo audit"]
```
