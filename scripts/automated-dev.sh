#!/bin/bash

# Automated Development Script
# Automatically detects context and chooses the right development mode

set -e

echo "🤖 Automated Development Pipeline"
echo "================================"

# Detect environment
IS_DEV_MACHINE=false
if [[ "$OSTYPE" == "darwin"* ]] || [[ "$OSTYPE" == "linux-gnu"* ]]; then
    if [ -n "$USER" ] && [ "$USER" != "runner" ] && [ "$USER" != "ubuntu" ] && [ "$USER" != "circleci" ]; then
        IS_DEV_MACHINE=true
    fi
fi

# Check current demo mode status
DEMO_ENABLED=false
if [ -f "src-ui/src/App.production.tsx" ]; then
    DEMO_ENABLED=true
fi

echo "🔍 Environment Analysis:"
echo "   Development Machine: $IS_DEV_MACHINE"
echo "   Demo Mode Enabled: $DEMO_ENABLED"

# Smart decision making
if [ "$IS_DEV_MACHINE" = true ]; then
    echo "💻 Development Environment Detected"
    
    if [ "$DEMO_ENABLED" = true ]; then
        echo "✅ Demo mode already enabled - starting development server..."
        cd src-ui && npm run dev
    else
        echo "🔄 Enabling demo mode and starting development server..."
        node scripts/switch-to-demo.js demo
        cd src-ui && npm run dev
    fi
else
    echo "🚨 Non-development environment detected!"
    echo "❌ This script should only be run on development machines"
    echo "💡 Use 'npm run dev' for production builds"
    exit 1
fi 