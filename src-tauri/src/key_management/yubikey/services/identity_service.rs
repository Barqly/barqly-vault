//! Identity service (placeholder)

use async_trait::async_trait;

#[async_trait]
pub trait IdentityService: Send + Sync {}

pub struct AgePluginIdentityService {}

impl AgePluginIdentityService {
    pub async fn new() -> Result<Self, Box<dyn std::error::Error + Send + Sync>> {
        Ok(Self {})
    }
}

#[async_trait]
impl IdentityService for AgePluginIdentityService {}