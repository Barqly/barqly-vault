# YubiKey Integration Gotchas & Implementation Guide

## Overview

This document captures all the critical gotchas, implementation details, and debugging steps required for successful YubiKey integration with age-plugin-yubikey. These issues took significant time to resolve due to subtle command syntax errors and PTY output handling problems.

## Critical Issues Resolved

### 1. ykman Command Syntax Errors

**Problem**: YubiKey initialization was failing with incorrect ykman command flags.

**Root Cause**: Using wrong flag syntax for ykman commands.

**Solutions**:

#### PIN Change Command
```rust
// ❌ WRONG - This fails silently or with errors
let args = vec![
    "piv", "access", "change-pin",
    "--pin", old_pin,           // Wrong flag
    "--new-pin", new_pin,       // Wrong flag
];

// ✅ CORRECT - Use capital -P and -n
let args = vec![
    "piv", "access", "change-pin",
    "-P", old_pin,              // Capital P for current PIN
    "-n", new_pin,              // Lowercase n for new PIN
];
```

#### PUK Change Command
```rust
// ✅ CORRECT - Use -p for current PUK, -n for new PUK
let args = vec![
    "piv", "access", "change-puk",
    "-p", old_puk,              // Lowercase p for current PUK
    "-n", new_puk,              // Lowercase n for new PUK
];
```

#### Management Key Change Command
```rust
// ❌ WRONG - Interactive prompts cause PTY hanging
let args = vec![
    "piv", "access", "change-management-key",
    "--algorithm", "tdes",
    "--protect",
    "--generate",
];

// ✅ CORRECT - Use flags to avoid interactive prompts
let args = vec![
    "piv", "access", "change-management-key",
    "-a", "tdes",               // Algorithm
    "-p",                       // Protect flag
    "-g",                       // Generate flag
    "-m", DEFAULT_MGMT_KEY,     // Current management key
    "-P", pin,                  // PIN for authentication
];
```

**Key Insight**: The POC code in `/poc/yubikey-ykman-poc/src/ykman_pty.rs` had the correct syntax. Always reference working POC code when debugging command syntax issues.

### 2. age-plugin-yubikey Slot Number Issue

**Problem**: Age identity generation failing with "Invalid slot '82' (expected number between 1 and 20)".

**Root Cause**: Using PIV hex slot numbers instead of age-plugin-yubikey slot numbers.

**Solution**:
```rust
// ❌ WRONG - PIV slot 82 (RETIRED1 in hex)
let args = vec![
    "--slot", "82"              // PIV hex slot - NOT supported by age-plugin-yubikey
];

// ✅ CORRECT - age-plugin-yubikey expects slots 1-20
let args = vec![
    "--slot", "1"               // Simple numeric slot 1-20
];
```

**Key Insight**: PIV slots (like 82 for RETIRED1) are different from age-plugin-yubikey slots (1-20). Always use 1-20 range for age-plugin-yubikey.

### 3. PTY Output Parsing Issue

**Problem**: `get_identity_for_serial` failing with "No identity found" even when identity exists.

**Root Cause**: PTY was truncating output and missing the crucial `AGE-PLUGIN-YUBIKEY-` line.

**Analysis**:
```bash
# Manual command works and shows full output:
$ age-plugin-yubikey --identity --serial 31310420
#       Serial: 31310420, Slot: 1
#         Name: YubiKey-313104
#      Created: Wed, 24 Sep 2025 02:49:21 +0000
#   PIN policy: Once   (A PIN is required once per session, if set)
# Touch policy: Cached (A physical touch is required for decryption, and is cached for 15 seconds)
#    Recipient: age1yubikey1qtqdz8q3d5mtt2yelu5hptersrwsckalwpuvkr0ncerfukrlflqmscu08zv
AGE-PLUGIN-YUBIKEY-12NPD6QVZG4ED7NQAYKG8W    # <- This line was missing in PTY

# But PTY only captured:
#    Recipient: age1yubikey1qtqdz8q3d5mtt2yelu5hptersrwsckalwpuvkr0ncerfukrlflqmscu08zv
```

**Solution**: Switch from PTY to direct Command execution since `--identity` doesn't need interactive input:

```rust
// ❌ WRONG - PTY truncates output
pub fn get_identity_for_serial(serial: &str) -> Result<String> {
    let args = vec!["--identity", "--serial", serial];
    let output = run_age_plugin_yubikey(args, None, false)?; // Uses PTY
    // PTY misses the AGE-PLUGIN-YUBIKEY line!
}

// ✅ CORRECT - Direct Command execution captures complete output
pub fn get_identity_for_serial(serial: &str) -> Result<String> {
    use std::process::Command;

    let age_path = get_age_plugin_path();
    let output = Command::new(&age_path)
        .arg("--identity")
        .arg("--serial")
        .arg(serial)
        .output()?;

    let output_str = String::from_utf8_lossy(&output.stdout);

    // Parse to find AGE-PLUGIN-YUBIKEY- line
    for line in output_str.lines() {
        let trimmed_line = line.trim();
        if trimmed_line.starts_with("AGE-PLUGIN-YUBIKEY-") {
            return Ok(trimmed_line.to_string());
        }
    }
}
```

**Key Insight**: Only use PTY when interactive input (PIN entry, touch prompts) is required. For read-only operations like `--identity`, use direct Command execution to avoid output truncation issues.

## Complete YubiKey Initialization Sequence

### Step 1: Reset YubiKey (Manual)
```bash
# Reset PIV applet to factory defaults
ykman piv reset -f
```

### Step 2: Initialize Credentials
```rust
// 1. Change PIN from default (123456) to secure PIN
change_pin_pty("123456", secure_pin)?;

// 2. Change PUK from default (12345678) to recovery code
change_puk_pty("12345678", recovery_code)?;

// 3. Change management key to TDES with protected mode
change_management_key_pty(secure_pin)?;
```

### Step 3: Generate Age Identity
```rust
// Generate age identity using slot 1 (not PIV slot 82)
let args = vec![
    "-g",
    "--serial", serial,
    "--slot", "1",              // Key: Use 1-20, not PIV hex slots
    "--touch-policy", "cached",
    "--name", key_name,
];
run_age_plugin_yubikey(args, Some(pin), true)?; // PTY needed for PIN + touch
```

### Step 4: Verify Identity
```rust
// Use direct Command (not PTY) to get complete output
let output = Command::new(age_plugin_path)
    .arg("--identity")
    .arg("--serial")
    .arg(serial)
    .output()?;

// Parse the AGE-PLUGIN-YUBIKEY- line from full output
```

## Debugging Tips

### 1. Always Check Manual Commands First
```bash
# Test each command manually to verify syntax:
ykman piv access change-pin -P 123456 -n your_new_pin
ykman piv access change-puk -p 12345678 -n your_recovery_code
ykman piv access change-management-key -a tdes -p -g -m 010203040506070801020304050607080102030405060708 -P your_pin
age-plugin-yubikey -g --serial YOUR_SERIAL --slot 1 --touch-policy cached --name YOUR_NAME
age-plugin-yubikey --identity --serial YOUR_SERIAL
```

### 2. Enable Debug Logging
```bash
RUST_LOG=debug cargo tauri dev
```

### 3. Monitor PTY vs Command Output
- PTY output may be truncated or incomplete
- For non-interactive commands, prefer direct Command execution
- Only use PTY when PIN entry or touch interaction is required

### 4. Check PIV State
```bash
# Verify YubiKey state after each step
ykman piv info
```

## Testing Checklist

- [ ] PIN changed from default (123456) to secure PIN
- [ ] PUK changed from default (12345678) to recovery code
- [ ] Management key changed to TDES with protected mode
- [ ] Age identity generated with slot 1 (not 82)
- [ ] Identity verification retrieves complete `AGE-PLUGIN-YUBIKEY-` string
- [ ] YubiKey shows as "Active" in vault keys
- [ ] Manual commands work: `ykman piv info`, `age-plugin-yubikey --identity --serial SERIAL`

## Common Error Patterns

### "No such option: -p"
- Wrong ykman flag syntax - check command structure

### "Invalid slot '82'"
- Using PIV hex slot instead of age-plugin-yubikey slot (1-20)

### "No identity found for serial"
- PTY output truncation - switch to direct Command execution

### "PIN change failed - X tries left"
- Likely incorrect PIN syntax or using wrong current PIN

### PTY hanging on management key
- Missing flags to avoid interactive prompts - use `-p -g -m -P` flags

## References

- Working POC: `/poc/yubikey-ykman-poc/src/ykman_pty.rs`
- ykman documentation: `ykman piv --help`
- age-plugin-yubikey documentation: `age-plugin-yubikey --help`
- PIV slot reference: YubiKey PIV slots 82-95 are "retired" slots in hex

---

**Last Updated**: 2025-09-24
**Status**: All critical issues resolved, YubiKey registration working ✅