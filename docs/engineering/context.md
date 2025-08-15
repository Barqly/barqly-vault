# Engineering Context - Barqly Vault

## What You Can Do Right Now

```bash
# Start developing in 30 seconds
git clone https://github.com/inauman/barqly-vault.git
cd barqly-vault
npm install && cargo build
make demo               # Start with interactive demos
```

This gets you a running system with live component demos. Everything else builds from here.

## The Engineering Philosophy

Engineering at Barqly Vault is about **making the right thing easy and the wrong thing hard**. We've built systems that guide you toward quality without getting in your way. The validation mirrors CI exactly - if it works locally, it ships. The demo system lets you see changes instantly. The recovery plans mean you're never stuck.

## Progressive Development Flow

### Level 1: Immediate Productivity (First 5 Minutes)

```bash
make demo               # Interactive component demos
make validate-ui        # Quick frontend validation (~30s)
make test-ui           # Run frontend tests (~10-20s)
```

You're now developing with hot reload, seeing your changes live, and validating as you go. The demo system automatically detects you're in development and enables the right mode.

### Level 2: Full Stack Development (First Hour)

```bash
make desktop           # Full Tauri app experience
make validate          # Complete validation (mirrors CI)
make test              # All tests (frontend + backend)
```

Now you're working with the complete encryption system - frontend, backend, and cross-platform desktop app. The validation system ensures your changes will pass CI.

### Level 3: Advanced Operations (As Needed)

```bash
# Surgical validation for specific changes
make validate-rust     # Rust only (~1-2min)
cd src-ui && npm test -- FileSelectionButton.test.tsx  # Single test

# Recovery from failure
make clean && make build  # Full rebuild
./scripts/setup-hooks.sh  # Reinstall pre-commit hooks
```

You now understand the full system and can optimize your workflow for speed while maintaining quality.

## The Three Pillars of Engineering

### 1. Developer Experience First

Every decision optimizes for developer productivity:

- **Hot reload everywhere** - See changes instantly in UI and demos
- **Smart automation** - Demo mode auto-detects development context
- **Copy-paste commands** - Everything in docs is immediately runnable
- **Fast feedback loops** - Validation tells you exactly what's wrong

### 2. Quality as Code

Quality isn't checked after - it's built in:

- **Pre-commit hooks** block bad code before it enters the repo
- **Validation hierarchy** - Quick checks first, comprehensive checks on demand
- **Test recovery plans** - When tests break, we know exactly how to fix them
- **CI/CD mirroring** - Local validation exactly matches CI pipeline

### 3. Failure Recovery

Mature systems plan for failure:

- **Test suite recovery** - 24-step plan when tests drift from implementation
- **Existing project onboarding** - Baseline and backup before any changes
- **Clear error messages** - Know what broke and how to fix it
- **Incremental validation** - Fix one thing at a time

## The Validation System

Our validation is hierarchical and intelligent:

```bash
# Quick validation during development
make test-ui            # ~10-20s - Run this frequently
make validate-ui        # ~30s - Before committing frontend changes

# Comprehensive validation before pushing
make validate           # ~2-3min - Mirrors CI exactly
```

**Why this matters:** The validation system catches issues before they waste time in CI. A 30-second local check saves a 5-minute CI failure and context switch.

## The Demo System

The demo system is our secret weapon for rapid development:

```bash
npm run demo
# Automatically:
# - Detects development environment
# - Enables demo routes if needed
# - Starts with hot reload
# - Provides component playground
```

**Key insight:** Production code and demo code are cleanly separated. Pre-commit hooks ensure demo mode never reaches production. You get the benefits of rapid prototyping without the risks.

## Connecting to Architecture

Engineering implements what Architecture designs:

### From Architecture's Modular Design

```typescript
// Architecture defines the interface
interface EncryptionService {
  encrypt(files: File[], key: Key): Promise<Archive>;
}

// Engineering provides the implementation
class AgeEncryptionService implements EncryptionService {
  async encrypt(files: File[], key: Key): Promise<Archive> {
    // Concrete implementation using age-encryption
    // Tar archiving, progress tracking, error handling
  }
}
```

### From Architecture's Security Model

```rust
// Architecture specifies: "Keys must be zeroed from memory"
// Engineering implements with zeroize crate
use zeroize::Zeroize;

struct SensitiveData {
    #[zeroize(drop)]
    passphrase: String,
}
```

## Connecting to Product

Engineering delivers what Product envisions:

### From Product's User Journey

```bash
# Product wants: "Simple three-step encryption"
# Engineering delivers:
make demo  # See the three-step flow in action
# 1. Setup page with key generation
# 2. Encrypt page with file selection
# 3. Success with clear feedback
```

### From Product's Quality Goals

```bash
# Product wants: "Bank-grade security, consumer-grade UX"
# Engineering ensures:
make validate  # Security checks (clippy, tests)
make demo      # UX iteration with instant feedback
```

## Recent Implementations (January 2025)

### Alpha Release - Three Functional Screens

Successfully implemented and tested all three core user screens:

1. **SetupPage** - Encryption identity creation
   - 90-second setup process achieved
   - Password strength validation
   - Key generation with memorable labels
   - Trust indicators and Bitcoin branding

2. **EncryptPage** - File encryption workflow
   - Drag-and-drop interface
   - Batch file processing
   - Progress tracking with debouncing
   - Archive creation with manifests

3. **DecryptPage** - File recovery workflow
   - Emergency-optimized UX
   - Clear error recovery
   - Directory structure preservation
   - Family-member tested

### UI Testing Standards Established

Created comprehensive testing patterns based on learnings:

- Mock isolation strategies
- Async operation handling
- Component testing best practices
- See: `/docs/engineering/testing-ui-standards.md`

### Performance Optimizations

- Implemented progress debouncing (80% IPC reduction)
- Added component lazy loading
- Optimized test suite performance

### UI Consistency Refactoring (January 2025)

Successfully completed comprehensive UI refactoring to achieve visual and functional consistency:

**Visual Consistency:**
- Added progress bar steppers across all three main screens (Setup, Encrypt, Decrypt)
- Created UniversalHeader component replacing fragmented headers
- Standardized button layouts with left/right positioning patterns
- Implemented consistent spacing system using CSS variables

**UX Improvements:**
- Optimized vertical spacing for better viewport utilization (reduced form gaps)
- Eliminated blank card flash during Setup key generation
- Added logical flow enhancement: "Decrypt Your Vault" button on Encrypt success screen
- Implemented user-friendly help content with unified imperative verb structure

**Testing Excellence:**
- Fixed all 14 failing frontend tests after UI changes
- Updated test selectors to handle multiple buttons with same accessible names
- Updated test expectations to match new help content structure
- Maintained 100% test coverage with 669/669 tests passing

**Technical Implementation:**
- Created reusable ProgressBar component with compact and default variants
- Implemented responsive design patterns for success panels
- Enhanced CollapsibleHelp component with context-aware content
- Applied consistent focus management and accessibility patterns

## Common Workflows

### Adding a New Feature

```bash
# 1. Start with the demo system
make demo

# 2. Create component in demo first
# src-ui/src/components/forms/YourComponentDemo.tsx

# 3. Iterate with hot reload until perfect

# 4. Integrate into main app
# src-ui/src/components/forms/YourComponent.tsx

# 5. Validate before committing
make validate-ui

# 6. Commit (pre-commit hook runs automatically)
git add . && git commit -m "feat: your feature"
```

### Fixing a Broken Test Suite

```bash
# 1. Assess the damage
make test-ui

# 2. Fix incrementally (see test-suite-recovery-plan.md)
cd src-ui && npm test -- specific-test.tsx

# 3. Validate fixes
make validate-ui

# 4. Full validation before declaring victory
make validate
```

### Joining an Existing Project

```bash
# 1. Create baseline (never modify without backup)
git tag baseline-$(date +%Y%m%d)

# 2. Understand current state
make validate  # See what's working/broken

# 3. Start with demo system
make demo  # Safe playground for learning

# 4. Make changes incrementally
# Fix one validation error at a time
```

## Performance Targets

These aren't aspirational - we measure and maintain them:

- **Startup time**: <2 seconds (Tauri optimizations)
- **Encryption speed**: >10MB/s (age library performance)
- **Memory usage**: <200MB typical (zeroize for security)
- **Development feedback**: <100ms (hot reload)
- **Test execution**: <30s for UI suite

## The Tools That Matter

### Core Commands

```bash
make demo              # Your home base for development
make validate          # Your safety net before pushing
make test-ui           # Your quick feedback during coding
```

### Key Files to Know

```
src-ui/src/App.demo.tsx        # Demo system entry point
scripts/automated-dev.sh       # Smart development automation
scripts/pre-commit             # Quality gates
Makefile                       # All commands in one place
docs/engineering/desktop-app-debugging-guide.md  # Desktop app troubleshooting
```

### Recovery Commands

```bash
make clean             # When things get weird
npm run demo:disable   # Return to production mode
cargo clean           # Reset Rust build cache
```

## What Makes Our Engineering Special

1. **We've solved the demo problem** - Safe, automated switching between demo and production modes
2. **We've solved the validation problem** - Hierarchical checks that mirror CI exactly
3. **We've solved the recovery problem** - Documented plans for when things break
4. **We've solved the onboarding problem** - New developers productive in minutes

## The Path Forward

Engineering excellence isn't about perfection - it's about:

- **Fast feedback loops** that catch issues early
- **Clear recovery paths** when things go wrong
- **Progressive disclosure** that doesn't overwhelm
- **Practical documentation** you can copy-paste and run

This is a living system. Every command has been run. Every workflow has been tested. Every failure mode has been encountered and documented.

Welcome to Barqly Vault engineering - where building secure software is as smooth as the experience we create for our users.

---

_"Make the right thing easy and the wrong thing hard" - The Barqly Vault Way_
