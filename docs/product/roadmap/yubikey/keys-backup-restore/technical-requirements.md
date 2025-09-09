# Technical Requirements: Key Backup & Restore

## Overview

This document specifies the technical implementation requirements for the key backup and restore feature. The implementation should modify the existing key generation flow to include mandatory backup steps.

## Architecture Changes

### Current State

- Keys stored in: `~/Library/Application Support/com.barqly.vault/keys/` (macOS)
- Key generation: `src-tauri/src/commands/crypto/key_generation.rs`
- Key storage: `src-tauri/src/storage/key_store/`
- No export/backup functionality exists

### Required Changes

1. Add backup/export commands to Tauri backend
2. Modify key generation flow in frontend to include backup step
3. Add verification mechanism for backups
4. Implement recovery/import functionality

## Backend Implementation (Rust/Tauri)

### New Commands Required

#### 1. Export Key to USB

```rust
// src-tauri/src/commands/crypto/backup.rs

#[tauri::command]
pub async fn export_key_to_usb(
    key_label: String,
    target_path: String,
) -> CommandResponse<BackupResult> {
    // Implementation requirements:
    // 1. Validate target_path is removable media
    // 2. Create backup directory with timestamp
    // 3. Copy encrypted key file (.agekey.enc)
    // 4. Copy metadata file (.agekey.meta)
    // 5. Generate README.txt with recovery instructions
    // 6. Create verification checksum (SHA-256) for both files
    // 7. Return BackupResult with location and verification hash
}

#[derive(Serialize, Deserialize)]
pub struct BackupResult {
    pub backup_path: String,
    pub verification_hash: String,
    pub files_created: Vec<String>,
    pub timestamp: String,
}
```

#### 2. Export Key to File

```rust
#[tauri::command]
pub async fn export_key_to_file(
    key_label: String,
    target_directory: String,
) -> CommandResponse<BackupResult> {
    // Implementation requirements:
    // 1. Check if target is cloud-synced (warn user)
    // 2. Create backup with same structure as USB
    // 3. Set appropriate file permissions (0600 on Unix)
    // 4. Return result with warnings if applicable
}
```

#### 3. Generate Backup Card Data

```rust
#[tauri::command]
pub async fn generate_backup_card(
    key_label: String,
) -> CommandResponse<BackupCardData> {
    // Implementation requirements:
    // 1. Load encrypted key from storage
    // 2. Generate QR code(s) - may need multiple for large keys
    // 3. Format key for manual entry (line breaks every 40 chars)
    // 4. Generate print-friendly HTML/PDF
    // 5. Return data for frontend rendering
}

#[derive(Serialize, Deserialize)]
pub struct BackupCardData {
    pub key_name: String,
    pub creation_date: String,
    pub qr_codes: Vec<String>,  // Base64 encoded QR images
    pub manual_key: String,      // Formatted for display
    pub public_key: String,      // For reference
    pub print_html: String,      // Ready-to-print HTML
}
```

#### 4. Verify Backup

```rust
#[tauri::command]
pub async fn verify_backup(
    backup_path: String,
    original_key_label: String,
) -> CommandResponse<VerificationResult> {
    // Implementation requirements:
    // 1. Check for both .agekey.enc and .agekey.meta files
    // 2. Read and validate metadata JSON structure
    // 3. Compare encrypted key with stored version (constant-time)
    // 4. Verify public key matches in metadata
    // 5. Verify checksums if present
    // 6. Return detailed verification result
}

#[derive(Serialize, Deserialize)]
pub struct VerificationResult {
    pub is_valid: bool,
    pub key_matches: bool,
    pub checksum_valid: bool,
    pub files_present: Vec<String>,
    pub errors: Vec<String>,
}
```

#### 5. Import Key from Backup

```rust
#[tauri::command]
pub async fn import_key_from_backup(
    backup_path: String,
    passphrase: SecretString,
) -> CommandResponse<ImportResult> {
    // Implementation requirements:
    // 1. Look for both .agekey.enc and .agekey.meta files
    // 2. Validate both files exist and are valid
    // 3. Check if key already exists (prevent overwrite)
    // 4. Verify passphrase by attempting decryption
    // 5. Import both files to standard storage location
    // 6. Preserve original metadata (created_at, public_key)
    // 7. Update last_accessed timestamp
    // 8. Return success with key details
}
```

#### 6. Scan QR Code

```rust
#[tauri::command]
pub async fn import_key_from_qr(
    qr_data: Vec<String>,  // Multiple QR codes if split
    passphrase: SecretString,
) -> CommandResponse<ImportResult> {
    // Implementation requirements:
    // 1. Combine multiple QR codes if split
    // 2. Decode base64 data
    // 3. Validate age key format
    // 4. Import using same logic as file import
}
```

### Backup File Structure

```
Barqly-Key-Backup-{timestamp}/
├── {key_name}.agekey.enc    # The encrypted private key
├── {key_name}.agekey.meta   # Metadata (creation date, public key, etc.)
├── README.txt              # Human-readable recovery instructions
├── verification.sha256      # Checksums for integrity verification
└── RECOVERY_INSTRUCTIONS.html  # Detailed guide with screenshots
```

#### Current File Extensions

- `.agekey.enc` - Encrypted private key file
- `.agekey.meta` - JSON metadata file containing:
  - `label`: User-friendly key name
  - `created_at`: ISO 8601 timestamp
  - `file_path`: Original storage location
  - `public_key`: The age public key (age1...)
  - `last_accessed`: Last usage timestamp (nullable)
  - `passphrase_hint`: Optional hint for recovery (nullable, max 100 chars)

#### README.txt Template

```text
BARQLY VAULT KEY BACKUP
======================
Created: {date}
Key Name: {key_name}

This backup contains your encrypted key for Barqly Vault.
You will need your passphrase to use this key.

TO RECOVER YOUR KEY:
1. Open Barqly Vault application
2. Select "Restore from Backup"
3. Choose this backup folder
4. Enter your passphrase
5. Your key will be restored

IMPORTANT:
- Keep this backup in a secure location
- Do NOT share this with anyone
- You need BOTH this file AND your passphrase
- Without both, your encrypted files cannot be recovered

For help: support@barqly.com
```

### Security Requirements

1. **No Plain Text Keys**: Never export unencrypted private keys
2. **Constant-Time Comparison**: Use constant-time comparison for verification
3. **Secure File Permissions**: Set 0600 permissions on Unix systems
4. **Memory Zeroization**: Clear sensitive data from memory after use
5. **Path Validation**: Prevent directory traversal attacks
6. **Cloud Sync Detection**: Warn if backup location is cloud-synced
7. **Passphrase Hint Validation**: Ensure hints don't contain the actual passphrase

### Passphrase Hint Implementation

#### Validation Rules

```rust
pub fn validate_passphrase_hint(
    hint: &str,
    passphrase: &SecretString
) -> Result<(), ValidationError> {
    // Max length check
    if hint.len() > 100 {
        return Err(ValidationError::HintTooLong);
    }

    // Ensure hint doesn't contain passphrase
    let passphrase_str = passphrase.expose_secret().to_lowercase();
    let hint_lower = hint.to_lowercase();

    if passphrase_str.contains(&hint_lower) ||
       hint_lower.contains(&passphrase_str) {
        return Err(ValidationError::HintContainsPassphrase);
    }

    // Check for overly revealing patterns
    let bad_patterns = [
        r"^password",
        r"^\d{4,}$",  // Just numbers
        r"^[a-z]+\d{1,3}$",  // Common weak patterns
    ];

    for pattern in bad_patterns {
        if Regex::new(pattern)?.is_match(&hint_lower) {
            return Err(ValidationError::HintTooRevealing);
        }
    }

    Ok(())
}
```

#### Storage in Metadata

```rust
#[derive(Serialize, Deserialize)]
pub struct KeyMetadata {
    pub label: String,
    pub created_at: DateTime<Utc>,
    pub file_path: PathBuf,
    pub public_key: String,
    pub last_accessed: Option<DateTime<Utc>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub passphrase_hint: Option<String>,  // New field
}
```

### Detection of Removable Media

```rust
// Platform-specific USB detection
#[cfg(target_os = "windows")]
fn is_removable_drive(path: &Path) -> bool {
    // Use Windows API to check drive type
    // GetDriveType() == DRIVE_REMOVABLE
}

#[cfg(target_os = "macos")]
fn is_removable_drive(path: &Path) -> bool {
    // Check if path starts with /Volumes/
    // and is not the system drive
}

#[cfg(target_os = "linux")]
fn is_removable_drive(path: &Path) -> bool {
    // Check if path is under /media/ or /mnt/
    // or check /sys/block/*/removable
}
```

### Cloud Sync Detection

```rust
fn is_cloud_synced(path: &Path) -> Option<String> {
    let path_str = path.to_string_lossy().to_lowercase();

    if path_str.contains("icloud") {
        return Some("iCloud".to_string());
    }
    if path_str.contains("onedrive") {
        return Some("OneDrive".to_string());
    }
    if path_str.contains("dropbox") {
        return Some("Dropbox".to_string());
    }
    if path_str.contains("google drive") {
        return Some("Google Drive".to_string());
    }

    None
}
```

## Frontend Implementation (React/TypeScript)

### Modified Key Generation Flow

```typescript
// src-ui/components/Setup/KeyGeneration.tsx

interface KeyGenerationState {
  step: "generate" | "backup" | "verify" | "complete";
  keyGenerated: boolean;
  backupCompleted: boolean;
  backupVerified: boolean;
  keyDetails: KeyInfo | null;
  backupLocation: string | null;
}

// State machine for key generation with backup
const KeyGenerationFlow: React.FC = () => {
  const [state, setState] = useState<KeyGenerationState>({
    step: "generate",
    keyGenerated: false,
    backupCompleted: false,
    backupVerified: false,
    keyDetails: null,
    backupLocation: null,
  });

  // Step transitions with validation
  const canProceed = () => {
    switch (state.step) {
      case "generate":
        return state.keyGenerated;
      case "backup":
        return state.backupCompleted;
      case "verify":
        return state.backupVerified;
      default:
        return true;
    }
  };
};
```

### Backup Method Components

```typescript
// src-ui/components/Backup/BackupMethods.tsx

interface BackupMethodProps {
  keyLabel: string;
  onBackupComplete: (location: string) => void;
  onError: (error: string) => void;
}

export const USBBackup: React.FC<BackupMethodProps> = ({ ... }) => {
  // 1. Detect available USB drives
  // 2. Show drive selector
  // 3. Call export_key_to_usb command
  // 4. Show progress
  // 5. Confirm success
};

export const FileExportBackup: React.FC<BackupMethodProps> = ({ ... }) => {
  // 1. Open file dialog
  // 2. Check for cloud sync warning
  // 3. Call export_key_to_file command
  // 4. Show success/warning
};

export const PrintableCardBackup: React.FC<BackupMethodProps> = ({ ... }) => {
  // 1. Call generate_backup_card command
  // 2. Render printable view
  // 3. Trigger print dialog
  // 4. Confirm print completion
};
```

### Verification Component

```typescript
// src-ui/components/Backup/BackupVerification.tsx

export const BackupVerification: React.FC = ({ backupPath, keyLabel }) => {
  const [verifying, setVerifying] = useState(false);
  const [result, setResult] = useState<VerificationResult | null>(null);

  const verifyBackup = async () => {
    setVerifying(true);
    try {
      const result = await invoke("verify_backup", {
        backupPath,
        originalKeyLabel: keyLabel,
      });
      setResult(result);
    } catch (error) {
      // Handle verification failure
    }
    setVerifying(false);
  };
};
```

## QR Code Generation

### Library Requirements

- Use `qrcode` crate in Rust backend
- Split large keys into multiple QR codes if needed
- Error correction level: High (30% redundancy)

### QR Code Data Format

```json
{
  "version": "1.0",
  "type": "age-key",
  "parts": 1,
  "part": 1,
  "data": "AGE-SECRET-KEY-1...",
  "checksum": "sha256..."
}
```

## Testing Requirements

### Unit Tests

- Key export with various formats
- Backup verification logic
- Import from different sources
- Cloud sync detection
- USB drive detection

### Integration Tests

- Full backup and restore cycle
- Corrupt backup handling
- Multiple QR code reconstruction
- Cross-platform path handling

### E2E Tests

- Complete key generation with backup flow
- Recovery from USB drive
- Recovery from printed card (mock QR scan)
- Backup verification UI flow

## Performance Requirements

- Key export: <1 second
- QR code generation: <2 seconds
- Backup verification: <500ms
- USB drive detection: <2 seconds
- Import from backup: <1 second

## Error Handling

### Error Codes

```rust
pub enum BackupError {
    KeyNotFound,
    InvalidBackupFormat,
    CorruptedBackup,
    PermissionDenied,
    UsbNotFound,
    CloudSyncWarning,
    VerificationFailed,
    ImportFailed,
    QrCodeGenerationFailed,
}
```

### User-Friendly Messages

- Map technical errors to clear user messages
- Provide actionable recovery steps
- Include support contact for critical failures

## Migration Path

### Phase 1: Backend Implementation

1. Implement backup/export commands
2. Add verification logic
3. Create import functionality
4. Add tests

### Phase 2: Frontend Integration

1. Modify key generation flow
2. Add backup method components
3. Implement verification UI
4. Add recovery flow

### Phase 3: Testing & Polish

1. Full E2E testing
2. Error message refinement
3. Performance optimization
4. Documentation update

## Dependencies

### Rust Crates

```toml
[dependencies]
qrcode = "0.14"
image = "0.24"  # For QR code image generation
sha2 = "0.10"   # For checksum generation
base64 = "0.21"  # For encoding
```

### NPM Packages

```json
{
  "dependencies": {
    "@react-pdf/renderer": "^3.0.0", // For printable cards
    "qr-scanner": "^1.4.0" // For QR code scanning
  }
}
```
