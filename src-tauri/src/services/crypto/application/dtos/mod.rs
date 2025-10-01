//! Crypto application DTOs
//!
//! Data transfer objects for crypto use cases

pub mod encrypt_input;
pub mod encrypt_multi_input;
pub mod encrypt_multi_response;

// Re-export for convenience
pub use encrypt_input::EncryptDataInput;
pub use encrypt_multi_input::EncryptFilesMultiInput;
pub use encrypt_multi_response::EncryptFilesMultiResponse;
