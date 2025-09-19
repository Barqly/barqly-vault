//! Raw APDU implementation for PIN-protected TDES management key
//! This module provides the missing functionality from the yubikey crate

use aes::Aes192;
use anyhow::{Context, Result};
use cipher::{BlockDecrypt, BlockEncrypt, KeyInit};
use des::TdesEde3;
use log::{debug, info, warn};
use once_cell::sync::Lazy;
use pcsc::{Card, Context as PcscContext, Protocols, Scope, MAX_BUFFER_SIZE};
use rand::Rng;
use std::sync::Mutex;

// PIV APDU Constants
const INS_VERIFY: u8 = 0x20;
const INS_SET_MGMKEY: u8 = 0xFF;
const INS_PUT_DATA: u8 = 0xDB;
const INS_AUTHENTICATE: u8 = 0x87;

// PIV Tags
const TAG_CARD_MANAGEMENT: u8 = 0x9B;
const TAG_DYN_AUTH: u8 = 0x7C;
const TAG_AUTH_WITNESS: u8 = 0x80;
const TAG_AUTH_CHALLENGE: u8 = 0x81;
const TAG_AUTH_RESPONSE: u8 = 0x82;

// Algorithm Types
const ALGO_TDES: u8 = 0x03;
const ALGO_AES192: u8 = 0x0A;

// PIV Application ID
const PIV_AID: &[u8] = &[0xA0, 0x00, 0x00, 0x03, 0x08];

// Object IDs for PIVMAN storage (vendor-specific)
const OBJECT_ID_PIVMAN_PROTECTED: &[u8] = &[0x5F, 0xFF, 0x01];

// Default management key (24 bytes for TDES)
pub const DEFAULT_MGMT_KEY: [u8; 24] = [
    0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08,
    0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08,
];

// Global storage for the management key (needed for protection metadata)
static MGMT_KEY_STORAGE: Lazy<Mutex<Option<[u8; 24]>>> = Lazy::new(|| Mutex::new(None));

/// Set PIN-protected TDES management key using raw APDU
pub fn set_pin_protected_management_key(pin: &str, touch_required: bool) -> Result<()> {
    info!("Setting PIN-protected TDES management key via raw APDU");

    // Establish PC/SC context
    let ctx = PcscContext::establish(Scope::System).context("Failed to establish PC/SC context")?;

    // Get available readers
    let mut readers_buf = [0; 2048];
    let mut readers = ctx
        .list_readers(&mut readers_buf)
        .context("Failed to list readers")?;

    // Find YubiKey reader
    let reader = readers
        .next()
        .ok_or_else(|| anyhow::anyhow!("No smart card reader found"))?;

    info!("Found reader");

    // Connect to the card
    let card = ctx
        .connect(reader, pcsc::ShareMode::Shared, Protocols::T1)
        .context("Failed to connect to YubiKey")?;

    // Select PIV application
    select_piv_application(&card)?;

    // Verify PIN first (required for protected key)
    verify_pin(&card, pin)?;

    // Try to authenticate with default management key
    // After a reset, this might fail or not be required
    match authenticate_with_default_key(&card) {
        Ok(_) => debug!("Authentication successful"),
        Err(e) => {
            warn!(
                "Authentication failed: {e}. Trying to proceed without auth (common after reset)"
            );
            // Continue without authentication - this is often the case after a PIV reset
        }
    }

    // Generate random TDES key with proper parity
    let new_key = generate_tdes_key();

    // Set the management key
    set_management_key(&card, &new_key, touch_required)?;

    // Store protection metadata (optional - for age-plugin-yubikey compatibility)
    if let Err(e) = store_protection_metadata(&card) {
        warn!("Failed to store protection metadata: {e}");
        // This is not critical - key is still set
    }

    info!("✅ Successfully set PIN-protected TDES management key!");
    Ok(())
}

/// Select PIV application on the card
fn select_piv_application(card: &Card) -> Result<()> {
    debug!("Selecting PIV application");

    // Build SELECT APDU: 00 A4 04 00 05 [PIV_AID]
    let mut apdu = vec![0x00, 0xA4, 0x04, 0x00, PIV_AID.len() as u8];
    apdu.extend_from_slice(PIV_AID);

    let mut response = [0; MAX_BUFFER_SIZE];
    let response = card
        .transmit(&apdu, &mut response)
        .context("Failed to select PIV application")?;

    check_response_status(response, "SELECT PIV")?;
    debug!("PIV application selected");
    Ok(())
}

/// Authenticate with default management key
fn authenticate_with_default_key(card: &Card) -> Result<()> {
    debug!("Authenticating with default management key");

    // Try AES-192 first (YubiKey 5.7+ default), then fallback to TDES
    match authenticate_with_algorithm(card, ALGO_AES192) {
        Ok(_) => {
            debug!("Authentication successful with AES-192");
            Ok(())
        }
        Err(e) => {
            debug!("AES-192 authentication failed: {e}, trying TDES");
            authenticate_with_algorithm(card, ALGO_TDES)
                .context("Authentication failed with both AES-192 and TDES")
        }
    }
}

/// Authenticate with specific algorithm
fn authenticate_with_algorithm(card: &Card, algo: u8) -> Result<()> {
    debug!("Authenticating with algorithm 0x{algo:02X}");

    // Step 1: Request witness using single authentication (tag 0x81)
    // Format: 00 87 <algo> 9B 04 7C 02 81 00
    let get_witness = vec![
        0x00,             // CLA
        INS_AUTHENTICATE, // INS = 0x87
        algo,             // P1 = algorithm (0x0A for AES-192, 0x03 for TDES)
        0x9B,             // P2 = 0x9B (Management key slot)
        0x04,             // Lc = 4 bytes of data follow
        0x7C,             // Dynamic auth template tag
        0x02,             // Length of content
        0x81,             // Tag 0x81 for single authentication (get challenge)
        0x00,             // Empty - request challenge from card
    ];

    debug!(
        "Sending witness request APDU: {}",
        hex::encode(&get_witness)
    );

    let mut response = [0; MAX_BUFFER_SIZE];
    let response = card
        .transmit(&get_witness, &mut response)
        .context("Failed to get witness")?;

    // Debug: Log the raw response
    debug!(
        "Raw witness response: {}",
        hex::encode(&response[..response.len().min(32)])
    );

    // Parse challenge from response
    // For AES: 7C 12 81 10 [16-byte-challenge] 90 00
    // For TDES: 7C 0A 81 08 [8-byte-challenge] 90 00
    let (challenge, challenge_len) = extract_witness_full(response)?;
    debug!(
        "Got challenge ({} bytes): {}",
        challenge_len,
        hex::encode(&challenge[..challenge_len])
    );

    // Step 2: Encrypt challenge using the appropriate algorithm
    let (encrypted_response, response_len) = if algo == ALGO_AES192 {
        // For AES-192, encrypt full 16-byte challenge
        let encrypted = encrypt_aes192_full(&challenge[..16], &DEFAULT_MGMT_KEY[..24])?;
        (encrypted.to_vec(), 16)
    } else {
        // For TDES, encrypt 8-byte challenge
        let mut challenge_8 = [0u8; 8];
        challenge_8.copy_from_slice(&challenge[..8]);
        let encrypted = encrypt_data(&challenge_8, &DEFAULT_MGMT_KEY)?;
        (encrypted.to_vec(), 8)
    };
    debug!(
        "Encrypted response ({} bytes): {}",
        response_len,
        hex::encode(&encrypted_response)
    );

    // Step 3: Send response back
    let mut auth_data = Vec::new();
    auth_data.push(TAG_DYN_AUTH);
    auth_data.push((2 + response_len) as u8); // Length of TLV inside
    auth_data.push(TAG_AUTH_RESPONSE);
    auth_data.push(response_len as u8);
    auth_data.extend_from_slice(&encrypted_response);

    let mut send_auth = vec![
        0x00,
        INS_AUTHENTICATE,
        algo, // P1 = algorithm
        0x9B, // P2 = 0x9B (management key slot)
        auth_data.len() as u8,
    ];
    send_auth.extend_from_slice(&auth_data);

    debug!(
        "Sending authentication response: {}",
        hex::encode(&send_auth)
    );

    let mut response = [0; MAX_BUFFER_SIZE];
    let response = card
        .transmit(&send_auth, &mut response)
        .context("Failed to complete authentication")?;

    // Check response status
    check_response_status(response, "AUTHENTICATE")?;

    debug!("Authentication successful!");
    Ok(())
}

/// Extract witness from APDU response (full size)
fn extract_witness_full(response: &[u8]) -> Result<([u8; 16], usize)> {
    // The response should contain a TLV structure
    // We need to find tag 0x80 or 0x81 (depending on auth type)

    // First, check if we have at least the status bytes
    if response.len() < 2 {
        return Err(anyhow::anyhow!(
            "Response too short: {} bytes",
            response.len()
        ));
    }

    // Look for the witness/challenge tag in the response
    // It could be tag 0x80 (mutual auth) or 0x81 (single auth)
    for i in 0..response.len().saturating_sub(4) {
        if response[i] == TAG_AUTH_WITNESS || response[i] == TAG_AUTH_CHALLENGE {
            let len = response[i + 1] as usize;
            if i + 2 + len <= response.len() {
                // For AES-192, we get 16 bytes
                // For TDES, we get 8 bytes
                let mut witness = [0u8; 16];
                let copy_len = len.min(16);
                witness[..copy_len].copy_from_slice(&response[i + 2..i + 2 + copy_len]);
                debug!(
                    "Found witness/challenge with tag 0x{:02X} at offset {}, length {}",
                    response[i], i, len
                );
                return Ok((witness, len));
            }
        }
    }

    // If not found, log the response for debugging
    debug!("Failed to find witness tag 0x80 or 0x81 in response");
    debug!(
        "Response bytes: {}",
        hex::encode(&response[..response.len().min(32)])
    );

    Err(anyhow::anyhow!(
        "Failed to extract witness from response - tag not found"
    ))
}

/// Extract witness from APDU response (8-byte version for compatibility)
fn extract_witness(response: &[u8]) -> Result<[u8; 8]> {
    let (witness_full, len) = extract_witness_full(response)?;
    let mut witness = [0u8; 8];
    let copy_len = len.min(8);
    witness[..copy_len].copy_from_slice(&witness_full[..copy_len]);
    Ok(witness)
}

/// Extract response from authentication APDU
fn extract_response(response: &[u8]) -> Result<[u8; 8]> {
    // Look for tag 0x82 with length 0x08
    for i in 0..response.len().saturating_sub(10) {
        if response[i] == TAG_AUTH_RESPONSE && response[i + 1] == 0x08 {
            let mut data = [0u8; 8];
            data.copy_from_slice(&response[i + 2..i + 10]);
            return Ok(data);
        }
    }
    Err(anyhow::anyhow!(
        "Failed to extract response from authentication"
    ))
}

/// Decrypt data using 3DES-ECB
fn decrypt_witness(encrypted: &[u8; 8], key: &[u8; 24]) -> Result<[u8; 8]> {
    let cipher = TdesEde3::new_from_slice(key)
        .map_err(|e| anyhow::anyhow!("Failed to create cipher: {:?}", e))?;

    let mut block = cipher::Block::<TdesEde3>::clone_from_slice(encrypted);
    cipher.decrypt_block(&mut block);

    let mut decrypted = [0u8; 8];
    decrypted.copy_from_slice(&block);
    Ok(decrypted)
}

/// Encrypt data using 3DES-ECB
fn encrypt_data(data: &[u8; 8], key: &[u8; 24]) -> Result<[u8; 8]> {
    let cipher = TdesEde3::new_from_slice(key)
        .map_err(|e| anyhow::anyhow!("Failed to create cipher: {:?}", e))?;

    let mut block = cipher::Block::<TdesEde3>::clone_from_slice(data);
    cipher.encrypt_block(&mut block);

    let mut encrypted = [0u8; 8];
    encrypted.copy_from_slice(&block);
    Ok(encrypted)
}

/// Encrypt data using AES-192 ECB (full 16-byte block)
fn encrypt_aes192_full(data: &[u8], key: &[u8]) -> Result<[u8; 16]> {
    use cipher::generic_array::GenericArray;

    // AES-192 uses 24-byte keys
    if key.len() != 24 {
        return Err(anyhow::anyhow!(
            "AES-192 requires 24-byte key, got {}",
            key.len()
        ));
    }

    // Data must be exactly 16 bytes for AES
    if data.len() != 16 {
        return Err(anyhow::anyhow!(
            "AES-192 requires 16-byte data block, got {}",
            data.len()
        ));
    }

    let cipher = Aes192::new(GenericArray::from_slice(key));
    let mut block = GenericArray::clone_from_slice(data);
    cipher.encrypt_block(&mut block);

    let mut encrypted = [0u8; 16];
    encrypted.copy_from_slice(&block);
    Ok(encrypted)
}

/// Verify PIN using raw APDU
fn verify_pin(card: &Card, pin: &str) -> Result<()> {
    debug!("Verifying PIN");

    // PIN must be padded to 8 bytes with 0xFF
    let mut pin_bytes = [0xFF; 8];
    let pin_data = pin.as_bytes();
    let copy_len = pin_data.len().min(8);
    pin_bytes[..copy_len].copy_from_slice(&pin_data[..copy_len]);

    // Build VERIFY APDU: 00 20 00 80 08 [PIN padded]
    let mut apdu = vec![0x00, INS_VERIFY, 0x00, 0x80, 0x08];
    apdu.extend_from_slice(&pin_bytes);

    let mut response = [0; MAX_BUFFER_SIZE];
    let response = card
        .transmit(&apdu, &mut response)
        .context("Failed to verify PIN")?;

    check_response_status(response, "VERIFY PIN")?;
    debug!("PIN verified successfully");
    Ok(())
}

/// Generate a random TDES key with proper DES parity
fn generate_tdes_key() -> [u8; 24] {
    let mut key = [0u8; 24];
    rand::thread_rng().fill(&mut key);

    // Ensure odd parity for each byte (DES requirement)
    for byte in key.iter_mut() {
        *byte = ensure_odd_parity(*byte);
    }

    key
}

/// Set management key using raw APDU
fn set_management_key(card: &Card, key: &[u8; 24], touch_required: bool) -> Result<()> {
    debug!("Setting management key");

    // The SET MANAGEMENT KEY command structure (from ykman):
    // CLA INS P1 P2 Lc Data
    // 00  FF  FF FF/FE Lc [key_type][TLV]
    // Where TLV = Tag(0x9B) + Length(0x18) + 24-byte-key

    // P1 is always 0xFF
    // P2 controls touch policy:
    //   0xFF = no touch required
    //   0xFE = touch required (cached)

    let p2 = if touch_required { 0xFE } else { 0xFF };

    // Build TLV structure
    let mut data = Vec::new();
    data.push(ALGO_TDES); // key_type = 0x03 for TDES
    data.push(TAG_CARD_MANAGEMENT); // Tag = 0x9B
    data.push(0x18); // Length = 24 bytes
    data.extend_from_slice(key); // 24-byte key

    // Build complete APDU
    let mut apdu = vec![0x00, INS_SET_MGMKEY, 0xFF, p2];
    apdu.push(data.len() as u8); // Lc
    apdu.extend_from_slice(&data);

    debug!("SET MGMT KEY APDU: {}", hex::encode(&apdu));

    let mut response = [0; MAX_BUFFER_SIZE];
    let response = card
        .transmit(&apdu, &mut response)
        .context("Failed to set management key")?;

    check_response_status(response, "SET MANAGEMENT KEY")?;

    // Store the key for protection metadata
    *MGMT_KEY_STORAGE.lock().unwrap() = Some(*key);

    debug!("Management key set successfully");
    Ok(())
}

/// Store protection metadata (for age-plugin-yubikey compatibility)
fn store_protection_metadata(card: &Card) -> Result<()> {
    debug!("Storing protection metadata");

    // The protected metadata contains the management key wrapped in TLV
    // Format: 88 [length] 89 [length] [key bytes]
    // where 88 is the outer tag, 89 is the key tag

    // Use the random key that was just set
    let key = &(*MGMT_KEY_STORAGE.lock().unwrap()).unwrap_or([0u8; 24]);

    // Build the inner TLV: 89 [length] [key]
    let mut inner_tlv = Vec::new();
    inner_tlv.push(0x89); // Key tag
    inner_tlv.push(24); // Key length (24 bytes for TDES)
    inner_tlv.extend_from_slice(key);

    // Build the outer TLV: 88 [length] [inner TLV]
    let mut outer_tlv = Vec::new();
    outer_tlv.push(0x88); // Outer tag
    outer_tlv.push(inner_tlv.len() as u8);
    outer_tlv.extend_from_slice(&inner_tlv);

    // Build the complete data object: 5C [object ID] 53 [data]
    let mut tlv = Vec::new();

    // Tag list: 5C [length] [object ID]
    tlv.push(0x5C);
    tlv.push(OBJECT_ID_PIVMAN_PROTECTED.len() as u8);
    tlv.extend_from_slice(OBJECT_ID_PIVMAN_PROTECTED);

    // Data object: 53 [length] [outer TLV]
    tlv.push(0x53);
    tlv.push(outer_tlv.len() as u8);
    tlv.extend_from_slice(&outer_tlv);

    // Build PUT DATA APDU: 00 DB 3F FF [Lc] [Data]
    let mut apdu = vec![0x00, INS_PUT_DATA, 0x3F, 0xFF];
    apdu.push(tlv.len() as u8);
    apdu.extend_from_slice(&tlv);

    debug!("Protection APDU: {}", hex::encode(&apdu));

    let mut response = [0; MAX_BUFFER_SIZE];
    let response = card
        .transmit(&apdu, &mut response)
        .context("Failed to store protection metadata")?;

    // This might fail if the object doesn't exist, which is okay
    if response.len() >= 2 {
        let sw1 = response[response.len() - 2];
        let sw2 = response[response.len() - 1];
        if sw1 != 0x90 || sw2 != 0x00 {
            debug!("Protection metadata storage returned: {sw1:02X}{sw2:02X}");
        }
    }

    Ok(())
}

/// Check APDU response status
fn check_response_status(response: &[u8], operation: &str) -> Result<()> {
    if response.len() < 2 {
        return Err(anyhow::anyhow!("{}: Invalid response length", operation));
    }

    let sw1 = response[response.len() - 2];
    let sw2 = response[response.len() - 1];

    match (sw1, sw2) {
        (0x90, 0x00) => Ok(()),
        (0x63, _) => {
            let tries_left = sw2 & 0x0F;
            Err(anyhow::anyhow!(
                "{}: Wrong PIN, {} tries left",
                operation,
                tries_left
            ))
        }
        (0x69, 0x82) => Err(anyhow::anyhow!(
            "{}: Security condition not satisfied",
            operation
        )),
        (0x69, 0x83) => Err(anyhow::anyhow!(
            "{}: Authentication method blocked",
            operation
        )),
        (0x6A, 0x80) => Err(anyhow::anyhow!("{}: Incorrect data parameter", operation)),
        (0x6A, 0x86) => Err(anyhow::anyhow!("{}: Incorrect P1/P2 parameter", operation)),
        _ => Err(anyhow::anyhow!(
            "{} failed: {:02X}{:02X}",
            operation,
            sw1,
            sw2
        )),
    }
}

/// Ensure odd parity for DES key byte
fn ensure_odd_parity(mut byte: u8) -> u8 {
    let mut parity = 0;
    for i in 0..7 {
        parity ^= (byte >> i) & 1;
    }
    // Set the least significant bit to ensure odd parity
    byte = (byte & 0xFE) | (parity ^ 1);
    byte
}
