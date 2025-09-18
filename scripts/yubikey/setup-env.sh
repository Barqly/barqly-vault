#!/bin/bash
# Setup Python environment for YubiKey binary building
# Uses uv for fast Python environment management

set -e

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$( cd "$SCRIPT_DIR/../.." && pwd )"
VENV_DIR="$PROJECT_ROOT/.venv-yubikey"

echo "Setting up Python environment for YubiKey tools..."

# Check if uv is installed
if ! command -v uv &> /dev/null; then
    echo "Installing uv (fast Python package manager)..."
    curl -LsSf https://astral.sh/uv/install.sh | sh

    # Add to PATH for current session
    export PATH="$HOME/.cargo/bin:$PATH"
fi

# Create virtual environment with uv
echo "Creating virtual environment at $VENV_DIR..."
uv venv "$VENV_DIR" --python 3.12

# Activate virtual environment
source "$VENV_DIR/bin/activate"

# Install required packages for ykman building
echo "Installing PyInstaller and dependencies..."
uv pip install pyinstaller
uv pip install yubikey-manager

echo ""
echo "✅ Python environment setup complete!"
echo ""
echo "To activate this environment in the future, run:"
echo "  source $VENV_DIR/bin/activate"
echo ""
echo "To build ykman, run:"
echo "  ./scripts/yubikey/build-ykman.sh"