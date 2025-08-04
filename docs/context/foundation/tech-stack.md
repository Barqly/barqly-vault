# Technology Stack

**Current versions and constraints for development**

## Core Technologies

### Backend (Rust)
```toml
# Rust toolchain
edition = "2021"
rust-version = "1.70"  # Minimum supported

# Core dependencies
tauri = "2.0"          # Desktop framework
age = "0.10"           # Encryption library
tar = "0.4"            # Archive creation
flate2 = "1.0"         # GZIP compression
serde = "1.0"          # Serialization
tokio = "1.39"         # Async runtime
thiserror = "1.0"      # Error handling
zeroize = "1.8"        # Memory safety

# Development dependencies
rstest = "0.18"        # Parameterized tests
tempfile = "3.8"       # Test file handling
criterion = "0.5"      # Benchmarking
```

### Frontend (TypeScript/React)
```json
// Node.js requirement
"node": "22.17.0 LTS"

// Core dependencies
"react": "^18.3.1"
"typescript": "^5.5.3"
"vite": "^5.4.11"
"tailwindcss": "^4.0.0-alpha"
"react-router-dom": "^7.1.1"
"@tauri-apps/api": "^2.2.0"

// UI Components
"@radix-ui/react-*": "^1.1.0"
"class-variance-authority": "^0.7.1"
"lucide-react": "^0.469.0"

// Development dependencies
"vitest": "^2.1.8"
"@testing-library/react": "^16.1.0"
"@testing-library/user-event": "^14.6.0"
"prettier": "^3.4.2"
"eslint": "^9.17.0"
```

## Build Tools

### Required Versions
```bash
# Check your versions
node --version      # Must be 22.17.0
rustc --version     # Latest stable
cargo --version     # Comes with Rust
npm --version       # Comes with Node.js

# Tauri CLI
cargo install tauri-cli@2
```

### Platform Requirements

#### macOS
- Xcode Command Line Tools
- macOS 10.15+ (Catalina or later)

#### Windows
- Visual Studio Build Tools 2022
- Windows 10 version 1803+

#### Linux
- webkit2gtk-4.1
- libssl-dev
- libgtk-3-dev

## Development Environment

### IDE Setup
```bash
# VSCode extensions
- rust-analyzer     # Rust language support
- Prettier          # Code formatting
- ESLint           # JavaScript linting
- Tailwind CSS     # CSS IntelliSense
```

### Environment Variables
```bash
# Development
RUST_LOG=debug      # Enable debug logging
VITE_DEV=true      # Frontend dev mode

# Testing
TEST_ENV=true      # Test environment flag
CI=true            # CI environment
```

## Security Libraries

### Cryptography
- **age**: Modern file encryption
- **ChaCha20-Poly1305**: AEAD cipher
- **scrypt**: Key derivation
- **SHA-256**: File integrity

### Memory Safety
- **zeroize**: Secure memory clearing
- **secrecy**: Secret value wrapper
- **constant_time_eq**: Timing-safe comparison

## Testing Stack

### Backend Testing
```rust
// Test framework
#[cfg(test)]       // Built-in Rust testing
rstest             // Parameterized tests
mockall            // Mocking (if needed)
proptest           // Property testing (future)
```

### Frontend Testing
```typescript
// Test framework
vitest                    // Test runner
@testing-library/react    // Component testing
@testing-library/user-event // User interactions
@vitest/ui               // Test UI
```

## CI/CD Pipeline

### GitHub Actions
```yaml
# Workflow tools
actions/checkout@v4
actions/setup-node@v4
dtolnay/rust-toolchain@stable
tauri-apps/tauri-action@v0
```

### Validation Commands
```bash
# Pre-commit validation
make validate         # Full suite
make validate-ui      # Frontend only
make validate-rust    # Backend only

# Individual checks
cargo fmt --check
cargo clippy -- -D warnings
npm run lint
npm run type-check
```

## Performance Tools

### Benchmarking
```bash
# Rust benchmarks
cargo bench

# Custom benchmark
make bench           # Cache performance

# Frontend metrics
npm run build -- --analyze
```

### Profiling
```bash
# Memory profiling
valgrind --tool=memcheck  # Linux/macOS
drmemory                  # Windows

# CPU profiling
perf record/report        # Linux
Instruments              # macOS
```

## Package Management

### Rust (Cargo)
```bash
cargo add <package>         # Add dependency
cargo update               # Update deps
cargo tree                 # Show dep tree
cargo audit               # Security check
```

### Node.js (npm)
```bash
npm install <package>      # Add dependency
npm update                # Update deps
npm ls                    # Show dep tree
npm audit                # Security check
```

## Version Constraints

### Minimum Supported Versions
| Component | Minimum | Recommended | Notes |
|-----------|---------|-------------|-------|
| Rust | 1.70 | Latest stable | Memory safety features |
| Node.js | 22.17.0 | 22.17.0 LTS | Required for Tailwind v4 |
| Tauri | 2.0 | 2.x latest | Desktop framework |
| React | 18.0 | 18.3.1 | Concurrent features |
| TypeScript | 5.0 | 5.5.3 | Strict mode required |

## Configuration Files

### Key Config Locations
```
src-tauri/
├── Cargo.toml           # Rust dependencies
├── tauri.conf.json      # Tauri configuration
└── .cargo/config.toml   # Cargo settings

src-ui/
├── package.json         # Node dependencies
├── tsconfig.json        # TypeScript config
├── vite.config.ts       # Build configuration
└── tailwind.config.js   # Styling config

root/
├── Makefile            # Build commands
├── .gitignore          # Git exclusions
└── CLAUDE.md           # Dev reference
```

## Platform-Specific Notes

### macOS Signing
```bash
# Code signing (future)
codesign --deep --force --verify
notarytool submit
```

### Windows Signing
```bash
# Certificate signing (future)
signtool sign /a /fd SHA256
```

### Linux Packaging
```bash
# AppImage/Flatpak (future)
appimage-builder
flatpak-builder
```