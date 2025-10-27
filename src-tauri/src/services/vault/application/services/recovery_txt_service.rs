//! RECOVERY.txt Generation Service
//!
//! Generates human-readable recovery instructions for encrypted vault bundles.

use crate::services::vault::infrastructure::persistence::metadata::{RecipientType, VaultMetadata};

/// Service for generating RECOVERY.txt files
#[derive(Debug)]
pub struct RecoveryTxtService;

impl RecoveryTxtService {
    pub fn new() -> Self {
        Self
    }

    /// Generate RECOVERY.txt content from vault metadata
    pub fn generate(&self, metadata: &VaultMetadata) -> String {
        let mut content = String::new();

        // Header
        content.push_str("═══════════════════════════════════════════════\n");
        content.push_str("BARQLY VAULT RECOVERY GUIDE\n");
        content.push_str("═══════════════════════════════════════════════\n\n");

        // Vault info
        content.push_str(&format!("Vault Name: {}\n", metadata.label()));
        content.push_str(&format!(
            "Created: {}\n",
            metadata.created_at().format("%B %d, %Y")
        ));
        content.push_str(&format!(
            "Encrypted File: {}.age\n\n",
            metadata.vault.sanitized_name
        ));

        // Required keys section
        content.push_str("───────────────────────────────────────────────\n");
        content.push_str("RECOVERY KEYS (Need ANY ONE)\n");
        content.push_str("───────────────────────────────────────────────\n\n");

        // Count YubiKeys and Passphrases
        let yubikey_recipients: Vec<_> = metadata
            .recipients()
            .iter()
            .filter(|r| matches!(r.recipient_type, RecipientType::YubiKey { .. }))
            .collect();

        let passphrase_recipients: Vec<_> = metadata
            .recipients()
            .iter()
            .filter(|r| matches!(r.recipient_type, RecipientType::Passphrase { .. }))
            .collect();

        // List YubiKeys
        if !yubikey_recipients.is_empty() {
            content.push_str(&format!("✓ {} YubiKey(s):\n", yubikey_recipients.len()));
            for recipient in yubikey_recipients {
                if let RecipientType::YubiKey { serial, .. } = &recipient.recipient_type {
                    // Show only last 4 digits of serial
                    let last_4 = if serial.len() >= 4 {
                        &serial[serial.len() - 4..]
                    } else {
                        serial
                    };
                    content.push_str(&format!("  - YubiKey ending in ...{}\n", last_4));
                    content.push_str(&format!("    Label: {}\n\n", recipient.label));
                }
            }
        }

        // List Passphrase keys
        if !passphrase_recipients.is_empty() {
            content.push_str(&format!(
                "✓ {} Passphrase Key(s):\n",
                passphrase_recipients.len()
            ));
            for recipient in passphrase_recipients {
                if let RecipientType::Passphrase { key_filename } = &recipient.recipient_type {
                    content.push_str(&format!("  - Label: {}\n", recipient.label));
                    content.push_str(&format!("    Key file: {}\n\n", key_filename));
                }
            }
        }

        // Recovery steps
        content.push_str("───────────────────────────────────────────────\n");
        content.push_str("RECOVERY STEPS\n");
        content.push_str("───────────────────────────────────────────────\n\n");

        content.push_str("1. Install Barqly Vault\n");
        content.push_str("   Download: https://barqly.com/vault\n\n");

        content.push_str("2. Follow the recovery guide\n");
        content.push_str("   Visit: https://barqly.com/recovery\n\n");

        content.push_str(&format!(
            "3. Your files will be recovered to:\n   ~/Documents/Barqly-Recovery/{}/\n\n",
            metadata.vault.sanitized_name
        ));

        // Contents section (file count and size only - no filenames for privacy)
        content.push_str("───────────────────────────────────────────────\n");
        content.push_str(&format!(
            "VAULT CONTENTS: {} file{}, {} total\n",
            metadata.file_count(),
            if metadata.file_count() == 1 { "" } else { "s" },
            Self::format_size(metadata.total_size())
        ));
        content.push_str("───────────────────────────────────────────────\n");

        content
    }

    /// Format file size in human-readable format
    fn format_size(bytes: u64) -> String {
        const UNITS: &[&str] = &["B", "KB", "MB", "GB"];
        const THRESHOLD: f64 = 1024.0;

        if bytes == 0 {
            return "0 B".to_string();
        }

        let mut size = bytes as f64;
        let mut unit_index = 0;

        while size >= THRESHOLD && unit_index < UNITS.len() - 1 {
            size /= THRESHOLD;
            unit_index += 1;
        }

        if unit_index == 0 {
            format!("{} {}", bytes, UNITS[unit_index])
        } else {
            format!("{:.1} {}", size, UNITS[unit_index])
        }
    }
}

impl Default for RecoveryTxtService {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    use crate::services::shared::infrastructure::DeviceInfo;
    use crate::services::vault::infrastructure::persistence::metadata::{
        RecipientInfo, VaultFileEntry,
    };

    #[test]
    fn test_generate_recovery_txt_passphrase_only() {
        let device_info = DeviceInfo {
            machine_id: "test-123".to_string(),
            machine_label: "test-laptop".to_string(),
            created_at: chrono::Utc::now(),
            app_version: "2.0.0".to_string(),
        };

        let recipient = RecipientInfo::new_passphrase(
            "my-backup-key".to_string(),
            "age1test123".to_string(),
            "my-backup-key".to_string(),
            "my-backup-key.agekey.enc".to_string(),
        );

        let metadata = VaultMetadata::new(
            "vault-001".to_string(),
            "Test Vault".to_string(),
            None,
            "Test-Vault".to_string(),
            &device_info,
            None, // source_root
            vec![recipient],
            vec![
                VaultFileEntry {
                    path: "document.pdf".to_string(),
                    size: 1024,
                    sha256: "abc123".to_string(),
                },
                VaultFileEntry {
                    path: "photo.jpg".to_string(),
                    size: 2048,
                    sha256: "def456".to_string(),
                },
            ],
            2,
            3072,
        );

        let service = RecoveryTxtService::new();
        let recovery_txt = service.generate(&metadata);

        assert!(recovery_txt.contains("BARQLY VAULT RECOVERY GUIDE"));
        assert!(recovery_txt.contains("Test Vault"));
        assert!(recovery_txt.contains("Passphrase Key"));
        assert!(recovery_txt.contains("my-backup-key.agekey.enc"));
        assert!(recovery_txt.contains("2 files"));
        assert!(recovery_txt.contains("3.0 KB")); // Total size
        assert!(!recovery_txt.contains("document.pdf")); // Filenames should NOT be present
        assert!(!recovery_txt.contains("photo.jpg")); // Filenames should NOT be present
        assert!(!recovery_txt.contains("Location: Check")); // Location hint should NOT be present
        assert!(!recovery_txt.contains("Need help?")); // Help section should NOT be present
        assert!(recovery_txt.contains("https://barqly.com/recovery"));
    }

    #[test]
    fn test_generate_recovery_txt_yubikey() {
        let device_info = DeviceInfo {
            machine_id: "test-456".to_string(),
            machine_label: "production".to_string(),
            created_at: chrono::Utc::now(),
            app_version: "2.0.0".to_string(),
        };

        let recipient = RecipientInfo::new_yubikey(
            "keyref_313104201".to_string(),
            "age1yubikey123".to_string(),
            "YubiKey-31310420".to_string(),
            "31310420".to_string(),
            1,
            0x82,
            "YubiKey 5 Series".to_string(),
            "AGE-PLUGIN-YUBIKEY-TEST".to_string(),
            Some("5.7.1".to_string()),
        );

        let metadata = VaultMetadata::new(
            "vault-002".to_string(),
            "Bitcoin Wallet".to_string(),
            None,
            "Bitcoin-Wallet".to_string(),
            &device_info,
            Some("wallet".to_string()), // source_root
            vec![recipient],
            vec![],
            0,
            0,
        );

        let service = RecoveryTxtService::new();
        let recovery_txt = service.generate(&metadata);

        assert!(recovery_txt.contains("YubiKey ending in ...0420"));
        assert!(!recovery_txt.contains("Firmware: 5.7.1")); // Firmware should NOT be present
        assert!(recovery_txt.contains("https://barqly.com/recovery"));
    }

    #[test]
    fn test_format_size() {
        assert_eq!(RecoveryTxtService::format_size(0), "0 B");
        assert_eq!(RecoveryTxtService::format_size(512), "512 B");
        assert_eq!(RecoveryTxtService::format_size(1024), "1.0 KB");
        assert_eq!(RecoveryTxtService::format_size(1536), "1.5 KB");
        assert_eq!(RecoveryTxtService::format_size(1048576), "1.0 MB");
        assert_eq!(RecoveryTxtService::format_size(10485760), "10.0 MB");
    }

    #[test]
    fn test_generate_hybrid_mode() {
        let device_info = DeviceInfo {
            machine_id: "test-789".to_string(),
            machine_label: "hybrid-machine".to_string(),
            created_at: chrono::Utc::now(),
            app_version: "2.0.0".to_string(),
        };

        let passphrase = RecipientInfo::new_passphrase(
            "backup-key".to_string(),
            "age1pass".to_string(),
            "backup-key".to_string(),
            "backup-key.agekey.enc".to_string(),
        );

        let yubikey = RecipientInfo::new_yubikey(
            "keyref_123451".to_string(),
            "age1yubikey".to_string(),
            "YubiKey-12345".to_string(),
            "12345".to_string(),
            1,
            0x82,
            "YubiKey 5".to_string(),
            "AGE-PLUGIN-TEST".to_string(),
            None,
        );

        let metadata = VaultMetadata::new(
            "vault-003".to_string(),
            "Hybrid Vault".to_string(),
            None,
            "Hybrid-Vault".to_string(),
            &device_info,
            None, // source_root
            vec![passphrase, yubikey],
            vec![],
            0,
            0,
        );

        let service = RecoveryTxtService::new();
        let recovery_txt = service.generate(&metadata);

        assert!(recovery_txt.contains("1 YubiKey"));
        assert!(recovery_txt.contains("1 Passphrase Key"));
        assert!(recovery_txt.contains("YubiKey ending in")); // Check for partial serial
        assert!(recovery_txt.contains("backup-key.agekey.enc"));
        assert!(recovery_txt.contains("https://barqly.com/recovery"));
    }
}
