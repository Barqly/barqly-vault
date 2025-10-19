/// PIV slot operations for YubiKey
/// Handles management key changes and PIV-specific operations
use super::super::core::{Result, run_ykman_command};
use crate::prelude::*;

const DEFAULT_MGMT_KEY: &str = "010203040506070801020304050607080102030405060708";

/// Change management key to TDES with protected mode
#[instrument(skip(pin))]
pub fn change_management_key_pty(serial: &str, pin: &str) -> Result<()> {
    info!(
        "Changing management key to TDES with protected mode for YubiKey {}",
        serial
    );

    let args = vec![
        "--device".to_string(),
        serial.to_string(),
        "piv".to_string(),
        "access".to_string(),
        "change-management-key".to_string(),
        "-a".to_string(),
        "tdes".to_string(),
        "-p".to_string(),
        "-g".to_string(),
        "-m".to_string(),
        DEFAULT_MGMT_KEY.to_string(), // Use default management key for authentication
        "-P".to_string(),
        pin.to_string(),
    ];

    debug!(command = %format!("ykman --device {} piv access change-management-key -a tdes -p -g -m [REDACTED] -P [REDACTED]", serial), "Executing ykman command");

    match run_ykman_command(args, Some(pin)) {
        Ok(output) => {
            info!(
                output_length = output.len(),
                "Management key change succeeded"
            );
            Ok(())
        }
        Err(e) => {
            warn!(error = ?e, "Management key change failed");
            Err(e)
        }
    }
}
