# age-plugin-yubikey TTY Issue

## Context

We've successfully implemented a hybrid approach to eliminate the 50MB ykman binary dependency:
1. ✅ **PIN/PUK changes** - Using yubikey-rs crate with "untested" feature
2. ✅ **Management key setting** - Using raw APDU commands via pcsc crate
3. ❌ **Age identity generation** - Using age-plugin-yubikey (has TTY issue)

## The Problem

`age-plugin-yubikey` requires a real TTY (terminal) for PIN input and cannot accept PIN via stdin pipe or command-line argument.

### What We Tried

1. **Command-line flag (doesn't exist):**
```rust
Command::new("age-plugin-yubikey")
    .args(&["--generate", "--touch-policy", "cached", "--name", slot_name, "--pin", pin])
```
Result: Error - `unrecognized option --pin`

2. **Piping PIN via stdin:**
```rust
let mut child = Command::new("age-plugin-yubikey")
    .args(&["--generate", "--touch-policy", touch_policy_str, "--name", slot_name])
    .stdin(Stdio::piped())
    .stdout(Stdio::piped())
    .stderr(Stdio::piped())
    .spawn()?;

if let Some(stdin) = child.stdin.as_mut() {
    writeln!(stdin, "{}", pin)?;
}
```
Result: Error - `Failed to get input from user: IO error: not a terminal`

## Technical Details

- **age-plugin-yubikey version**: Latest from homebrew
- **Error message**: `Error: Failed to get input from user: IO error: not a terminal`
- **Context**: Running from Rust test harness (non-interactive environment)

## What We Need

A way to programmatically provide the PIN to `age-plugin-yubikey` without requiring user interaction. Options could be:

1. **Environment variable** - e.g., `AGE_YUBIKEY_PIN=212121 age-plugin-yubikey --generate`
2. **PTY (pseudo-terminal) emulation** - Simulate a terminal for PIN entry
3. **Alternative tool** - Different approach to generate age identity after setting management key
4. **Direct implementation** - Generate age identity using Rust code directly

## Code Context

Our current hybrid implementation workflow:
```rust
// Step 1: Change PIN (WORKS ✅)
yubikey.change_pin(old_pin, new_pin)?;

// Step 2: Change PUK (WORKS ✅)  
yubikey.change_puk(old_puk, new_puk)?;

// Step 3: Set PIN-protected management key via APDU (WORKS ✅)
set_pin_protected_management_key(pin, touch_policy)?;

// Step 4: Generate age identity (FAILS ❌ - requires TTY)
generate_age_identity(pin, touch_policy, slot_name)?;
```

## Constraints

- Cannot use ykman (50MB binary we're trying to replace)
- Must work in automated/CI environments
- Should not require manual user interaction
- PIN is already known (212121 in our test case)

## Question

How can we programmatically provide the PIN to `age-plugin-yubikey` or generate the age identity in an automated way without requiring TTY interaction?

## Additional Info

- YubiKey firmware: 5.7.x (uses AES-192 by default)
- All PIV initialization steps complete successfully
- Manual execution works: `age-plugin-yubikey --generate --touch-policy cached --name test`
- The issue is specifically with automated PIN entry