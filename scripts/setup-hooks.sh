#!/bin/bash

# Barqly Vault Git Hooks Setup Script
# This script sets up pre-commit hooks for automated validation

set -e

echo "🔧 Setting up Barqly Vault Git Hooks"
echo "===================================="

# Create hooks directory if it doesn't exist
mkdir -p .git/hooks

# Copy pre-commit hook
echo "📋 Installing pre-commit hook..."
cp scripts/pre-commit .git/hooks/pre-commit

# Make it executable
chmod +x .git/hooks/pre-commit

echo "✅ Pre-commit hook installed successfully!"
echo ""
echo "🎯 What this hook does:"
echo "   • Automatically runs cargo fmt, cargo clippy, and cargo test"
echo "   • Blocks commits if any validation fails"
echo "   • Shows clear error messages with fix instructions"
echo "   • Proceeds only when all checks pass"
echo ""
echo "💡 To bypass the hook (emergency only):"
echo "   git commit --no-verify -m 'emergency: bypass validation'"
echo ""
echo "🔧 To update the hook:"
echo "   Run this script again or manually copy scripts/pre-commit to .git/hooks/" 