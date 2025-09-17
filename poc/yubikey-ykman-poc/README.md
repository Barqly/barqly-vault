# YubiKey ykman POC

Minimal, production-ready YubiKey integration using ykman + age-plugin-yubikey with PTY automation.

## Architecture

This POC implements the pivot strategy from `tbd/cg20.md`:
- **ykman** for one-time initialization only (PIN, PUK, management key)
- **age-plugin-yubikey** for key generation and decryption
- **PTY automation** to handle PIN entry without user terminal interaction
- **No bundled binaries** - uses system-installed tools

## Key Features

- ✅ Minimal dependencies (no APDU, no yubikey crate)
- ✅ Clean API surface for Tauri integration
- ✅ Comprehensive error handling with user-friendly messages
- ✅ Auto-run test mode with sensible defaults
- ✅ Production-ready code structure (<250 lines per file)

## Requirements

### Using System Package Managers
```bash
# macOS
brew install yubikey-manager age-plugin-yubikey

# Windows
winget install Yubico.YubiKeyManager
cargo install age-plugin-yubikey

# Linux
apt install yubikey-manager pcscd
cargo install age-plugin-yubikey
```

### Using Bundled Binaries (Production)
For production deployments, the project includes scripts to download/build pinned versions:

```bash
# Download age-plugin-yubikey v0.5.0
./scripts/download-age-plugin.sh

# Build ykman v5.8.0 from source
./scripts/build-ykman.sh
```

The binaries are managed in `bin/` directory with SHA256 verification. See `bin/README.md` for CI/CD integration details.

## Quick Test

```bash
# Check requirements only
cargo run

# Auto-run complete setup (PIN will be 212121)
RUST_LOG=info cargo run -- --auto

# Reset YubiKey to test again
ykman piv reset -f
```

## Testing Options

The POC provides three testing modes:

### Option 1: Full Cycle (Reset YubiKey Scenario)
```bash
cargo run -- --auto
# Does: init → key gen → manifest → enc/dec test
```
Use this after resetting your YubiKey to perform complete initialization, generate age identity, create manifest, and test encryption/decryption.

### Option 2: Test Only (Existing Setup)
```bash
cargo run -- --test-only
# Does: enc/dec using existing manifest
```
Use this when you already have a manifest and want to test encryption/decryption without reinitializing.

### Option 3: Manual Mode (With Prompts)
```bash
cargo run
# Does: Same as --auto but with user confirmation prompts
```
Use this for step-by-step execution with manual confirmations.

### Important Notes
- The manifest (`yubikey-manifest.json`) stores the YubiKey serial, recipient, and identity
- Identity files are created dynamically from the manifest during decryption
- All temporary files are cleaned up after successful operations
- Failed operations keep temp files in `/tmp` for debugging

## Integration into Tauri App

### 1. Copy Module Files

Copy these files to `src-tauri/src/yubikey/`:
- `errors.rs` - Error types and results
- `ykman.rs` - ykman wrapper functions
- `pty.rs` - PTY automation for age-plugin
- `lib.rs` → rename to `mod.rs`

### 2. Update Cargo.toml

Add to `src-tauri/Cargo.toml`:
```toml
portable-pty = "0.8"
nix = { version = "0.27", features = ["term"] }
```

### 3. Tauri Commands

```rust
use crate::yubikey;

#[tauri::command]
async fn check_yubikey_requirements() -> Result<Requirements, String> {
    yubikey::check_requirements()
        .map_err(|e| e.to_string())
}

#[tauri::command]
async fn initialize_yubikey(pin: String) -> Result<InitStatus, String> {
    yubikey::initialize_yubikey(&pin)
        .map_err(|e| e.to_string())
}

#[tauri::command]
async fn generate_yubikey_identity(pin: String) -> Result<String, String> {
    yubikey::generate_age_identity(&pin)
        .map_err(|e| e.to_string())
}
```

### 4. Frontend Integration

```typescript
// Check requirements
const reqs = await invoke('check_yubikey_requirements');
if (!reqs.ykman_installed) {
  // Show installation instructions
}

// Initialize YubiKey
const status = await invoke('initialize_yubikey', { pin: '212121' });

// Generate identity
const recipient = await invoke('generate_yubikey_identity', { pin: '212121' });
// Save recipient for encryption operations
```

## API Reference

### Core Functions

```rust
// Check all prerequisites
pub fn check_requirements() -> Result<Requirements>

// Initialize YubiKey (idempotent)
pub fn initialize_yubikey(pin: &str) -> Result<InitStatus>

// Generate age identity (requires touch)
pub fn generate_age_identity(pin: &str) -> Result<String>

// Complete workflow (for testing)
pub fn complete_setup(pin: Option<&str>) -> Result<String>
```

### Key Types

```rust
struct Requirements {
    ykman_installed: bool,
    age_plugin_installed: bool,
    yubikey_present: bool,
    yubikey_info: Option<YubiKeyInfo>,
}

struct InitStatus {
    pin_changed: bool,
    puk_changed: bool,
    management_key_set: bool,
    ready_for_generation: bool,
    message: String,
}
```

## Error Handling

All errors implement Display with user-friendly messages:
- `YkmanNotFound` - Installation instructions
- `NoYubiKey` - Insert device prompt
- `PinFailed(attempts)` - Remaining attempts
- `TouchTimeout` - Touch reminder

## Security Notes

- PIN/PUK never persisted, only in memory
- Management key uses TDES + protected mode
- Touch policy set to "cached" for better UX
- PTY streams are process-local

## Testing Workflow

1. Reset YubiKey: `ykman piv reset -f`
2. Run POC: `RUST_LOG=info cargo run -- --auto`
3. Touch YubiKey when it blinks
4. Save the generated recipient string

## Differences from APDU POC

| Aspect | APDU POC | This POC |
|--------|----------|----------|
| Dependencies | yubikey, pcsc, aes, des | portable-pty only |
| Lines of Code | ~1000 | ~500 |
| External Tools | Tries to avoid | Embraces ykman |
| Complexity | High (raw APDU) | Low (subprocess) |
| Maintenance | Fragile | Stable |

## Next Steps

1. Integrate into main Tauri app
2. Add UI for touch prompts
3. Implement decryption flow
4. Add telemetry (no sensitive data)
5. Test across platforms