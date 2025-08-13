# Development Workflow

**Essential commands and processes for daily development**

## Quick Start Commands

### Most Used Commands

```bash
# Start development
make ui              # Frontend dev server (http://localhost:5173)
make app             # Desktop application

# Validate before commit
make validate        # Full validation (matches CI exactly)
make validate-ui     # Frontend only (~30s)
make validate-rust   # Backend only (~1-2min)

# Testing
make test            # All tests
make test-ui         # Frontend tests (~10-20s)
make test-rust       # Backend tests (~1-2min)
```

## Development Setup

### Initial Setup

```bash
# Clone and setup
git clone <repo>
cd barqly-vault

# Install dependencies
cd src-ui && npm install
cd ../src-tauri && cargo build

# Setup development environment
make dev-keys        # Generate sample keys
make setup-hooks     # Install git hooks
```

### Daily Workflow

```bash
# 1. Start your day
git pull origin main
make validate        # Ensure clean state

# 2. Create feature branch
git checkout -b feature/description

# 3. Development cycle
make ui             # Start frontend
# OR
make app            # Start full app

# 4. Test as you code
make test-ui        # Quick frontend tests
make test-rust      # Backend tests

# 5. Before committing
make validate       # Full validation
git add .
git commit -m "type(scope): description"
```

## Testing Workflow

### Running Tests

```bash
# All tests
make test

# Specific frontend test
cd src-ui && npm test -- FileSelectionButton.test.tsx

# Specific backend test
cd src-tauri && cargo test crypto::

# With coverage
cd src-ui && npm test -- --coverage
cd src-tauri && cargo tarpaulin
```

### Test Organization

```
src-ui/__tests__/           # Frontend tests
├── components/             # Component tests
├── hooks/                  # Hook tests
└── integration/            # Integration tests

src-tauri/tests/            # Backend tests
├── unit/                   # Unit tests
├── integration/            # Integration tests
└── smoke/                  # Smoke tests
```

## Code Quality Checks

### Frontend Validation

```bash
# TypeScript check
cd src-ui && npx tsc --noEmit

# Linting
cd src-ui && npm run lint

# Formatting
cd src-ui && npx prettier --check .
cd src-ui && npx prettier --write .  # Auto-fix
```

### Backend Validation

```bash
# Formatting
cd src-tauri && cargo fmt --check
cd src-tauri && cargo fmt           # Auto-fix

# Linting
cd src-tauri && cargo clippy --all-targets --all-features -- -D warnings

# Security audit
cd src-tauri && cargo audit
```

## Development Tools

### Useful Development Commands

```bash
# Reset development environment
make dev-reset       # Interactive cleanup

# Clean test artifacts
make clean-keys      # Remove test keys

# Run benchmarks
make bench           # Performance tests

# Generate sample data
make dev-keys        # Create 4 test keys
```

### Debugging

```bash
# Enable verbose logging
RUST_LOG=debug cargo tauri dev

# Frontend debugging
# Open browser DevTools in Tauri window

# Backend debugging with prints
dbg!(&variable);     # Debug print in Rust
console.log(data);   # Frontend logging
```

## Git Workflow

### Commit Convention

```bash
# Format: type(scope): description

# Types:
feat     # New feature
fix      # Bug fix
docs     # Documentation
style    # Formatting
refactor # Code restructuring
test     # Tests
chore    # Maintenance

# Examples:
git commit -m "feat(crypto): add key rotation support"
git commit -m "fix(ui): resolve dropdown selection issue"
git commit -m "docs: update development workflow"
```

### Branch Strategy

```bash
main                 # Production-ready code
├── feature/*        # New features
├── fix/*           # Bug fixes
├── refactor/*      # Code improvements
└── docs/*          # Documentation
```

## Performance Optimization

### Quick Performance Checks

```bash
# Run benchmarks
make bench

# Check bundle size
cd src-ui && npm run build
ls -lh src-ui/dist/

# Memory profiling
RUST_LOG=debug cargo tauri dev
# Monitor in Activity Monitor/Task Manager
```

### Common Optimizations

```typescript
// Frontend: Use lazy loading
const SetupPage = lazy(() => import("./pages/SetupPage"));

// Frontend: Memoize expensive operations
const result = useMemo(() => expensiveOp(data), [data]);
```

```rust
// Backend: Use references
fn process(data: &str) instead of fn process(data: String)

// Backend: Async operations
async fn long_operation() -> Result<T>
```

## Troubleshooting

### Common Issues

```bash
# Frontend won't start
cd src-ui && rm -rf node_modules package-lock.json
npm install
npm run dev

# Rust compilation errors
cd src-tauri && cargo clean
cargo build

# Test failures from artifacts
make clean-keys
make dev-reset

# Git hooks not running
chmod +x .git/hooks/pre-commit
```

### Platform-Specific Paths

```bash
# Find app data (macOS)
ls ~/Library/Application\ Support/barqly-vault/

# Find app data (Windows PowerShell)
ls $env:APPDATA\barqly-vault\

# Find app data (Linux)
ls ~/.config/barqly-vault/
```

## CI/CD Integration

### Pre-push Checklist

```bash
# 1. All tests pass
make test

# 2. Code quality checks
make validate

# 3. No security issues
cd src-tauri && cargo audit
cd src-ui && npm audit

# 4. Documentation updated
# Update relevant .md files

# 5. Commit message follows convention
git log --oneline -1
```

### CI Pipeline Stages

1. **Validation** - Formatting, linting, type checking
2. **Testing** - Unit, integration, smoke tests
3. **Security** - Dependency audits
4. **Build** - Compile for all platforms
5. **Package** - Create distributables

## Time-Saving Tips

### Fastest Iteration

```bash
# Frontend only changes
make validate-ui     # 30 seconds
make test-ui        # 10-20 seconds

# Backend only changes
make validate-rust   # 1-2 minutes
make test-rust      # 1-2 minutes

# Full validation only when:
# - Mixed changes
# - Before pushing
# - Final check
make validate       # 2-3 minutes
```

### Parallel Development

```bash
# Terminal 1: Frontend
make ui

# Terminal 2: Backend tests
watch -n 5 'cd src-tauri && cargo test'

# Terminal 3: Frontend tests
cd src-ui && npm test
```

## Definition of Done

Before marking any task complete:

- [ ] Feature works as specified
- [ ] Tests written and passing
- [ ] `make validate` passes
- [ ] Documentation updated
- [ ] No security warnings
- [ ] Performance acceptable
- [ ] Code reviewed (if team)
