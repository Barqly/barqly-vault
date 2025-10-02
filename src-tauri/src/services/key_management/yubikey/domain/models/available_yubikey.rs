//! Available YubiKey for vault registration DTO

use serde::Serialize;

/// Available YubiKey for vault registration - matches frontend YubiKeyStateInfo
#[derive(Debug, Serialize, specta::Type)]
pub struct AvailableYubiKey {
    pub serial: String,
    pub state: String, // "new", "orphaned", "registered", "reused"
    pub slot: Option<u8>,
    pub recipient: Option<String>,
    pub identity_tag: Option<String>,
    pub label: Option<String>,
    pub pin_status: String, // For now, simplified
}
