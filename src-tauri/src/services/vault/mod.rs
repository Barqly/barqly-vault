pub mod application;
pub mod domain;
pub mod infrastructure;

pub use application::VaultManager;
pub use domain::{VaultError, VaultResult};