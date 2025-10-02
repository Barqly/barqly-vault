//! Service metrics and operation context for monitoring

/// Service health status
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum ServiceHealth {
    Healthy,
    Warning { message: String },
    Unhealthy { error: String },
}

/// Service metrics for monitoring
#[derive(Debug, Clone)]
pub struct ServiceMetrics {
    pub operations_count: u64,
    pub errors_count: u64,
    pub average_response_time_ms: f64,
    pub last_operation: Option<chrono::DateTime<chrono::Utc>>,
}

impl Default for ServiceMetrics {
    fn default() -> Self {
        Self {
            operations_count: 0,
            errors_count: 0,
            average_response_time_ms: 0.0,
            last_operation: None,
        }
    }
}

/// Operation context for logging and tracing
#[derive(Debug, Clone)]
pub struct OperationContext {
    pub operation: String,
    pub serial: String, // Already redacted for security
    pub started_at: chrono::DateTime<chrono::Utc>,
}

impl OperationContext {
    /// Get operation duration
    pub fn duration(&self) -> chrono::Duration {
        chrono::Utc::now() - self.started_at
    }

    /// Create completion log entry
    pub fn completion_log(&self) -> String {
        format!(
            "Operation '{}' completed for YubiKey {} in {}ms",
            self.operation,
            self.serial,
            self.duration().num_milliseconds()
        )
    }
}
