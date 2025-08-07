//! Generic TTL-based LRU cache implementation
//!
//! This module provides a thread-safe LRU cache with time-to-live (TTL) support
//! for automatic expiration of cached entries.

use lru::LruCache;
use serde::{Deserialize, Serialize};
use std::num::NonZeroUsize;
use std::sync::{Arc, Mutex};
use std::time::{Duration, SystemTime};

/// Cache entry with TTL support
#[derive(Debug, Clone, Serialize, Deserialize)]
pub(crate) struct CacheEntry<T> {
    pub data: T,
    created_at: SystemTime,
    ttl_seconds: u64,
}

impl<T> CacheEntry<T> {
    pub fn new(data: T, ttl_seconds: u64) -> Self {
        Self {
            data,
            created_at: SystemTime::now(),
            ttl_seconds,
        }
    }

    pub fn is_expired(&self) -> bool {
        self.created_at.elapsed().unwrap_or(Duration::MAX) > Duration::from_secs(self.ttl_seconds)
    }
}

/// Thread-safe LRU cache with TTL support
pub struct TtlLruCache<K, V>
where
    K: std::hash::Hash + Eq + Clone,
{
    pub(crate) cache: Arc<Mutex<LruCache<K, CacheEntry<V>>>>,
    pub(crate) default_ttl: u64,
}

impl<K, V> std::fmt::Debug for TtlLruCache<K, V>
where
    K: std::hash::Hash + Eq + Clone,
    V: Clone,
{
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.debug_struct("TtlLruCache")
            .field("default_ttl", &self.default_ttl)
            .field("cache_size", &self.len())
            .finish()
    }
}

impl<K, V> TtlLruCache<K, V>
where
    K: std::hash::Hash + Eq + Clone,
    V: Clone,
{
    pub fn new(capacity: usize, default_ttl: u64) -> Self {
        Self {
            cache: Arc::new(Mutex::new(LruCache::new(
                NonZeroUsize::new(capacity).unwrap(),
            ))),
            default_ttl,
        }
    }

    pub fn get(&self, key: &K) -> Option<V> {
        let mut cache = self.cache.lock().unwrap();
        if let Some(entry) = cache.get(key) {
            if !entry.is_expired() {
                return Some(entry.data.clone());
            } else {
                // Remove expired entry
                cache.pop(key);
            }
        }
        None
    }

    pub fn put(&self, key: K, value: V) {
        self.put_with_ttl(key, value, self.default_ttl);
    }

    pub fn put_with_ttl(&self, key: K, value: V, ttl: u64) {
        let mut cache = self.cache.lock().unwrap();
        let entry = CacheEntry::new(value, ttl);
        cache.put(key, entry);
    }

    pub fn invalidate(&self, key: &K) {
        let mut cache = self.cache.lock().unwrap();
        cache.pop(key);
    }

    pub fn clear(&self) {
        let mut cache = self.cache.lock().unwrap();
        cache.clear();
    }

    pub fn len(&self) -> usize {
        let cache = self.cache.lock().unwrap();
        cache.len()
    }

    pub fn is_empty(&self) -> bool {
        let cache = self.cache.lock().unwrap();
        cache.is_empty()
    }
}
