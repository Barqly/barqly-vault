//! Custom formatter for Barqly Vault tracing output
//!
//! Implements a pipe-separated format with file location information

use std::fmt;
use tracing::field::{Field, Visit};
use tracing::{Event, Level, Subscriber};
use tracing_subscriber::fmt::format::{FormatEvent, FormatFields};
use tracing_subscriber::fmt::{FmtContext, FormattedFields};
use tracing_subscriber::registry::LookupSpan;

/// Maximum width for the module:file:line column for consistent alignment
const MODULE_COLUMN_WIDTH: usize = 60;

/// Custom formatter that creates pipe-separated log entries
#[derive(Clone, Debug)]
pub struct BarqlyFormatter {}

impl BarqlyFormatter {
    pub fn new() -> Self {
        Self {}
    }
}

impl Default for BarqlyFormatter {
    fn default() -> Self {
        Self::new()
    }
}

/// Helper struct to collect fields from an event
struct FieldCollector {
    fields: Vec<(String, String)>,
    message: Option<String>,
}

impl FieldCollector {
    fn new() -> Self {
        Self {
            fields: Vec::new(),
            message: None,
        }
    }
}

impl Visit for FieldCollector {
    fn record_debug(&mut self, field: &Field, value: &dyn fmt::Debug) {
        if field.name() == "message" {
            self.message = Some(format!("{value:?}"));
        } else {
            self.fields
                .push((field.name().to_string(), format!("{value:?}")));
        }
    }

    fn record_str(&mut self, field: &Field, value: &str) {
        if field.name() == "message" {
            self.message = Some(value.to_string());
        } else {
            self.fields
                .push((field.name().to_string(), value.to_string()));
        }
    }
}

/// Format module location with fixed width for consistent log alignment
///
/// This function creates a fixed-width string for the module:file:line column
/// to ensure consistent alignment in log output.
fn format_module_location(target: &str, file: Option<&str>, line: Option<u32>) -> String {
    // Build the full location string
    let location = match (file, line) {
        (Some(f), Some(l)) => {
            // Extract just the filename from the full path
            let filename = f.rsplit('/').next().unwrap_or(f);
            format!("{target}:{filename}:{l}")
        }
        _ => target.to_string(),
    };

    // Handle width formatting
    if location.len() <= MODULE_COLUMN_WIDTH {
        // Pad with spaces to reach fixed width (left-aligned)
        format!("{location:<MODULE_COLUMN_WIDTH$}")
    } else {
        // Truncate from the left, keeping the most important part (filename:line)
        let truncated = &location[location.len() - (MODULE_COLUMN_WIDTH - 3)..];
        format!("...{truncated}")
    }
}

impl<S, N> FormatEvent<S, N> for BarqlyFormatter
where
    S: Subscriber + for<'a> LookupSpan<'a>,
    N: for<'a> FormatFields<'a> + 'static,
{
    fn format_event(
        &self,
        ctx: &FmtContext<'_, S, N>,
        mut writer: tracing_subscriber::fmt::format::Writer<'_>,
        event: &Event<'_>,
    ) -> fmt::Result {
        let metadata = event.metadata();

        // 1. Timestamp in RFC3339 format
        let now = chrono::Utc::now();
        write!(writer, "{}", now.to_rfc3339())?;

        // 2. Separator and Level
        let level = metadata.level();
        write!(writer, " | ")?;

        // Format level with fixed width (5 chars) for alignment
        let level_str = match *level {
            Level::ERROR => "ERROR",
            Level::WARN => "WARN ",
            Level::INFO => "INFO ",
            Level::DEBUG => "DEBUG",
            Level::TRACE => "TRACE",
        };

        // Apply color if ANSI is enabled
        if writer.has_ansi_escapes() {
            let colored = match *level {
                Level::ERROR => format!("\x1b[31m{level_str}\x1b[0m"), // Red
                Level::WARN => format!("\x1b[33m{level_str}\x1b[0m"),  // Yellow
                Level::INFO => format!("\x1b[32m{level_str}\x1b[0m"),  // Green
                Level::DEBUG => format!("\x1b[36m{level_str}\x1b[0m"), // Cyan
                Level::TRACE => format!("\x1b[90m{level_str}\x1b[0m"), // Gray
            };
            write!(writer, "{colored}")?;
        } else {
            write!(writer, "{level_str}")?;
        }

        // 3. Separator and Module path with file:line (fixed width for alignment)
        write!(writer, " | ")?;

        // Use fixed-width formatting for consistent column alignment
        let formatted_location =
            format_module_location(metadata.target(), metadata.file(), metadata.line());
        write!(writer, "{formatted_location}")?;

        // 4. Separator and Message/Fields
        write!(writer, " | ")?;

        // Collect event fields
        let mut collector = FieldCollector::new();
        event.record(&mut collector);

        // Write the message if present
        if let Some(message) = collector.message {
            write!(writer, "{message}")?;
        }

        // 5. Write span context if present
        if let Some(scope) = ctx.event_scope() {
            let mut spans = Vec::new();
            for span in scope.from_root() {
                let extensions = span.extensions();
                if let Some(fields) = extensions.get::<FormattedFields<N>>() {
                    if !fields.is_empty() {
                        spans.push(format!("{}[{}]", span.name(), fields));
                    } else {
                        spans.push(span.name().to_string());
                    }
                }
            }
            if !spans.is_empty() {
                write!(writer, " | spans: {}", spans.join(" > "))?;
            }
        }

        // 6. Write additional fields if present
        if !collector.fields.is_empty() {
            write!(writer, " | ")?;
            let field_strs: Vec<String> = collector
                .fields
                .iter()
                .map(|(k, v)| format!("{k}={v}"))
                .collect();
            write!(writer, "{{{}}}", field_strs.join(", "))?;
        }

        writeln!(writer)
    }
}
