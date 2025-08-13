# Technical Architecture: Backup Verification System

## Overview

The Backup Verification System combines file integrity verification (manifest) with authenticity verification (digital signatures) to protect Bitcoin custody documents against both accidental corruption and sophisticated replacement attacks in cloud storage environments.

## Architecture Principles

### Security First

- **Defense in Depth**: Multiple layers of verification (integrity + authenticity)
- **Zero Trust**: Verify every backup regardless of source or storage location
- **Cryptographic Standards**: Industry-standard algorithms (SHA-256, Ed25519/RSA)

### Performance Optimized

- **Streaming Verification**: Verify during decryption to avoid double I/O
- **Minimal Overhead**: Sub-100ms verification time for typical backups
- **Memory Efficient**: Process large files without excessive memory usage

### Backward Compatible

- **Graceful Degradation**: Handle backups created without verification
- **Version Awareness**: Support multiple manifest format versions
- **Migration Path**: Easy upgrade from non-verified to verified backups

## Data Structures

### Verification Manifest v2.0

```rust
#[derive(Serialize, Deserialize)]
pub struct VerificationManifest {
    pub version: String,                    // "2.0"
    pub created_at: DateTime<Utc>,         // Timestamp of creation
    pub creator_identity: String,          // Hash of creator's public key
    pub files: Vec<FileEntry>,             // List of all encrypted files
    pub total_size: u64,                   // Total size of all files
    pub file_count: usize,                 // Number of files
    pub signature: String,                 // Cryptographic signature of manifest
    pub signature_algorithm: String,       // "Ed25519" or "RSA-2048"
}

#[derive(Serialize, Deserialize)]
pub struct FileEntry {
    pub path: String,                      // Relative path within backup
    pub size: u64,                         // File size in bytes
    pub sha256: String,                    // SHA-256 hash of original file
    pub last_modified: DateTime<Utc>,      // Last modification timestamp
    pub file_type: String,                 // MIME type or file extension
}
```

### Key Derivation Structure

```rust
#[derive(Clone)]
pub struct VerificationKeys {
    pub signing_key: SigningKey,           // For creating signatures
    pub verifying_key: VerifyingKey,       // For verifying signatures
    pub key_derivation_salt: [u8; 32],     // Salt for reproducible key derivation
}
```

## System Components

### 1. Manifest Generator

**Responsibility**: Create verification manifest during encryption

```rust
pub struct ManifestGenerator {
    hasher: Sha256,
    files: Vec<FileEntry>,
    start_time: DateTime<Utc>,
}

impl ManifestGenerator {
    pub fn new() -> Self { /* ... */ }

    pub fn add_file(&mut self, path: &str, content: &[u8]) -> Result<()> {
        // Calculate SHA-256 hash
        // Extract file metadata
        // Add to file list
    }

    pub fn finalize(&self, signing_key: &SigningKey) -> Result<VerificationManifest> {
        // Create manifest structure
        // Sign manifest with private key
        // Return signed manifest
    }
}
```

### 2. Manifest Verifier

**Responsibility**: Validate verification manifest during decryption

```rust
pub struct ManifestVerifier {
    manifest: VerificationManifest,
    verifying_key: VerifyingKey,
}

impl ManifestVerifier {
    pub fn new(manifest: VerificationManifest, key: VerifyingKey) -> Self { /* ... */ }

    pub fn verify_signature(&self) -> Result<bool> {
        // Verify cryptographic signature
    }

    pub fn verify_file(&self, path: &str, content: &[u8]) -> Result<VerificationResult> {
        // Calculate SHA-256 of decrypted file
        // Compare against manifest hash
        // Return verification result
    }

    pub fn verify_complete(&self) -> Result<OverallVerificationResult> {
        // Ensure all files were verified
        // Check file counts match
        // Return overall result
    }
}
```

### 3. Key Management

**Responsibility**: Derive signing keys from user passphrase

```rust
pub struct KeyDerivation;

impl KeyDerivation {
    pub fn derive_verification_keys(
        passphrase: &str,
        salt: Option<[u8; 32]>
    ) -> Result<VerificationKeys> {
        // Use PBKDF2 or Argon2 for key derivation
        // Generate deterministic signing key pair
        // Return verification keys
    }

    pub fn generate_salt() -> [u8; 32] {
        // Generate cryptographically secure random salt
    }
}
```

## Integration Points

### Encryption Workflow Integration

```rust
// Modified encryption process
pub async fn encrypt_with_verification(
    files: &[PathBuf],
    output_path: &Path,
    passphrase: &str,
) -> Result<EncryptionResult> {
    // 1. Derive verification keys from passphrase
    let keys = KeyDerivation::derive_verification_keys(passphrase, None)?;

    // 2. Initialize manifest generator
    let mut manifest_generator = ManifestGenerator::new();

    // 3. Process each file (existing encryption logic)
    let mut archive_builder = tar::Builder::new(Vec::new());

    for file_path in files {
        let content = fs::read(file_path)?;

        // Add to manifest before encryption
        manifest_generator.add_file(&file_path.to_string_lossy(), &content)?;

        // Add to archive (existing logic)
        archive_builder.append_data(/* ... */)?;
    }

    // 4. Generate signed manifest
    let manifest = manifest_generator.finalize(&keys.signing_key)?;

    // 5. Add manifest to archive
    let manifest_json = serde_json::to_string(&manifest)?;
    archive_builder.append_data(
        &mut tar::Header::new_gnu(),
        ".barqly_verification_manifest.json",
        manifest_json.as_bytes(),
    )?;

    // 6. Encrypt archive (existing age encryption logic)
    let encrypted_data = age_encrypt(archive_builder.into_inner()?, passphrase)?;

    // 7. Write encrypted file
    fs::write(output_path, encrypted_data)?;

    // 8. Optionally write external manifest preview
    if should_create_external_manifest() {
        write_external_manifest(&manifest, output_path)?;
    }

    Ok(EncryptionResult::success())
}
```

### Decryption Workflow Integration

```rust
// Modified decryption process
pub async fn decrypt_with_verification(
    encrypted_path: &Path,
    output_dir: &Path,
    passphrase: &str,
) -> Result<DecryptionResult> {
    // 1. Decrypt archive (existing age decryption logic)
    let decrypted_data = age_decrypt(encrypted_path, passphrase)?;

    // 2. Extract manifest from archive
    let mut archive = tar::Archive::new(decrypted_data.as_slice());
    let manifest = extract_manifest(&mut archive)?;

    // 3. Derive verification keys
    let keys = KeyDerivation::derive_verification_keys(
        passphrase,
        Some(manifest.creator_identity.as_bytes().try_into()?)
    )?;

    // 4. Initialize verifier
    let verifier = ManifestVerifier::new(manifest, keys.verifying_key);

    // 5. Verify signature first
    if !verifier.verify_signature()? {
        return Err(VerificationError::InvalidSignature.into());
    }

    // 6. Extract and verify each file
    let mut verification_results = Vec::new();

    for entry in archive.entries()? {
        let mut entry = entry?;
        let path = entry.path()?.to_string_lossy().to_string();

        // Skip manifest file itself
        if path == ".barqly_verification_manifest.json" {
            continue;
        }

        // Read file content
        let mut content = Vec::new();
        entry.read_to_end(&mut content)?;

        // Verify file integrity
        let result = verifier.verify_file(&path, &content)?;
        verification_results.push(result);

        // Write file to output directory if verification passes
        if result.is_valid() {
            let output_path = output_dir.join(&path);
            fs::create_dir_all(output_path.parent().unwrap())?;
            fs::write(output_path, content)?;
        }
    }

    // 7. Verify overall completeness
    let overall_result = verifier.verify_complete()?;

    Ok(DecryptionResult {
        verification_status: overall_result,
        individual_results: verification_results,
        files_restored: verification_results.iter().filter(|r| r.is_valid()).count(),
    })
}
```

## Security Considerations

### Cryptographic Choices

#### Digital Signature Algorithm

- **Primary**: Ed25519 (fast, secure, small signatures)
- **Fallback**: RSA-2048 (broader compatibility)
- **Key Size**: 32 bytes for Ed25519, 256 bytes for RSA-2048

#### Hash Algorithm

- **Algorithm**: SHA-256 (FIPS 140-2 approved)
- **Performance**: ~400 MB/s on modern hardware
- **Security**: No known practical attacks

#### Key Derivation

- **Algorithm**: PBKDF2-SHA256 or Argon2id
- **Iterations**: Minimum 100,000 for PBKDF2, Argon2id with 19MB memory
- **Salt**: 32 bytes cryptographically secure random

### Attack Resistance

#### Integrity Attacks

- **File Corruption**: Detected by SHA-256 hash mismatch
- **Partial Modification**: Any byte change causes hash verification failure
- **File Replacement**: Individual file hashes prevent undetected replacement

#### Authenticity Attacks

- **Complete Backup Replacement**: Invalid signature prevents acceptance
- **Manifest Tampering**: Signature verification detects manifest modifications
- **Key Substitution**: Key derivation tied to original passphrase

#### Replay Attacks

- **Timestamp Verification**: Manifest creation time prevents old backup replay
- **Salt Uniqueness**: Each backup uses unique salt for key derivation

### Key Management Security

#### Passphrase-Based Derivation

```rust
// Secure key derivation implementation
fn derive_keys_secure(passphrase: &str, salt: &[u8; 32]) -> Result<VerificationKeys> {
    // Use Argon2id for memory-hard key derivation
    let config = argon2::Config::default();
    let key_material = argon2::hash_raw(
        passphrase.as_bytes(),
        salt,
        &config,
    )?;

    // Split key material for different purposes
    let signing_seed = &key_material[0..32];
    let verifying_seed = &key_material[32..64];

    // Generate Ed25519 key pair
    let signing_key = SigningKey::from_bytes(signing_seed)?;
    let verifying_key = VerifyingKey::from(&signing_key);

    Ok(VerificationKeys {
        signing_key,
        verifying_key,
        key_derivation_salt: *salt,
    })
}
```

#### Memory Protection

- **Secure Zeroing**: Clear key material from memory after use
- **Minimal Lifetime**: Keep keys in memory only during active operations
- **Stack Allocation**: Avoid heap allocation for sensitive data where possible

## Performance Considerations

### Optimization Strategies

#### Streaming Operations

- Process files during encryption/decryption to avoid double I/O
- Calculate hashes incrementally to minimize memory usage
- Use memory-mapped files for large backups

#### Parallel Processing

```rust
// Parallel hash calculation for multiple files
use rayon::prelude::*;

fn calculate_hashes_parallel(files: &[PathBuf]) -> Result<Vec<FileEntry>> {
    files.par_iter()
        .map(|path| -> Result<FileEntry> {
            let content = fs::read(path)?;
            let hash = sha256::digest(&content);
            Ok(FileEntry {
                path: path.to_string_lossy().to_string(),
                size: content.len() as u64,
                sha256: hash,
                last_modified: get_modified_time(path)?,
                file_type: detect_file_type(path),
            })
        })
        .collect()
}
```

### Performance Targets

- **Hash Calculation**: 400+ MB/s sustained throughput
- **Signature Generation**: <1ms for Ed25519, <10ms for RSA-2048
- **Signature Verification**: <0.1ms for Ed25519, <1ms for RSA-2048
- **Overall Overhead**: <5% increase in total encryption/decryption time

## Error Handling

### Verification Error Types

```rust
#[derive(Debug, thiserror::Error)]
pub enum VerificationError {
    #[error("Backup signature is invalid - may be tampered with")]
    InvalidSignature,

    #[error("File integrity check failed: {path}")]
    HashMismatch { path: String },

    #[error("Backup is incomplete - missing files: {missing:?}")]
    IncompleteBackup { missing: Vec<String> },

    #[error("Verification manifest is corrupted or missing")]
    CorruptManifest,

    #[error("Unsupported manifest version: {version}")]
    UnsupportedVersion { version: String },

    #[error("Key derivation failed - check passphrase")]
    KeyDerivationFailed,
}
```

### Recovery Strategies

- **Partial Verification Failure**: Allow user to proceed with warnings
- **Complete Verification Failure**: Block decryption, suggest alternative backups
- **Missing Manifest**: Graceful handling of legacy backups without verification
- **Performance Issues**: Fallback to simpler verification if needed

## Testing Strategy

### Unit Tests

- Hash calculation accuracy and performance
- Signature generation and verification
- Key derivation determinism and security
- Error handling for all failure modes

### Integration Tests

- Full encryption/decryption workflow with verification
- Backward compatibility with non-verified backups
- Performance regression testing
- Cross-platform compatibility

### Security Tests

- Tampering detection across all attack vectors
- Key derivation security properties
- Cryptographic primitive correctness
- Side-channel attack resistance
