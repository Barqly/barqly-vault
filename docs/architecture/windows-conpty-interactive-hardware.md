# Windows ConPTY Interactive Hardware Device Integration

**Document Type:** Technical Learning / Architecture Reference
**Date:** 2025-11-16
**Context:** YubiKey Integration on Windows
**Audience:** Engineers working with interactive hardware devices on Windows

---

## Overview

When integrating interactive hardware devices (YubiKey, security keys, HSMs) on Windows that require:
- PIN entry via stdin
- Touch detection via PTY output
- Real-time bidirectional communication

Windows ConPTY (Pseudo-Console) has two critical requirements that differ from Unix PTY:

1. **Terminal Query Protocol** - Must respond to Device Status Report (DSR) queries
2. **Line Ending Convention** - Must use CRLF (`\r\n`) for stdin input in canonical mode

**Failure to address either results in complete operation failure** (timeouts, blocked I/O).

---

## Issue 1: Device Status Report (DSR) Blocking

### Problem

ConPTY sends `ESC[6n` (ANSI escape sequence for cursor position query) and **blocks all further I/O** until it receives a response.

**Symptoms:**
- PTY output contains only control sequences (`ESC[6n`, `ESC[?9001h`, etc.)
- No actual text prompts ("Enter PIN...") appear in output
- Process hangs/times out despite being active

### Root Cause

From Microsoft documentation:
> "When using PSEUDOCONSOLE_INHERIT_CURSOR, failure to respond to cursor queries may cause application to hang."

ConPTY expects terminal emulator behavior - queries must be answered.

### Solution

**Implement request-response protocol:**

```rust
// 1. Detect ESC[6n in raw PTY bytes
if raw_data.windows(4).any(|w| w == b"\x1b[6n") {
    tx.send(PtyState::DeviceStatusReport);
}

// 2. Respond with cursor position from main thread (has writer access)
PtyState::DeviceStatusReport => {
    write!(writer, "\x1b[1;1R")?;  // Cursor at row 1, col 1
    writer.flush()?;
}
```

**Critical:** Response must come AFTER detecting the query (not proactively).

**Result:** ConPTY unblocks and forwards actual text prompts.

---

## Issue 2: CRLF Line Ending Requirement

### Problem

After sending PIN via `writeln!(writer, pin)`, the child process never receives it. PTY output goes silent indefinitely.

**Symptoms:**
- PIN sent successfully (confirmed in logs)
- Process doesn't process input
- No response from child application
- Eventual timeout

### Root Cause

Windows console applications in canonical mode (`ENABLE_LINE_INPUT`) buffer stdin until receiving `\r\n` (CRLF), not just `\n` (LF).

**What happens:**
- `writeln!()` sends: `PIN + \n` (Unix LF)
- ConPTY buffers: Waits for `\r` (carriage return)
- Input never flushed to child process
- Child waits forever for input

**Confirmed by:**
- Manual terminal test: User presses ENTER → sends `\r\n` → works
- Programmatic: `writeln!()` sends only `\n` → blocked

### Solution

**Use Windows line ending explicitly:**

```rust
// WRONG (Unix):
writeln!(writer, "{}", pin)?;  // Sends: PIN\n

// CORRECT (Windows):
write!(writer, "{}\r\n", pin)?;  // Sends: PIN\r\n
writer.flush()?;
```

**Result:** Input immediately flushed to child process, processed correctly.

---

## Combined Implementation Pattern

**For Windows interactive PTY operations:**

```rust
// Reader thread: Raw read + DSR detection
loop {
    match reader.read(&mut buffer) {
        Ok(n) => {
            // Detect DSR query
            if buffer[..n].windows(4).any(|w| w == b"\x1b[6n") {
                tx.send(PtyState::DeviceStatusReport);
            }

            // Strip ANSI sequences for clean text
            let stripped = strip_ansi_escapes::strip(&accumulated);
            // Pattern match on stripped text...
        }
    }
}

// Main thread: DSR response + CRLF input
match rx.recv() {
    PtyState::DeviceStatusReport => {
        write!(writer, "\x1b[1;1R")?;
        writer.flush()?;
    }
    PtyState::WaitingForPin => {
        write!(writer, "{}\r\n", pin)?;  // CRLF!
        writer.flush()?;
    }
}
```

---

## Platform Isolation Strategy

**Create platform-specific function variants:**

```rust
// Original function (macOS/Linux)
pub fn interactive_hardware_operation(...) -> Result<T> {
    // Unix PTY - works as-is
}

// Windows-specific function
#[cfg(target_os = "windows")]
pub fn interactive_hardware_operation_windows(...) -> Result<T> {
    // Add: DSR response + CRLF line endings
}

// Conditional calling
#[cfg(target_os = "windows")]
let result = interactive_hardware_operation_windows(...);

#[cfg(not(target_os = "windows"))]
let result = interactive_hardware_operation(...);
```

**Benefits:**
- Zero impact on working platforms
- Isolated Windows-specific quirks
- Easy to maintain and test

---

## Debugging Techniques

**1. Raw Byte Logging (Critical)**
```rust
debug!(
    raw_hex = ?data.iter().map(|b| format!("{:02x}", b)).collect::<Vec<_>>(),
    "Raw PTY bytes"
);
```
Reveals EXACTLY what ConPTY sends (control sequences vs actual text).

**2. Before/After ANSI Stripping**
```rust
debug!(raw_text = %text, "Before stripping");
let stripped = strip_ansi_escapes::strip(&data);
debug!(clean_text = %stripped, "After stripping");
```
Shows if text is hidden in control sequences.

**3. Input/Output Lifecycle**
```rust
debug!("Before PIN injection");
write!(writer, "{}\r\n", pin)?;
writer.flush()?;
debug!("After PIN injection and flush");
```
Confirms timing and processing order.

---

## Key Takeaways

**For future Windows hardware device integration:**

1. **Always respond to terminal queries** (DSR, etc.) - ConPTY expects terminal emulator behavior
2. **Use CRLF (`\r\n`) for stdin input** - Windows canonical mode requirement
3. **Use raw byte read** - Detect control sequences that don't contain newlines
4. **Strip ANSI sequences** - Extract actual text from VT sequences
5. **Log raw bytes in hex** - Only way to see what ConPTY actually sends
6. **Isolate platform-specific code** - Don't break working Unix implementations

**Dependencies:**
- `strip-ansi-escapes` crate for ANSI sequence removal
- Raw `read()` not `read_line()` for DSR detection

**Testing on Windows is essential** - These issues don't appear on Unix systems.

---

## References

- Microsoft Terminal Issue #17688: PSEUDOCONSOLE_INHERIT_CURSOR hangs
- Microsoft PR #17510: Cursor inheritance timeout fix
- ConPTY Documentation: https://learn.microsoft.com/en-us/windows/console/creating-a-pseudoconsole-session
- ANSI Escape Codes: Device Status Report (DSR) - `ESC[6n` / `ESC[row;colR`

---

**This document captures hard-won knowledge from debugging Windows ConPTY integration with YubiKey hardware. These patterns apply to any interactive hardware device requiring PTY on Windows.**
