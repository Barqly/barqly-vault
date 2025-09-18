# Multi-YubiKey UX Design

## Overview
Intuitive visual grid layout for managing multiple YubiKeys with focus on simplicity and stress-free recovery.

## Core Principles
1. **All keys are equal** - No primary/backup designation, all keys are fungible
2. **Auto-selection** - Reduce clicks by auto-selecting inserted keys
3. **Stress-free recovery** - Simple flow when user needs access under pressure
4. **Visual feedback** - Clear status indicators for each key state

## Visual Grid Layout (3 Keys Max in UI)

### Empty State (First Time)
```
Configure YubiKey Protection
────────────────────────────

┌─────────┐  ┌─────────┐  ┌─────────┐
│    🗝️   │  │    🗝️   │  │    🗝️   │
│         │  │         │  │         │
│   Add   │  │   Add   │  │   Add   │
└─────────┘  └─────────┘  └─────────┘

"Insert your first YubiKey to begin"
```

### Active Setup State
```
┌─────────┐  ┌─────────┐  ┌─────────┐
│    🔑   │  │    🗝️   │  │    🗝️   │
│   ✅    │  │         │  │         │
│  ...420 │  │   Add   │  │   Add   │
└─────────┘  └─────────┘  └─────────┘
  Personal     [Empty]     [Empty]

[Auto-selected form appears below for ...420]
```

### Multiple Keys Registered
```
┌─────────┐  ┌─────────┐  ┌─────────┐
│    🔑   │  │    🔑   │  │    🔑   │
│   ✅    │  │         │  │         │
│  ...420 │  │  ...865 │  │  ...123 │
└─────────┘  └─────────┘  └─────────┘
  Personal     Work        Backup

[Auto-selected form for currently inserted key]
```

## Key States & Colors

- **🟢 Green with ✅**: Currently inserted and active
- **🔵 Blue**: Registered but not inserted
- **⚫ Grey**: Empty slot available for setup
- **🟡 Yellow**: Orphaned/needs recovery (manifest missing)
- **Setup Complete**: Brief success indicator after initialization

## Auto-Selection Logic

1. **One key inserted**: Automatically select it and show relevant form
2. **No keys inserted**: Show "Please insert YubiKey" message
3. **Multiple inserted** (rare): Auto-select first detected
4. **All registered, none inserted**: "Insert any of your YubiKeys to continue"

## Setup Flow

### Step 1: Initial Setup
- User inserts first YubiKey
- Auto-detects and shows setup form
- Fields: Label, PIN (6-8 digits), Confirm PIN
- Single button: "Initialize YubiKey"

### Step 2: Recovery Code Display
```
┌──────────────────────────┐
│ ✅ YubiKey Initialized   │
│                          │
│ Recovery Code:           │
│ ┌──────────────────────┐ │
│ │     Nx2mBtQa        │ │
│ └──────────────────────┘ │
│                          │
│ [Copy] [I've saved it]   │
└──────────────────────────┘
```

### Step 3: Backup Prompt
- After first key: "Recommended: Add at least one backup YubiKey"
- After second key: "Good! You have a backup"
- After third key: "Maximum redundancy achieved"

## Recovery/Decryption Flow

### Stress-Free Design
```
Decrypt Your Vault
──────────────────

┌─────────┐  ┌─────────┐  ┌─────────┐
│    🔑   │  │    🔑   │  │    🔑   │
│   ✅    │  │         │  │         │
│  ...420 │  │Registered│ │Registered│
└─────────┘  └─────────┘  └─────────┘

✅ YubiKey detected - Ready to decrypt

Enter PIN: [________]

[Decrypt Vault]
```

**Key Point**: User can insert ANY registered YubiKey, enter PIN, and decrypt. No selection needed.

## Important Technical Considerations

### Encryption Behavior
- **Multi-recipient encryption**: Vault is encrypted to ALL registered keys (YubiKeys + passphrase keys)
- Each key can independently decrypt the vault
- Adding a new key requires re-encrypting vault metadata (not the actual files)

### Decryption Options
During decryption, show ALL available methods:
```
Unlock Your Vault
─────────────────

Option 1: YubiKey (Recommended)
[Insert any registered YubiKey]

Option 2: Passphrase Key
[Select from: Personal-Key.enc, Backup-Key.enc]
[Enter passphrase: ________]
```

### Backend Configuration
```rust
// Configurable limits
const MAX_YUBIKEYS_UI: usize = 3;      // Shown in UI grid
const MAX_YUBIKEYS_TOTAL: usize = 10;  // Backend limit
const MAX_TOTAL_RECIPIENTS: usize = 20; // YubiKeys + passphrase keys
```

## Label Management

### Auto-labeling
- If user doesn't provide label: "YubiKey 1", "YubiKey 2", etc.
- Show last 4 digits of serial for identification

### User Labels
- Keep simple: "Personal", "Work", "Backup"
- Max 20 characters
- Shown below each key card

## State-Specific Forms

### New YubiKey
- Label field
- PIN creation (with confirmation)
- "Initialize" button
- Note about auto-generated recovery code

### Registered YubiKey
- Show info only
- "This YubiKey is already configured"
- Option to remove/replace

### Orphaned YubiKey
- "This YubiKey needs recovery"
- PIN field only
- "Recover" button

## Progressive Disclosure

1. Start simple - one key minimum
2. Gentle nudge toward backups
3. Clear visual of empty slots encourages redundancy
4. No overwhelming options or complex hierarchies

## Error Handling

- **YubiKey not detected**: Gentle reminder to insert
- **Wrong PIN**: Clear error, remaining attempts if applicable
- **YubiKey locked**: Recovery code instructions
- **Manifest missing**: Automatic recovery flow

## Benefits of This Design

1. **Intuitive**: Visual grid immediately shows status
2. **Frictionless**: Auto-selection reduces clicks
3. **Stress-resistant**: Simple recovery under pressure
4. **Flexible**: Supports both YubiKey and passphrase keys
5. **Scalable**: UI shows 3, backend supports more

## Future Enhancements

- Touch policy configuration (always/cached/never)
- PIN policy settings
- YubiKey firmware version display
- Remote wipe capabilities
- Audit log of key usage