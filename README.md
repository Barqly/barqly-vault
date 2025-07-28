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
# Install all dependencies (from project root)
npm install          # Installs frontend dependencies
cargo build          # Builds backend dependencies
```

### Running the App (Development)

```bash
# From project root - choose your preferred method:

# Option 1: Make commands (shorter)
make dev             # Start UI development server
make desktop         # Start Tauri desktop app

# Option 2: npm scripts
npm run dev          # Start UI development server
npm run tauri:dev    # Start Tauri desktop app

# Option 3: Direct commands
cd src-ui && npm run dev           # UI only
cd src-tauri && cargo tauri dev    # Desktop app
```

---

## Project Structure

```
barqly-vault/
├── src-ui/          # React/TypeScript frontend
│   ├── src/         # Frontend source code
│   ├── package.json # Frontend dependencies
│   └── vite.config.ts
├── src-tauri/       # Rust backend (Tauri)
│   ├── src/         # Backend source code
│   ├── Cargo.toml   # Backend dependencies
│   └── tauri.conf.json
├── package.json     # Root workspace (npm)
├── Cargo.toml       # Root workspace (Rust)
├── Makefile         # Development commands
└── README.md        # This file
```

### Package Management

- **Frontend packages**: Install from root with `npm install <package>` or from `src-ui/` directory
- **Backend packages**: Install from root with `cargo add <package>` or from `src-tauri/` directory
- **Workspace setup**: Both npm and Cargo workspaces are configured for seamless development

---

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

---

## License

MIT
