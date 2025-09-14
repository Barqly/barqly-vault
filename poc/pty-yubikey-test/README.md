# PTY YubiKey Test POC

This POC tests the interaction between PTY and age-plugin-yubikey to understand EOF detection patterns and process completion behavior.

## Phase 1: Basic PTY + EOF Detection
- PTY creation and lifecycle management
- age-plugin-yubikey process spawning
- EOF detection patterns (Ok(0) vs EIO)
- Process completion detection
- Comprehensive logging for debugging

## Usage

```bash
# Run with debug logging
RUST_LOG=debug cargo run

# Run with trace logging for detailed PTY behavior
RUST_LOG=trace cargo run
```

## Test Scenarios
1. TouchPolicy::Never - No user interaction required
2. Basic command execution and EOF detection
3. Process completion patterns

## Current Focus
- Understanding PTY read behavior patterns
- Identifying reliable EOF detection methods
- Process lifecycle management