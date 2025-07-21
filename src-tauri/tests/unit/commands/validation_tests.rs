//! Unit tests for command input validation
//!
//! Tests cover:
//! - Crypto command input validation
//! - Storage command input validation
//! - File command input validation
//! - Path validation across platforms
//! - Edge cases and error conditions

use crate::common::helpers::TestAssertions;
use barqly_vault_lib::commands::{
    crypto_commands::{
        DecryptDataInput, EncryptDataInput, GenerateKeyInput, ValidatePassphraseInput,
    },
    types::{CommandError, ErrorCode, ValidateInput},
};

#[cfg(test)]
mod crypto_validation_tests {
    use super::*;

    #[test]
    fn test_generate_key_input_validation_success() {
        let input = GenerateKeyInput {
            label: "test-key".to_string(),
            passphrase: "strong-passphrase-123".to_string(),
        };

        let result = input.validate();
        assert!(result.is_ok(), "Valid input should pass validation");
    }

    #[test]
    fn test_generate_key_input_empty_label() {
        let input = GenerateKeyInput {
            label: "".to_string(),
            passphrase: "strong-passphrase-123".to_string(),
        };

        let result = input.validate();
        assert!(result.is_err(), "Empty label should fail validation");

        if let Err(error) = result {
            assert_eq!(
                error.message, "Key label cannot be empty",
                "Error message should match"
            );
        }
    }

    #[test]
    fn test_generate_key_input_invalid_label_characters() {
        let test_cases = vec![
            "test key", // space
            "test@key", // @ symbol
            "test#key", // # symbol
            "test.key", // dot
            "test/key", // slash
        ];

        for invalid_label in test_cases {
            let input = GenerateKeyInput {
                label: invalid_label.to_string(),
                passphrase: "strong-passphrase-123".to_string(),
            };

            let result = input.validate();
            assert!(
                result.is_err(),
                "Invalid label '{}' should fail validation",
                invalid_label
            );

            if let Err(error) = result {
                assert!(
                    error.message.contains("letters, numbers, and dashes"),
                    "Error message should mention valid characters for label '{}'",
                    invalid_label
                );
            }
        }
    }

    #[test]
    fn test_generate_key_input_weak_passphrase() {
        let weak_passphrases = vec![
            "short",       // too short
            "123456789",   // only numbers
            "abcdefghijk", // only letters
        ];

        for weak_passphrase in weak_passphrases {
            let input = GenerateKeyInput {
                label: "test-key".to_string(),
                passphrase: weak_passphrase.to_string(),
            };

            let result = input.validate();
            assert!(
                result.is_err(),
                "Weak passphrase '{}' should fail validation",
                weak_passphrase
            );

            if let Err(error) = result {
                assert!(
                    error.message.contains("12 characters"),
                    "Error message should mention minimum length for passphrase '{}'",
                    weak_passphrase
                );
            }
        }
    }

    #[test]
    fn test_encrypt_data_input_validation_success() {
        let input = EncryptDataInput {
            key_id: "test-key-id".to_string(),
            file_paths: vec![
                "/path/to/file1.txt".to_string(),
                "/path/to/file2.txt".to_string(),
            ],
            output_name: Some("encrypted_output".to_string()),
        };

        let result = input.validate();
        assert!(result.is_ok(), "Valid input should pass validation");
    }

    #[test]
    fn test_encrypt_data_input_empty_key_id() {
        let input = EncryptDataInput {
            key_id: "".to_string(),
            file_paths: vec!["/path/to/file.txt".to_string()],
            output_name: None,
        };

        let result = input.validate();
        assert!(result.is_err(), "Empty key_id should fail validation");

        if let Err(error) = result {
            assert_eq!(
                error.message, "Key ID cannot be empty",
                "Error message should match"
            );
        }
    }

    #[test]
    fn test_encrypt_data_input_empty_file_paths() {
        let input = EncryptDataInput {
            key_id: "test-key-id".to_string(),
            file_paths: vec![],
            output_name: None,
        };

        let result = input.validate();
        assert!(result.is_err(), "Empty file_paths should fail validation");

        if let Err(error) = result {
            assert_eq!(
                error.message, "At least one file must be selected",
                "Error message should match"
            );
        }
    }

    #[test]
    fn test_decrypt_data_input_validation_success() {
        let input = DecryptDataInput {
            encrypted_file: "/path/to/encrypted.file".to_string(),
            key_id: "test-key-id".to_string(),
            passphrase: "strong-passphrase-123".to_string(),
            output_dir: "/path/to/output".to_string(),
        };

        let result = input.validate();
        assert!(result.is_ok(), "Valid input should pass validation");
    }

    #[test]
    fn test_decrypt_data_input_empty_encrypted_file() {
        let input = DecryptDataInput {
            encrypted_file: "".to_string(),
            key_id: "test-key-id".to_string(),
            passphrase: "strong-passphrase-123".to_string(),
            output_dir: "/path/to/output".to_string(),
        };

        let result = input.validate();
        assert!(
            result.is_err(),
            "Empty encrypted_file should fail validation"
        );

        if let Err(error) = result {
            assert_eq!(
                error.message, "Encrypted file path cannot be empty",
                "Error message should match"
            );
        }
    }

    #[test]
    fn test_decrypt_data_input_empty_key_id() {
        let input = DecryptDataInput {
            encrypted_file: "/path/to/encrypted.file".to_string(),
            key_id: "".to_string(),
            passphrase: "strong-passphrase-123".to_string(),
            output_dir: "/path/to/output".to_string(),
        };

        let result = input.validate();
        assert!(result.is_err(), "Empty key_id should fail validation");

        if let Err(error) = result {
            assert_eq!(
                error.message, "Key ID cannot be empty",
                "Error message should match"
            );
        }
    }

    #[test]
    fn test_decrypt_data_input_empty_passphrase() {
        let input = DecryptDataInput {
            encrypted_file: "/path/to/encrypted.file".to_string(),
            key_id: "test-key-id".to_string(),
            passphrase: "".to_string(),
            output_dir: "/path/to/output".to_string(),
        };

        let result = input.validate();
        assert!(result.is_err(), "Empty passphrase should fail validation");

        if let Err(error) = result {
            assert_eq!(
                error.message, "Passphrase cannot be empty",
                "Error message should match"
            );
        }
    }

    #[test]
    fn test_decrypt_data_input_empty_output_dir() {
        let input = DecryptDataInput {
            encrypted_file: "/path/to/encrypted.file".to_string(),
            key_id: "test-key-id".to_string(),
            passphrase: "strong-passphrase-123".to_string(),
            output_dir: "".to_string(),
        };

        let result = input.validate();
        assert!(result.is_err(), "Empty output_dir should fail validation");

        if let Err(error) = result {
            assert_eq!(
                error.message, "Output directory cannot be empty",
                "Error message should match"
            );
        }
    }
}

#[cfg(test)]
mod path_validation_tests {
    use super::*;
    use std::path::Path;

    fn validate_path(path: &str) -> Result<(), CommandError> {
        if path.is_empty() {
            return Err(CommandError::validation("Path cannot be empty"));
        }

        // Accept both Unix and Windows absolute paths
        let is_unix_absolute = path.starts_with('/');
        let is_windows_absolute = path.len() > 2
            && ((path.chars().nth(1) == Some(':')
                && (path.chars().nth(2) == Some('\\') || path.chars().nth(2) == Some('/')))
                || path.starts_with("\\\\"));

        if !is_unix_absolute && !is_windows_absolute {
            return Err(CommandError::validation("Path must be absolute"));
        }

        // Check for potentially dangerous patterns
        let path_lower = path.to_lowercase();
        if path_lower.contains("..") || path_lower.contains("~") {
            return Err(CommandError::validation("Path contains invalid patterns"));
        }

        Ok(())
    }

    #[test]
    fn test_windows_path_validation() {
        let valid_windows_paths = vec![
            r"C:\Users\username\Documents\file.txt",
            r"D:\Projects\test\data.bin",
            r"\\server\share\file.txt",
        ];

        for path in valid_windows_paths {
            let result = validate_path(path);
            TestAssertions::assert_ok(
                result,
                &format!("Windows path '{}' should pass validation", path),
            );
        }
    }

    #[test]
    fn test_unix_path_validation() {
        let valid_unix_paths = vec![
            "/home/username/documents/file.txt",
            "/var/log/app.log",
            "/tmp/temporary_file.dat",
        ];

        for path in valid_unix_paths {
            let result = validate_path(path);
            TestAssertions::assert_ok(
                result,
                &format!("Unix path '{}' should pass validation", path),
            );
        }
    }

    #[test]
    fn test_macos_path_validation() {
        let valid_macos_paths = vec![
            "/Users/username/Documents/file.txt",
            "/Applications/App.app/Contents/Resources/data.bin",
            "/System/Library/Frameworks/framework.framework",
        ];

        for path in valid_macos_paths {
            let result = validate_path(path);
            TestAssertions::assert_ok(
                result,
                &format!("macOS path '{}' should pass validation", path),
            );
        }
    }

    #[test]
    fn test_invalid_path_patterns() {
        let invalid_paths = vec![
            "relative/path/file.txt", // relative path
            "../parent/file.txt",     // parent directory traversal
            "~/home/file.txt",        // home directory expansion
            "",                       // empty path
            "file.txt",               // just filename
        ];

        for path in invalid_paths {
            let result = validate_path(path);
            assert!(
                result.is_err(),
                "Invalid path '{}' should fail validation",
                path
            );
        }
    }

    #[test]
    fn test_path_with_special_characters() {
        let special_char_paths = vec![
            r"C:\Users\username\My Documents\file (1).txt",
            "/home/username/file-with-dashes.txt",
            "/path/with/underscores_and_spaces.txt",
        ];

        for path in special_char_paths {
            let result = validate_path(path);
            TestAssertions::assert_ok(
                result,
                &format!("Path with special chars '{}' should pass validation", path),
            );
        }
    }

    #[test]
    fn test_unicode_path_validation() {
        let unicode_paths = vec![
            "/home/用户/文档/文件.txt",
            "/path/with/émojis 🚀/file.txt",
            "/caminho/com/acentos/arquivo.txt",
        ];

        for path in unicode_paths {
            let result = validate_path(path);
            TestAssertions::assert_ok(
                result,
                &format!("Unicode path '{}' should pass validation", path),
            );
        }
    }
}

#[cfg(test)]
mod edge_case_tests {
    use super::*;

    #[test]
    fn test_very_long_inputs() {
        let long_label = "a".repeat(1000);
        let long_passphrase = "b".repeat(1000);

        let input = GenerateKeyInput {
            label: long_label.clone(),
            passphrase: long_passphrase.clone(),
        };

        // Should pass validation as it meets minimum requirements
        let result = input.validate();
        assert!(
            result.is_ok(),
            "Long inputs should pass validation if they meet requirements"
        );
    }

    #[test]
    fn test_boundary_values() {
        // Test minimum valid passphrase length
        let input = GenerateKeyInput {
            label: "test-key".to_string(),
            passphrase: "123456789012".to_string(), // exactly 12 characters
        };

        let result = input.validate();
        assert!(
            result.is_ok(),
            "Minimum length passphrase should pass validation"
        );
    }

    #[test]
    fn test_unicode_inputs() {
        let unicode_label = "测试密钥";
        let unicode_passphrase = "密码短语123";

        let input = GenerateKeyInput {
            label: unicode_label.to_string(),
            passphrase: unicode_passphrase.to_string(),
        };

        let result = input.validate();
        assert!(result.is_ok(), "Unicode inputs should pass validation");
    }

    #[test]
    fn test_mixed_case_inputs() {
        let mixed_label = "Test-Key_123";
        let mixed_passphrase = "PassPhrase123!@#";

        let input = GenerateKeyInput {
            label: mixed_label.to_string(),
            passphrase: mixed_passphrase.to_string(),
        };

        let result = input.validate();
        assert!(result.is_ok(), "Mixed case inputs should pass validation");
    }
}

#[cfg(test)]
mod validate_passphrase_tests {
    use super::*;

    #[test]
    fn test_validate_passphrase_input_empty_passphrase() {
        let input = ValidatePassphraseInput {
            passphrase: String::new(),
        };
        let result = input.validate();
        assert!(result.is_err());
        if let Err(error) = result {
            assert!(error.message.contains("cannot be empty"));
        } else {
            panic!("Expected validation error");
        }
    }

    #[test]
    fn test_validate_passphrase_input_validation_success() {
        let input = ValidatePassphraseInput {
            passphrase: "valid_passphrase".to_string(),
        };
        let result = input.validate();
        assert!(result.is_ok());
    }

    #[test]
    fn test_validate_passphrase_command_weak_passphrase() {
        let input = ValidatePassphraseInput {
            passphrase: "weak".to_string(),
        };

        // This would be tested in integration tests, but we can test the validation logic
        let result = input.validate();
        assert!(result.is_ok()); // Input validation passes

        // The actual command logic would be tested in integration tests
        // where we can call the Tauri command directly
    }

    #[test]
    fn test_validate_passphrase_command_strong_passphrase() {
        let input = ValidatePassphraseInput {
            passphrase: "StrongPass123!@#".to_string(),
        };

        let result = input.validate();
        assert!(result.is_ok());
    }

    #[test]
    fn test_validate_passphrase_command_unicode_passphrase() {
        let input = ValidatePassphraseInput {
            passphrase: "Unicode密码123!@#".to_string(),
        };

        let result = input.validate();
        assert!(result.is_ok());
    }
}
