//! Test suite for Barqly Vault
//!
//! This module contains all tests organized by type:
//! - Unit tests: Test individual functions and components
//! - Integration tests: Test module interactions
//! - Smoke tests: Health checks for deployment validation

pub mod common;
pub mod integration;
pub mod smoke;
pub mod unit;

// Re-export test runner for convenience
pub use test_runner::*;

mod test_runner;
