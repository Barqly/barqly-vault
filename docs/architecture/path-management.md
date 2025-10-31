# Path Management Architecture

**Version:** 1.0
**Date:** 2025-10-31
**Status:** Implemented

## Overview

The Barqly Vault path management system provides centralized, cross-platform directory and file path handling through the `PathProvider` component. This architecture ensures consistent behavior across macOS, Windows, and Linux platforms, with special support for bootstrap sequences and headless environments.

## Design Goals

1. **Single Source of Truth**: All path operations go through PathProvider
2. **Cross-Platform Consistency**: Same directory structure on all platforms
3. **Bootstrap Compatibility**: Works before and after Tauri AppHandle initialization
4. **Headless Support**: Graceful fallbacks for CI/Docker environments
5. **Security**: Proper Unix permissions (0o700) on all created directories
6. **DRY Principle**: No duplicate path logic across the codebase

## Architecture Components

### Core Component: PathProvider

```rust
pub struct PathProvider {
    app_handle: Option<AppHandle>,  // None during bootstrap
    platform: Platform,
    headless_mode: bool,
}
```

The PathProvider is initialized early in application startup (before logging) and maintains consistent paths throughout the application lifecycle.

## Directory Structure

### Application Data (Non-Sync)

Platform-specific secure storage for application data:

```
macOS:    ~/Library/Application Support/com.barqly.vault/
Windows:  %APPDATA%\com.barqly.vault\
Linux:    ~/.local/share/com.barqly.vault/  (XDG_DATA_HOME)
```

Contents:
```
com.barqly.vault/
├── keys/                           # Encrypted key files
│   ├── barqly-vault-key-registry.json
│   └── *.key                       # Individual encrypted keys
├── vaults/                         # Vault manifests
│   └── *.manifest
├── logs/                           # Application logs
│   └── barqly-vault.log
├── config/                         # App configuration
├── backups/                        # Backup files
│   └── manifest/
└── device.json                     # Device identity
```

### User Documents (Sync-Friendly)

User-visible directories for encrypted vaults:

```
~/Documents/ (or fallback in headless mode)
├── Barqly-Vaults/                 # Encrypted .age files
│   ├── VaultName.age
│   └── VaultName-RECOVERY.txt
└── Barqly-Recovery/               # Decrypted files
    └── VaultName/
```

## Initialization Sequence

### 1. Early Bootstrap Phase

```rust
// In lib.rs:run_app()
1. PathProvider::initialize()       // Creates PathProvider without AppHandle
2. logging::init()                  // Uses PathProvider for log directory
3. run_bootstrap()                  // Uses PathProvider for registry/manifests
```

At this stage, PathProvider uses manual path construction based on platform.

### 2. Tauri Setup Phase

```rust
// In Tauri setup callback
4. init_app_handle(handle)          // For binary paths
5. PathProvider::set_app_handle(handle)  // Update with Tauri handle
```

After this, PathProvider prefers Tauri's path resolver but maintains the same paths.

### 3. Runtime Phase

All subsequent operations use the fully-initialized PathProvider with consistent paths.

## Platform-Specific Implementation

### macOS

- Uses `ProjectDirs::from("com", "barqly", "vault")`
- Results in `~/Library/Application Support/com.barqly.vault/`
- Already correct, no special handling needed

### Windows

- **Critical**: Must use `com.barqly.vault` not `barqly\vault`
- Manual construction: `%APPDATA%\com.barqly.vault\`
- Avoids split between bootstrap and runtime paths

### Linux

- **Critical**: Must use `com.barqly.vault` not just `vault`
- Manual construction: `~/.config/com.barqly.vault/`
- Consistent with other platforms

## Headless Environment Support

The system detects headless environments by checking for CI/Docker environment variables:

```rust
- CI
- DOCKER
- GITHUB_ACTIONS
- GITLAB_CI
- JENKINS_URL
- BUILDKITE
- CIRCLECI
```

### Fallback Strategy

When `UserDirs::document_dir()` returns None:

1. **Primary fallback**: `~/.local/share/barqly-documents/`
2. **Secondary fallback**: Home directory
3. **Last resort**: Current working directory

## Security Considerations

### Unix Permissions

All directories are created with mode `0o700` (owner read/write/execute only):

```rust
pub fn ensure_dir_exists(&self, path: &Path) -> Result<(), StorageError> {
    // Create directory
    std::fs::create_dir_all(path)?;

    // Set restrictive permissions on Unix
    #[cfg(unix)]
    {
        let mut perms = metadata.permissions();
        perms.set_mode(0o700);
        std::fs::set_permissions(path, perms)?;
    }
}
```

### Path Validation

The system includes validation to prevent:
- Path traversal attacks (`../` sequences)
- Absolute paths when relative expected
- Invalid characters in filenames
- Windows reserved names (CON, PRN, AUX, etc.)

## API Design

### Initialization

```rust
// Early in startup (before logging)
init_path_provider()?;

// After Tauri setup
update_with_app_handle(app_handle)?;
```

### Path Access

```rust
// Get application directories
let app_dir = get_app_dir()?;
let keys_dir = get_keys_dir()?;
let logs_dir = get_logs_dir()?;

// Get user-visible directories
let vaults_dir = get_vaults_directory()?;
let recovery_dir = get_recovery_directory()?;
```

### Direct PathProvider Access

```rust
let provider = PathProvider::global()?;
let provider = provider.read()?;
let path = provider.app_config_dir()?;
provider.ensure_dir_exists(&path)?;
```

## Migration Notes

### From Scattered Implementation

Before PathProvider:
- Multiple implementations of path logic
- `get_app_dir()` in directories.rs
- `get_log_dir()` in logging/mod.rs
- Different fallback strategies
- Inconsistent error handling

After PathProvider:
- Single source of truth
- All modules delegate to PathProvider
- Consistent fallback strategy
- Unified error handling

### No Data Migration Required

Since the code was not released with the path inconsistencies, no migration of existing user data is required. The implementation ensures correct paths from the first release.

## Testing Strategy

### Unit Tests

- Platform detection
- Path consistency
- Headless mode detection
- Directory creation
- Permission setting

### Integration Tests

- Bootstrap sequence
- Full application startup
- Cross-component path usage

### Platform Tests

Each platform requires testing for:
- Correct base directory
- Consistent naming (`com.barqly.vault`)
- Permission settings
- Headless fallbacks

## Error Handling

The system uses `StorageError` with specific variants:

```rust
pub enum StorageError {
    InitializationFailed(String),
    DirectoryCreationFailed(PathBuf),
    PermissionDenied(PathBuf),
    // ... other variants
}
```

All path operations propagate errors with context about what failed and where.

## Future Considerations

### Potential Enhancements

1. **Configurable Paths**: Allow users to override default locations
2. **Path Migration**: Support for moving data between locations
3. **Network Paths**: Support for network-attached storage
4. **Portable Mode**: Self-contained installation support

### Maintenance Guidelines

1. **Never duplicate path logic** - Always use PathProvider
2. **Test bootstrap sequence** - Ensure paths work without AppHandle
3. **Verify headless support** - Test in CI/Docker environments
4. **Check permissions** - Ensure 0o700 on Unix systems
5. **Platform consistency** - Use `com.barqly.vault` everywhere

## Troubleshooting

### Common Issues

1. **"PathProvider not initialized"**
   - Ensure `init_path_provider()` is called early in `run_app()`
   - Check that it's called before any path operations

2. **Different paths during bootstrap vs runtime**
   - Verify Windows uses `com.barqly.vault` consistently
   - Check Linux uses full identifier, not just `vault`

3. **Headless environment failures**
   - Ensure fallback directories are accessible
   - Check environment variable detection

4. **Permission denied errors**
   - Verify Unix permissions are 0o700
   - Check parent directory permissions

## References

- Implementation: `src/services/shared/infrastructure/path_management/provider.rs`
- Bootstrap Integration: `src/lib.rs`
- Original Issues: `tbd/r2/cg2.md`
- Implementation Plan: `tbd/r2/path-provider-implementation.md`