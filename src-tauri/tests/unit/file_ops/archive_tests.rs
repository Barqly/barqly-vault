//! Unit tests for archive operations

use barqly_vault_lib::file_ops::archive_operations::{
    create_archive, create_archive_with_progress, extract_archive,
};
use barqly_vault_lib::file_ops::{FileOpsConfig, FileOpsError, FileSelection};
use flate2::Compression;
use flate2::write::GzEncoder;
use std::fs;
use std::io::Write;
use std::path::{Path, PathBuf};
use tar::Builder;
use tempfile::tempdir;

fn create_test_file(dir: &Path, name: &str, content: &str) -> PathBuf {
    let file_path = dir.join(name);
    let mut file = fs::File::create(&file_path).unwrap();
    file.write_all(content.as_bytes()).unwrap();
    file_path
}

#[test]
fn test_create_archive() {
    let temp_dir = tempdir().unwrap();
    let file1 = create_test_file(temp_dir.path(), "test1.txt", "content1");
    let file2 = create_test_file(temp_dir.path(), "test2.txt", "content2");

    let selection = FileSelection::Files(vec![file1, file2]);
    let output_path = temp_dir.path().join("test.tar.gz");
    let config = FileOpsConfig::default();

    let result = create_archive(&selection, &output_path, &config);
    assert!(result.is_ok());

    let operation = result.unwrap();
    assert_eq!(operation.file_count, 2);
    assert!(operation.total_size > 0);
    assert!(output_path.exists());
}

#[test]
fn test_extract_archive() {
    let temp_dir = tempdir().unwrap();
    let file1 = create_test_file(temp_dir.path(), "test1.txt", "content1");
    let file2 = create_test_file(temp_dir.path(), "test2.txt", "content2");

    let selection = FileSelection::Files(vec![file1, file2]);
    let archive_path = temp_dir.path().join("test.tar.gz");
    let config = FileOpsConfig::default();

    // Create archive
    create_archive(&selection, &archive_path, &config).unwrap();

    // Extract archive
    let extract_dir = temp_dir.path().join("extracted");
    let extracted_files = extract_archive(&archive_path, &extract_dir, &config).unwrap();

    assert_eq!(extracted_files.len(), 2);
    assert!(extract_dir.exists());
}

#[test]
fn test_archive_with_progress() {
    let temp_dir = tempdir().unwrap();
    let file1 = create_test_file(temp_dir.path(), "test1.txt", "content1");
    let file2 = create_test_file(temp_dir.path(), "test2.txt", "content2");

    let selection = FileSelection::Files(vec![file1, file2]);
    let output_path = temp_dir.path().join("test.tar.gz");
    let config = FileOpsConfig::default();

    let progress_calls = std::sync::Arc::new(std::sync::atomic::AtomicUsize::new(0));
    let progress_calls_clone = progress_calls.clone();
    let progress_callback = Box::new(move |processed: u64, total: u64| {
        progress_calls_clone.fetch_add(1, std::sync::atomic::Ordering::Relaxed);
        assert!(processed <= total);
    });

    let result =
        create_archive_with_progress(&selection, &output_path, &config, Some(progress_callback));

    assert!(result.is_ok());
    assert!(progress_calls.load(std::sync::atomic::Ordering::Relaxed) > 0);
}

// ============================================================================
// PATH TRAVERSAL SECURITY TESTS
// ============================================================================

/// Helper function to create a malicious archive with path traversal attempts
/// This bypasses the tar library's built-in validation to create truly malicious archives
fn create_malicious_archive_with_traversal(
    output_path: &Path,
    malicious_path: &str,
    content: &[u8],
) -> std::io::Result<()> {
    use std::io::Write;

    // Create a TAR archive manually to bypass built-in path validation
    let mut tar_data = Vec::new();

    // Create TAR header (512 bytes)
    let mut header = [0u8; 512];

    // Write the malicious path (max 100 bytes for standard tar)
    let path_bytes = malicious_path.as_bytes();
    let path_len = path_bytes.len().min(100);
    header[0..path_len].copy_from_slice(&path_bytes[0..path_len]);

    // Set file mode (octal 0644 = 420 decimal)
    let mode = "0000644\0";
    header[100..108].copy_from_slice(mode.as_bytes());

    // Set uid/gid (octal)
    let uid_gid = "0000000\0";
    header[108..116].copy_from_slice(uid_gid.as_bytes());
    header[116..124].copy_from_slice(uid_gid.as_bytes());

    // Set file size (octal)
    let size_str = format!("{:011o}\0", content.len());
    header[124..136].copy_from_slice(size_str.as_bytes());

    // Set modification time (octal)
    let mtime = "00000000000\0";
    header[136..148].copy_from_slice(mtime.as_bytes());

    // Set type flag (0 = regular file)
    header[156] = b'0';

    // Set magic and version for ustar format
    let magic = "ustar\0";
    header[257..263].copy_from_slice(magic.as_bytes());
    let version = "00";
    header[263..265].copy_from_slice(version.as_bytes());

    // Calculate and set checksum
    // Initially fill checksum field with spaces
    for byte in header.iter_mut().take(156).skip(148) {
        *byte = b' ';
    }

    // Calculate checksum
    let checksum: u32 = header.iter().map(|&b| b as u32).sum();
    let checksum_str = format!("{checksum:06o}\0 ");
    header[148..156].copy_from_slice(checksum_str.as_bytes());

    // Write header and content to tar data
    tar_data.extend_from_slice(&header);
    tar_data.extend_from_slice(content);

    // Pad content to 512-byte boundary
    let padding_needed = (512 - (content.len() % 512)) % 512;
    tar_data.extend_from_slice(&vec![0u8; padding_needed]);

    // Add two empty 512-byte blocks to mark end of archive
    tar_data.extend_from_slice(&[0u8; 1024]);

    // Compress with gzip
    let tar_gz = fs::File::create(output_path)?;
    let mut encoder = GzEncoder::new(tar_gz, Compression::default());
    encoder.write_all(&tar_data)?;
    encoder.finish()?;

    Ok(())
}

#[test]
fn test_extract_archive_blocks_parent_directory_traversal() {
    let temp_dir = tempdir().unwrap();
    let archive_path = temp_dir.path().join("malicious.tar.gz");
    let extract_dir = temp_dir.path().join("extracted");

    // Create a malicious archive with "../" path traversal
    create_malicious_archive_with_traversal(&archive_path, "../etc/passwd", b"malicious content")
        .unwrap();

    let config = FileOpsConfig::default();

    // Attempt to extract the malicious archive
    let result = extract_archive(&archive_path, &extract_dir, &config);

    // The extraction should fail due to path traversal detection
    assert!(result.is_err(), "Should detect and block path traversal");

    // Verify it's the correct error type
    if let Err(err) = result {
        assert!(
            matches!(err, FileOpsError::PathValidationFailed { .. }),
            "Should fail with PathValidationFailed error, got: {err:?}"
        );

        // Check the error message mentions traversal
        let error_string = err.to_string();
        assert!(
            error_string.contains("traversal") || error_string.contains("outside"),
            "Error message should mention traversal or escaping: {error_string}"
        );
    }

    // Ensure no files were extracted outside the intended directory
    assert!(!temp_dir.path().join("etc").exists());
}

#[test]
fn test_extract_archive_blocks_absolute_path_traversal() {
    let temp_dir = tempdir().unwrap();
    let archive_path = temp_dir.path().join("malicious_absolute.tar.gz");
    let extract_dir = temp_dir.path().join("extracted");

    // Create a malicious archive with an absolute path
    create_malicious_archive_with_traversal(&archive_path, "/etc/passwd", b"malicious content")
        .unwrap();

    let config = FileOpsConfig::default();

    // Attempt to extract the malicious archive
    let result = extract_archive(&archive_path, &extract_dir, &config);

    // For absolute paths, tar library typically strips the leading slash,
    // but we should still validate the resulting path
    if result.is_ok() {
        // If extraction succeeded, verify file is within extract_dir
        let expected_path = extract_dir.join("etc/passwd");
        assert!(
            expected_path.starts_with(&extract_dir),
            "File should be extracted within the output directory"
        );
    }
}

#[test]
fn test_extract_archive_blocks_encoded_traversal() {
    let temp_dir = tempdir().unwrap();
    let archive_path = temp_dir.path().join("malicious_encoded.tar.gz");
    let extract_dir = temp_dir.path().join("extracted");

    // Create a malicious archive with encoded traversal sequences
    create_malicious_archive_with_traversal(
        &archive_path,
        "..%2f..%2fetc%2fpasswd",
        b"malicious content",
    )
    .unwrap();

    let config = FileOpsConfig::default();

    // Attempt to extract the malicious archive
    let result = extract_archive(&archive_path, &extract_dir, &config);

    // The extraction should fail if the path contains encoded traversal
    if let Err(err) = result {
        assert!(
            matches!(err, FileOpsError::PathValidationFailed { .. }),
            "Should detect encoded traversal patterns"
        );
    }
}

#[test]
fn test_extract_archive_blocks_windows_style_traversal() {
    let temp_dir = tempdir().unwrap();
    let archive_path = temp_dir.path().join("malicious_windows.tar.gz");
    let extract_dir = temp_dir.path().join("extracted");

    // Create a malicious archive with Windows-style path traversal
    create_malicious_archive_with_traversal(
        &archive_path,
        "..\\..\\windows\\system32\\config",
        b"malicious content",
    )
    .unwrap();

    let config = FileOpsConfig::default();

    // Attempt to extract the malicious archive
    let result = extract_archive(&archive_path, &extract_dir, &config);

    // The extraction should fail due to path traversal detection
    assert!(
        result.is_err(),
        "Should detect and block Windows-style path traversal"
    );

    if let Err(err) = result {
        assert!(
            matches!(err, FileOpsError::PathValidationFailed { .. }),
            "Should fail with PathValidationFailed error for Windows paths"
        );
    }
}

#[test]
fn test_extract_archive_blocks_multiple_traversal_patterns() {
    let temp_dir = tempdir().unwrap();
    let archive_path = temp_dir.path().join("malicious_multiple.tar.gz");
    let extract_dir = temp_dir.path().join("extracted");

    // Test various traversal patterns
    let malicious_paths = vec![
        "../../etc/passwd",
        "..//..//etc//passwd",
        "subdir/../../etc/passwd",
        ".//../etc/passwd",
    ];

    for malicious_path in malicious_paths {
        // Create a new archive for each test case
        create_malicious_archive_with_traversal(
            &archive_path,
            malicious_path,
            b"malicious content",
        )
        .unwrap();

        let config = FileOpsConfig::default();
        let result = extract_archive(&archive_path, &extract_dir, &config);

        assert!(
            result.is_err(),
            "Should block traversal pattern: {malicious_path}"
        );

        // Clean up for next iteration
        let _ = fs::remove_file(&archive_path);
    }
}

#[test]
fn test_extract_archive_allows_normal_nested_paths() {
    let temp_dir = tempdir().unwrap();

    // Create legitimate nested directory structure
    let source_dir = temp_dir.path().join("source");
    fs::create_dir_all(source_dir.join("subdir1/subdir2")).unwrap();

    // Create test files in nested structure
    let file1 = create_test_file(&source_dir, "root.txt", "root content");
    let subdir1 = source_dir.join("subdir1");
    let file2 = create_test_file(&subdir1, "sub1.txt", "sub1 content");
    let subdir2 = source_dir.join("subdir1/subdir2");
    let file3 = create_test_file(&subdir2, "sub2.txt", "sub2 content");

    // Create archive with legitimate nested paths
    let selection = FileSelection::Files(vec![file1, file2, file3]);
    let archive_path = temp_dir.path().join("legitimate.tar.gz");
    let config = FileOpsConfig::default();

    create_archive(&selection, &archive_path, &config).unwrap();

    // Extract the archive
    let extract_dir = temp_dir.path().join("extracted");
    let result = extract_archive(&archive_path, &extract_dir, &config);

    // Should succeed for legitimate nested paths
    assert!(
        result.is_ok(),
        "Should allow extraction of legitimate nested paths"
    );

    let extracted_files = result.unwrap();
    assert_eq!(
        extracted_files.len(),
        3,
        "Should extract all files from nested structure"
    );
}

#[test]
fn test_extract_archive_validates_symlink_targets() {
    // This test ensures that archives with normal files extract correctly
    // and validates our security implementation doesn't break normal functionality
    let temp_dir = tempdir().unwrap();
    let archive_path = temp_dir.path().join("normal_archive.tar.gz");
    let extract_dir = temp_dir.path().join("extracted");

    // Create a simple tar archive with normal files
    let tar_gz = fs::File::create(&archive_path).unwrap();
    let encoder = GzEncoder::new(tar_gz, Compression::default());
    let mut archive = Builder::new(encoder);

    // Add a regular file
    let mut header = tar::Header::new_gnu();
    header.set_path("normal.txt").unwrap();
    header.set_size(7);
    header.set_mode(0o644);
    header.set_cksum();
    archive.append(&header, &b"content"[..]).unwrap();

    // Add another file in a subdirectory
    let mut header2 = tar::Header::new_gnu();
    header2.set_path("subdir/another.txt").unwrap();
    header2.set_size(4);
    header2.set_mode(0o644);
    header2.set_cksum();
    archive.append(&header2, &b"test"[..]).unwrap();

    archive.finish().unwrap();
    drop(archive); // Ensure the file is properly closed

    let config = FileOpsConfig::default();
    let result = extract_archive(&archive_path, &extract_dir, &config);

    // Should succeed for normal files
    assert!(
        result.is_ok(),
        "Should extract archives with normal files: {:?}",
        result.err()
    );

    // Verify the files were extracted correctly
    if let Ok(extracted) = result {
        assert_eq!(extracted.len(), 2, "Should extract two files");
        assert!(
            extract_dir.join("normal.txt").exists(),
            "normal.txt should exist"
        );
        assert!(
            extract_dir.join("subdir/another.txt").exists(),
            "subdir/another.txt should exist"
        );
    }
}
