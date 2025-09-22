#!/bin/bash
# Script to fix logging calls from direct macros to wrapper functions
# This ensures all logs appear in the application log file

set -e

echo "🔧 Fixing logging calls in Rust codebase..."
echo "Converting direct macro calls to wrapper functions..."

# Count before
BEFORE_COUNT=$(rg "info!\(|debug!\(|warn!\(|error!\(" src-tauri --type rust | wc -l | tr -d ' ')
echo "Found $BEFORE_COUNT direct macro calls to fix"

# Fix info! -> log_info
echo "  Converting info! -> log_info..."
find src-tauri -name "*.rs" -type f -exec perl -pi -e 's/\binfo!\(/crate::logging::log_info\(/g' {} \;

# Fix debug! -> log_debug
echo "  Converting debug! -> log_debug..."
find src-tauri -name "*.rs" -type f -exec perl -pi -e 's/\bdebug!\(/crate::logging::log_debug\(/g' {} \;

# Fix warn! -> log_warn
echo "  Converting warn! -> log_warn..."
find src-tauri -name "*.rs" -type f -exec perl -pi -e 's/\bwarn!\(/crate::logging::log_warn\(/g' {} \;

# Fix error! -> log_error
echo "  Converting error! -> log_error..."
find src-tauri -name "*.rs" -type f -exec perl -pi -e 's/\berror!\(/crate::logging::log_error\(/g' {} \;

# Count after
AFTER_COUNT=$(rg "info!\(|debug!\(|warn!\(|error!\(" src-tauri --type rust | wc -l | tr -d ' ')
FIXED_COUNT=$((BEFORE_COUNT - AFTER_COUNT))

echo ""
echo "✅ Fixed $FIXED_COUNT logging calls"
echo "   Remaining direct macro calls: $AFTER_COUNT"

# Show remaining if any
if [ "$AFTER_COUNT" -gt 0 ]; then
    echo ""
    echo "⚠️  Some direct macro calls remain (may be in tests or special cases):"
    rg "info!\(|debug!\(|warn!\(|error!\(" src-tauri --type rust | head -10
fi

echo ""
echo "🔍 Verifying wrapper function usage..."
WRAPPER_COUNT=$(rg "log_info\(|log_debug\(|log_warn\(|log_error\(" src-tauri --type rust | wc -l | tr -d ' ')
echo "   Total wrapper function calls: $WRAPPER_COUNT"

echo ""
echo "✅ Logging migration complete!"
echo "   Please run 'cargo check' to verify compilation"