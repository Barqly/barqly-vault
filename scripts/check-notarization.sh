#!/bin/bash

# Script to check Apple notarization status
# Usage: ./scripts/check-notarization.sh [submission-id]

# You need to provide these or set as environment variables
API_KEY_PATH="${APPLE_API_KEY_PATH:-AuthKey_HPN43M699Z.p8}"
API_KEY_ID="${APPLE_API_KEY_ID:-HPN43M699Z}"
API_ISSUER_ID="${APPLE_API_ISSUER_ID:-225c8891-4b66-4a50-b358-2707a9a833eb}"

echo "🔍 Checking notarization status..."
echo "Using API Key ID: $API_KEY_ID"
echo ""

# If submission ID provided as argument, check that specific one
if [ -n "$1" ]; then
    echo "Checking specific submission: $1"
    xcrun notarytool info "$1" \
        --key "$API_KEY_PATH" \
        --key-id "$API_KEY_ID" \
        --issuer "$API_ISSUER_ID"
    
    echo ""
    echo "---"
    echo "Attempting to get log for submission: $1"
    xcrun notarytool log "$1" \
        --key "$API_KEY_PATH" \
        --key-id "$API_KEY_ID" \
        --issuer "$API_ISSUER_ID"
else
    # Show history of all submissions
    echo "📋 Recent submission history:"
    xcrun notarytool history \
        --key "$API_KEY_PATH" \
        --key-id "$API_KEY_ID" \
        --issuer "$API_ISSUER_ID"
    
    echo ""
    echo "---"
    echo "To check a specific submission, run:"
    echo "./scripts/check-notarization.sh <submission-id>"
fi

echo ""
echo "---"
echo "Known submission IDs from beta11:"
echo "  Intel: 85417a5f-7bcd-4988-b1f8-339e75312886"
echo "  From screenshot: c2fac43b-1a46-46ae-8806-dcbfef890477"