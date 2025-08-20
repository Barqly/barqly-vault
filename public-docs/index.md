# Barqly Vault

**Simple, secure file encryption for the Bitcoin ecosystem**

---

## What is Barqly Vault?

Barqly Vault is a minimal, open-source desktop app that lets you encrypt and backup your most important digital files - like Bitcoin output descriptors, Lightning node backups, family documents, or any sensitive data you need to protect.

## The Problem it Solves

When you practice Bitcoin self-custody (mainchain or Lightning) or have sensitive family documents, you need a reliable way to create secure backups that you control completely. While some tools have built-in encryption, many users need additional security layers or want to encrypt other sensitive files alongside their Bitcoin backups.

## How it Works

1. **Setup**: You create a secure "key" (like a digital lock) with a passphrase you remember
2. **Encrypt**: You select files or folders, choose your key, and the app creates an encrypted backup
3. **Decrypt**: When you need your files back, you use your key and passphrase to unlock them

## Key Benefits

- **Simple**: Three clear steps - setup, encrypt, decrypt
- **Secure**: Uses [age](https://github.com/FiloSottile/age), a modern encryption standard trusted by security experts
- **Self-Controlled**: Your files never leave your computer unless you choose to move them
- **Cross-Platform**: Works the same way on Mac, Windows, and Linux
- **Reliable**: Preserves folder structure and includes integrity checks to ensure your files are safe

## Target Users

- **Bitcoin mainchain users** - wallet recovery info, output descriptors, seed phrases
- **Lightning node operators** - additional encryption for node backups
- **Bitcoin businesses** - client data, configuration files, recovery kits
- **Families** - inheritance planning with all Bitcoin-related documents
- **Anyone** who wants simple, secure file encryption without cloud lock-in

## The Promise

Professional-grade encryption, without the complexity. No cloud. No accounts. No hidden dependencies. Just secure, reliable file protection you fully control.

---

## 🚀 Get Involved

👉 [Try the Alpha Preview](https://github.com/barqly/barqly-vault)  
👉 [Star the Repo](https://github.com/barqly/barqly-vault/stargazers)  
👉 [Contribute Feedback](https://github.com/barqly/barqly-vault/issues)

---

## Current Status

**Development Phase**: Core application development in progress  
**Timeline**: Q3-Q4 2025 for initial release  
**Platform**: Cross-platform desktop application (macOS, Windows, Linux)

## Technology Stack

- **Backend**: Rust with Tauri framework
- **Frontend**: React with TypeScript
- **Encryption**: Age encryption standard

---

_Built with ❤️ for the Bitcoin community_
