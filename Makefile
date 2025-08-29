# Barqly Vault - Monorepo Makefile
# Secure backup and restore for sensitive data & documents

.PHONY: help ui app demo demo-build build app-build dmg-intel dmg-arm dmg-all dmg-quick linux-build preview app-preview lint fmt rust-lint rust-fmt clean clean-releases install validate test test-ui test-rust validate-ui validate-rust dev-reset dev-keys bench clean-keys pipeline-test pipeline-release verify-dmg check-notarization publish-prod list-betas promote-beta

# Default target
help:
	@echo "Barqly Vault - Available Commands:"
	@echo ""
	@echo "Development:"
	@echo "  ui            - Start UI development server"
	@echo "  app           - Start Tauri desktop app"
	@echo "  demo          - Start demo server in browser"
	@echo ""
	@echo "Build:"
	@echo "  build         - Build UI for production"
	@echo "  app-build     - Build desktop app (current architecture)"
	@echo "  dmg-intel     - Build DMG for Intel Macs (x86_64)"
	@echo "  dmg-arm       - Build DMG for Apple Silicon Macs (aarch64)"
	@echo "  dmg-all       - Build separate DMGs for both architectures"
	@echo "  dmg-quick     - Quick build for current architecture (skip validation)"
	@echo "  linux-build   - Build Linux AppImage and .deb (requires Linux OS)"
	@echo "  demo-build    - Build demo site"
	@echo ""
	@echo "Preview:"
	@echo "  preview       - Preview UI build"
	@echo "  app-preview   - Preview desktop app build"
	@echo ""
	@echo "Quality Assurance:"
	@echo "  validate      - Comprehensive validation (mirrors CI exactly)"
	@echo "  validate-ui   - Validate frontend only (lint, format, types, tests)"
	@echo "  validate-rust - Validate Rust only (fmt, clippy, tests)"
	@echo "  validate-docs - Check documentation updates (definition of done)"
	@echo "  lint          - Run ESLint on frontend"
	@echo "  fmt           - Run Prettier on frontend"
	@echo "  rust-lint     - Run clippy on Rust code"
	@echo "  rust-fmt      - Run rustfmt on Rust code"
	@echo ""
	@echo "Testing:"
	@echo "  test          - Run all tests (frontend + backend)"
	@echo "  test-ui       - Run frontend tests only"
	@echo "  test-rust     - Run Rust tests only"
	@echo ""
	@echo "Utilities:"
	@echo "  clean         - Clean build artifacts"
	@echo "  clean-releases - Clean all release files and build artifacts"
	@echo "  install       - Install dependencies"
	@echo ""
	@echo "Development Tools:"
	@echo "  dev-reset     - Reset development environment (keys, logs, cache)"
	@echo "  dev-keys      - Generate sample keys and test data for development"
	@echo "  bench         - Run performance benchmarks"
	@echo "  clean-keys    - Clean application keys directory (with confirmation)"
	@echo ""
	@echo "Pipeline & CI/CD:"
	@echo "  pipeline-test    - Test CI pipeline locally (simulate GitHub Actions)"
	@echo "  pipeline-release - Simulate release pipeline locally"
	@echo ""
	@echo "Release Management:"
	@echo "  list-betas       - List available beta releases for promotion"
	@echo "  promote-beta     - Promote a beta release to production draft"
	@echo "  publish-prod     - Publish production release and update downloads"
	@echo ""
	@echo "UI Capture & Analysis:"
	@echo "  ui-capture    - Start on-demand UI screenshot capture session"
	@echo "  ui-analyze    - Generate analysis prompt for latest capture session"
	@echo ""
	@echo "Code Signing (macOS):"
	@echo "  verify-dmg    - Verify DMG signature and notarization"
	@echo "  check-notarization - Check notarization status of DMG"
	@echo ""
	@echo "💡 Tip: Run 'make validate' before committing to ensure CI will pass!"

# Development commands
ui:
	@echo "🚀 Starting UI development server..."
	cd src-ui && npm run dev

app:
	@echo "🖥️  Starting Tauri desktop app..."
	cd src-tauri && cargo tauri dev

demo:
	@echo "🌐 Starting demo server in browser..."
	cd src-ui && npm run demo:dev

# Build commands
build:
	@echo "🔨 Building UI for production..."
	cd src-ui && npm run build

app-build:
	@echo "📦 Building desktop app for distribution..."
	cd src-tauri && cargo tauri build

demo-build:
	@echo "🌐 Building demo site..."
	cd src-ui && npm run demo:build

dmg-intel:
	@echo "🚀 Building DMG for Intel Macs (x86_64)..."
	@./scripts/build-macos-separate.sh --target intel

dmg-arm:
	@echo "🚀 Building DMG for Apple Silicon Macs (aarch64)..."
	@./scripts/build-macos-separate.sh --target arm

dmg-all:
	@echo "🚀 Building separate DMGs for Intel and Apple Silicon..."
	@./scripts/build-macos-separate.sh

dmg-quick:
	@echo "⚡ Quick DMG build for current architecture (skipping validation)..."
	@./scripts/build-macos-separate.sh --skip-validation --skip-frontend

linux-build:
	@echo "🐧 Building Linux packages (AppImage + .deb)..."
	@./scripts/build-linux.sh

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
	cd src-ui && rm -rf dist dist-demo node_modules/.vite
	cd src-tauri && cargo clean

clean-releases:
	@echo "🧹 Cleaning release files and build artifacts..."
	rm -rf target/aarch64-apple-darwin
	rm -rf target/x86_64-apple-darwin
	# Note: universal builds are no longer used (we follow Sparrow's separate builds model)
	rm -rf target/release/bundle
	cd src-ui && rm -rf dist dist-demo node_modules/.vite
	cd src-tauri && cargo clean

# Setup commands
install:
	@echo "📦 Installing dependencies..."
	cd src-ui && npm install
	cd src-tauri && cargo build

# Testing commands
test:
	@echo "🧪 Running all tests..."
	@$(MAKE) test-rust
	@$(MAKE) test-ui

test-ui:
	@echo "🧪 Running frontend tests..."
	@cd src-ui && npm run test:run

test-rust:
	@echo "🧪 Running Rust tests..."
	@cd src-tauri && cargo test

# Validation commands
validate-ui:
	@echo "🔍 Running frontend validation..."
	@echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
	@echo "1️⃣  Prettier formatting check..."
	@cd src-ui && npx prettier --check . || (echo "❌ Format errors found. Run 'make fmt' to fix." && exit 1)
	@echo "✅ Formatting check passed"
	@echo ""
	@echo "2️⃣  ESLint check..."
	@cd src-ui && npm run lint || (echo "❌ Linting errors found." && exit 1)
	@echo "✅ ESLint check passed"
	@echo ""
	@echo "3️⃣  TypeScript type check..."
	@cd src-ui && npx tsc --noEmit || (echo "❌ Type errors found." && exit 1)
	@echo "✅ TypeScript check passed"
	@echo ""
	@echo "4️⃣  Running tests..."
	@cd src-ui && npm run test:run || (echo "❌ Tests failed." && exit 1)
	@echo "✅ All frontend tests passed"
	@echo ""
	@echo "🎉 Frontend validation complete!"

validate-rust:
	@echo "🔍 Running Rust validation..."
	@echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
	@echo "1️⃣  Rust formatting check..."
	@cd src-tauri && cargo fmt --check || (echo "❌ Format errors found. Run 'make rust-fmt' to fix." && exit 1)
	@echo "✅ Formatting check passed"
	@echo ""
	@echo "2️⃣  Clippy check..."
	@cd src-tauri && cargo clippy --all-targets --all-features -- -D warnings || (echo "❌ Clippy errors found." && exit 1)
	@echo "✅ Clippy check passed"
	@echo ""
	@echo "3️⃣  Running tests..."
	@cd src-tauri && cargo test || (echo "❌ Tests failed." && exit 1)
	@echo "✅ All Rust tests passed"
	@echo ""
	@echo "🎉 Rust validation complete!"

validate-docs:
	@echo "📝 Checking documentation updates..."
	@./scripts/validate-docs.sh

# Development tools
dev-reset:
	@echo "🧹 Resetting development environment..."
	@cd src-tauri && cargo run --example dev_reset
	@echo "🧹 Cleaning build artifacts..."
	@$(MAKE) clean

dev-keys:
	@cd src-tauri && cargo run --example generate_dev_keys

bench:
	@echo "🚀 Running performance benchmarks..."
	@echo ""
	@echo "📊 Cache Performance Test"
	@echo "========================="
	@cd src-tauri && cargo run --example cache_performance_test --release
	@echo ""
	@echo "⚡ Encryption/Decryption Benchmark"
	@echo "=================================="
	@cd src-tauri && cargo run --example encryption_benchmark --release 2>/dev/null || \
		(echo "⚠️  Encryption benchmark not found. Running basic performance test..." && \
		 cargo test --release crypto::benchmarks || \
		 echo "ℹ️  No dedicated benchmarks found. Use 'cargo test --release' for performance testing.")
	@echo ""
	@echo "💾 Memory Usage Test"
	@echo "==================="
	@cd src-tauri && cargo run --example memory_usage_test --release 2>/dev/null || \
		echo "ℹ️  Memory usage test not available. Monitor with system tools during operations."
	@echo ""
	@echo "✅ Benchmark suite complete!"
	@echo "💡 Tip: Run benchmarks after making performance changes to measure impact."

clean-keys:
	@echo "🧹 Cleaning application keys directory..."
	@cd src-tauri && cargo run --example clean_keys 

# UI Capture and Analysis
ui-capture:
	@echo "📸 Starting on-demand UI capture session..."
	@SESSION_DESC=$(desc) npm run ui:capture


ui-analyze:
	@echo "🤖 Generating analysis prompt for latest capture session..."
	@npm run ui:analyze

# Pipeline & CI/CD commands
pipeline-test:
	@echo "🔧 Testing CI pipeline locally (simulating GitHub Actions)..."
	@echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
	@echo "📋 This simulates the CI smart pipeline workflow locally"
	@echo ""
	@echo "🔍 Step 1: Comprehensive validation..."
	@$(MAKE) validate || (echo "❌ Validation failed - CI would fail" && exit 1)
	@echo ""
	@echo "🔨 Step 2: Production build test..."
	@$(MAKE) build || (echo "❌ Build failed - CI would fail" && exit 1)
	@echo ""
	@echo "✅ Pipeline test complete - CI would pass!"
	@echo "💡 Ready to push to GitHub"

pipeline-release:
	@echo "🚀 Simulating release pipeline locally..."
	@echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
	@echo "📋 This tests what would happen on version tag release"
	@echo ""
	@echo "🔍 Step 1: Full validation..."
	@$(MAKE) validate || (echo "❌ Release validation failed" && exit 1)
	@echo ""
	@echo "🍎 Step 2: macOS separate DMGs (Intel & ARM)..."
	@$(MAKE) dmg-all || (echo "❌ macOS build failed" && exit 1)
	@echo ""
	@echo "🐧 Step 3: Linux packages (if on Linux)..."
	@if [[ "$$OSTYPE" == "linux-gnu"* ]]; then \
		$(MAKE) linux-build || (echo "❌ Linux build failed" && exit 1); \
	else \
		echo "⚠️  Skipped Linux build (not on Linux OS)"; \
	fi
	@echo ""
	@echo "✅ Release pipeline simulation complete!"
	@echo "💡 Ready for version tag: git tag v1.0.0 && git push origin v1.0.0"

# Code Signing commands (macOS)
verify-dmg:
	@if [ -z "$(DMG)" ]; then \
		echo "❌ Usage: make verify-dmg DMG=path/to/your.dmg"; \
		exit 1; \
	fi
	@echo "🔍 Verifying DMG signature and notarization..."
	@echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
	@echo ""
	@echo "📋 Signature verification:"
	@codesign -dv --verbose=4 "$(DMG)" 2>&1 || echo "⚠️  DMG is not signed"
	@echo ""
	@echo "📋 Notarization check:"
	@xcrun stapler validate "$(DMG)" 2>&1 || echo "⚠️  DMG is not notarized"
	@echo ""
	@echo "📋 Gatekeeper assessment:"
	@spctl -a -t open --context context:primary-signature -v "$(DMG)" 2>&1 || echo "⚠️  Gatekeeper would block this DMG"
	@echo ""
	@echo "✅ Verification complete"

check-notarization:
	@if [ -z "$(DMG)" ]; then \
		echo "❌ Usage: make check-notarization DMG=path/to/your.dmg"; \
		exit 1; \
	fi
	@echo "🔍 Checking notarization status..."
	@xcrun stapler validate "$(DMG)" || true
	@echo ""
	@echo "💡 For detailed notarization history, use:"
	@echo "   xcrun notarytool history --apple-id YOUR_APPLE_ID --team-id YOUR_TEAM_ID"

# List available beta releases
list-betas:
	@echo "📋 Listing available beta releases..."
	@chmod +x scripts/promote-beta.sh
	@./scripts/promote-beta.sh --list

# Promote beta release to production draft
promote-beta:
	@if [ -z "$(FROM)" ] || [ -z "$(TO)" ]; then \
		echo "❌ Usage: make promote-beta FROM=0.1.0-beta.3 TO=0.1.0"; \
		echo ""; \
		echo "This command will:"; \
		echo "  1. Verify the beta release exists"; \
		echo "  2. Trigger the promotion workflow"; \
		echo "  3. Create a draft production release with beta artifacts"; \
		echo ""; \
		echo "To see available betas: make list-betas"; \
		echo ""; \
		echo "Examples:"; \
		echo "  make list-betas                           # List all beta releases"; \
		echo "  make promote-beta FROM=0.1.0-beta.3 TO=0.1.0  # Promote specific beta"; \
		exit 1; \
	fi
	@echo "🚀 Promoting beta v$(FROM) to production v$(TO)..."
	@chmod +x scripts/promote-beta.sh
	@./scripts/promote-beta.sh --from "$(FROM)" --to "$(TO)"

# Publish production release from draft
publish-prod:
	@if [ -z "$(VERSION)" ]; then \
		echo "❌ Usage: make publish-prod VERSION=0.1.0"; \
		echo ""; \
		echo "This command will:"; \
		echo "  1. Publish the draft release on GitHub"; \
		echo "  2. Update the downloads documentation"; \
		echo "  3. Commit and push the changes"; \
		echo ""; \
		echo "Prerequisites:"; \
		echo "  - Draft release must exist for the specified version"; \
		echo "  - You must have admin permissions to push to main"; \
		exit 1; \
	fi
	@echo "🚀 Publishing production release v$(VERSION)..."
	@chmod +x scripts/publish-production.sh
	@chmod +x scripts/update-downloads.sh
	@./scripts/publish-production.sh "$(VERSION)"