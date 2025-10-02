//! Common service traits for YubiKey operations

use super::{OperationContext, ServiceHealth, ServiceMetrics};
use crate::services::key_management::yubikey::domain::errors::YubiKeyResult;
use crate::services::key_management::yubikey::domain::models::Serial;
use async_trait::async_trait;

/// Common service behavior that all services should implement
#[async_trait]
pub trait Service: Send + Sync + std::fmt::Debug {
    /// Initialize the service
    async fn initialize(&self) -> YubiKeyResult<()>;

    /// Check if service is healthy
    async fn health_check(&self) -> YubiKeyResult<ServiceHealth>;

    /// Get service metrics
    async fn get_metrics(&self) -> YubiKeyResult<ServiceMetrics>;

    /// Shutdown the service gracefully
    async fn shutdown(&self) -> YubiKeyResult<()>;
}

/// Validation trait for serial-scoped operations
pub trait SerialScoped {
    /// Validate that serial parameter is provided (enforces architectural requirement)
    fn validate_serial(&self, serial: &Serial) -> YubiKeyResult<()> {
        if serial.value().is_empty() {
            return Err(
                crate::services::key_management::yubikey::domain::errors::YubiKeyError::serial_required(
                    "operation",
                ),
            );
        }
        Ok(())
    }

    /// Create operation context for logging and tracing
    fn create_operation_context(&self, operation: &str, serial: &Serial) -> OperationContext {
        OperationContext {
            operation: operation.to_string(),
            serial: serial.redacted(),
            started_at: chrono::Utc::now(),
        }
    }
}
