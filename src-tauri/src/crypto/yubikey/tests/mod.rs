//! Comprehensive test suite for YubiKey functionality
//!
//! This module contains tests for all YubiKey-related functionality including
//! mock implementations for CI/CD environments where hardware is not available.

pub mod integration_tests;
pub mod mock_yubikey;
pub mod unit_tests;

use crate::crypto::yubikey::*;
use std::collections::HashMap;
use std::sync::{Arc, Mutex};

/// Test configuration for YubiKey tests
pub struct YubiKeyTestConfig {
    pub use_mock_hardware: bool,
    pub mock_serial_numbers: Vec<String>,
    pub mock_pin: String,
    pub simulate_errors: bool,
}

impl Default for YubiKeyTestConfig {
    fn default() -> Self {
        Self {
            use_mock_hardware: true, // Default to mock for CI
            mock_serial_numbers: vec!["12345678".to_string(), "87654321".to_string()],
            mock_pin: "123456".to_string(),
            simulate_errors: false,
        }
    }
}

/// Global test state for managing mock YubiKey behavior
#[derive(Debug)]
pub struct YubiKeyTestState {
    pub connected_devices: HashMap<String, YubiKeyDevice>,
    pub pin_attempts: HashMap<String, u8>,
    pub blocked_devices: Vec<String>,
    pub should_fail_operations: bool,
}

impl Default for YubiKeyTestState {
    fn default() -> Self {
        Self {
            connected_devices: HashMap::new(),
            pin_attempts: HashMap::new(),
            blocked_devices: Vec::new(),
            should_fail_operations: false,
        }
    }
}

lazy_static::lazy_static! {
    static ref TEST_STATE: Arc<Mutex<YubiKeyTestState>> = Arc::new(Mutex::new(YubiKeyTestState::default()));
}

/// Initialize test environment with mock devices
pub fn init_test_environment(config: YubiKeyTestConfig) {
    let mut state = TEST_STATE.lock().unwrap();
    state.connected_devices.clear();

    if config.use_mock_hardware {
        for (index, serial) in config.mock_serial_numbers.iter().enumerate() {
            let device = YubiKeyDevice {
                serial: serial.clone(),
                model: format!("YubiKey 5 Series (Test {})", index + 1),
                version: "5.4.3".to_string(),
                status: DeviceStatus::Ready,
                available_slots: vec![0x82, 0x83, 0x84, 0x85],
            };
            state.connected_devices.insert(serial.clone(), device);
            state.pin_attempts.insert(serial.clone(), 3);
        }
    }

    state.should_fail_operations = config.simulate_errors;
}

/// Reset test environment
pub fn reset_test_environment() {
    let mut state = TEST_STATE.lock().unwrap();
    *state = YubiKeyTestState::default();
}

/// Get mock test state (for test verification)
pub fn get_test_state() -> Arc<Mutex<YubiKeyTestState>> {
    Arc::clone(&TEST_STATE)
}

/// Helper function to create a mock YubiKey device for testing
pub fn create_mock_device(serial: &str, model: &str) -> YubiKeyDevice {
    YubiKeyDevice {
        serial: serial.to_string(),
        model: model.to_string(),
        version: "5.4.3".to_string(),
        status: DeviceStatus::Ready,
        available_slots: vec![0x82, 0x83, 0x84],
    }
}

/// Helper function to simulate YubiKey connection/disconnection
pub fn simulate_device_connection(device: YubiKeyDevice, connected: bool) {
    let mut state = TEST_STATE.lock().unwrap();
    if connected {
        state
            .connected_devices
            .insert(device.serial.clone(), device);
    } else {
        state.connected_devices.remove(&device.serial);
    }
}

/// Helper function to simulate PIN blocking
pub fn simulate_pin_block(serial: &str) {
    let mut state = TEST_STATE.lock().unwrap();
    state.blocked_devices.push(serial.to_string());
    state.pin_attempts.insert(serial.to_string(), 0);
}

/// Helper function to simulate PIN attempts
pub fn simulate_pin_attempt(serial: &str, correct: bool) -> u8 {
    let mut state = TEST_STATE.lock().unwrap();
    
    // Get current attempts or default to 3
    let current_attempts = state.pin_attempts.get(serial).copied().unwrap_or(3);
    let new_attempts = if !correct && current_attempts > 0 {
        current_attempts - 1
    } else if correct {
        3 // Reset on successful authentication
    } else {
        current_attempts
    };
    
    // Update attempts
    state.pin_attempts.insert(serial.to_string(), new_attempts);

    if new_attempts == 0 {
        state.blocked_devices.push(serial.to_string());
    }

    new_attempts
}

/// Check if a device is blocked in the test environment
pub fn is_device_blocked(serial: &str) -> bool {
    let state = TEST_STATE.lock().unwrap();
    state.blocked_devices.contains(&serial.to_string())
}

/// Set whether operations should fail in test environment
pub fn set_should_fail_operations(should_fail: bool) {
    let mut state = TEST_STATE.lock().unwrap();
    state.should_fail_operations = should_fail;
}

/// Check if operations should fail in test environment
pub fn should_fail_operations() -> bool {
    let state = TEST_STATE.lock().unwrap();
    state.should_fail_operations
}

// Re-export test modules for easier access
pub use integration_tests::*;
pub use mock_yubikey::*;
pub use unit_tests::*;
