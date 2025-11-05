# Barqly Vault Recovery Guide

**Recover your encrypted files using your vault keys**

---

## What You Need

Before starting recovery, ensure you have:

✓ **Barqly Vault installed** - [Download here](https://barqly.com/vault)
✓ **Your encrypted .age file** - Usually in `~/Documents/Barqly-Vaults/`
✓ **At least ONE key** from your vault (see your RECOVERY.txt file)

**Important:** Your vault was encrypted to up to 4 keys. You only need **ANY ONE** of them to decrypt.

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
- Use multiple keys per vault (at least 2 recommended for redundancy)
- Use hardware keys (YubiKeys) for maximum security
- Backup passphrase key files securely if using them
- Keep YubiKeys in separate physical locations

---

_Last updated: October 27, 2025_
