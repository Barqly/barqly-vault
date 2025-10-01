use crate::services::shared::{CacheMetrics, get_cache};
use crate::services::storage::domain::StorageResult;

pub struct CacheService;

impl CacheService {
    pub fn new() -> Self {
        Self
    }

    /// Get cache performance metrics with exact logic from commands/storage/mod.rs
    pub async fn get_cache_metrics(&self) -> StorageResult<CacheMetrics> {
        // Get cache metrics (same logic as current command)
        let cache = get_cache();
        let metrics = cache.get_metrics();

        // Log operation completion with metrics (same as current command)
        log::info!(
            "Cache metrics retrieval completed successfully: hit_rate={:.2}%, key_list_hit_rate={:.2}%, total_requests={}, cache_invalidations={}",
            metrics.hit_rate() * 100.0,
            metrics.key_list_hit_rate() * 100.0,
            metrics.total_requests,
            metrics.cache_invalidations
        );

        Ok(metrics)
    }
}

impl Default for CacheService {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_cache_service_creation() {
        let _service = CacheService::new();
        // Just verify creation works
    }
}
