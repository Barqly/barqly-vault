# Barqly Vault - Monorepo Makefile
# Secure file encryption for Bitcoin custody

.PHONY: help dev ui desktop build ui-build desktop-build preview ui-preview desktop-preview lint fmt rust-lint rust-fmt clean install

# Default target
help:
	@echo "Barqly Vault - Available Commands:"
	@echo ""
	@echo "Development:"
	@echo "  dev, ui        - Start UI development server"
	@echo "  desktop        - Start Tauri desktop app"
	@echo "  preview        - Preview UI build"
	@echo "  ui-preview     - Preview UI build"
	@echo "  desktop-preview- Preview desktop app build"
	@echo ""
	@echo "Build:"
	@echo "  build, ui-build      - Build UI for production"
	@echo "  desktop-build        - Build desktop app for distribution"
	@echo ""
	@echo "Quality:"
	@echo "  coverage       - Run UI coverage tests"
	@echo "  lint           - Lint UI code (ESLint)"
	@echo "  fmt            - Format UI code (Prettier)"
	@echo "  rust-lint      - Lint Rust code (clippy)"
	@echo "  rust-fmt       - Format Rust code (cargo fmt)"
	@echo "  clean          - Clean build artifacts"
	@echo ""
	@echo "Setup:"
	@echo "  install        - Install all dependencies"

# Development commands
dev: ui
ui:
	@echo "🚀 Starting UI development server..."
	cd src-ui && npm run dev

desktop:
	@echo "🖥️  Starting Tauri desktop app..."
	cd src-tauri && cargo tauri dev

# Build commands
build: ui-build
ui-build:
	@echo "🔨 Building UI for production..."
	cd src-ui && npm run build

desktop-build:
	@echo "📦 Building desktop app for distribution..."
	cd src-tauri && cargo tauri build

# Preview commands
preview: ui-preview
ui-preview:
	@echo "👀 Previewing UI build..."
	cd src-ui && npm run preview

desktop-preview:
	@echo "👀 Previewing desktop app build..."
	cd src-tauri && cargo tauri preview

# Quality commands
coverage:
	@echo "🔍 Running UI coverage tests..."
	cd src-ui && npm test -- --run --coverage

lint:
	@echo "🔍 Linting UI code..."
	cd src-ui && npm run lint

fmt:
	@echo "🎨 Formatting UI code..."
	cd src-ui && npx prettier --write .

rust-lint:
	@echo "🔍 Linting Rust code..."
	cd src-tauri && cargo clippy

rust-fmt:
	@echo "🎨 Formatting Rust code..."
	cd src-tauri && cargo fmt

clean:
	@echo "🧹 Cleaning build artifacts..."
	cd src-ui && rm -rf dist node_modules/.vite
	cd src-tauri && cargo clean

# Setup commands
install:
	@echo "📦 Installing dependencies..."
	cd src-ui && npm install
	cd src-tauri && cargo build 