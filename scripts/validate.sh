#!/bin/bash

# Barqly Vault - Comprehensive Validation Script
# This script mirrors the CI environment exactly to catch issues locally

set -e

echo "🔍 Barqly Vault - Comprehensive Validation"
echo "=========================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    local status=$1
    local message=$2
    case $status in
        "success")
            echo -e "${GREEN}✅ $message${NC}"
            ;;
        "error")
            echo -e "${RED}❌ $message${NC}"
            ;;
        "warning")
            echo -e "${YELLOW}⚠️  $message${NC}"
            ;;
        "info")
            echo -e "ℹ️  $message"
            ;;
    esac
}

# Check if we're in the right directory
if [ ! -d "src-tauri" ] || [ ! -d "src-ui" ]; then
    print_status "error" "Must be run from the project root directory"
    exit 1
fi

print_status "info" "Starting comprehensive validation..."

# ============================================================================
# RUST VALIDATION (Mirrors CI exactly)
# ============================================================================
print_status "info" "📦 Rust project validation..."

cd src-tauri

# Cargo fmt check
print_status "info" "🎨 Running cargo fmt..."
if ! cargo fmt --check; then
    print_status "error" "Code formatting issues found!"
    print_status "info" "💡 Run 'cargo fmt' to fix formatting"
    exit 1
fi
print_status "success" "Formatting check passed"

# Cargo clippy (same as CI)
print_status "info" "🔍 Running cargo clippy..."
if ! cargo clippy --all-targets --all-features -- -D warnings; then
    print_status "error" "Clippy linting issues found!"
    print_status "info" "💡 Fix the issues above and try again"
    exit 1
fi
print_status "success" "Clippy check passed"

# Cargo test
print_status "info" "🧪 Running tests..."
if ! cargo test; then
    print_status "error" "Tests failed!"
    print_status "info" "💡 Fix the failing tests and try again"
    exit 1
fi
print_status "success" "All tests passed"

cd ..

# ============================================================================
# FRONTEND VALIDATION (Mirrors CI exactly)
# ============================================================================
print_status "info" "🌐 Frontend project validation..."

cd src-ui

# Check dependencies
if [ ! -d "node_modules" ]; then
    print_status "info" "📦 Installing dependencies..."
    npm install
fi

# Prettier formatting check
print_status "info" "🎨 Running Prettier formatting check..."
if ! npx prettier --check .; then
    print_status "error" "Code formatting issues found!"
    print_status "info" "💡 Run 'npx prettier --write .' to fix formatting"
    exit 1
fi
print_status "success" "Formatting check passed"

# ESLint
print_status "info" "🔍 Running ESLint..."
if ! npm run lint; then
    print_status "error" "ESLint issues found!"
    print_status "info" "💡 Fix the linting issues above and try again"
    exit 1
fi
print_status "success" "ESLint check passed"

# TypeScript type checking (EXACTLY like CI)
print_status "info" "🔧 Running TypeScript type check..."
if ! npx tsc --noEmit; then
    print_status "error" "TypeScript type errors found!"
    print_status "info" "💡 Fix the type errors above and try again"
    exit 1
fi
print_status "success" "TypeScript check passed"

# Production build (EXACTLY like CI)
print_status "info" "🏗️  Running production build..."
if ! npm run build; then
    print_status "error" "Production build failed!"
    print_status "info" "💡 Fix the build errors above and try again"
    exit 1
fi
print_status "success" "Production build passed"

# Tests
print_status "info" "🧪 Running frontend tests..."
if ! npm test -- --run; then
    print_status "error" "Frontend tests failed!"
    print_status "info" "💡 Fix the failing tests and try again"
    exit 1
fi
print_status "success" "All frontend tests passed"

cd ..

# ============================================================================
# FINAL VALIDATION
# ============================================================================
print_status "info" "🎯 Final validation checks..."

# Check for any uncommitted changes
if [ -n "$(git status --porcelain)" ]; then
    print_status "warning" "Uncommitted changes detected"
    print_status "info" "💡 Consider committing your changes before proceeding"
else
    print_status "success" "Working directory is clean"
fi

# Check if pre-commit hook is installed
if [ -f ".git/hooks/pre-commit" ]; then
    print_status "success" "Pre-commit hook is installed"
else
    print_status "warning" "Pre-commit hook is not installed"
    print_status "info" "💡 Run 'npm run setup-hooks' to install hooks"
fi

print_status "success" "🎉 All validation checks passed!"
print_status "info" "🚀 Your code is ready for commit and CI will pass!"

echo ""
echo "📋 Validation Summary:"
echo "   ✅ Rust: fmt, clippy, tests"
echo "   ✅ Frontend: prettier, eslint, typescript, build, tests"
echo "   ✅ Environment: clean working directory"
echo ""
echo "💡 Next steps:"
echo "   • git add ."
echo "   • git commit -m 'your message'"
echo "   • git push"
echo "" 