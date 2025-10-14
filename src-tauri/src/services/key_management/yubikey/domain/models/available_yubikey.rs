//! Available YubiKey for vault registration DTO

use crate::services::key_management::shared::domain::models::key_lifecycle::KeyLifecycleStatus;
use serde::Serialize;

/// Available YubiKey for vault registration - matches frontend YubiKeyStateInfo
///
/// **Dual State System:**
/// - `state`: Device-level hardware state (YubiKeyState as string)
/// - `lifecycle_status`: Registry-level NIST state (KeyLifecycleStatus)
#[derive(Debug, Serialize, specta::Type)]
pub struct AvailableYubiKey {
    pub serial: String,
    /// Device state: "new", "reused", "registered", "orphaned"
    /// (Kept for backward compatibility - will be deprecated in favor of lifecycle_status)
    pub state: String,
    /// NIST-aligned lifecycle status (PreActivation, Active, Suspended, etc.)
    pub lifecycle_status: KeyLifecycleStatus,
    pub slot: Option<u8>,
    pub recipient: Option<String>,
    pub identity_tag: Option<String>,
    pub label: Option<String>,
    pub pin_status: String, // For now, simplified
}
