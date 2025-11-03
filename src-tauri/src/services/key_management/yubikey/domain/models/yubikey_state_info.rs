//! YubiKey state information DTO

use super::{PinStatus, YubiKeyState};
use crate::services::key_management::shared::domain::models::key_lifecycle::KeyLifecycleStatus;
use chrono::{DateTime, Utc};

#[derive(Debug, serde::Serialize, specta::Type)]
pub struct YubiKeyStateInfo {
    pub serial: String,
    /// Device-level state (hardware initialization status)
    pub state: YubiKeyState,
    /// Registry-level lifecycle status (NIST-aligned) for consistent UI badges
    pub lifecycle_status: KeyLifecycleStatus,
    pub slot: Option<u8>,
    pub recipient: Option<String>,
    pub identity_tag: Option<String>,
    pub label: Option<String>,
    pub pin_status: PinStatus,
    pub firmware_version: Option<String>,
    /// Whether YubiKey has TDES PIN-protected management key
    /// Required for proper UI display of reused YubiKeys (differentiates Scenario 1 vs 2)
    pub has_tdes_protected_mgmt_key: bool,
    pub created_at: DateTime<Utc>,
    pub last_used: Option<DateTime<Utc>>,
}
