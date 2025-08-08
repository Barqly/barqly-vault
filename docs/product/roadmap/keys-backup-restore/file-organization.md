# File Organization Strategy

## Overview

This document outlines the file organization strategy for Barqly Vault, addressing the critical balance between user experience and security requirements for encryption keys and encrypted files.

## Current Implementation

### File Locations (macOS Example)
```
~/Library/Application Support/com.barqly.vault/keys/  # Hidden, secure
~/Documents/Barqly-Vaults/encrypted_[timestamp].age   # User visible
~/Documents/Barqly-Recovery/[timestamp]/              # User visible
```

### Problems with Current Approach
1. **Fragmented Storage**: Keys separated from encrypted files
2. **Hidden Keys**: Users cannot easily backup critical keys
3. **Discovery Issues**: Hard to find files years later
4. **No Clear Organization**: Encrypted files use timestamps only

## Recommended Approach: Hybrid Model

### Core Principle
Keep security-critical keys in OS-protected locations while providing easy export/backup functionality and organizing user-visible assets in a single parent directory.

### Directory Structure

#### System Directories (Hidden from User)
```
# macOS
~/Library/Application Support/com.barqly.vault/
├── keys/                    # Master key storage (encrypted)
├── config/                  # App configuration
├── logs/                    # Application logs
└── cache/                   # Performance cache

# Windows  
%LOCALAPPDATA%\Barqly\Vault\
├── keys\
├── config\
├── logs\
└── cache\

# Linux
~/.config/barqly-vault/
├── keys/
├── config/
├── logs/
└── cache/
```

#### User-Visible Directories
```
~/Documents/Barqly Vault/           # Parent directory for all user assets
├── Encrypted Vaults/               # User's encrypted files
│   ├── 2025-08-08 Bitcoin Keys.age
│   ├── 2025-07-15 Tax Documents.age
│   ├── 2024-12-20 Family Photos.age
│   └── [user-chosen-name].age
├── Recovered Files/                # Decrypted files
│   ├── 2025-08-08 Bitcoin Keys/
│   ├── 2025-07-01 Tax Documents/
│   └── [timestamp] [vault-name]/
└── Key Backups/                    # Exported key backups (optional)
    ├── 2025-08-08 Key Export/
    └── USB Backup 2025-07-15/
```

### Key Management Strategy

#### Storage Locations
1. **Master Keys**: Always in OS-protected application directories
2. **Key Backups**: User-initiated exports to external media or designated folders
3. **Never Comingle**: Keys never stored with encrypted files automatically

#### Backup Mechanisms
1. **On-Demand Export**: User explicitly exports keys when needed
2. **Backup Reminder**: Prompt after key generation
3. **Verification Required**: Ensure backup is valid before considering complete

### Installation Experience

#### First Launch
```typescript
interface InstallationOptions {
  vaultLocation: string;      // Default: ~/Documents/Barqly Vault
  allowCustomization: boolean; // Let user choose different location
  cloudSyncWarning: boolean;  // Warn if selected location is cloud-synced
}
```

#### User Dialog
```
Welcome to Barqly Vault!

Where should we store your encrypted vaults?

📁 Recommended: ~/Documents/Barqly Vault
   ✓ Easy to find and backup
   ✓ Included in Time Machine/File History
   ✓ Your keys are stored separately and securely

📁 Custom Location: [________] [Browse]

⚠️ Note: Your encryption keys will be stored securely
in system-protected folders and can be backed up separately.

[Learn More] [Continue]
```

### Migration Strategy

#### For Existing Users
```typescript
interface MigrationPlan {
  detectOldLocations(): Promise<OldPaths>;
  promptUserForMigration(): Promise<boolean>;
  migrateToNewStructure(): Promise<MigrationResult>;
  verifyMigration(): Promise<boolean>;
  cleanupOldLocations(): Promise<void>; // Optional, with user consent
}
```

#### Migration Flow
1. **Detection**: On app update, detect old file locations
2. **Notification**: "We've improved file organization. Would you like to migrate?"
3. **Preview**: Show what will be moved and where
4. **Migration**: Copy (not move) files to new structure
5. **Verification**: Ensure all files accessible in new location
6. **Cleanup**: Optionally remove old files after confirmation

### Platform-Specific Paths

#### Path Resolution
```rust
// src-tauri/src/storage/path_management/user_paths.rs

pub struct UserPaths {
    vault_parent: PathBuf,
    encrypted_vaults: PathBuf,
    recovered_files: PathBuf,
    key_backups: PathBuf,
}

impl UserPaths {
    pub fn new(custom_location: Option<PathBuf>) -> Result<Self, PathError> {
        let vault_parent = match custom_location {
            Some(path) => path,
            None => Self::default_location()?,
        };
        
        Ok(Self {
            vault_parent: vault_parent.clone(),
            encrypted_vaults: vault_parent.join("Encrypted Vaults"),
            recovered_files: vault_parent.join("Recovered Files"),
            key_backups: vault_parent.join("Key Backups"),
        })
    }
    
    #[cfg(target_os = "macos")]
    fn default_location() -> Result<PathBuf, PathError> {
        dirs::document_dir()
            .ok_or(PathError::NoDocumentDir)?
            .join("Barqly Vault")
    }
    
    #[cfg(target_os = "windows")]
    fn default_location() -> Result<PathBuf, PathError> {
        dirs::document_dir()
            .ok_or(PathError::NoDocumentDir)?
            .join("Barqly Vault")
    }
    
    #[cfg(target_os = "linux")]
    fn default_location() -> Result<PathBuf, PathError> {
        dirs::document_dir()
            .or_else(|| dirs::home_dir().map(|h| h.join("Documents")))
            .ok_or(PathError::NoDocumentDir)?
            .join("Barqly Vault")
    }
}
```

### File Naming Conventions

#### Encrypted Vaults
```
Format: [YYYY-MM-DD] [User Chosen Name].age
Examples:
- 2025-08-08 Bitcoin Cold Storage.age
- 2025-07-15 Family Documents.age
- 2025-06-01 Business Records Q2.age

Benefits:
- Chronological sorting
- User-friendly names
- Clear purpose identification
```

#### Recovered Files
```
Format: [YYYY-MM-DD] [Vault Name]/
Examples:
- 2025-08-08 Bitcoin Cold Storage/
- 2025-07-15 Family Documents/

Benefits:
- Maintains audit trail
- Clear relationship to source vault
- Prevents accidental overwrites
```

### Cloud Sync Considerations

#### Detection
```rust
pub fn detect_cloud_sync(path: &Path) -> Option<CloudProvider> {
    let path_str = path.to_string_lossy().to_lowercase();
    
    // Check for common cloud provider paths
    if path_str.contains("icloud") { return Some(CloudProvider::ICloud); }
    if path_str.contains("onedrive") { return Some(CloudProvider::OneDrive); }
    if path_str.contains("dropbox") { return Some(CloudProvider::Dropbox); }
    if path_str.contains("google drive") { return Some(CloudProvider::GoogleDrive); }
    
    // Check for .nosync or similar markers
    if path.join(".nosync").exists() { return Some(CloudProvider::Unknown); }
    
    None
}
```

#### User Warnings
```typescript
interface CloudSyncWarning {
  provider: string;
  risks: string[];
  recommendation: string;
  allowOverride: boolean;
}

const warning: CloudSyncWarning = {
  provider: "iCloud",
  risks: [
    "Encrypted vaults will sync to cloud automatically",
    "May consume significant cloud storage",
    "Potential privacy considerations"
  ],
  recommendation: "Consider using a local folder or external drive",
  allowOverride: true
};
```

### Security Considerations

#### Directory Permissions
```rust
#[cfg(unix)]
pub fn set_secure_permissions(path: &Path) -> Result<(), IoError> {
    use std::os::unix::fs::PermissionsExt;
    
    let mut perms = fs::metadata(path)?.permissions();
    
    // Different permissions for different directories
    match path.file_name().and_then(|n| n.to_str()) {
        Some("keys") => perms.set_mode(0o700),      // Owner only
        Some("Key Backups") => perms.set_mode(0o700), // Owner only
        _ => perms.set_mode(0o755),                 // Standard for documents
    }
    
    fs::set_permissions(path, perms)?;
    Ok(())
}
```

#### Validation
```rust
pub fn validate_path_security(path: &Path) -> Result<(), SecurityError> {
    // Ensure not in system directories
    if path.starts_with("/System") || path.starts_with("/Windows") {
        return Err(SecurityError::SystemDirectory);
    }
    
    // Ensure not in temp directories
    if path.starts_with("/tmp") || path.starts_with("/var/tmp") {
        return Err(SecurityError::TempDirectory);
    }
    
    // Ensure user has write permissions
    if !path.exists() {
        fs::create_dir_all(path)?;
    }
    
    // Test write access
    let test_file = path.join(".barqly_test");
    fs::write(&test_file, b"test")?;
    fs::remove_file(test_file)?;
    
    Ok(())
}
```

### Recovery Scenarios

#### Scenario 1: Finding Old Vaults
```
User: "I encrypted files 2 years ago, where are they?"
Solution: Everything is in ~/Documents/Barqly Vault/Encrypted Vaults/
Look for: 2023-XX-XX [your description].age
```

#### Scenario 2: Emergency Recovery
```
User: "Computer crashed, need to recover from backup"
Solution: 
1. Restore ~/Documents/Barqly Vault/ from backup
2. Import keys from Key Backups/ or external backup
3. Decrypt needed vaults
```

#### Scenario 3: New Computer Setup
```
User: "Setting up new computer"
Solution:
1. Install Barqly Vault
2. Copy ~/Documents/Barqly Vault/ from old computer
3. Import keys from backup
4. Continue where you left off
```

### Implementation Priority

#### Phase 1: Core Structure (Immediate)
- Update default paths to new structure
- Implement directory creation on first launch
- Add path validation

#### Phase 2: Migration (Next Release)
- Detect existing installations
- Implement migration wizard
- Test across platforms

#### Phase 3: Enhancement (Future)
- Cloud sync detection and warnings
- Advanced organization options
- Vault collections/categories

### Success Metrics

- **File Discovery Time**: <30 seconds to find any vault
- **Backup Success Rate**: >95% successful backups
- **Migration Success**: >99% successful migrations
- **Support Tickets**: <1% related to file location

## Decision Summary

### Final Recommendation

1. **Keep keys in OS-protected directories** for security
2. **Create unified parent folder** for all user assets
3. **Implement robust export/backup** for keys
4. **Use human-friendly naming** with dates and descriptions
5. **Provide clear installation choices** with sensible defaults
6. **Add migration support** for existing users

This approach balances:
- **Security**: Keys remain protected
- **Usability**: Everything user needs is in one place
- **Flexibility**: Power users can customize
- **Recoverability**: Clear organization aids long-term recovery