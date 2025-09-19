use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::{Arc, RwLock};
use std::time::{Duration, SystemTime};

/// YubiKey initialization state to prevent re-initialization and lockouts
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct YubiKeyInitState {
    pub serial: String,
    pub pin_changed: bool,
    pub mgmt_key_changed: bool,
    pub keys_generated: Vec<String>,
    pub last_verified: SystemTime,
    pub initialization_completed: bool,
}

impl YubiKeyInitState {
    pub fn new(serial: String) -> Self {
        Self {
            serial,
            pin_changed: false,
            mgmt_key_changed: false,
            keys_generated: Vec::new(),
            last_verified: SystemTime::now(),
            initialization_completed: false,
        }
    }

    pub fn mark_pin_changed(&mut self) {
        self.pin_changed = true;
        self.last_verified = SystemTime::now();
    }

    pub fn mark_mgmt_key_changed(&mut self) {
        self.mgmt_key_changed = true;
        self.last_verified = SystemTime::now();
    }

    pub fn mark_initialization_complete(&mut self) {
        self.initialization_completed = true;
        self.last_verified = SystemTime::now();
    }

    pub fn add_generated_key(&mut self, key_label: String) {
        if !self.keys_generated.contains(&key_label) {
            self.keys_generated.push(key_label);
        }
        self.last_verified = SystemTime::now();
    }

    pub fn is_expired(&self, max_age: Duration) -> bool {
        self.last_verified.elapsed().unwrap_or(Duration::MAX) > max_age
    }

    pub fn needs_initialization(&self) -> bool {
        !self.initialization_completed || (!self.pin_changed || !self.mgmt_key_changed)
    }
}

/// Thread-safe cache for YubiKey states
#[derive(Debug, Clone)]
pub struct YubiKeyStateCache {
    cache: Arc<RwLock<HashMap<String, YubiKeyInitState>>>,
    default_expiry: Duration,
}

impl YubiKeyStateCache {
    pub fn new() -> Self {
        Self {
            cache: Arc::new(RwLock::new(HashMap::new())),
            default_expiry: Duration::from_secs(3600), // 1 hour default
        }
    }

    pub fn get_state(&self, serial: &str) -> Option<YubiKeyInitState> {
        let cache = self.cache.read().ok()?;
        let state = cache.get(serial)?.clone();

        // Check if expired
        if state.is_expired(self.default_expiry) {
            drop(cache);
            self.remove_state(serial);
            None
        } else {
            Some(state)
        }
    }

    pub fn update_state(&self, serial: &str, state: YubiKeyInitState) {
        if let Ok(mut cache) = self.cache.write() {
            cache.insert(serial.to_string(), state);
        }
    }

    pub fn mark_pin_changed(&self, serial: &str) {
        if let Ok(mut cache) = self.cache.write() {
            if let Some(state) = cache.get_mut(serial) {
                state.mark_pin_changed();
            } else {
                let mut new_state = YubiKeyInitState::new(serial.to_string());
                new_state.mark_pin_changed();
                cache.insert(serial.to_string(), new_state);
            }
        }
    }

    pub fn mark_initialization_complete(&self, serial: &str) {
        if let Ok(mut cache) = self.cache.write() {
            if let Some(state) = cache.get_mut(serial) {
                state.mark_initialization_complete();
            } else {
                let mut new_state = YubiKeyInitState::new(serial.to_string());
                new_state.mark_initialization_complete();
                cache.insert(serial.to_string(), new_state);
            }
        }
    }

    pub fn add_generated_key(&self, serial: &str, key_label: String) {
        if let Ok(mut cache) = self.cache.write() {
            if let Some(state) = cache.get_mut(serial) {
                state.add_generated_key(key_label);
            }
        }
    }

    pub fn remove_state(&self, serial: &str) {
        if let Ok(mut cache) = self.cache.write() {
            cache.remove(serial);
        }
    }

    pub fn clear_all(&self) {
        if let Ok(mut cache) = self.cache.write() {
            cache.clear();
        }
    }

    /// Check if YubiKey needs initialization (prevents lockouts)
    pub fn needs_initialization(&self, serial: &str) -> bool {
        self.get_state(serial)
            .map(|state| state.needs_initialization())
            .unwrap_or(true) // If no state, assume needs init
    }

    /// Check if YubiKey has completed initialization
    pub fn is_initialized(&self, serial: &str) -> bool {
        self.get_state(serial)
            .map(|state| state.initialization_completed)
            .unwrap_or(false)
    }
}

impl Default for YubiKeyStateCache {
    fn default() -> Self {
        Self::new()
    }
}

// Global cache instance
lazy_static::lazy_static! {
    pub static ref YUBIKEY_STATE_CACHE: YubiKeyStateCache = YubiKeyStateCache::new();
}
