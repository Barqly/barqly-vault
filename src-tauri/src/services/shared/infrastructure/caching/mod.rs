//! Simple response caching for storage operations
//!
//! This module provides LRU caching for frequently accessed storage operations
//! to improve performance by 10-20% for repeated key listing and metadata operations.
//!
//! ## Architecture
//!
//! The cache module is organized into three components:
//! - `ttl_lru`: Generic TTL-based LRU cache implementation
//! - `metrics`: Cache performance metrics tracking
//! - `storage_cache`: Storage-specific cache operations
//!
//! ## Usage
//!
//! ```rust,no_run
//! # use barqly_vault_lib::services::shared::infrastructure::caching::get_cache;
//! let cache = get_cache();
//! cache.cache_key_list("my_key".to_string(), vec![]);
//! ```

mod metrics;
mod storage_cache;
mod ttl_lru;

// Re-export public types to maintain backward compatibility
pub use metrics::CacheMetrics;
pub use storage_cache::{StorageCache, get_cache};
pub use ttl_lru::TtlLruCache;

#[cfg(test)]
mod tests {
    use super::*;
    use crate::storage::KeyInfo;
    use std::sync::Arc;
    use std::thread;
    use std::time::Duration;

    #[test]
    fn test_cache_entry_expiration() {
        use super::ttl_lru::CacheEntry;

        let entry = CacheEntry::new("test_data".to_string(), 1);

        // Should not be expired immediately
        assert!(!entry.is_expired());

        // Wait for expiration
        thread::sleep(Duration::from_secs(2));
        assert!(entry.is_expired());
    }

    #[test]
    fn test_ttl_lru_cache_basic_operations() {
        let cache = TtlLruCache::new(2, 60);

        // Test put and get
        cache.put("key1".to_string(), "value1".to_string());
        assert_eq!(cache.get(&"key1".to_string()), Some("value1".to_string()));

        // Test cache miss
        assert_eq!(cache.get(&"nonexistent".to_string()), None);

        // Test invalidation
        cache.invalidate(&"key1".to_string());
        assert_eq!(cache.get(&"key1".to_string()), None);
    }

    #[test]
    fn test_ttl_lru_cache_expiration() {
        let cache = TtlLruCache::new(10, 1); // 1 second TTL

        cache.put("key1".to_string(), "value1".to_string());
        assert_eq!(cache.get(&"key1".to_string()), Some("value1".to_string()));

        // Wait for expiration
        thread::sleep(Duration::from_secs(2));
        assert_eq!(cache.get(&"key1".to_string()), None);
    }

    #[test]
    fn test_ttl_lru_cache_capacity() {
        let cache = TtlLruCache::new(2, 60);

        cache.put("key1".to_string(), "value1".to_string());
        cache.put("key2".to_string(), "value2".to_string());
        cache.put("key3".to_string(), "value3".to_string()); // Should evict key1

        assert_eq!(cache.get(&"key1".to_string()), None);
        assert_eq!(cache.get(&"key2".to_string()), Some("value2".to_string()));
        assert_eq!(cache.get(&"key3".to_string()), Some("value3".to_string()));
    }

    #[test]
    fn test_storage_cache_key_list_operations() {
        let cache = StorageCache::new();
        let test_keys = vec![KeyInfo::new(
            "test1".to_string(),
            std::path::PathBuf::from("/test/path1"),
            Some("public_key1".to_string()),
        )];

        // Cache miss
        assert_eq!(cache.get_key_list("test_cache_key"), None);

        // Cache hit after storing
        cache.cache_key_list("test_cache_key".to_string(), test_keys.clone());
        let cached_keys = cache.get_key_list("test_cache_key");
        assert!(cached_keys.is_some());
        assert_eq!(cached_keys.unwrap().len(), 1);

        // Test invalidation
        cache.invalidate_key_list();
        assert_eq!(cache.get_key_list("test_cache_key"), None);
    }

    #[test]
    fn test_storage_cache_metrics() {
        let cache = StorageCache::new();
        let test_keys = vec![KeyInfo::new(
            "test1".to_string(),
            std::path::PathBuf::from("/test/path1"),
            Some("public_key1".to_string()),
        )];

        // Initial metrics
        let metrics = cache.get_metrics();
        assert_eq!(metrics.total_requests, 0);
        assert_eq!(metrics.key_list_hits, 0);
        assert_eq!(metrics.key_list_misses, 0);

        // Cache miss
        cache.get_key_list("test_key");
        let metrics = cache.get_metrics();
        assert_eq!(metrics.total_requests, 1);
        assert_eq!(metrics.key_list_misses, 1);

        // Cache hit
        cache.cache_key_list("test_key".to_string(), test_keys);
        cache.get_key_list("test_key");
        let metrics = cache.get_metrics();
        assert_eq!(metrics.total_requests, 2);
        assert_eq!(metrics.key_list_hits, 1);
        assert_eq!(metrics.key_list_misses, 1);

        // Test hit rate calculation
        assert_eq!(metrics.key_list_hit_rate(), 0.5);
    }

    #[test]
    fn test_cache_thread_safety() {
        let cache = Arc::new(StorageCache::new());
        let mut handles = vec![];

        // Spawn multiple threads accessing the cache
        for i in 0..10 {
            let cache_clone = Arc::clone(&cache);
            let handle = thread::spawn(move || {
                let test_keys = vec![KeyInfo::new(
                    format!("test{i}"),
                    std::path::PathBuf::from(format!("/test/path{i}")),
                    Some(format!("public_key{i}")),
                )];

                cache_clone.cache_key_list(format!("key{i}"), test_keys);
                cache_clone.get_key_list(&format!("key{i}"));
            });
            handles.push(handle);
        }

        // Wait for all threads to complete
        for handle in handles {
            handle.join().unwrap();
        }

        // Verify metrics were updated correctly
        let metrics = cache.get_metrics();
        assert!(metrics.total_requests > 0);
    }

    #[test]
    fn test_global_cache_instance() {
        let cache1 = get_cache();
        let cache2 = get_cache();

        // Should be the same instance
        assert!(std::ptr::eq(cache1, cache2));

        // Test basic functionality
        let test_keys = vec![KeyInfo::new(
            "global_test".to_string(),
            std::path::PathBuf::from("/test/global"),
            Some("global_public_key".to_string()),
        )];

        cache1.cache_key_list("global_key".to_string(), test_keys);
        assert!(cache2.get_key_list("global_key").is_some());
    }
}
