#[cfg(test)]
mod tests {
    use super::super::*;
    use crate::models::{KeyState, KeyType, Vault};
    use crate::storage::vault_store::persistence::{delete_vault, save_vault};
    use bs58;
    use chrono::Utc;

    async fn create_test_vault() -> Vault {
        let vault_id = bs58::encode(uuid::Uuid::new_v4().as_bytes()).into_string();
        let vault = Vault {
            id: vault_id.clone(),
            name: "Test Vault".to_string(),
            description: Some("Test vault for unit tests".to_string()),
            created_at: Utc::now(),
            updated_at: Utc::now(),
            keys: vec![],
            is_current: true,
        };

        save_vault(&vault).await.expect("Failed to save test vault");
        vault
    }

    async fn cleanup_test_vault(vault_id: &str) {
        let _ = delete_vault(vault_id).await;
    }

    #[tokio::test]
    async fn test_add_passphrase_key_success() {
        let vault = create_test_vault().await;
        let vault_id = vault.id.clone();

        let request = AddPassphraseKeyRequest {
            vault_id: vault_id.clone(),
            label: "Test Passphrase".to_string(),
            passphrase: "MySecurePassphrase123!".to_string(),
        };

        let result = add_passphrase_key_to_vault(request).await;
        assert!(result.is_ok());

        let data = result.unwrap();
        assert_eq!(data.key_reference.label, "Test Passphrase");
        assert!(matches!(
            data.key_reference.key_type,
            KeyType::Passphrase { .. }
        ));
        assert_eq!(data.key_reference.state, KeyState::Active);
        assert!(!data.public_key.is_empty());

        cleanup_test_vault(&vault_id).await;
    }

    #[tokio::test]
    async fn test_add_passphrase_key_duplicate_fails() {
        let vault = create_test_vault().await;
        let vault_id = vault.id.clone();

        // Add first passphrase
        let request1 = AddPassphraseKeyRequest {
            vault_id: vault_id.clone(),
            label: "First Passphrase".to_string(),
            passphrase: "FirstPassphrase123!".to_string(),
        };
        let result1 = add_passphrase_key_to_vault(request1).await;
        assert!(result1.is_ok());

        // Try to add second passphrase
        let request2 = AddPassphraseKeyRequest {
            vault_id: vault_id.clone(),
            label: "Second Passphrase".to_string(),
            passphrase: "SecondPassphrase456!".to_string(),
        };
        let result2 = add_passphrase_key_to_vault(request2).await;
        assert!(result2.is_err());

        let error = result2.unwrap_err();
        assert!(error.to_string().contains("already has a passphrase"));

        cleanup_test_vault(&vault_id).await;
    }

    #[tokio::test]
    async fn test_add_passphrase_key_vault_not_found() {
        let request = AddPassphraseKeyRequest {
            vault_id: "non_existent_vault".to_string(),
            label: "Test Passphrase".to_string(),
            passphrase: "MySecurePassphrase123!".to_string(),
        };

        let result = add_passphrase_key_to_vault(request).await;
        assert!(result.is_err());
    }

    #[tokio::test]
    async fn test_add_passphrase_key_weak_passphrase() {
        let vault = create_test_vault().await;
        let vault_id = vault.id.clone();

        let request = AddPassphraseKeyRequest {
            vault_id: vault_id.clone(),
            label: "Weak Passphrase".to_string(),
            passphrase: "weak".to_string(),
        };

        let result = add_passphrase_key_to_vault(request).await;
        assert!(result.is_err());

        let error = result.unwrap_err();
        assert!(error.to_string().contains("weak"));

        cleanup_test_vault(&vault_id).await;
    }

    #[tokio::test]
    async fn test_add_passphrase_key_empty_label() {
        let vault = create_test_vault().await;
        let vault_id = vault.id.clone();

        let request = AddPassphraseKeyRequest {
            vault_id: vault_id.clone(),
            label: "".to_string(),
            passphrase: "MySecurePassphrase123!".to_string(),
        };

        let result = add_passphrase_key_to_vault(request).await;
        assert!(result.is_err());

        let error = result.unwrap_err();
        assert!(error.to_string().contains("Label"));

        cleanup_test_vault(&vault_id).await;
    }

    #[tokio::test]
    async fn test_add_passphrase_key_long_label() {
        let vault = create_test_vault().await;
        let vault_id = vault.id.clone();

        let long_label = "a".repeat(300);
        let request = AddPassphraseKeyRequest {
            vault_id: vault_id.clone(),
            label: long_label,
            passphrase: "MySecurePassphrase123!".to_string(),
        };

        let result = add_passphrase_key_to_vault(request).await;
        assert!(result.is_err());

        let error = result.unwrap_err();
        assert!(error.to_string().contains("255"));

        cleanup_test_vault(&vault_id).await;
    }

    #[tokio::test]
    async fn test_add_passphrase_key_updates_vault() {
        let vault = create_test_vault().await;
        let vault_id = vault.id.clone();
        let initial_update_time = vault.updated_at;

        // Sleep briefly to ensure time difference
        tokio::time::sleep(tokio::time::Duration::from_millis(10)).await;

        let request = AddPassphraseKeyRequest {
            vault_id: vault_id.clone(),
            label: "Test Passphrase".to_string(),
            passphrase: "MySecurePassphrase123!".to_string(),
        };

        let result = add_passphrase_key_to_vault(request).await;
        assert!(result.is_ok());

        // Verify vault was updated
        let updated_vault = crate::storage::vault_store::persistence::get_vault(&vault_id)
            .await
            .expect("Failed to get vault");

        assert_eq!(updated_vault.keys.len(), 1);
        assert!(updated_vault.updated_at > initial_update_time);

        cleanup_test_vault(&vault_id).await;
    }
}
