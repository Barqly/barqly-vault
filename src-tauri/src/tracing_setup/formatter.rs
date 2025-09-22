//! Custom formatter for Barqly Vault tracing output
//!
//! Implements a pipe-separated format with file location information

use std::fmt;
use tracing::field::{Field, Visit};
use tracing::{Event, Level, Subscriber};
use tracing_subscriber::fmt::format::{FormatEvent, FormatFields};
use tracing_subscriber::fmt::{FmtContext, FormattedFields};
use tracing_subscriber::registry::LookupSpan;

/// Custom formatter that creates pipe-separated log entries
#[derive(Clone, Debug)]
pub struct BarqlyFormatter {
    /// Whether to include ANSI color codes
    use_ansi: bool,
}

impl BarqlyFormatter {
    pub fn new() -> Self {
        Self { use_ansi: false }
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
            self.message = Some(format!("{:?}", value));
        } else {
            self.fields.push((field.name().to_string(), format!("{:?}", value)));
        }
    }

    fn record_str(&mut self, field: &Field, value: &str) {
        if field.name() == "message" {
            self.message = Some(value.to_string());
        } else {
            self.fields.push((field.name().to_string(), value.to_string()));
        }
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
                Level::ERROR => format!("\x1b[31m{}\x1b[0m", level_str), // Red
                Level::WARN => format!("\x1b[33m{}\x1b[0m", level_str),  // Yellow
                Level::INFO => format!("\x1b[32m{}\x1b[0m", level_str),  // Green
                Level::DEBUG => format!("\x1b[36m{}\x1b[0m", level_str), // Cyan
                Level::TRACE => format!("\x1b[90m{}\x1b[0m", level_str), // Gray
            };
            write!(writer, "{}", colored)?;
        } else {
            write!(writer, "{}", level_str)?;
        }

        // 3. Separator and Module path with file:line
        write!(writer, " | ")?;

        // Module path (target)
        write!(writer, "{}", metadata.target())?;

        // Add file and line if available
        if let (Some(file), Some(line)) = (metadata.file(), metadata.line()) {
            // Extract just the filename from the full path
            let filename = file.rsplit('/').next().unwrap_or(file);
            write!(writer, ":{}:{}", filename, line)?;
        }

        // 4. Separator and Message/Fields
        write!(writer, " | ")?;

        // Collect event fields
        let mut collector = FieldCollector::new();
        event.record(&mut collector);

        // Write the message if present
        if let Some(message) = collector.message {
            write!(writer, "{}", message)?;
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
            let field_strs: Vec<String> = collector.fields
                .iter()
                .map(|(k, v)| format!("{}={}", k, v))
                .collect();
            write!(writer, "{{{}}}", field_strs.join(", "))?;
        }

        writeln!(writer)
    }
}