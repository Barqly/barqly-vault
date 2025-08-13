# Getting Started - Barqly Vault

## 🚀 **Development Setup**

### **Prerequisites**

- **Node.js**: v22.17.0 LTS or higher
- **Rust**: Latest stable version (1.87.0+)
- **Tauri CLI**: `cargo install tauri-cli`

### **Quick Setup**

```bash
# Clone the repository
git clone https://github.com/inauman/barqly-vault.git
cd barqly-vault

# Install dependencies (from root)
npm install          # Frontend dependencies
cargo build          # Backend dependencies

# Start development
make dev             # UI development server
make desktop         # Tauri desktop app
```

### **Available Commands**

```bash
# Development
make dev             # Start UI dev server
make desktop         # Start Tauri desktop app
make ui              # Same as make dev

# Build
make build           # Build UI for production
make desktop-build   # Build desktop app
make ui-build        # Same as make build

# Quality
make lint            # Lint UI code
make clean           # Clean build artifacts

# Alternative npm commands
npm run dev          # UI dev server
npm run tauri:dev    # Tauri desktop app
npm run build        # UI build
npm run tauri:build  # Desktop build
```

## 📱 **User Quick Start Guide**

Barqly Vault makes secure file encryption simple. Follow these three steps to protect your important files.

### Step 1: Setup Your Encryption Key

1. **Launch Barqly Vault** on your computer
2. **Create a new key** with a memorable name (e.g., "Family Backup Key")
3. **Choose a strong passphrase** - this is your digital password
4. **Save your key** - it's now ready to use

_💡 Tip: Choose a passphrase you'll remember but others won't guess_

### Step 2: Encrypt Your Files

1. **Select files or folders** you want to protect
2. **Choose your encryption key** from the dropdown
3. **Pick a destination** for your encrypted backup
4. **Click "Encrypt"** - that's it!

_✅ Your files are now securely encrypted and ready for backup_

### Step 3: Decrypt When Needed

1. **Select your encrypted file** (.age extension)
2. **Choose the key** you used for encryption
3. **Enter your passphrase**
4. **Pick where to save** the decrypted files
5. **Click "Decrypt"** - your files are restored!

## What You'll See

### Setup Screen

- Key name and passphrase creation
- Backup reminder for your key
- Success confirmation

### Encrypt Screen

- File/folder selection
- Key selection dropdown
- Destination folder picker
- Progress indicator
- Success message with file location

### Decrypt Screen

- Encrypted file selection
- Key and passphrase input
- Destination selection
- Integrity verification
- Success confirmation

## Best Practices

### 🔐 **Security**

- Use different keys for different purposes
- Keep your passphrase private and memorable
- Store encrypted backups in multiple locations
- Test decryption periodically

### 📁 **Organization**

- Use descriptive key names
- Organize encrypted files by purpose
- Keep a list of what's encrypted where
- Include recovery instructions in your backups

### 💰 **Bitcoin-Specific**

- Encrypt wallet recovery information
- Include output descriptors and seed phrases
- Backup to multiple secure locations
- Test recovery on a different device

## Need Help?

- **First time user?** Start with a small test file
- **Forgot passphrase?** Unfortunately, we can't recover it - that's the security feature
- **Questions?** Open a [GitHub Issue](https://github.com/inauman/barqly-vault/issues) with your question
- **Found a bug?** Report it on [GitHub Issues](https://github.com/inauman/barqly-vault/issues)

## What's Next?

- Learn about [advanced features](../Product/Features.md)
- Explore our [user journey](../Product/User-Journey.md)
- Check out our [roadmap](../Product/Roadmap.md)
- [Contribute to the project](https://github.com/inauman/barqly-vault/blob/main/CONTRIBUTING.md)
