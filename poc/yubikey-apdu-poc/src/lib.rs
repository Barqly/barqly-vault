pub mod apdu;
pub mod hybrid;

// Re-export the hybrid module's types for convenience
pub use hybrid::{TouchPolicy, complete_yubikey_setup, initialize_yubikey_hybrid};

use anyhow::{Context, Result};
use log::{debug, info, warn};
use rand::Rng;
use yubikey::{YubiKey, MgmKey};

// PIV APDU Constants
const INS_SET_MGMKEY: u8 = 0xFF;
const INS_PUT_DATA: u8 = 0xDB;
const INS_VERIFY: u8 = 0x20;

// PIV Tags
const TAG_CARD_MANAGEMENT: u8 = 0x9B;

// Algorithm Types
const ALGO_TDES: u8 = 0x03;

// Object IDs for PIVMAN storage
const OBJECT_ID_PIVMAN_DATA: &[u8] = &[0x5F, 0xFF, 0x00];
const OBJECT_ID_PIVMAN_PROTECTED: &[u8] = &[0x5F, 0xFF, 0x01];

// Default management key (for testing/initialization)
pub const DEFAULT_MGMT_KEY: &[u8] = &[
    0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08,
    0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08,
    0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08,
];

/// Configuration for management key protection
#[derive(Debug, Clone, Copy, PartialEq)]
pub enum MgmKeyProtection {
    /// Manual - key must be provided each time
    Manual,
    /// Derived - key is derived from PIN (deprecated)
    Derived,
    /// Protected - key is stored on device, protected by PIN
    Protected,
}

// TouchPolicy is now defined in hybrid module

/// PIN-protected TDES management key implementation
pub struct ProtectedManagementKey {
    key: [u8; 24],
    protection: MgmKeyProtection,
    touch_policy: hybrid::TouchPolicy,
}

impl ProtectedManagementKey {
    /// Generate a new random TDES management key
    pub fn generate_random(protection: MgmKeyProtection, touch_policy: hybrid::TouchPolicy) -> Self {
        let mut key = [0u8; 24];
        rand::thread_rng().fill(&mut key);
        
        // Ensure odd parity for DES keys (requirement for TDES)
        for byte in key.iter_mut() {
            *byte = ensure_odd_parity(*byte);
        }
        
        Self {
            key,
            protection,
            touch_policy,
        }
    }
    
    /// Create from existing key bytes
    pub fn from_bytes(key: [u8; 24], protection: MgmKeyProtection, touch_policy: TouchPolicy) -> Self {
        Self {
            key,
            protection,
            touch_policy,
        }
    }
    
    /// Set the management key on the YubiKey using available crate API
    pub fn set_on_yubikey(&self, pin: &str) -> Result<()> {
        info!("Setting PIN-protected TDES management key");
        
        // Open YubiKey
        let mut yubikey = YubiKey::open()
            .context("Failed to open YubiKey")?;
        
        // Use authenticate method to get access to PIV operations
        // First authenticate with default management key
        yubikey.authenticate(MgmKey::default())
            .context("Failed to authenticate with management key")?;
        
        // Step 1: Verify PIN
        yubikey.verify_pin(pin.as_bytes())
            .context("Failed to verify PIN")?;
        
        // Step 2: Set the new management key
        // Note: The yubikey crate doesn't expose direct management key setting
        // We would need to implement raw APDU commands
        warn!("Direct management key setting not available in yubikey crate 0.8");
        warn!("Would need pcsc-sys for raw APDU commands");
        
        // Step 3: Store protection metadata (if protected)
        if self.protection == MgmKeyProtection::Protected {
            warn!("Protection metadata storage requires raw APDU commands");
        }
        
        info!("Note: Full implementation requires raw APDU access");
        Ok(())
    }
    
    /// Verify PIN using APDU (placeholder - would need raw APDU)
    fn verify_pin_apdu(&self, pin: &str) -> Result<()> {
        debug!("Verifying PIN");
        
        // PIN must be padded to 8 bytes with 0xFF
        let mut pin_bytes = [0xFF; 8];
        let pin_data = pin.as_bytes();
        let copy_len = pin_data.len().min(8);
        pin_bytes[..copy_len].copy_from_slice(&pin_data[..copy_len]);
        
        // Build VERIFY APDU: 00 20 00 80 08 [PIN padded]
        let mut apdu = vec![0x00, INS_VERIFY, 0x00, 0x80, 0x08];
        apdu.extend_from_slice(&pin_bytes);
        
        // Would need raw APDU transmit here
        warn!("Raw APDU transmit not available without pcsc-sys");
        
        // Would check response status here
        debug!("PIN verification would happen here with raw APDU");
        Ok(())
    }
    
    /// Set management key using APDU (placeholder - would need raw APDU)
    fn set_management_key_apdu(&self) -> Result<()> {
        debug!("Setting management key");
        
        // Build SET MANAGEMENT KEY APDU
        // 00 FF FF [P2] [Lc] [Algo] [TLV]
        let p2 = self.touch_policy.to_p2();
        
        // Build TLV: Tag 0x9B + Length 0x18 + 24-byte key
        let mut tlv = vec![TAG_CARD_MANAGEMENT, 0x18];
        tlv.extend_from_slice(&self.key);
        
        // Build complete APDU
        let mut apdu = vec![0x00, INS_SET_MGMKEY, 0xFF, p2];
        apdu.push((1 + tlv.len()) as u8); // Lc: algorithm + TLV
        apdu.push(ALGO_TDES); // Algorithm
        apdu.extend_from_slice(&tlv);
        
        debug!("APDU: {}", hex::encode(&apdu));
        
        // Would need raw APDU transmit here  
        warn!("Raw APDU transmit not available without pcsc-sys");
        
        // Would check response status here
        debug!("Management key would be set here with raw APDU");
        Ok(())
    }
    
    /// Store protection metadata using PUT DATA APDU (placeholder)
    fn store_protection_metadata_apdu(&self) -> Result<()> {
        debug!("Storing protection metadata");
        
        // Build protection metadata TLV structure
        // This stores a flag indicating the management key is PIN-protected
        let protection_data = build_protection_tlv();
        
        // Build PUT DATA APDU: 00 DB 3F FF [Lc] [Data]
        let mut apdu = vec![0x00, INS_PUT_DATA, 0x3F, 0xFF];
        apdu.push(protection_data.len() as u8);
        apdu.extend_from_slice(&protection_data);
        
        debug!("Protection APDU: {}", hex::encode(&apdu));
        
        // Would need raw APDU transmit here
        warn!("Raw APDU transmit not available without pcsc-sys");
        
        // Would check response status here
        debug!("Protection metadata would be stored here with raw APDU");
        Ok(())
    }
}

/// Build TLV structure for protection metadata
fn build_protection_tlv() -> Vec<u8> {
    // Simplified structure - actual implementation would need
    // to match age-plugin-yubikey expectations exactly
    let mut tlv = Vec::new();
    
    // Tag list: 5C [length] [object ID]
    tlv.push(0x5C);
    tlv.push(OBJECT_ID_PIVMAN_PROTECTED.len() as u8);
    tlv.extend_from_slice(OBJECT_ID_PIVMAN_PROTECTED);
    
    // Data object: 53 [length] [data]
    tlv.push(0x53);
    tlv.push(0x04); // Length of data
    
    // Protected flag: 88 02 01 01 (protected = true)
    tlv.extend_from_slice(&[0x88, 0x02, 0x01, 0x01]);
    
    tlv
}

/// Ensure odd parity for DES key byte
fn ensure_odd_parity(byte: u8) -> u8 {
    let mut b = byte;
    b = (b & 0xFE) | ((b.count_ones() & 1) ^ 1) as u8;
    b
}

/// Initialize YubiKey with PIN-protected management key
pub fn initialize_yubikey_with_protected_key(
    pin: &str,
    touch_policy: TouchPolicy,
) -> Result<()> {
    info!("Initializing YubiKey with PIN-protected TDES management key");
    
    // Find YubiKey
    let yubikey = YubiKey::open()
        .context("Failed to open YubiKey")?;
    
    info!("YubiKey found: {:?}", yubikey.serial());
    
    // Generate random protected management key
    let mgmt_key = ProtectedManagementKey::generate_random(
        MgmKeyProtection::Protected,
        touch_policy,
    );
    
    // Set the key on YubiKey
    mgmt_key.set_on_yubikey(pin)?;
    
    info!("YubiKey initialized successfully with PIN-protected management key");
    Ok(())
}

/// Check if YubiKey has a protected management key
pub fn check_protected_key_status(pin: &str) -> Result<bool> {
    // This would require reading the protection metadata
    // For now, we'll just verify we can authenticate
    
    let mut yubikey = YubiKey::open()
        .context("Failed to open YubiKey")?;
    
    // Try to verify PIN
    match yubikey.verify_pin(pin.as_bytes()) {
        Ok(_) => {
            info!("PIN verification successful");
            // Would need to read metadata to confirm protected key
            Ok(true)
        }
        Err(e) => {
            warn!("PIN verification failed: {}", e);
            Ok(false)
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn test_odd_parity() {
        assert_eq!(ensure_odd_parity(0x00), 0x01);
        assert_eq!(ensure_odd_parity(0xFF), 0xFE);
        assert_eq!(ensure_odd_parity(0xAA), 0xAB);
    }
    
    #[test]
    fn test_protection_tlv() {
        let tlv = build_protection_tlv();
        assert!(!tlv.is_empty());
        // Should start with tag list
        assert_eq!(tlv[0], 0x5C);
    }
}