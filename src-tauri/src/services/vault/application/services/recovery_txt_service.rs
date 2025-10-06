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
        content.push_str("BARQLY VAULT RECOVERY INSTRUCTIONS\n");
        content.push_str("═══════════════════════════════════════════════\n\n");

        // Vault info
        content.push_str(&format!("Vault: {}\n", metadata.label));
        content.push_str(&format!(
            "Encrypted: {} UTC\n",
            metadata.last_encrypted_at.format("%Y-%m-%d %H:%M:%S")
        ));
        content.push_str(&format!("Version: {}\n", metadata.manifest_version));
        content.push_str(&format!(
            "Machine: {} ({})\n\n",
            metadata.last_encrypted_by.machine_label, metadata.last_encrypted_by.machine_id
        ));

        // Required keys section
        content.push_str("───────────────────────────────────────────────\n");
        content.push_str("REQUIRED: You need at least ONE of these keys\n");
        content.push_str("───────────────────────────────────────────────\n\n");

        // List all recipients
        for recipient in &metadata.recipients {
            match &recipient.recipient_type {
                RecipientType::YubiKey {
                    serial,
                    slot,
                    firmware_version,
                    ..
                } => {
                    content.push_str(&format!("✓ YubiKey Serial: {} (Slot {})\n", serial, slot));
                    content.push_str(&format!("  Label: {}\n", recipient.label));
                    if let Some(fw) = firmware_version {
                        content.push_str(&format!("  Firmware: {}\n", fw));
                    }
                    content.push('\n');
                }
                RecipientType::Passphrase { key_filename } => {
                    content.push_str("✓ Passphrase-Protected Key\n");
                    content.push_str(&format!("  Label: {}\n", recipient.label));
                    content.push_str(&format!(
                        "  File: {} (included in this bundle)\n\n",
                        key_filename
                    ));
                }
            }
        }

        // Recovery steps
        content.push_str("───────────────────────────────────────────────\n");
        content.push_str("RECOVERY STEPS\n");
        content.push_str("───────────────────────────────────────────────\n\n");

        content.push_str("1. Install Barqly Vault\n");
        content.push_str("   Download: https://barqly.com/vault\n\n");

        // Check if we have YubiKey recipients
        let has_yubikey = metadata
            .recipients
            .iter()
            .any(|r| matches!(r.recipient_type, RecipientType::YubiKey { .. }));

        if has_yubikey {
            content.push_str("2. OPTION A - YubiKey Recovery:\n");
            if let Some(yubikey_recipient) = metadata
                .recipients
                .iter()
                .find(|r| matches!(r.recipient_type, RecipientType::YubiKey { .. }))
                && let RecipientType::YubiKey { serial, .. } = &yubikey_recipient.recipient_type
            {
                content.push_str(&format!("   - Connect YubiKey (Serial: {})\n", serial));
            }
            content.push_str("   - Open Barqly Vault\n");
            content.push_str("   - Import this .age file\n");
            content.push_str("   - Enter YubiKey PIN when prompted\n\n");
        }

        // Check if we have passphrase recipients
        let has_passphrase = metadata
            .recipients
            .iter()
            .any(|r| matches!(r.recipient_type, RecipientType::Passphrase { .. }));

        if has_passphrase {
            let option_label = if has_yubikey { "OPTION B" } else { "2" };
            content.push_str(&format!("{}. Passphrase Recovery:\n", option_label));
            content.push_str("   - Open Barqly Vault\n");

            if let Some(passphrase_recipient) = metadata
                .recipients
                .iter()
                .find(|r| matches!(r.recipient_type, RecipientType::Passphrase { .. }))
                && let RecipientType::Passphrase { key_filename } =
                    &passphrase_recipient.recipient_type
            {
                content.push_str(&format!("   - Import {} from this bundle\n", key_filename));
            }
            content.push_str("   - Enter passphrase\n");
            content.push_str("   - Import this .age file\n");
            content.push_str("   - Decrypt\n\n");
        }

        content.push_str("3. Your files will appear in ~/Documents/Barqly-Recovery/\n\n");

        // Contents section
        content.push_str("═══════════════════════════════════════════════\n");
        content.push_str(&format!(
            "CONTENTS ({} files, {} total)\n",
            metadata.file_count,
            Self::format_size(metadata.total_size)
        ));
        content.push_str("═══════════════════════════════════════════════\n\n");

        // List files (limit to first 20 for readability)
        let file_limit = 20;
        for (i, file_entry) in metadata.files.iter().take(file_limit).enumerate() {
            content.push_str(&format!(
                "- {} ({})\n",
                file_entry.path,
                Self::format_size(file_entry.size)
            ));
            if i == file_limit - 1 && metadata.files.len() > file_limit {
                content.push_str(&format!(
                    "... and {} more files\n",
                    metadata.files.len() - file_limit
                ));
            }
        }

        content.push_str("\nSupport: support@barqly.com\n");

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
    use crate::services::key_management::yubikey::domain::models::ProtectionMode;
    use crate::services::shared::infrastructure::DeviceInfo;
    use crate::services::vault::infrastructure::persistence::metadata::{
        RecipientInfo, SelectionType, VaultFileEntry,
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
            "age1test123".to_string(),
            "my-backup-key".to_string(),
            "my-backup-key.agekey.enc".to_string(),
        );

        let metadata = VaultMetadata::new_r2(
            "vault-001".to_string(),
            "Test Vault".to_string(),
            "Test-Vault".to_string(),
            &device_info,
            SelectionType::Files,
            None,
            ProtectionMode::PassphraseOnly,
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
            "checksum".to_string(),
        );

        let service = RecoveryTxtService::new();
        let recovery_txt = service.generate(&metadata);

        assert!(recovery_txt.contains("BARQLY VAULT RECOVERY INSTRUCTIONS"));
        assert!(recovery_txt.contains("Test Vault"));
        assert!(recovery_txt.contains("Passphrase-Protected Key"));
        assert!(recovery_txt.contains("my-backup-key.agekey.enc"));
        assert!(recovery_txt.contains("2 files"));
        assert!(recovery_txt.contains("document.pdf"));
        assert!(recovery_txt.contains("photo.jpg"));
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
            "age1yubikey123".to_string(),
            "YubiKey-31310420".to_string(),
            "31310420".to_string(),
            1,
            0x82,
            "YubiKey 5 Series".to_string(),
            "AGE-PLUGIN-YUBIKEY-TEST".to_string(),
            Some("5.7.1".to_string()),
        );

        let metadata = VaultMetadata::new_r2(
            "vault-002".to_string(),
            "Bitcoin Wallet".to_string(),
            "Bitcoin-Wallet".to_string(),
            &device_info,
            SelectionType::Folder,
            Some("wallet".to_string()),
            ProtectionMode::YubiKeyOnly {
                serial: "31310420".to_string(),
            },
            vec![recipient],
            vec![],
            0,
            0,
            "checksum".to_string(),
        );

        let service = RecoveryTxtService::new();
        let recovery_txt = service.generate(&metadata);

        assert!(recovery_txt.contains("YubiKey Serial: 31310420"));
        assert!(recovery_txt.contains("Firmware: 5.7.1"));
        assert!(recovery_txt.contains("OPTION A - YubiKey Recovery"));
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
            "age1pass".to_string(),
            "backup-key".to_string(),
            "backup-key.agekey.enc".to_string(),
        );

        let yubikey = RecipientInfo::new_yubikey(
            "age1yubikey".to_string(),
            "YubiKey-12345".to_string(),
            "12345".to_string(),
            1,
            0x82,
            "YubiKey 5".to_string(),
            "AGE-PLUGIN-TEST".to_string(),
            None,
        );

        let metadata = VaultMetadata::new_r2(
            "vault-003".to_string(),
            "Hybrid Vault".to_string(),
            "Hybrid-Vault".to_string(),
            &device_info,
            SelectionType::Files,
            None,
            ProtectionMode::Hybrid {
                yubikey_serial: "12345".to_string(),
            },
            vec![passphrase, yubikey],
            vec![],
            0,
            0,
            "checksum".to_string(),
        );

        let service = RecoveryTxtService::new();
        let recovery_txt = service.generate(&metadata);

        assert!(recovery_txt.contains("OPTION A - YubiKey"));
        assert!(recovery_txt.contains("OPTION B"));
        assert!(recovery_txt.contains("Passphrase Recovery"));
        assert!(recovery_txt.contains("backup-key.agekey.enc"));
    }
}
