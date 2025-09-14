# age-plugin-yubikey PTY Issue - Current Status

## What We Implemented (from ChatGPT's Solution)

We implemented the PTY solution using `portable-pty` as recommended:

```rust
// Setup PTY
let pty_system = native_pty_system();
let pair = pty_system.openpty(PtySize {
    rows: 24,
    cols: 80,
    pixel_width: 0,
    pixel_height: 0,
}).context("Failed to open PTY")?;

// Spawn age-plugin-yubikey in PTY
let mut child = pair.slave.spawn_command(cmd)
    .context("Failed to spawn age-plugin-yubikey in PTY")?;

// Read output and respond to prompts
loop {
    // ... reading lines ...
    if l.contains("Enter PIN") || l.contains("PIN:") {
        info!("Providing PIN to age-plugin-yubikey...");
        writeln!(writer, "{}", pin)?;
        writer.flush()?;
    }
}
```

## Current Behavior

When running the test, we see:

```
[INFO] yubikey::yubikey| connected to reader: Yubico YubiKey FIDO+CCID
[DEBUG] age-plugin-yubikey: [INFO] yubikey::yubikey| connected to reader: Yubico YubiKey FIDO+CCID
[DEBUG] age-plugin-yubikey: 🔐 Generating key...
```

Then it **hangs indefinitely** at "Generating key..." - never progressing to:
- PIN prompt detection
- Touch prompt
- Key generation

## The Problem

**The PIN prompt is invisible!** 

`age-plugin-yubikey` is using a password input method that:
1. **Doesn't print "Enter PIN:" to stdout/stderr** that we can detect
2. Instead uses direct terminal I/O (like `rpassword::read_password()`)
3. Waits for input on the PTY without any visible prompt

Our code is waiting for a prompt that never appears in the output stream:
```rust
if l.contains("Enter PIN") || l.contains("PIN:") {  // This never matches!
```

## Why It Appears to Work in Terminal

When you run `age-plugin-yubikey --generate` manually in a terminal:
- The terminal handles the raw I/O
- You see a PIN prompt (rendered by the terminal, not printed to stdout)
- You type the PIN
- It continues

But in PTY:
- We only see stdout/stderr output
- The PIN prompt uses raw terminal control codes that don't appear in our line-by-line reading
- We never send the PIN because we're waiting for a prompt string that doesn't exist

## Possible Solutions

### 1. **Send PIN immediately after "Generating key..."**
```rust
if l.contains("Generating key") {
    // Small delay to ensure it's ready
    std::thread::sleep(Duration::from_millis(100));
    writeln!(writer, "{}", pin)?;
    writer.flush()?;
}
```

### 2. **Send PIN after a timeout**
```rust
// After spawning, wait 500ms then send PIN
std::thread::sleep(Duration::from_millis(500));
writeln!(writer, "{}", pin)?;
```

### 3. **Use expect-like pattern matching**
Instead of line-by-line reading, use a more sophisticated PTY interaction library that can handle raw terminal I/O.

### 4. **Check if age-plugin-yubikey has environment variable support**
Some tools accept credentials via environment variables to avoid TTY issues.

## The Touch Issue

Once we solve the PIN input, we'll likely face a similar issue with touch detection. The current code looks for "Touch your YubiKey" but the actual process might be using different output or terminal control sequences.

## Current Status

- ✅ PTY is created successfully
- ✅ age-plugin-yubikey is spawned in PTY
- ✅ We can read its output
- ❌ PIN is never sent (waiting for wrong prompt)
- ❌ Process hangs waiting for PIN
- ❌ Never reaches touch or key generation

## Next Steps

We need to:
1. Detect when to send the PIN (likely right after "Generating key..." appears)
2. Handle the touch prompt correctly (may need similar fix)
3. Ensure we capture the generated recipient key

The solution is close - we just need to trigger PIN input at the right moment, not wait for a prompt that doesn't exist in the output stream.