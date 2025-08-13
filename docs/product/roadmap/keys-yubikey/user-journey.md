# User Journey: YubiKey Integration

## Overview

This document details the user experience flows for YubiKey integration, covering initial setup, daily usage, and recovery scenarios.

## Initial Setup Flow

### Step 1: Protection Mode Selection

```
Welcome to Barqly Vault Setup
─────────────────────────────

How would you like to protect your encryption keys?

○ Passphrase Protection (Recommended for beginners)
  Traditional password-based security
  ✓ Works everywhere
  ✓ No hardware required

○ YubiKey Protection (Hardware Security)
  Physical key required for decryption
  ✓ Cannot be hacked remotely
  ⚠️ Lost key = lost access

● Both (Maximum Flexibility) [RECOMMENDED]
  Best of both worlds
  ✓ YubiKey for daily convenience
  ✓ Passphrase for emergency backup

[Learn More] [Continue →]
```

### Step 2A: Passphrase Only Flow

```
Create Your Passphrase
──────────────────────

Passphrase:     [************************]
                Min 12 characters

Confirm:        [************************]

Hint (optional): [________________________]
                Example: "Wedding date + dog's name"

Password Strength: ████████░░ Strong

[← Back] [Generate Key →]
```

### Step 2B: YubiKey Only Flow

```
YubiKey Setup
─────────────

Step 1: Insert Your YubiKey
[Detecting...]

✅ YubiKey 5C NFC Detected
   Serial: 12345678
   Firmware: 5.4.3

Step 2: Choose Security Slot
○ Slot 82 (Recommended - Empty)
○ Slot 83 (Empty)
○ Slot 84 (Empty)
⚠️ Slot 9A (In use - will be overwritten)

Step 3: Set YubiKey PIN
New PIN:     [******]
Confirm PIN: [******]

⚠️ Important: Remember this PIN!
You'll need it every time you decrypt files.

[← Back] [Generate Key on YubiKey →]
```

#### YubiKey Only - Backup Warning

```
⚠️ Critical Security Decision
────────────────────────────

You're using YubiKey-only protection without a backup method.

Risks:
• If you lose this YubiKey, you lose ALL encrypted data
• If YubiKey breaks, you cannot recover files
• No password fallback available

Strongly Recommended:
Add a backup YubiKey now

[Add Backup YubiKey] [I Accept the Risk →]
```

### Step 2C: Both (Hybrid) Flow

```
Step 1 of 2: Create Passphrase
──────────────────────────────

This will be your emergency backup method.

Passphrase:     [************************]
Confirm:        [************************]
Hint (optional): [________________________]

[← Back] [Next: Add YubiKey →]
```

```
Step 2 of 2: Add YubiKey(s)
───────────────────────────

Primary YubiKey
[Insert YubiKey...]

✅ YubiKey 5C NFC (Serial: 12345678)
   PIN: [******]
   Slot: 82

Add Backup YubiKey? (Recommended)
[+ Add Another YubiKey]

Your Protection Setup:
• ✅ Passphrase (emergency backup)
• ✅ YubiKey #12345678 (primary)

[← Back] [Complete Setup →]
```

### Step 3: Setup Confirmation

```
✅ Setup Complete!
─────────────────

Your vault is protected by:

🔐 Passphrase
   Hint: "Wedding date + dog's name"

🔑 YubiKey 5C NFC
   Serial: 12345678
   PIN: Set (not shown)

You can decrypt your vaults using EITHER method.

Important Next Steps:
1. Back up your passphrase securely
2. Test your YubiKey works
3. Consider adding a backup YubiKey

[Test Decryption] [Finish]
```

## Daily Usage Flows

### Encryption Flow

```
Encrypt Files
─────────────

Selected: tax-documents-2025.pdf (2.3 MB)

Your configured protection:
✅ Passphrase key (available)
✅ YubiKey #12345678 (detected)
✅ YubiKey #87654321 (not detected - OK)

Files will be encrypted for ALL your keys.
Any single key can decrypt later.

[Cancel] [Encrypt →]
```

### Decryption Flow - YubiKey Available

```
Decrypt Vault
─────────────

File: tax-documents-2025.age

YubiKey Detected!
Using YubiKey for fast decryption.

Enter YubiKey PIN: [******]

[Touch your YubiKey when it blinks]

✅ Decrypted successfully!
Location: ~/Documents/Barqly Vault/Recovered Files/

[Open Folder] [Done]
```

### Decryption Flow - YubiKey Not Available

```
Decrypt Vault
─────────────

File: tax-documents-2025.age

No YubiKey detected.
This vault can also be decrypted with your passphrase.

Enter passphrase: [************************]
💡 Hint: "Wedding date + dog's name"

✅ Decrypted successfully!

[Open Folder] [Done]
```

## YubiKey Management

### Main Management Screen

```
YubiKey Management
──────────────────

Registered YubiKeys (2)
┌─────────────────────────────────────┐
│ 🔑 YubiKey 5C NFC                   │
│    Serial: 12345678                 │
│    Added: 2025-08-08                │
│    Last Used: 2 hours ago           │
│    Status: ✅ Connected             │
│    [Remove] [Test]                  │
├─────────────────────────────────────┤
│ 🔑 YubiKey 5 NFC                    │
│    Serial: 87654321                 │
│    Added: 2025-08-08                │
│    Last Used: 3 days ago            │
│    Status: ⚪ Not Connected         │
│    [Remove] [Test]                  │
└─────────────────────────────────────┘

[+ Add New YubiKey]

Other Protection Methods:
🔐 Passphrase: Configured
   Last changed: 30 days ago
   [Change Passphrase]
```

### Adding Additional YubiKey

```
Add New YubiKey
───────────────

Step 1: Insert the new YubiKey
[Detecting...]

✅ YubiKey 5 Nano Detected
   Serial: 99887766

Step 2: Configure This YubiKey

Label: [Backup YubiKey Nano]

Choose Slot:
● Slot 82 (Recommended)
○ Slot 83
○ Slot 84

Set PIN for this YubiKey:
New PIN:     [******]
Confirm PIN: [******]

Step 3: Update Existing Vaults?

You have 15 encrypted vaults.
Should they be updated to work with this new YubiKey?

● Yes, update all vaults (Recommended)
  Future vaults will also include this key

○ No, only use for new vaults
  Existing vaults won't work with this key

[Cancel] [Add YubiKey →]
```

### Removing YubiKey

```
Remove YubiKey?
───────────────

You're about to remove:
YubiKey 5C NFC (Serial: 12345678)

⚠️ Warning:
• This YubiKey will no longer decrypt vaults
• Existing vaults will still work with remaining keys
• This cannot be undone

Remaining protection methods:
• ✅ Passphrase (configured)
• ✅ YubiKey #87654321 (backup)

[Cancel] [Remove YubiKey]
```

## Recovery Scenarios

### Scenario 1: Forgot YubiKey PIN

```
YubiKey PIN Required
────────────────────

Enter PIN: [******]

❌ Incorrect PIN
Attempts remaining: 2

[Forgot PIN?]
```

```
PIN Recovery Options
────────────────────

Unfortunately, YubiKey PINs cannot be recovered.
After 3 failed attempts, the YubiKey will lock.

Your options:
1. Use your passphrase instead
   [Decrypt with Passphrase]

2. Use a backup YubiKey
   [Use Different YubiKey]

3. Reset this YubiKey (deletes key!)
   [Learn About Reset]

[← Back]
```

### Scenario 2: Lost YubiKey

```
Recovery Assistant
─────────────────

Can't find your YubiKey? Let's help you recover access.

This vault can be decrypted with:
• 🔑 YubiKey #12345678 (Primary) - Missing?
• 🔑 YubiKey #87654321 (Backup)
• 🔐 Passphrase

Choose recovery method:
[Use Backup YubiKey] [Use Passphrase]
```

### Scenario 3: YubiKey-Only User Lost Device

```
⚠️ Critical Recovery Situation
──────────────────────────────

Your vaults are protected by YubiKey-only.
Without your YubiKey, recovery may not be possible.

Do you have:
○ A backup YubiKey?
○ An exported key backup file?
○ A printed recovery card?

[Yes, I have backup] [No backup available]
```

```
No Recovery Options Available
─────────────────────────────

Unfortunately, without a YubiKey or backup method,
your encrypted vaults cannot be decrypted.

This is why we strongly recommend:
• Using passphrase + YubiKey protection
• Registering multiple YubiKeys
• Creating backup exports

For future vaults, please configure multiple
recovery methods.

[Understood] [Contact Support]
```

## Migration Flows

### Upgrading from Passphrase-Only

```
Add YubiKey Protection
──────────────────────

You currently use passphrase-only protection.
Would you like to add YubiKey for convenience?

Benefits:
✓ Faster daily decryption
✓ No typing passwords
✓ Hardware security

Your passphrase remains as backup.

[Not Now] [Add YubiKey →]
```

### Converting YubiKey-Only to Hybrid

```
Add Backup Protection
─────────────────────

Currently using YubiKey-only (risky).
Add a passphrase for emergency recovery?

This is strongly recommended to prevent
permanent data loss if your YubiKey is lost.

[Create Backup Passphrase →]
```

## Error States

### YubiKey Communication Error

```
⚠️ YubiKey Communication Failed
───────────────────────────────

Unable to communicate with YubiKey.

Try:
1. Remove and reinsert YubiKey
2. Try a different USB port
3. Check YubiKey is not in use by another app

[Retry] [Use Passphrase Instead]
```

### Incompatible YubiKey

```
❌ Incompatible YubiKey
───────────────────

This YubiKey (version 3.x) doesn't support
the required PIV features.

Supported models:
• YubiKey 5 Series
• YubiKey 5C Series
• YubiKey 5 NFC Series

[Learn More] [Use Different Method]
```

## Best Practices Messaging

### First-Time YubiKey User

```
💡 YubiKey Tips
──────────────

New to YubiKey? Here are best practices:

1. Always register at least 2 YubiKeys
   One primary, one backup in safe location

2. Remember your PIN
   Unlike passwords, it's short (6-8 digits)

3. Keep passphrase backup
   Hardware can fail - have a fallback

4. Test regularly
   Verify your backup YubiKey works monthly

[Got it!]
```

### Security Reminder

```
🔒 Security Best Practices
─────────────────────────

Your current setup:
✅ Multiple YubiKeys registered
✅ Passphrase backup configured
✅ All methods tested recently

Recommendations:
• Store backup YubiKey separately
• Don't share YubiKey PINs
• Update passphrase annually
• Test recovery quarterly

[Review Security] [Dismiss]
```

## Success Metrics

Track these user journey metrics:

1. **Setup Completion Rate**
   - Passphrase-only: >95%
   - YubiKey-only: >85%
   - Both: >90%

2. **Time to Complete Setup**
   - Passphrase: <2 minutes
   - YubiKey: <5 minutes
   - Both: <7 minutes

3. **Recovery Success Rate**
   - With backup method: >99%
   - Without backup: track failures

4. **Daily Usage**
   - YubiKey decrypt time: <10 seconds
   - Fallback to passphrase: <5% of attempts

5. **Support Tickets**
   - PIN issues: Provide clear recovery path
   - Lost YubiKey: Emphasize backup importance
