//! Passphrase key information DTO

use chrono::{DateTime, Utc};
use serde::Serialize;

#[derive(Debug, Serialize, specta::Type)]
pub struct PassphraseKeyInfo {
    pub id: String,
    pub label: String,
    pub public_key: String,
    pub created_at: DateTime<Utc>,
    pub last_used: Option<DateTime<Utc>>,
    pub is_available: bool,
}
