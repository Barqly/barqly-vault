//! I/O utilities for safe file operations

pub mod atomic_write;

pub use atomic_write::{atomic_write, atomic_write_sync};
