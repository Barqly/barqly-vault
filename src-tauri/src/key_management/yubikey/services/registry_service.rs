//! Registry service (placeholder)

use async_trait::async_trait;

#[async_trait]
pub trait RegistryService: Send + Sync {}

pub struct VaultRegistryService {}

impl VaultRegistryService {
    pub async fn new() -> Result<Self, Box<dyn std::error::Error + Send + Sync>> {
        Ok(Self {})
    }
}

#[async_trait]
impl RegistryService for VaultRegistryService {}