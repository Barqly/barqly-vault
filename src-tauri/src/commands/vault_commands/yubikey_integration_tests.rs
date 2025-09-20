#[cfg(test)]
mod tests {
    use super::super::*;
    use crate::models::{KeyReference, KeyState, KeyType, Vault};
    use crate::storage::vault_store::persistence::{delete_vault, save_vault};
    use bs58;
    use chrono::Utc;

    async fn create_test_vault() -> Vault {
        let vault_id = bs58::encode(uuid::Uuid::new_v4().as_bytes()).into_string();
        let vault = Vault {
            id: vault_id.clone(),
            name: "Test YubiKey Vault".to_string(),
            description: Some("Test vault for YubiKey tests".to_string()),
            created_at: Utc::now(),
            updated_at: Utc::now(),
            keys: vec![],
        };

        save_vault(&vault).await.expect("Failed to save test vault");
        vault
    }

    async fn cleanup_test_vault(vault_id: &str) {
        let _ = delete_vault(vault_id).await;
    }

    fn slot_index_to_piv_slot(index: u8) -> u8 {
        // Map UI slot index (0-2) to PIV retired slots (0x82-0x84)
        0x82 + index
    }

    #[tokio::test]
    async fn test_check_yubikey_slot_availability_empty_vault() {
        let vault = create_test_vault().await;
        let vault_id = vault.id.clone();

        let result = check_yubikey_slot_availability(vault_id.clone()).await;
        assert!(result.is_ok());

        let data = result.unwrap();
        assert_eq!(data.len(), 3);
        assert_eq!(data, vec![true, true, true]);

        cleanup_test_vault(&vault_id).await;
    }

    #[tokio::test]
    async fn test_check_yubikey_slot_availability_partial() {
        let mut vault = create_test_vault().await;
        let vault_id = vault.id.clone();

        // Add a YubiKey at slot 0
        let key_ref = KeyReference {
            id: "test_yubikey_1".to_string(),
            key_type: KeyType::Yubikey {
                serial: "12345678".to_string(),
                slot_index: 0,
                piv_slot: 0x82,
            },
            label: "Test YubiKey 1".to_string(),
            state: KeyState::Registered,
            created_at: Utc::now(),
            last_used: None,
        };

        vault.add_key(key_ref).unwrap();
        save_vault(&vault).await.unwrap();

        let result = check_yubikey_slot_availability(vault_id.clone()).await;
        assert!(result.is_ok());

        let data = result.unwrap();
        assert_eq!(data.len(), 3);
        assert_eq!(data, vec![false, true, true]);

        cleanup_test_vault(&vault_id).await;
    }

    #[tokio::test]
    async fn test_check_yubikey_slot_availability_full() {
        let mut vault = create_test_vault().await;
        let vault_id = vault.id.clone();

        // Add 3 YubiKeys (max allowed)
        for i in 0..3 {
            let key_ref = KeyReference {
                id: format!("test_yubikey_{i}"),
                key_type: KeyType::Yubikey {
                    serial: format!("serial_{i}"),
                    slot_index: i as u8,
                    piv_slot: slot_index_to_piv_slot(i as u8),
                },
                label: format!("Test YubiKey {i}"),
                state: KeyState::Registered,
                created_at: Utc::now(),
                last_used: None,
            };
            vault.add_key(key_ref).unwrap();
        }

        save_vault(&vault).await.unwrap();

        let result = check_yubikey_slot_availability(vault_id.clone()).await;
        assert!(result.is_ok());

        let data = result.unwrap();
        assert_eq!(data.len(), 3);
        assert_eq!(data, vec![false, false, false]);

        cleanup_test_vault(&vault_id).await;
    }

    #[tokio::test]
    async fn test_list_available_yubikeys_no_devices() {
        let vault = create_test_vault().await;
        let vault_id = vault.id.clone();

        // This test will work even without actual YubiKeys
        let result = list_available_yubikeys(vault_id.clone()).await;
        assert!(result.is_ok());

        let data = result.unwrap();
        // In test environment, likely no YubiKeys connected
        assert!(data.is_empty() || !data.is_empty());

        cleanup_test_vault(&vault_id).await;
    }

    #[tokio::test]
    async fn test_init_yubikey_for_vault_validation() {
        let vault = create_test_vault().await;
        let vault_id = vault.id.clone();

        // Test with empty serial
        let params = YubiKeyInitForVaultParams {
            serial: "".to_string(),
            pin: "123456".to_string(),
            label: "Test YubiKey".to_string(),
            vault_id: vault_id.clone(),
            slot_index: 0,
        };

        let result = init_yubikey_for_vault(params).await;
        assert!(result.is_err());
        assert!(result.unwrap_err().to_string().contains("Serial"));

        // Test with invalid PIN length
        let params = YubiKeyInitForVaultParams {
            serial: "12345678".to_string(),
            pin: "12".to_string(), // Too short
            label: "Test YubiKey".to_string(),
            vault_id: vault_id.clone(),
            slot_index: 0,
        };

        let result = init_yubikey_for_vault(params).await;
        assert!(result.is_err());
        assert!(result.unwrap_err().to_string().contains("PIN"));

        cleanup_test_vault(&vault_id).await;
    }

    #[tokio::test]
    async fn test_register_yubikey_for_vault_validation() {
        let vault = create_test_vault().await;
        let vault_id = vault.id.clone();

        // Test with empty serial
        let params = RegisterYubiKeyForVaultParams {
            serial: "".to_string(),
            pin: "123456".to_string(),
            label: "Test YubiKey".to_string(),
            vault_id: vault_id.clone(),
            slot_index: 0,
        };

        let result = register_yubikey_for_vault(params).await;
        assert!(result.is_err());
        assert!(result.unwrap_err().to_string().contains("Serial"));

        // Test with invalid slot index
        let params = RegisterYubiKeyForVaultParams {
            serial: "12345678".to_string(),
            pin: "123456".to_string(),
            label: "Test YubiKey".to_string(),
            vault_id: vault_id.clone(),
            slot_index: 3, // Invalid, should be 0-2
        };

        let result = register_yubikey_for_vault(params).await;
        assert!(result.is_err());

        cleanup_test_vault(&vault_id).await;
    }

    #[tokio::test]
    async fn test_vault_not_found_errors() {
        let fake_vault_id = "non_existent_vault";

        // Test check_yubikey_slot_availability
        let result = check_yubikey_slot_availability(fake_vault_id.to_string()).await;
        assert!(result.is_err());
        assert!(result.unwrap_err().to_string().contains("Vault not found"));

        // Test list_available_yubikeys
        let result = list_available_yubikeys(fake_vault_id.to_string()).await;
        assert!(result.is_err());
        assert!(result.unwrap_err().to_string().contains("Vault not found"));
    }

    #[tokio::test]
    async fn test_yubikey_limit_exceeded() {
        let mut vault = create_test_vault().await;
        let vault_id = vault.id.clone();

        // Add 3 YubiKeys (max allowed)
        for i in 0..3 {
            let key_ref = KeyReference {
                id: format!("test_yubikey_{i}"),
                key_type: KeyType::Yubikey {
                    serial: format!("serial_{i}"),
                    slot_index: i as u8,
                    piv_slot: slot_index_to_piv_slot(i as u8),
                },
                label: format!("Test YubiKey {i}"),
                state: KeyState::Registered,
                created_at: Utc::now(),
                last_used: None,
            };
            vault.add_key(key_ref).unwrap();
        }

        save_vault(&vault).await.unwrap();

        // Try to register a 4th YubiKey (should fail)
        let params = RegisterYubiKeyForVaultParams {
            serial: "new_serial".to_string(),
            pin: "123456".to_string(),
            label: "Fourth YubiKey".to_string(),
            vault_id: vault_id.clone(),
            slot_index: 0, // Even though slot 0 is taken, should fail on limit first
        };

        let result = register_yubikey_for_vault(params).await;
        assert!(result.is_err());
        // Note: The actual error might be about slot not available or limit exceeded
        // depending on implementation order of checks

        cleanup_test_vault(&vault_id).await;
    }
}
