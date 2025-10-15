//! Storage-specific cache implementation
//!
//! This module provides caching functionality specifically tailored for
//! storage operations like key listing and directory checks.

use super::metrics::CacheMetrics;
use super::ttl_lru::TtlLruCache;
use crate::constants::{DEFAULT_CACHE_SIZE, DIRECTORY_CACHE_TTL_SECONDS, KEY_CACHE_TTL_SECONDS};
use crate::services::key_management::shared::infrastructure::KeyInfo;
use std::sync::{Arc, Mutex};

/// Cache manager for storage operations
#[derive(Debug)]
pub struct StorageCache {
    key_list_cache: TtlLruCache<String, Vec<KeyInfo>>,
    directory_cache: TtlLruCache<String, bool>,
    metrics: Arc<Mutex<CacheMetrics>>,
}

impl StorageCache {
    pub fn new() -> Self {
        Self {
            key_list_cache: TtlLruCache::new(DEFAULT_CACHE_SIZE, KEY_CACHE_TTL_SECONDS),
            directory_cache: TtlLruCache::new(DEFAULT_CACHE_SIZE, DIRECTORY_CACHE_TTL_SECONDS),
            metrics: Arc::new(Mutex::new(CacheMetrics::default())),
        }
    }

    pub fn get_key_list(&self, cache_key: &str) -> Option<Vec<KeyInfo>> {
        // Update metrics if available (ignore if mutex poisoned - offline app, extremely unlikely)
        if let Ok(mut metrics) = self.metrics.lock() {
            metrics.total_requests += 1;
        }

        let cache_key_owned = cache_key.to_string();
        let result = self.key_list_cache.get(&cache_key_owned);

        // Update hit/miss metrics if available
        if let Ok(mut metrics) = self.metrics.lock() {
            if result.is_some() {
                metrics.key_list_hits += 1;
            } else {
                metrics.key_list_misses += 1;
            }
        }

        result
    }

    pub fn cache_key_list(&self, cache_key: String, keys: Vec<KeyInfo>) {
        self.key_list_cache.put(cache_key, keys);
    }

    pub fn invalidate_key_list(&self) {
        self.key_list_cache.clear();
        // Update metrics if available
        if let Ok(mut metrics) = self.metrics.lock() {
            metrics.cache_invalidations += 1;
        }
    }

    pub fn get_directory_exists(&self, path: &str) -> Option<bool> {
        // Update metrics if available
        if let Ok(mut metrics) = self.metrics.lock() {
            metrics.total_requests += 1;
        }

        let path_owned = path.to_string();
        let result = self.directory_cache.get(&path_owned);

        // Update hit/miss metrics if available
        if let Ok(mut metrics) = self.metrics.lock() {
            if result.is_some() {
                metrics.directory_hits += 1;
            } else {
                metrics.directory_misses += 1;
            }
        }

        result
    }

    pub fn cache_directory_exists(&self, path: String, exists: bool) {
        self.directory_cache.put(path, exists);
    }

    pub fn invalidate_directory(&self, path: &str) {
        let path_owned = path.to_string();
        self.directory_cache.invalidate(&path_owned);
        // Update metrics if available
        if let Ok(mut metrics) = self.metrics.lock() {
            metrics.cache_invalidations += 1;
        }
    }

    pub fn get_metrics(&self) -> CacheMetrics {
        // Return default metrics if mutex poisoned (extremely unlikely in offline desktop app)
        self.metrics.lock().map(|m| m.clone()).unwrap_or_default()
    }

    pub fn clear_all(&self) {
        self.key_list_cache.clear();
        self.directory_cache.clear();
        // Reset metrics if available
        if let Ok(mut metrics) = self.metrics.lock() {
            *metrics = CacheMetrics::default();
        }
    }
}

impl Default for StorageCache {
    fn default() -> Self {
        Self::new()
    }
}

/// Global cache instance
static CACHE_INSTANCE: once_cell::sync::Lazy<StorageCache> =
    once_cell::sync::Lazy::new(StorageCache::new);

/// Get the global cache instance
pub fn get_cache() -> &'static StorageCache {
    &CACHE_INSTANCE
}
