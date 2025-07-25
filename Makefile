# Barqly Vault - Monorepo Makefile
# Secure file encryption for Bitcoin custody

.PHONY: help ui app build app-build preview app-preview lint fmt rust-lint rust-fmt clean install validate

# Default target
help:
	@echo "Barqly Vault - Available Commands:"
	@echo ""
	@echo "Development:"
	@echo "  ui            - Start UI development server"
	@echo "  app           - Start Tauri desktop app"
	@echo ""
	@echo "Build:"
	@echo "  build         - Build UI for production"
	@echo "  app-build     - Build desktop app"
	@echo ""
	@echo "Preview:"
	@echo "  preview       - Preview UI build"
	@echo "  app-preview   - Preview desktop app build"
	@echo ""
	@echo "Quality Assurance:"
	@echo "  validate      - Comprehensive validation (mirrors CI exactly)"
	@echo "  lint          - Run ESLint on frontend"
	@echo "  fmt           - Run Prettier on frontend"
	@echo "  rust-lint     - Run clippy on Rust code"
	@echo "  rust-fmt      - Run rustfmt on Rust code"
	@echo ""
	@echo "Utilities:"
	@echo "  clean         - Clean build artifacts"
	@echo "  install       - Install dependencies"
	@echo ""
	@echo "💡 Tip: Run 'make validate' before committing to ensure CI will pass!"

# Development commands
ui:
	@echo "🚀 Starting UI development server..."
	cd src-ui && npm run dev

app:
	@echo "🖥️  Starting Tauri desktop app..."
	cd src-tauri && cargo tauri dev

# Build commands
build:
	@echo "🔨 Building UI for production..."
	cd src-ui && npm run build

app-build:
	@echo "📦 Building desktop app for distribution..."
	cd src-tauri && cargo tauri build

# Preview commands
preview:
	@echo "👀 Previewing UI build..."
	cd src-ui && npm run preview

app-preview:
	@echo "👀 Previewing desktop app build..."
	cd src-tauri && cargo tauri preview

# Quality Assurance
validate:
	@echo "🔍 Running comprehensive validation (mirrors CI exactly)..."
	@./scripts/validate.sh

lint:
	@echo "🔍 Linting frontend code..."
	@cd src-ui && npm run lint

fmt:
	@echo "🎨 Formatting frontend code..."
	@cd src-ui && npm run fmt

rust-lint:
	@echo "🔍 Linting Rust code..."
	@cd src-tauri && cargo clippy --all-targets --all-features -- -D warnings

rust-fmt:
	@echo "🎨 Formatting Rust code..."
	@cd src-tauri && cargo fmt

clean:
	@echo "🧹 Cleaning build artifacts..."
	cd src-ui && rm -rf dist node_modules/.vite
	cd src-tauri && cargo clean

# Setup commands
install:
	@echo "📦 Installing dependencies..."
	cd src-ui && npm install
	cd src-tauri && cargo build 