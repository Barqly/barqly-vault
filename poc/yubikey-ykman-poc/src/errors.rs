use thiserror::Error;

#[derive(Error, Debug)]
pub enum YubiKeyError {
    #[error("ykman not found. Please install: brew install yubikey-manager")]
    YkmanNotFound,

    #[error("age-plugin-yubikey not found. Please install: brew install age-plugin-yubikey")]
    AgePluginNotFound,

    #[error("No YubiKey detected. Please insert your YubiKey")]
    NoYubiKey,

    #[error("YubiKey operation failed: {0}")]
    OperationFailed(String),

    #[error("PIN verification failed. Attempts remaining: {0}")]
    PinFailed(u8),

    #[error("PUK verification failed. Attempts remaining: {0}")]
    PukFailed(u8),

    #[error("Touch timeout. Please touch your YubiKey when it blinks")]
    TouchTimeout,

    #[error("PTY operation failed: {0}")]
    PtyError(String),

    #[error("Invalid PIN format. PIN must be 6-8 digits")]
    InvalidPin,

    #[error("Management key setup failed: {0}")]
    ManagementKeyError(String),

    #[error("Unexpected output from command: {0}")]
    UnexpectedOutput(String),

    #[error("IO error: {0}")]
    IoError(#[from] std::io::Error),
}

pub type Result<T> = std::result::Result<T, YubiKeyError>;

#[derive(Debug, Clone, serde::Serialize)]
pub struct Requirements {
    pub ykman_installed: bool,
    pub ykman_version: Option<String>,
    pub age_plugin_installed: bool,
    pub age_plugin_version: Option<String>,
    pub yubikey_present: bool,
    pub yubikey_info: Option<YubiKeyInfo>,
}

#[derive(Debug, Clone, serde::Serialize)]
pub struct YubiKeyInfo {
    pub serial: String,
    pub version: String,
    pub pin_attempts: u8,
    pub puk_attempts: u8,
    pub management_key_is_default: bool,
    pub management_key_algorithm: String,
    pub management_key_protected: bool,
}

#[derive(Debug, Clone, serde::Serialize)]
pub struct InitStatus {
    pub pin_changed: bool,
    pub puk_changed: bool,
    pub management_key_set: bool,
    pub ready_for_generation: bool,
    pub message: String,
}
