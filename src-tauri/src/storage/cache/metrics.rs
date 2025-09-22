//! Cache performance metrics
//!
//! This module provides metrics tracking for cache operations
//! to monitor hit rates and performance characteristics.

use serde::{Deserialize, Serialize};

/// Cache performance metrics
#[derive(Debug, Default, Clone, Serialize, Deserialize, specta::Type)]
pub struct CacheMetrics {
    pub key_list_hits: u64,
    pub key_list_misses: u64,
    pub directory_hits: u64,
    pub directory_misses: u64,
    pub total_requests: u64,
    pub cache_invalidations: u64,
}

impl CacheMetrics {
    /// Calculate overall cache hit rate
    pub fn hit_rate(&self) -> f64 {
        let total_hits = self.key_list_hits + self.directory_hits;
        if self.total_requests == 0 {
            0.0
        } else {
            total_hits as f64 / self.total_requests as f64
        }
    }

    /// Calculate hit rate specifically for key list operations
    pub fn key_list_hit_rate(&self) -> f64 {
        let total_key_requests = self.key_list_hits + self.key_list_misses;
        if total_key_requests == 0 {
            0.0
        } else {
            self.key_list_hits as f64 / total_key_requests as f64
        }
    }

    /// Calculate hit rate specifically for directory operations
    pub fn directory_hit_rate(&self) -> f64 {
        let total_directory_requests = self.directory_hits + self.directory_misses;
        if total_directory_requests == 0 {
            0.0
        } else {
            self.directory_hits as f64 / total_directory_requests as f64
        }
    }
}
