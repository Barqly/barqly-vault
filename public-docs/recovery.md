# Barqly Vault Recovery Guide

**Recover your encrypted files using your vault keys**

---

## Prerequisites

Before starting recovery, ensure you have:

✓ **Barqly Vault installed** - [Download here](https://barqly.com/vault)
✓ **Your encrypted .age file** - Usually in `~/Documents/Barqly-Vaults/`
✓ **At least ONE key** from your vault:
  - A YubiKey that was attached to the vault, OR
  - A passphrase key file (`.agekey.enc`)

**Important:** Your vault was encrypted to 2-4 keys. You only need **ANY ONE** of them to decrypt.

---

## Quick Start

1. **Find your RECOVERY.txt file** - Saved alongside your encrypted `.age` file
2. **Check which keys were used** - Listed in RECOVERY.txt
3. **Follow the appropriate recovery method below** - YubiKey or Passphrase

---

## Method 1: YubiKey Recovery

### If Your YubiKey is Already Registered

1. **Connect your YubiKey** to your computer
2. **Open Barqly Vault**
3. **Go to Decrypt** page (left sidebar)
4. **Select your encrypted `.age` file**
   - Click "Select Files" or drag-and-drop
   - Navigate to `~/Documents/Barqly-Vaults/`
5. **Choose your YubiKey** from the dropdown
6. **Enter your YubiKey PIN**
7. **Touch your YubiKey** when the green light blinks
8. **Files recovered!** Check `~/Documents/Barqly-Recovery/{vault-name}/`

### If Your YubiKey is Not Registered

1. **Connect your YubiKey** to your computer
2. **Open Barqly Vault**
3. **Go to Manage Keys** page (left sidebar)
4. **Click "+ New Key"** → **Detect YubiKey**
5. **YubiKey should appear** in the detection list
6. **Enter your label** (or use the default)
7. **Enter your YubiKey PIN** to verify ownership
8. **Click "Add to Registry"**
9. **Now follow the steps above** ("If Your YubiKey is Already Registered")

---

## Method 2: Passphrase Key Recovery

### Step 1: Import Your Passphrase Key

1. **Locate your passphrase key file**
   - Filename: `{key-label}.agekey.enc` (e.g., `MBP-2024-Family-Key.agekey.enc`)
   - Check your backups or wherever you saved it
2. **Open Barqly Vault**
3. **Go to Manage Keys** page (left sidebar)
4. **Click "Import Key"**
5. **Select the `.agekey.enc` file**
6. **Enter the passphrase** that protects this key
7. **Key imported successfully!**

### Step 2: Decrypt Your Vault

1. **Go to Decrypt** page (left sidebar)
2. **Select your encrypted `.age` file**
   - Click "Select Files" or drag-and-drop
   - Navigate to `~/Documents/Barqly-Vaults/`
3. **Choose your imported passphrase key** from the dropdown
4. **Enter your passphrase**
5. **Click "Decrypt Vault"**
6. **Files recovered!** Check `~/Documents/Barqly-Recovery/{vault-name}/`

---

## Recovery Output Location

Decrypted files are always recovered to:

- **macOS:** `~/Documents/Barqly-Recovery/{vault-name}/`
- **Windows:** `C:\Users\{username}\Documents\Barqly-Recovery\{vault-name}\`
- **Linux:** `/home/{username}/Documents/Barqly-Recovery/{vault-name}/`

Files are organized in their original folder structure.

---

## Understanding Your RECOVERY.txt File

Each encrypted vault has an accompanying `{vault-name}-RECOVERY.txt` file that lists:

- **Vault name and creation date**
- **All keys that can decrypt this vault** (you only need ONE)
  - YubiKeys: Last 4 digits of serial (e.g., "ending in ...3715")
  - Passphrase keys: Label and filename
- **File count and total size** (to verify correct vault)
- **Recovery output location**

**Example:**
```
✓ 3 YubiKey(s):
  - YubiKey ending in ...3715 (Label: YubiKey-15903715)
  - YubiKey ending in ...0420 (Label: YubiKey-31310420)

✓ 1 Passphrase Key(s):
  - Label: MBP 2024 Family Key
    Key file: MBP-2024-Family-Key.agekey.enc
```

---

## Troubleshooting

### "YubiKey not detected"

**Solution:**
- Ensure YubiKey is properly connected
- Try unplugging and reconnecting
- Click "Refresh" in the detection dialog
- Check YubiKey works (green light blinks when touched)

### "Incorrect PIN"

**Solution:**
- Double-check your PIN (6-8 digits)
- Refer to your password manager where you stored it
- **Warning:** After 3 incorrect attempts, PIN will be blocked
- If blocked, you'll need your Recovery PIN to unlock

### "YubiKey touch not detected"

**Solution:**
- Watch for the green light to blink on your YubiKey
- Touch the gold contact when it blinks
- Don't wait too long (30 second timeout)
- Try again if timeout occurs

### "Incorrect passphrase"

**Solution:**
- Verify you're using the correct passphrase
- Check your password manager
- Try copy-pasting to avoid typos
- Passphrases are case-sensitive

### "Key file not found" or "Can't import .agekey.enc"

**Solution:**
- Verify the file is actually a `.agekey.enc` file
- Check file hasn't been corrupted
- Try locating it in your backups
- Ensure you have the correct passphrase for this key file

### "Wrong YubiKey" or "Failed to decrypt"

**Solution:**
- Check your RECOVERY.txt file
- Verify you're using one of the listed YubiKeys (check last 4 digits)
- Try a different YubiKey if you have multiple
- Ensure the YubiKey was actually attached to this vault

---

## Lost All Your Keys?

If you've lost **all** the keys that were attached to your vault:

**Unfortunately, your files cannot be recovered.**

Barqly Vault uses strong encryption (age encryption). This means:
- Without at least one valid key, decryption is cryptographically impossible
- This is by design - it's what makes your data secure
- Even Barqly cannot help (we don't have your keys)

**Prevention for the future:**
- **Use 2-4 keys per vault** (redundancy!)
- **Mix key types:** YubiKeys (hardware) + Passphrase keys (software)
- **Backup passphrase key files** securely (password manager, safe location)
- **Keep YubiKeys in separate physical locations**
- **Document which keys go with which vaults** (RECOVERY.txt helps with this)

---

## Recovery Mode (Disaster Recovery)

If your vault manifest and key registry were deleted (system crash, reinstall):

### What is Recovery Mode?

When Barqly Vault detects an encrypted `.age` file without a corresponding vault manifest, it enters **Recovery Mode**.

### How Recovery Mode Works:

1. **Select the orphaned `.age` file** on Decrypt page
2. **You'll see a Recovery Mode banner** (orange ShieldAlert icon)
3. **Import or detect your key** (if not already in Manage Keys)
4. **Decrypt as normal**
5. **Everything is automatically restored:**
   - Vault manifest
   - Key registry
   - Your files

**After recovery:** Your vault appears in Vault Hub and works normally!

---

## Still Need Help?

**Email Support:** support@barqly.com

**Include in your message:**
- Brief description of the issue
- Which recovery method you tried (YubiKey or Passphrase)
- Any error messages you saw
- Operating system (macOS, Windows, Linux)

We typically respond within 24 hours.

---

## Related Resources

- [Download Barqly Vault](https://barqly.com/vault)
- [Main Website](https://barqly.com)
- [GitHub Repository](https://github.com/barqly/barqly-vault)

---

_Last updated: October 27, 2025_
