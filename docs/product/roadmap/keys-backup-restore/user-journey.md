# User Journey: Key Backup & Restore

## Key Generation with Mandatory Backup

### Flow Overview
```
Generate Key → Key Created → Backup Required → Choose Method → Verify Backup → Complete
```

### Detailed Journey

#### Step 1: User Initiates Key Generation
- User clicks "Generate New Key" from setup screen
- Enters key name (e.g., "family-vault")
- Sets passphrase
- (Optional) Adds passphrase hint for recovery assistance
- Clicks "Generate"

##### Passphrase Hint Guidelines
```
Enter a hint to help you remember your passphrase:
[________________________________________________]

✓ Good hints:
  • "Wedding date + first pet"
  • "Favorite book quote"
  • "Kids' middle names pattern"

✗ Bad hints (too revealing):
  • "password123"
  • "It's my birthday"
  • The actual passphrase
```

#### Step 2: Key Generation Success
```
┌─────────────────────────────────────────┐
│  ✅ Key Generated Successfully!         │
│                                         │
│  Key Name: family-vault                │
│  Created: 2025-08-08 10:45am          │
│                                         │
│  ⚠️ CRITICAL: Back up your key now     │
│  Without this backup, you cannot       │
│  recover your encrypted files!         │
│                                         │
│  [Continue to Backup]                  │
└─────────────────────────────────────────┘
```

#### Step 3: Choose Backup Method
```
┌─────────────────────────────────────────┐
│  Backup Your Key                       │
│                                         │
│  Choose how to backup your key:        │
│                                         │
│  [💾 Copy to USB Drive]                │
│   Recommended: Save to external drive  │
│                                         │
│  [📄 Export as File]                   │
│   Save to a specific location          │
│                                         │
│  [🖨️ Print Backup Card]                │
│   Create physical backup with QR code  │
│                                         │
│  □ I understand I need this backup     │
│    to recover my encrypted files       │
│                                         │
│  [Skip (Dangerous)] [Continue]         │
└─────────────────────────────────────────┐
```

### Backup Method: USB Drive

#### User Selects USB Drive
1. System detects available removable drives
2. User selects target drive
3. App creates structured backup:
```
/USB-Drive/Barqly-Key-Backup-2025-08-08/
├── family-vault.age         # Encrypted key
├── family-vault.json        # Metadata
├── README.txt              # Recovery instructions
└── verification.sha256      # Checksum for integrity
```

#### Success Confirmation
```
✅ Key backed up successfully to:
   E:\Barqly-Key-Backup-2025-08-08\

⚠️ Store this USB drive in a safe place!
```

### Backup Method: Export File

#### User Selects Location
1. File browser opens
2. User navigates to desired location (NOT cloud-synced folders)
3. Warning shown if cloud-sync detected:
```
⚠️ Warning: This location appears to sync with [iCloud/OneDrive/Dropbox]
   Keys should not be stored in cloud-synced folders.
   
   [Choose Different Location] [Continue Anyway]
```

### Backup Method: Print Backup Card

#### Generate Printable Card
```
┌────────────────────────────────────────┐
│          BARQLY VAULT KEY BACKUP       │
│                                        │
│  Created: 2025-08-08 10:45 AM         │
│  Key Name: family-vault                │
│                                        │
│  ┌────────────────────┐               │
│  │                    │               │
│  │    [QR CODE]       │               │
│  │                    │               │
│  └────────────────────┘               │
│                                        │
│  If QR code fails, enter manually:    │
│  ┌────────────────────────────────┐   │
│  │AGE-SECRET-KEY-1QYQSZQGPQYQS... │   │
│  │...ZQGPQYQSZQGPQYQSZQGPQYQSZ    │   │
│  └────────────────────────────────┘   │
│                                        │
│  ⚠️ STORE IN SECURE LOCATION          │
│  This key decrypts all your files     │
│                                        │
│  Need help? Visit:                    │
│  barqly.com/recover                   │
└────────────────────────────────────────┘
```

### Step 4: Backup Verification

#### Verification Process
```
┌─────────────────────────────────────────┐
│  Verify Your Backup                    │
│                                         │
│  Let's make sure your backup works!    │
│                                         │
│  Please select your backup file:       │
│                                         │
│  [Select Backup File]                  │
│                                         │
│  Checking backup...                    │
│  ✅ Backup verified successfully!      │
│                                         │
│  Your key is safely backed up and      │
│  can be used for recovery.             │
│                                         │
│  [Complete Setup]                      │
└─────────────────────────────────────────┘
```

### Step 5: Setup Complete
- User returns to main application
- Backup status shown in UI: "✅ Key Backed Up"

## Key Recovery Journey

### Scenario 1: New Device Setup

#### User Story
"I got a new computer and need to restore my Barqly Vault keys"

#### Flow
1. Install Barqly Vault
2. On welcome screen: "Restore Existing Key"
3. Select backup source:
   - USB Drive
   - File Import
   - Scan QR Code (from printed card)
4. Enter passphrase
5. Key restored and ready to use

### Scenario 2: Emergency Recovery

#### User Story
"My computer crashed and I need to decrypt important files NOW"

#### Flow
1. Stress-optimized UI with large, clear buttons
2. Auto-scan for common backup locations
3. "Found potential backup at E:\Barqly-Key-Backup\"
4. Display passphrase hint if available:
   ```
   Enter your passphrase:
   [_____________________]
   
   💡 Hint: "Wedding date + first pet"
   ```
5. One-click restore with passphrase
6. Immediate access to decrypt files

### Recovery from Printed Card

#### QR Code Scanning
1. User selects "Scan Backup Card"
2. Camera/webcam activated
3. QR code scanned
4. Key data extracted and validated
5. User enters passphrase
6. Key restored

#### Manual Entry (QR Damaged)
1. User selects "Enter Key Manually"
2. Types the AGE-SECRET-KEY string
3. System validates format
4. User enters passphrase
5. Key restored

## Error Handling

### Common Errors and Solutions

#### "Backup File Corrupted"
- Try alternate backup if available
- Check file integrity with provided checksum
- Contact support with error code

#### "Wrong Passphrase"
- Allow multiple attempts
- Provide passphrase hints if set during creation
- No permanent lockout (stress scenario)

#### "Backup File Not Found"
- Scan common locations automatically
- Guide user to check:
  - USB drives
  - External drives
  - Documents folder
  - Safe deposit box (for printed cards)

## Success Metrics

- **Backup Completion Rate**: >95% of users complete backup
- **Successful Recovery Rate**: >99% can recover with valid backup
- **Time to Recovery**: <2 minutes in emergency scenario
- **Support Tickets**: <1% related to backup/recovery