//! Unit tests for command types and error handling
//!
//! Tests cover:
//! - CommandError creation and properties
//! - ErrorCode enum values
//! - ProgressUpdate serialization/deserialization
//! - CommandResponse type alias
//! - Input validation traits

use barqly_vault_lib::commands::types::{
    CommandError, CommandResponse, ErrorCode, ProgressDetails, ProgressUpdate, ValidateInput,
};
use serde_json;

#[cfg(test)]
mod command_error_tests {
    use super::*;

    #[test]
    fn test_command_error_creation() {
        let message = "Test error message".to_string();
        let error = CommandError::validation(message.clone());

        assert_eq!(error.message, message, "Message should match");
        assert!(error.details.is_none(), "Details should be None by default");
    }

    #[test]
    fn test_command_error_with_details() {
        let error = CommandError::validation("Base error").with_details("Additional context");

        assert_eq!(error.details, Some("Additional context".to_string()));
    }

    #[test]
    fn test_command_error_display() {
        let message = "Test error message".to_string();
        let error = CommandError::validation(message.clone());

        assert_eq!(error.to_string(), message);
    }

    #[test]
    fn test_command_error_serialization() {
        let error = CommandError::validation("Test error".to_string()).with_details("Test details");

        let serialized = serde_json::to_string(&error).expect("Should serialize");
        let deserialized: CommandError =
            serde_json::from_str(&serialized).expect("Should deserialize");

        assert_eq!(deserialized.message, error.message);
        assert_eq!(deserialized.details, error.details);
    }

    #[test]
    fn test_error_code_serialization() {
        let test_cases = vec![
            ErrorCode::InvalidInput,
            ErrorCode::PermissionDenied,
            ErrorCode::KeyNotFound,
            ErrorCode::EncryptionFailed,
            ErrorCode::InternalError,
        ];

        for error_code in test_cases {
            let serialized = serde_json::to_string(&error_code).expect("Should serialize");
            let deserialized: ErrorCode =
                serde_json::from_str(&serialized).expect("Should deserialize");

            // Since ErrorCode doesn't implement PartialEq, we can only verify it deserializes
            assert!(matches!(
                deserialized,
                ErrorCode::InvalidInput
                    | ErrorCode::PermissionDenied
                    | ErrorCode::KeyNotFound
                    | ErrorCode::EncryptionFailed
                    | ErrorCode::InternalError
            ));
        }
    }

    #[test]
    fn test_command_response_success() {
        let test_data = "test response data";
        let response: CommandResponse<String> = Ok(test_data.to_string());

        match response {
            Ok(data) => assert_eq!(data, test_data, "Response data should match"),
            Err(_) => panic!("Should be success response"),
        }
    }

    #[test]
    fn test_command_response_error() {
        let error_message = "Test error".to_string();
        let error = CommandError::validation(error_message.clone());
        let response: CommandResponse<String> = Err(Box::new(error));

        match response {
            Ok(_) => panic!("Should be error response"),
            Err(response_error) => {
                assert_eq!(
                    response_error.message, error_message,
                    "Error message should match"
                );
            }
        }
    }
}

#[cfg(test)]
mod progress_update_tests {
    use super::*;

    #[test]
    fn test_progress_update_creation() {
        let progress = ProgressUpdate {
            operation_id: "test_operation".to_string(),
            progress: 0.5,
            message: "Processing...".to_string(),
            details: None,
            timestamp: chrono::Utc::now(),
            estimated_time_remaining: None,
        };

        assert_eq!(
            progress.operation_id, "test_operation",
            "Operation ID should match"
        );
        assert_eq!(progress.progress, 0.5, "Progress should match");
        assert_eq!(progress.message, "Processing...", "Message should match");
        assert!(progress.details.is_none(), "Details should be None");
    }

    #[test]
    fn test_progress_update_with_file_details() {
        let details = ProgressDetails::FileOperation {
            current_file: "file1.txt".to_string(),
            total_files: 5,
            current_file_progress: 0.3,
            current_file_size: 1024,
            total_size: 5120,
        };

        let progress = ProgressUpdate {
            operation_id: "file_operation".to_string(),
            progress: 0.2,
            message: "Processing files...".to_string(),
            details: Some(details),
            timestamp: chrono::Utc::now(),
            estimated_time_remaining: None,
        };

        assert_eq!(
            progress.operation_id, "file_operation",
            "Operation ID should match"
        );
        assert_eq!(progress.progress, 0.2, "Progress should match");

        if let Some(ProgressDetails::FileOperation {
            current_file,
            total_files,
            current_file_progress,
            current_file_size: _,
            total_size: _,
        }) = progress.details
        {
            assert_eq!(current_file, "file1.txt");
            assert_eq!(total_files, 5);
            assert_eq!(current_file_progress, 0.3);
        } else {
            panic!("Should have file operation details");
        }
    }

    #[test]
    fn test_progress_update_with_encryption_details() {
        let details = ProgressDetails::Encryption {
            bytes_processed: 1024,
            total_bytes: 2048,
            encryption_rate: Some(512.0),
        };

        let progress = ProgressUpdate {
            operation_id: "encryption".to_string(),
            progress: 0.5,
            message: "Encrypting...".to_string(),
            details: Some(details),
            timestamp: chrono::Utc::now(),
            estimated_time_remaining: None,
        };

        if let Some(ProgressDetails::Encryption {
            bytes_processed,
            total_bytes,
            encryption_rate: _,
        }) = progress.details
        {
            assert_eq!(bytes_processed, 1024);
            assert_eq!(total_bytes, 2048);
        } else {
            panic!("Should have encryption details");
        }
    }

    #[test]
    fn test_progress_update_serialization() {
        let progress = ProgressUpdate {
            operation_id: "test_operation".to_string(),
            progress: 0.75,
            message: "Test message".to_string(),
            details: None,
            timestamp: chrono::Utc::now(),
            estimated_time_remaining: None,
        };

        let serialized = serde_json::to_string(&progress).expect("Should serialize");
        let deserialized: ProgressUpdate =
            serde_json::from_str(&serialized).expect("Should deserialize");

        assert_eq!(
            deserialized.operation_id, progress.operation_id,
            "Operation ID should match"
        );
        assert_eq!(
            deserialized.progress, progress.progress,
            "Progress should match"
        );
        assert_eq!(
            deserialized.message, progress.message,
            "Message should match"
        );
    }

    #[test]
    fn test_progress_update_with_details_serialization() {
        let details = ProgressDetails::FileOperation {
            current_file: "test.txt".to_string(),
            total_files: 10,
            current_file_progress: 0.5,
            current_file_size: 2048,
            total_size: 10240,
        };

        let progress = ProgressUpdate {
            operation_id: "file_op".to_string(),
            progress: 0.3,
            message: "Processing files".to_string(),
            details: Some(details),
            timestamp: chrono::Utc::now(),
            estimated_time_remaining: None,
        };

        let serialized = serde_json::to_string(&progress).expect("Should serialize");
        let deserialized: ProgressUpdate =
            serde_json::from_str(&serialized).expect("Should deserialize");

        assert_eq!(
            deserialized.operation_id, progress.operation_id,
            "Operation ID should match"
        );
        assert_eq!(
            deserialized.progress, progress.progress,
            "Progress should match"
        );
        assert_eq!(
            deserialized.message, progress.message,
            "Message should match"
        );

        // Verify details are preserved
        assert!(
            deserialized.details.is_some(),
            "Details should be preserved"
        );
    }
}

#[cfg(test)]
mod validation_tests {
    use super::*;

    // Mock struct for testing ValidateInput trait
    #[derive(Debug)]
    struct MockValidatable {
        value: String,
    }

    impl ValidateInput for MockValidatable {
        fn validate(&self) -> Result<(), Box<CommandError>> {
            if self.value.is_empty() {
                return Err(Box::new(CommandError::validation("Value is required")));
            }

            if self.value.len() > 100 {
                return Err(Box::new(CommandError::validation("Value too long")));
            }

            Ok(())
        }
    }

    #[test]
    fn test_validation_success() {
        let valid_input = MockValidatable {
            value: "valid input".to_string(),
        };

        assert!(
            valid_input.validate().is_ok(),
            "Valid input should pass validation"
        );
    }

    #[test]
    fn test_validation_empty_value() {
        let invalid_input = MockValidatable {
            value: "".to_string(),
        };

        let result = invalid_input.validate();
        assert!(result.is_err(), "Empty value should fail validation");

        if let Err(error) = result {
            assert_eq!(
                error.message, "Value is required",
                "Error message should match"
            );
        }
    }

    #[test]
    fn test_validation_too_long() {
        let long_value = "a".repeat(101);
        let invalid_input = MockValidatable { value: long_value };

        let result = invalid_input.validate();
        assert!(result.is_err(), "Too long value should fail validation");

        if let Err(error) = result {
            assert_eq!(
                error.message, "Value too long",
                "Error message should match"
            );
        }
    }
}

#[cfg(test)]
mod error_handling_tests {
    use super::*;

    #[test]
    fn test_error_code_variants() {
        // Test that all error code variants can be created
        let _invalid_input = ErrorCode::InvalidInput;
        let _missing_parameter = ErrorCode::MissingParameter;
        let _invalid_path = ErrorCode::InvalidPath;
        let _permission_denied = ErrorCode::PermissionDenied;
        let _path_not_allowed = ErrorCode::PathNotAllowed;
        let _key_not_found = ErrorCode::KeyNotFound;
        let _file_not_found = ErrorCode::FileNotFound;
        let _encryption_failed = ErrorCode::EncryptionFailed;
        let _decryption_failed = ErrorCode::DecryptionFailed;
        let _storage_failed = ErrorCode::StorageFailed;
        let _internal_error = ErrorCode::InternalError;
    }

    #[test]
    fn test_command_error_factory_methods() {
        let validation_error = CommandError::validation("Validation failed");
        assert_eq!(validation_error.message, "Validation failed");

        let permission_error = CommandError::permission("Access denied");
        assert_eq!(permission_error.message, "Access denied");

        let not_found_error = CommandError::not_found("Resource not found");
        assert_eq!(not_found_error.message, "Resource not found");

        let operation_error =
            CommandError::operation(ErrorCode::EncryptionFailed, "Encryption failed");
        assert_eq!(operation_error.message, "Encryption failed");
    }

    #[test]
    fn test_unicode_error_messages() {
        let unicode_message = "错误消息: 加密失败";
        let error = CommandError::validation(unicode_message.to_string());

        assert_eq!(
            error.message, unicode_message,
            "Unicode message should be preserved"
        );
    }

    #[test]
    fn test_large_progress_values() {
        let progress = ProgressUpdate {
            operation_id: "large_operation".to_string(),
            progress: 0.999999,
            message: "Almost done".to_string(),
            details: None,
            timestamp: chrono::Utc::now(),
            estimated_time_remaining: None,
        };

        let serialized = serde_json::to_string(&progress).expect("Should serialize");
        let deserialized: ProgressUpdate =
            serde_json::from_str(&serialized).expect("Should deserialize");

        assert_eq!(
            deserialized.progress, progress.progress,
            "Large progress should be preserved"
        );
    }
}
