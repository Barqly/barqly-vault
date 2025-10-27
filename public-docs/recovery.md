# Barqly Vault Recovery Guide

**Recover your encrypted files using your vault keys**

---

## What You Need

Before starting recovery, ensure you have:

✓ **Barqly Vault installed** - [Download here](https://barqly.com/vault)
✓ **Your encrypted .age file** - Usually in `~/Documents/Barqly-Vaults/`
✓ **At least ONE key** from your vault (see your RECOVERY.txt file)

**Important:** Your vault was encrypted to 2-4 keys. You only need **ANY ONE** of them to decrypt.

---

## YubiKey Recovery

1. **Connect YubiKey** to your computer
2. **Open Barqly Vault** → Decrypt
3. **Select your encrypted .age file**
4. **Choose YubiKey** from dropdown, enter PIN
5. **Touch YubiKey** when the green light blinks
6. **Done!** Files recovered to `Documents/Barqly-Recovery/{vault-name}/`

**If YubiKey not registered:**
- Go to Manage Keys → + New Key → Detect YubiKey first
- Enter PIN to verify ownership
- Then follow steps above

---

## Passphrase Key Recovery

1. **Import your key file:**
   - Open Barqly Vault → Manage Keys → Import Key
   - Select your `.agekey.enc` file, enter passphrase
2. **Decrypt your vault:**
   - Go to Decrypt → Select your `.age` file
   - Choose imported key, enter passphrase
3. **Done!** Files recovered to `Documents/Barqly-Recovery/{vault-name}/`

---

## Lost All Your Keys?

**If you've lost ALL keys attached to your vault, your files cannot be recovered.**

Encryption is designed to be unbreakable without keys. Even Barqly cannot help.

**Prevent this in the future:**
- Use 2-4 keys per vault (redundancy!)
- Mix YubiKeys (hardware) and Passphrase keys (software)
- Backup passphrase key files securely
- Keep YubiKeys in separate physical locations

---

## Need Help?

**Email:** support@barqly.com

Include:
- Brief description of the issue
- Which recovery method you tried (YubiKey or Passphrase)
- Any error messages
- Operating system (macOS, Windows, Linux)

We typically respond within 24 hours.

---

_Last updated: October 27, 2025_
