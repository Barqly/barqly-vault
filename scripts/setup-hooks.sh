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
echo "   • Detects Rust projects and shows validation reminders"
echo "   • Displays helpful commands: cargo fmt && cargo clippy && cargo test"
echo "   • Explains time-saving benefits (prevents CI failures)"
echo "   • Never blocks commits, just provides gentle reminders"
echo ""
echo "💡 To bypass the hook (emergency only):"
echo "   git commit --no-verify -m 'emergency: bypass validation'"
echo ""
echo "🔧 To update the hook:"
echo "   Run this script again or manually copy scripts/pre-commit to .git/hooks/" 