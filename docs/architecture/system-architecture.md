# Barqly Vault Technical Architecture

## Overview

Barqly Vault is a security-focused desktop application designed specifically for Bitcoin custody backup and restoration. It provides a trust-minimized, self-sovereign solution for encrypting sensitive files like output descriptors, wallet databases, and access keys.

## Core Architecture Principles

1. **Security First**: All cryptographic operations use audited libraries (age encryption)
2. **User Sovereignty**: No cloud dependencies, local-only operation
3. **Cross-Platform Consistency**: Identical behavior across macOS, Windows, Linux
4. **Bitcoin Custody Optimized**: Designed for small, critical files (<100MB)
5. **Minimal Dependencies**: Reduce attack surface and complexity

## Technology Stack

### Backend (Rust)
- **Framework**: Tauri v2 (latest stable)
- **Encryption**: age-encryption crate (preferred over CLI for better control)
- **Archiving**: tar crate for preserving folder structure
- **Serialization**: serde for JSON handling
- **Error Handling**: thiserror + anyhow
- **Logging**: tracing for structured logging
- **Memory Safety**: zeroize for clearing sensitive data

### Frontend (TypeScript/React)
- **UI Framework**: React 19.1 (latest stable)
- **Language**: TypeScript 5.x (strict mode)
- **Styling**: Tailwind CSS v4 + Shadcn/ui components
- **State Management**: Zustand (lightweight, TypeScript-friendly)
- **Routing**: React Router v7
- **Build Tool**: Vite with @tailwindcss/vite plugin
- **Node.js**: v22.17.0 LTS
- **Design System**: OKLCH colors, CSS variables, dark mode support

## Project Structure

```
barqly-vault/
├── src-tauri/          # Rust backend (Tauri)
│   ├── src/            # Rust source code
│   ├── Cargo.toml      # Backend dependencies
│   └── tauri.conf.json # Tauri configuration
├── src-ui/             # React/TypeScript frontend
│   ├── src/            # Frontend source code
│   ├── package.json    # Frontend dependencies
│   └── vite.config.ts  # Vite configuration
├── package.json        # Root workspace (npm)
├── Cargo.toml          # Root workspace (Rust)
├── Makefile            # Development commands
└── README.md           # Project documentation
```

### Monorepo Setup
- **npm workspace**: Configured for frontend package management
- **Cargo workspace**: Configured for Rust backend management
- **Development commands**: Available from root via Makefile or npm scripts
- **Package installation**: Works from root or subdirectories

## Module Architecture

### 1. Crypto Module (`src-tauri/src/crypto/`)
```rust
pub mod age_crypto {
    use age::{Encryptor, Decryptor, Identity, Recipient};
    use zeroize::Zeroize;
    
    // Key generation using age crate
    pub fn generate_keypair() -> Result<(PublicKey, PrivateKey)>
    
    // Passphrase protection for private keys
    pub fn encrypt_private_key(key: &PrivateKey, passphrase: &str) -> Result<Vec<u8>>
    
    // File encryption/decryption
    pub fn encrypt_archive(data: &[u8], recipient: &PublicKey) -> Result<Vec<u8>>
    pub fn decrypt_archive(data: &[u8], key: &PrivateKey) -> Result<Vec<u8>>
    
    // Ensure sensitive data is cleared from memory
    impl Drop for PrivateKey {
        fn drop(&mut self) {
            self.0.zeroize();
        }
    }
}
```

### 2. Storage Module (`src-tauri/src/storage/`)
```rust
pub mod key_storage {
    // Cross-platform path handling
    pub fn get_key_directory() -> PathBuf
    
    // Key file operations
    pub fn save_encrypted_key(label: &str, encrypted_key: &[u8]) -> Result<()>
    pub fn list_keys() -> Result<Vec<KeyInfo>>
    pub fn load_encrypted_key(label: &str) -> Result<Vec<u8>>
}
```

### 3. File Operations Module (`src-tauri/src/file_ops/`)
```rust
pub mod archive {
    // Staging area management
    pub fn create_staging_area() -> Result<PathBuf>
    pub fn cleanup_staging_area(path: &Path) -> Result<()>
    
    // Archive creation
    pub fn create_tar_archive(source: &Path) -> Result<Vec<u8>>
    pub fn extract_tar_archive(data: &[u8], destination: &Path) -> Result<()>
    
    // Manifest generation
    pub fn generate_manifest(files: &[PathBuf]) -> Result<Manifest>
}
```

## Data Flow

### Encryption Flow
1. User selects files/folder via drag-drop or picker
2. Files copied to staging area (preserves originals)
3. Manifest generated with SHA-256 hashes
4. TAR archive created from staging area
5. Archive encrypted with selected public key
6. Output saved as `.age` file with optional external manifest
7. Staging area cleaned up

### Decryption Flow
1. User selects `.age` file
2. User selects matching private key file
3. User enters passphrase to unlock private key
4. File decrypted to memory
5. TAR archive extracted to chosen destination
6. Manifest verified for integrity (if present)
7. Success/failure reported to user

## File Selection Strategy

### Mutual Exclusion Design
- **Folder Mode**: When a folder is selected, individual file selection is disabled
- **File Mode**: When files are selected, folder selection is disabled
- **Reset**: "Clear" button resets to neutral state

### Implementation
```typescript
interface FileSelectionState {
  mode: 'none' | 'folder' | 'files';
  selectedFolder?: string;
  selectedFiles: string[];
}
```

## Key Management Design

### Key File Naming Convention
- Format: `barqly-<label>.agekey.enc`
- Example: `barqly-family.agekey.enc`
- Label extracted from filename for dropdown display

### Key Storage Location
Platform-specific directories following OS conventions:
- **macOS**: `~/.config/barqly-vault/` (following Unix convention)
- **Windows**: `%APPDATA%\barqly-vault\`
- **Linux**: `~/.config/barqly-vault/`

### Key Display UX
```typescript
interface KeyDisplayProps {
  selectedKeyLabel: string;      // Shown in dropdown
  publicKey?: string;            // Shown below when selected
  showQRCode?: boolean;          // Future: QR display
}
```

## Error Handling Strategy

### Error Categories
1. **Crypto Errors**: Wrong key, corrupted data, invalid passphrase
2. **File System Errors**: Permission denied, disk full, file not found
3. **User Errors**: Invalid input, unsupported file types
4. **System Errors**: Memory issues, OS-specific problems

### User-Facing Messages
```typescript
const ERROR_MESSAGES = {
  WRONG_KEY: "This file was encrypted with a different key. Please select the correct key.",
  INVALID_PASSPHRASE: "Incorrect passphrase. Please try again.",
  CORRUPTED_FILE: "This file appears to be corrupted. The integrity check failed.",
  PERMISSION_DENIED: "Cannot access this location. Please check folder permissions.",
};
```

## Security Considerations

### Threat Model
- **Primary Threats**: Key theft, passphrase brute force, corrupted backups
- **Mitigations**: 
  - Passphrase-protected keys
  - Local-only operation
  - Integrity verification via manifests
  - No network communication

### Best Practices
1. Never store unencrypted private keys
2. Use secure random for all crypto operations
3. Clear sensitive data from memory after use
4. Validate all user input
5. Use constant-time comparisons for crypto

## Performance Targets

- **Startup Time**: <2 seconds
- **Key Generation**: <1 second
- **Encryption Speed**: >10MB/s
- **Memory Usage**: <200MB for typical operations
- **File Size Limit**: 100MB (soft limit for Bitcoin custody use case)

## Testing Strategy

### Unit Tests
- Crypto operations with test vectors
- File operations with temp directories
- Key management with mock storage

### Integration Tests
- Full encryption/decryption cycles
- Cross-platform path handling
- Error recovery scenarios

### Security Tests
- Timing attack resistance
- Memory leak detection
- Input fuzzing

## Future Enhancements

### Phase 2 Features
- QR code display for public keys
- Digital signatures for manifests
- Hardware wallet integration for key storage
- Multi-recipient encryption

### Phase 3 Features
- Nostr integration for cosigner communication
- PSBT coordination support
- Inheritance planning workflows
- Time-locked decryption 