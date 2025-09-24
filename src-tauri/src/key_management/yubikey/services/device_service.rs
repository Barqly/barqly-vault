//! Device service (placeholder)

use async_trait::async_trait;

#[async_trait]
pub trait DeviceService: Send + Sync {}

pub struct YkmanDeviceService {}

impl YkmanDeviceService {
    pub async fn new() -> Result<Self, Box<dyn std::error::Error + Send + Sync>> {
        Ok(Self {})
    }
}

#[async_trait]
impl DeviceService for YkmanDeviceService {}