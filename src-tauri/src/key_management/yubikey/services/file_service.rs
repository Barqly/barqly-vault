//! File service (placeholder)

use async_trait::async_trait;

#[async_trait]
pub trait FileService: Send + Sync {}

pub struct TempFileService {}

impl TempFileService {
    pub fn new() -> Result<Self, Box<dyn std::error::Error + Send + Sync>> {
        Ok(Self {})
    }
}

#[async_trait]
impl FileService for TempFileService {}