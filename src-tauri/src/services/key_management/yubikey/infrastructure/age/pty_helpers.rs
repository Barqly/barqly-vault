//! Helper functions for PTY operations with age-plugin-yubikey
//!
//! This module provides reusable utilities for PTY setup, EOF polling, and touch detection.

use crate::log_sensitive;
use crate::logging::debug;
use crate::services::key_management::yubikey::domain::errors::{YubiKeyError, YubiKeyResult};
use portable_pty::ExitStatus;
use portable_pty::{CommandBuilder, PtySize, native_pty_system};
use std::io::{BufRead, BufReader, Read, Write};
use std::path::Path;
use std::time::Duration;

/// Type alias for PTY session components
type PtySession = (
    Box<dyn portable_pty::Child + Send>,
    BufReader<Box<dyn Read + Send>>,
    Box<dyn Write + Send>,
);

/// Setup PTY session for age-plugin-yubikey
pub(super) fn setup_pty_session(plugin_path: &Path, args: &[&str]) -> YubiKeyResult<PtySession> {
    // Create PTY system and open a new PTY
    let pty_system = native_pty_system();
    let pty_pair = pty_system
        .openpty(PtySize {
            rows: 24,
            cols: 80,
            pixel_width: 0,
            pixel_height: 0,
        })
        .map_err(|e| YubiKeyError::age_plugin(format!("Failed to create PTY: {e}")))?;

    // Build command with proper terminal environment
    let mut cmd = CommandBuilder::new(plugin_path);
    for arg in args {
        cmd.arg(arg);
    }

    // Set comprehensive environment variables to ensure proper terminal behavior
    cmd.env("TERM", "xterm-256color");
    cmd.env("AGE_PLUGIN_YUBIKEY_FORCE_TTY", "1");
    cmd.env("FORCE_COLOR", "1");
    // Additional terminal detection variables
    cmd.env("CI", "false"); // Ensure it doesn't think it's in CI
    cmd.env("COLORTERM", "truecolor");
    // Force interactive mode
    cmd.env("RUST_LOG", "debug"); // Enable debug logging in age-plugin-yubikey

    // Ensure stdin/stdout/stderr are properly connected
    log_sensitive!(dev_only: {
        debug!("🔧 TRACER: Setting up PTY environment for age-plugin-yubikey");
    });

    // Spawn command in PTY
    let child = pty_pair
        .slave
        .spawn_command(cmd)
        .map_err(|e| YubiKeyError::age_plugin(format!("Failed to spawn command in PTY: {e}")))?;

    // Create reader and writer for PTY master
    let reader = pty_pair
        .master
        .try_clone_reader()
        .map_err(|e| YubiKeyError::age_plugin(format!("Failed to clone PTY reader: {e}")))?;
    let writer = pty_pair
        .master
        .take_writer()
        .map_err(|e| YubiKeyError::age_plugin(format!("Failed to take PTY writer: {e}")))?;

    let buf_reader = BufReader::new(Box::new(reader) as Box<dyn Read + Send>);
    Ok((child, buf_reader, Box::new(writer) as Box<dyn Write + Send>))
}

/// Active polling for process completion with EOF detection
pub(super) async fn poll_for_process_completion(
    child: &mut Box<dyn portable_pty::Child + Send>,
    writer: &mut Box<dyn Write + Send>,
    _output: &str,
) -> YubiKeyResult<Option<ExitStatus>> {
    // Active polling with proper retry loop structure
    let max_retries = 60; // 30 seconds total with 500ms intervals
    let mut nudge_count = 0;

    // Proper polling loop - retry counter increments per polling attempt
    for retry_count in 1..=max_retries {
        log_sensitive!(dev_only: {
            debug!("🔍 TRACER: PTY EOF active polling: attempt {retry_count}/{max_retries}, checking process state...");
        });
        log_sensitive!(dev_only: {
            debug!("🕵️ DETECTIVE: About to poll process - attempt: {}, elapsed time: {}ms",
                retry_count, retry_count * 500);
        });

        // Check if process completed
        match child.try_wait() {
            Ok(Some(status)) => {
                log_sensitive!(dev_only: {
                    debug!("✅ TRACER: Process completed during active polling with status: {status:?}");
                });
                return Ok(Some(status));
            }
            Ok(None) => {
                // Process still alive - continue polling with backoff
                log_sensitive!(dev_only: {
                    debug!("🔄 TRACER: Process still alive, continuing to poll...");
                });

                // Send periodic CRLF nudge to help with line discipline
                // This mimics what a real terminal would do
                if retry_count % 4 == 0 {
                    // Every 2 seconds (4 * 500ms)
                    nudge_count += 1;
                    log_sensitive!(dev_only: {
                        debug!("📤 TRACER: Sending CRLF nudge #{nudge_count} to assist line discipline");
                    });
                    log_sensitive!(dev_only: {
                        debug!("🕵️ DETECTIVE: Writer available before nudge: true, nudge #{nudge_count}");
                    });

                    match writer.write_all(b"\r\n") {
                        Ok(_) => match writer.flush() {
                            Ok(_) => {
                                log_sensitive!(dev_only: {
                                    debug!("📤 TRACER: CRLF nudge sent and flushed successfully");
                                });
                                log_sensitive!(dev_only: {
                                    debug!("🕵️ DETECTIVE: CRLF bytes [\\r\\n] written to PTY master");
                                });
                            }
                            Err(e) => {
                                log_sensitive!(dev_only: {
                                    debug!("⚠️ TRACER: CRLF nudge flush failed: {e}");
                                });
                                log_sensitive!(dev_only: {
                                    debug!("🚨 DETECTIVE: FLUSH ERROR - PTY may be broken: {e}");
                                });
                            }
                        },
                        Err(e) => {
                            log_sensitive!(dev_only: {
                                debug!("⚠️ TRACER: CRLF nudge write failed: {e}");
                            });
                            log_sensitive!(dev_only: {
                                debug!("🚨 DETECTIVE: WRITE ERROR - PTY connection may be lost: {e}");
                            });
                        }
                    }
                }

                // Graduated backoff: start fast, slow down
                let sleep_ms = if retry_count < 10 { 250 } else { 500 };
                tokio::time::sleep(Duration::from_millis(sleep_ms)).await;
            }
            Err(e) => {
                log_sensitive!(dev_only: {
                    debug!("❌ TRACER: Process wait error during active polling: {e}");
                });
                return Err(YubiKeyError::age_plugin(format!("Process error: {e}")));
            }
        }
    }

    // If we get here, we've exhausted all polling attempts
    log_sensitive!(dev_only: {
        debug!("⏰ TRACER: Touch timeout - process still running after {}s, continuing to outer timeout handler", max_retries / 2);
    });
    log_sensitive!(dev_only: {
        debug!("🕵️ DETECTIVE: Polling exhausted - returning to outer read loop to check for delayed output");
    });

    // Try reading again - maybe output appeared during final polling attempts
    log_sensitive!(dev_only: {
        debug!("🔄 DETECTIVE: About to continue outer read loop - looking for post-touch output");
    });

    Ok(None) // Continue outer read loop
}

/// Wait for touch completion with timeout handling
pub(super) async fn wait_for_touch_completion(
    child: &mut Box<dyn portable_pty::Child + Send>,
    buf_reader: &mut BufReader<Box<dyn Read + Send>>,
    writer: &mut Box<dyn Write + Send>,
    output: &mut String,
) -> YubiKeyResult<ExitStatus> {
    // TODO: Emit Tauri event here

    // Start timeout-based touch detection since no more output will come
    let touch_start = std::time::Instant::now();
    let mut touch_timeout_count = 0;
    let mut line = String::new();

    // Continue reading but with timeout expectations
    log_sensitive!(dev_only: {
        debug!("⏰ TRACER: Entering touch-wait polling mode - process is silent during touch");
    });

    loop {
        line.clear();
        let read_result = tokio::time::timeout(Duration::from_millis(1000), async {
            buf_reader.read_line(&mut line)
        })
        .await;

        match read_result {
            Ok(Ok(0)) => {
                // EOF during touch wait - this is expected behavior
                touch_timeout_count += 1;
                log_sensitive!(dev_only: {
                    debug!("⏳ TRACER: Touch wait timeout #{} - still waiting for touch completion (elapsed: {:?})",
                        touch_timeout_count, touch_start.elapsed());
                });

                // Send periodic CRLF nudges to help the process along
                if touch_timeout_count % 3 == 0 {
                    writer.write_all(b"\r\n").map_err(|e| {
                        YubiKeyError::age_plugin(format!("Failed to write CRLF nudge: {e}"))
                    })?;
                    writer.flush().map_err(|e| {
                        YubiKeyError::age_plugin(format!("Failed to flush CRLF nudge: {e}"))
                    })?;
                    log_sensitive!(dev_only: {
                        debug!("📡 TRACER: Sent CRLF nudge #{}", touch_timeout_count / 3);
                    });
                }

                // Check if process completed
                match child.try_wait() {
                    Ok(Some(status)) => {
                        log_sensitive!(dev_only: {
                            debug!("✅ TRACER: Process completed after touch! Status: {status:?}");
                        });
                        return Ok(status);
                    }
                    Ok(None) => {
                        // Process still running, continue waiting
                        if touch_start.elapsed() > Duration::from_secs(30) {
                            log_sensitive!(dev_only: {
                                debug!("⚠️  TRACER: Touch timeout after 30s - user may need to touch YubiKey");
                            });
                        }
                        continue;
                    }
                    Err(e) => {
                        return Err(YubiKeyError::age_plugin(format!(
                            "Process wait error during touch: {e}"
                        )));
                    }
                }
            }
            Ok(Ok(bytes_read)) => {
                // Got output during touch wait - this means touch completed!
                log_sensitive!(dev_only: {
                    debug!("🎉 TRACER: TOUCH COMPLETED! Got output: '{}' ({} bytes)", line.trim(), bytes_read);
                });
                output.push_str(&line);
                break; // Exit touch-wait mode, return to normal processing
            }
            Ok(Err(e)) => {
                return Err(YubiKeyError::age_plugin(format!(
                    "Read error during touch wait: {e}"
                )));
            }
            Err(_) => {
                // Timeout on read - continue waiting
                touch_timeout_count += 1;
                continue;
            }
        }
    }

    // Continue with normal processing after touch completion
    log_sensitive!(dev_only: {
        debug!("🔄 TRACER: Resuming normal PTY processing after successful touch");
    });

    // After touch completion, we need to continue reading until process exits
    loop {
        line.clear();
        match buf_reader.read_line(&mut line) {
            Ok(0) => {
                // EOF - check if process completed
                match child.try_wait() {
                    Ok(Some(status)) => return Ok(status),
                    Ok(None) => {
                        // Process still alive, wait a bit
                        tokio::time::sleep(Duration::from_millis(100)).await;
                    }
                    Err(e) => return Err(YubiKeyError::age_plugin(format!("Process error: {e}"))),
                }
            }
            Ok(_) => {
                output.push_str(&line);
            }
            Err(e) => {
                return Err(YubiKeyError::age_plugin(format!(
                    "Read error after touch: {e}"
                )));
            }
        }
    }
}
