# Barqly Vault

Barqly Vault is a cross-platform desktop application for secure file encryption, designed for Bitcoin custody backup and restoration. Built with Tauri (Rust backend) and React/TypeScript (frontend), it uses the audited `age` encryption standard for maximum security.

---

## Features
- Secure file and folder encryption using `age`
- Cross-platform: macOS, Windows, Linux
- Simple, intuitive interface
- Bitcoin custody backup focus

---

## Getting Started

### Prerequisites
- Node.js v22.17.0 LTS or higher
- Rust (latest stable)
- Tauri CLI

### Setup
```bash
# Install dependencies
cd src-ui && npm install
cd ../src-tauri && cargo build
```

### Running the App (Development)
```bash
# In project root
cd src-ui
npm run tauri dev
```

---

## Project Structure
- `src-ui/` – React/TypeScript frontend
- `src-tauri/` – Rust backend (Tauri)
- `docs/` – Documentation
- `zenai-programming-rituals/` – AI/rituals/process docs

---

## Contributing
See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

---

## License
MIT
# test
