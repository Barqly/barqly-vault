//! YubiKey state information DTO

use super::{PinStatus, YubiKeyState};

#[derive(Debug, serde::Serialize, specta::Type)]
pub struct YubiKeyStateInfo {
    pub serial: String,
    pub state: YubiKeyState,
    pub slot: Option<u8>,
    pub recipient: Option<String>,
    pub identity_tag: Option<String>,
    pub label: Option<String>,
    pub pin_status: PinStatus,
    pub firmware_version: Option<String>,
}
