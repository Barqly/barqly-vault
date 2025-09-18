# Unified Key Menu Design

## Executive Summary
Replace complex "protection mode" cards with a unified visual key menu that treats all keys (passphrase and YubiKey) equally. Vault-centric architecture where keys belong to vaults, not globally.

## Core Philosophy
- **No Protection Mode Terminology**: Remove "Passphrase Only", "YubiKey Only", "Hybrid"
- **All Keys Are Equal**: Passphrase keys and YubiKeys shown in same visual menu
- **Vault-Centric**: Vaults are the primary organizing construct
- **Visual Simplicity**: See all keys at a glance

## Visual Key Menu Design

### Standard Layout (1 Passphrase + 3 YubiKeys)
```
Vault: Family Documents
────────────────────────
┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐
│    🔐   │  │    🔑   │  │    🔑   │  │    🗝️   │
│   ✅    │  │   ✅    │  │         │  │         │
│personal-│  │yubikey- │  │yubikey- │  │   Add   │
│ laptop  │  │personal │  │  work   │  │         │
└─────────┘  └─────────┘  └─────────┘  └─────────┘
```

### Key States
- **Green ✅**: Configured and ready (passphrase) or currently inserted (YubiKey)
- **Blue**: Registered YubiKey (not currently inserted)
- **Grey**: Empty slot available
- **Yellow**: Needs attention (orphaned/recovery needed)

## Key Management Rules

### Key Naming
- **User-driven**: Users provide descriptive names
- **Length**: 3-5 words recommended, 40 characters max
- **Storage Format**: Lowercase with dashes (e.g., "Personal Laptop" → "personal-laptop")
- **Examples**:
  - Passphrase: "personal-laptop", "work-macbook", "emergency-backup"
  - YubiKey: "yubikey-personal", "yubikey-office", "hardware-backup"

### Key Sharing Across Vaults
- **Reusable**: Same key CAN be used across multiple vaults
- **Independent Registration**: Each vault maintains its own key list
- **YubiKey Registration Flow**:
  - First vault: Full initialization (PIN setup, recovery code)
  - Subsequent vaults: Just register (enter PIN to confirm)
- **Passphrase Key Flow**:
  - Each vault can have different passphrase keys
  - Or reuse same passphrase with different labels

### No Migration Needed
- App released only 2 weeks ago
- No user tracking (offline-first)
- Clean slate for new design

## Vault-Centric Architecture

### Vault as Primary Construct
```
App Structure:
├── Vault Selection (if multiple)
│   └── Family Documents ▼
│   └── Business Files
│   └── [Create New Vault...]
│
└── Key Menu for Selected Vault
    ├── Passphrase Key(s)
    └── YubiKey(s)
```

### Single Vault Behavior
- No vault selector shown
- Key menu directly visible
- Setup screen shows key configuration

### Multi-Vault Behavior
- Vault dropdown at top
- Each vault has independent key configuration
- Keys can be shared but must be explicitly registered per vault

## Screen-Specific Behaviors

### Setup Screen

**First Time (No Vault)**:
```
Create Your First Vault
───────────────────────
Vault Name: [________________]

Add Your Keys:
┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐
│    ➕   │  │    ➕   │  │    ➕   │  │    ➕   │
│   Add   │  │   Add   │  │   Add   │  │   Add   │
│  Pass-  │  │YubiKey  │  │YubiKey  │  │YubiKey  │
│ phrase  │  │         │  │         │  │         │
└─────────┘  └─────────┘  └─────────┘  └─────────┘

[Create Vault]
```

**Existing Vault**:
```
Manage Vault: Family Documents
─────────────────────────────
┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐
│    🔐   │  │    🔑   │  │    🗝️   │  │    🗝️   │
│   ✅    │  │   ✅    │  │   Add   │  │   Add   │
│personal-│  │yubikey- │  │YubiKey  │  │YubiKey  │
│ laptop  │  │personal │  │         │  │         │
└─────────┘  └─────────┘  └─────────┘  └─────────┘
    [Edit]      [Remove]

[Save Changes]
```

### Encrypt Screen

**Simplified Flow** (No Key Selection):
```
Step 1: Select/Confirm Vault
Step 2: Add Files
Step 3: Automatic encryption to ALL vault keys

Encrypting to: Family Documents
──────────────────────────────
Using keys: personal-laptop, yubikey-personal, yubikey-work
[All 3 keys will be able to decrypt this vault]

[Drop files here]

[Encrypt Vault]
```

### Decrypt Screen

**Auto-Detection Flow**:
```
Step 1: Drop encrypted vault file
Step 2: Auto-detect vault and show its keys
Step 3: Use ANY available key

Vault Detected: Family Documents
────────────────────────────────
┌─────────┐  ┌─────────┐  ┌─────────┐
│    🔐   │  │    🔑   │  │    🔑   │
│Available│  │   ✅    │  │Not Here │
│personal-│  │yubikey- │  │yubikey- │
│ laptop  │  │personal │  │  work   │
└─────────┘  └─────────┘  └─────────┘
 [Use This]   [Active]

Enter PIN: [______]
[Decrypt]
```

## Key Registration Workflows

### First YubiKey for Any Vault
1. Insert YubiKey
2. Initialize: Set PIN, get recovery code
3. Register with vault
4. YubiKey now usable for THIS vault

### Same YubiKey for Another Vault
1. Insert YubiKey (already initialized)
2. Verify with PIN
3. Register with new vault
4. YubiKey now usable for BOTH vaults

### Passphrase Key
1. Enter label (descriptive name)
2. Enter passphrase
3. Confirm passphrase
4. Key created and registered to current vault

## Technical Implementation

### Backend Configuration
```rust
// Configurable limits
const MAX_PASSPHRASE_KEYS: usize = 1;  // Per vault
const MAX_YUBIKEYS_UI: usize = 3;      // Shown in UI
const MAX_YUBIKEYS_BACKEND: usize = 10; // Backend limit
const MAX_VAULTS: usize = 10;          // Total vaults

// Key naming
const MAX_KEY_LABEL_LENGTH: usize = 40;
const KEY_LABEL_FORMAT: &str = "lowercase-with-dashes";
```

### Data Structure
```rust
struct Vault {
    id: String,
    name: String,
    keys: Vec<KeyReference>,
    created_at: DateTime,
}

struct KeyReference {
    key_type: KeyType,
    label: String,          // User-friendly name
    identifier: String,     // Actual key ID/serial
    registered_at: DateTime,
}

enum KeyType {
    Passphrase,
    YubiKey { serial: String },
}
```

## Benefits

1. **Intuitive**: No complex protection mode concepts
2. **Flexible**: Mix and match keys as needed
3. **Vault-Centric**: Clear organization model
4. **Visual**: See key status at a glance
5. **Reusable**: Share keys across vaults
6. **Progressive**: Start simple, add complexity as needed

## User Flows

### New User Journey
1. Open app → Create first vault
2. Name vault → "Family Documents"
3. Add passphrase key → "personal-laptop"
4. Optional: Add YubiKey
5. Vault ready for use

### Power User (Multiple Vaults)
1. Has "Family", "Work", "Archive" vaults
2. YubiKey registered to all three
3. Different passphrase for each (or same)
4. Quick vault switching via dropdown

### Recovery Scenario
1. Drop encrypted file
2. Auto-detects vault: "Family Documents"
3. Shows available keys
4. Insert ANY registered YubiKey OR enter passphrase
5. Decrypt successfully

## Migration Strategy
**Not needed** - App released 2 weeks ago, no legacy users to migrate

## Future Enhancements
- Vault templates (suggested key configurations)
- Key strength indicators
- Key usage analytics (last used, frequency)
- Batch operations (register key to multiple vaults)
- Key rotation reminders

## Summary
This unified key menu design eliminates complexity while maintaining security. Users think in terms of vaults and keys, not protection modes. The visual menu provides instant understanding of security configuration without technical jargon.