# Development Setup Guide

## 🚀 **Quick Start**

### **Prerequisites**

- **Node.js**: v22.17.0 LTS or higher
- **Rust**: Latest stable version (1.87.0+)
- **Tauri CLI**: `cargo install tauri-cli`

### **Initial Setup**

```bash
# Clone the repository
git clone https://github.com/inauman/barqly-vault.git
cd barqly-vault

# Install dependencies
npm install          # Frontend dependencies
cargo build          # Backend dependencies

# Setup pre-commit hooks
chmod +x scripts/setup-hooks.sh
./scripts/setup-hooks.sh
```

## 🛠️ **Development Commands**

### **From Project Root (Recommended)**

#### **Make Commands (Short)**

```bash
make dev             # Start UI development server
make desktop         # Start Tauri desktop app
make build           # Build UI for production
make desktop-build   # Build desktop app for distribution
make lint            # Lint frontend code
make clean           # Clean build artifacts
make help            # Show all available commands
```

#### **npm Scripts (Alternative)**

```bash
npm run dev          # Start UI development server
npm run tauri:dev    # Start Tauri desktop app
npm run build        # Build UI for production
npm run tauri:build  # Build desktop app
npm run lint         # Lint frontend code
```

### **From Subdirectories (If Needed)**

```bash
# Frontend development
cd src-ui
npm run dev          # Start dev server
npm run build        # Build for production

# Backend development
cd src-tauri
cargo tauri dev      # Start desktop app
cargo build          # Build backend
```

## 📦 **Package Management**

### **Frontend Packages**

```bash
# Install from root (recommended)
npm install <package-name>

# Install from src-ui directory
cd src-ui
npm install <package-name>
```

### **Backend Packages**

```bash
# Install from root (recommended)
cargo add <package-name>

# Install from src-tauri directory
cd src-tauri
cargo add <package-name>
```

## 🎨 **Frontend Development**

### **Technology Stack**

- **React 18 LTS** with TypeScript 5.x
- **Tailwind CSS v4** with Vite plugin
- **Shadcn/ui** components with OKLCH colors
- **Zustand** for state management
- **React Router v6** for routing

### **Key Files**

```
src-ui/
├── src/
│   ├── components/     # UI components
│   ├── lib/           # Utilities and API types
│   ├── pages/         # Page components
│   └── App.tsx        # Main app component
├── package.json       # Frontend dependencies
├── vite.config.ts     # Vite configuration
└── tailwind.config.js # Tailwind configuration
```

### **Adding Shadcn/ui Components**

```bash
cd src-ui
npx shadcn@canary add <component-name>
```

## 🔧 **Backend Development**

### **Technology Stack**

- **Rust** with Tauri v2
- **age-encryption** for cryptographic operations
- **serde** for serialization
- **tracing** for structured logging
- **thiserror** for error handling

### **Key Files**

```
src-tauri/
├── src/
│   ├── commands/      # Tauri command handlers
│   ├── crypto/        # Cryptographic operations
│   ├── storage/       # Key and file storage
│   └── file_ops/      # File operations
├── Cargo.toml         # Backend dependencies
└── tauri.conf.json    # Tauri configuration
```

### **Generating TypeScript Types**

```bash
# From root
cargo build --features generate-types

# From src-tauri
cd src-tauri
cargo build --features generate-types
```

## 🔄 **Development Workflow**

### **1. Start Development**

```bash
# Option 1: UI only (for frontend work)
make dev

# Option 2: Full desktop app (for full-stack work)
make desktop
```

### **2. Make Changes**

- Edit frontend code in `src-ui/src/`
- Edit backend code in `src-tauri/src/`
- Both will hot-reload automatically

### **3. Validate Changes**

```bash
# Before committing
make lint            # Frontend linting
cargo fmt --check    # Backend formatting
cargo clippy         # Backend linting
cargo test           # Backend tests
```

### **4. Commit Changes**

```bash
git add .
git commit -m "feat: your feature description"
# Pre-commit hooks will run validation automatically
```

## 🧪 **Testing**

### **Frontend Testing**

```bash
cd src-ui
npm test             # Run tests
npm run test:watch   # Watch mode
```

### **Backend Testing**

```bash
# From root
cargo test

# From src-tauri
cd src-tauri
cargo test
```

### **Integration Testing**

```bash
# Run all tests
cargo test --workspace
```

## 🚀 **Building for Production**

### **Frontend Build**

```bash
make build           # Build UI
# Output: src-ui/dist/
```

### **Desktop App Build**

```bash
make desktop-build   # Build desktop app
# Output: src-tauri/target/release/
```

## 🔍 **Debugging**

### **Frontend Debugging**

- Use browser dev tools when running `make dev`
- React DevTools extension recommended
- Vite provides fast HMR and error overlay

### **Backend Debugging**

- Use `cargo tauri dev` for desktop debugging
- Check logs in terminal output
- Use `tracing` for structured logging

### **Tauri Debugging**

```bash
# Enable debug logging
RUST_LOG=debug make desktop

# Enable trace logging
RUST_LOG=trace make desktop
```

## 📁 **Project Structure**

```
barqly-vault/
├── src-ui/              # Frontend (React/TypeScript)
│   ├── src/             # Source code
│   ├── package.json     # Frontend dependencies
│   └── vite.config.ts   # Vite configuration
├── src-tauri/           # Backend (Rust/Tauri)
│   ├── src/             # Source code
│   ├── Cargo.toml       # Backend dependencies
│   └── tauri.conf.json  # Tauri configuration
├── package.json         # Root workspace (npm)
├── Cargo.toml           # Root workspace (Rust)
├── Makefile             # Development commands
└── README.md            # Project documentation
```

## 🛡️ **Security Considerations**

### **Development Security**

- Never commit sensitive data (keys, passphrases)
- Use `.env` files for local configuration
- Follow security guidelines in code reviews

### **Cryptographic Operations**

- All crypto operations use audited libraries
- Sensitive data is zeroed from memory
- Keys are stored encrypted at rest

## 🆘 **Troubleshooting**

### **Common Issues**

#### **Frontend Issues**

```bash
# Clear node_modules and reinstall
cd src-ui
rm -rf node_modules package-lock.json
npm install

# Clear Vite cache
rm -rf node_modules/.vite
```

#### **Backend Issues**

```bash
# Clear Rust cache
cargo clean

# Update Rust toolchain
rustup update
```

#### **Tauri Issues**

```bash
# Reinstall Tauri CLI
cargo install tauri-cli --force

# Clear Tauri cache
rm -rf src-tauri/target/
```

### **Getting Help**

- Check the [Validation System](./Validation-System.md)
- Review [API Documentation](../Architecture/API-Quick-Reference.md)
- Open a [GitHub Issue](https://github.com/inauman/barqly-vault/issues)

---

_This guide covers the essential setup and workflow for Barqly Vault development. For detailed API documentation, see the Architecture section._
