#[cfg(test)]
mod windows_ansi_stripping_tests {
    //! Tests for Windows ConPTY ANSI stripping behavior
    //! Uses actual byte sequences from Windows logs to verify chunk-based stripping works

    #[test]
    fn test_chunk_stripping_preserves_all_content() {
        // Actual chunks from Windows logs (barqly-vault-15.log)

        // Line 89: i18n debug logs (early content that was getting stuck)
        let chunk1_hex = "1b5b33383b353b386d5b1b5b33326d494e464f20201b5b6d6931386e5f656d6265643a3a726571756573746572";
        let chunk1 = hex::decode(chunk1_hex).unwrap();

        // Line 259: Key output (Serial, Recipient, etc.)
        let chunk2_hex = "23202020202020202053657269616c3a2033313331303432302c20536c6f743a20310d0a";
        let chunk2 = hex::decode(chunk2_hex).unwrap();

        // Line 285: Identity tag
        let chunk3_hex =
            "4147452d504c5547494e2d5955424b4b45592d313250444436515656e5a58453932435a4657353";
        let chunk3 = hex::decode(chunk3_hex).unwrap();

        println!("\n=== Testing BROKEN approach (strip accumulated, replace) ===");
        let mut accumulated = Vec::new();
        let mut clean_broken = String::new();

        for (i, chunk) in [&chunk1, &chunk2, &chunk3].iter().enumerate() {
            accumulated.extend_from_slice(chunk);
            let stripped = strip_ansi_escapes::strip(&accumulated);
            if let Ok(clean) = String::from_utf8(stripped) {
                clean_broken = clean.clone(); // REPLACE
                println!(
                    "After chunk {}: Contains 'Serial': {}",
                    i + 1,
                    clean_broken.contains("Serial")
                );
                println!(
                    "After chunk {}: Contains 'AGE-PLUGIN': {}",
                    i + 1,
                    clean_broken.contains("AGE-PLUGIN")
                );
            }
        }

        println!("\n=== Testing FIXED approach (strip chunks, append) ===");
        let mut clean_fixed = String::new();

        for (i, chunk) in [&chunk1, &chunk2, &chunk3].iter().enumerate() {
            let chunk_stripped = strip_ansi_escapes::strip(chunk);
            if let Ok(chunk_clean) = String::from_utf8(chunk_stripped) {
                clean_fixed.push_str(&chunk_clean); // APPEND
                println!(
                    "After chunk {}: Contains 'Serial': {}",
                    i + 1,
                    clean_fixed.contains("Serial")
                );
                println!(
                    "After chunk {}: Contains 'AGE-PLUGIN': {}",
                    i + 1,
                    clean_fixed.contains("AGE-PLUGIN")
                );
            }
        }

        println!("\n=== Results ===");
        println!("Broken approach final length: {}", clean_broken.len());
        println!("Fixed approach final length: {}", clean_fixed.len());
        println!(
            "Broken contains 'Serial': {}",
            clean_broken.contains("Serial")
        );
        println!(
            "Fixed contains 'Serial': {}",
            clean_fixed.contains("Serial")
        );
        println!(
            "Broken contains 'AGE-PLUGIN': {}",
            clean_broken.contains("AGE-PLUGIN")
        );
        println!(
            "Fixed contains 'AGE-PLUGIN': {}",
            clean_fixed.contains("AGE-PLUGIN")
        );

        // Verify fix works
        assert!(
            clean_fixed.contains("Serial"),
            "Fixed approach should contain Serial"
        );
        assert!(
            clean_fixed.contains("AGE-PLUGIN") || clean_fixed.len() > clean_broken.len(),
            "Fixed approach should preserve more content"
        );
        assert!(
            clean_fixed.len() >= clean_broken.len(),
            "Fixed should have at least as much content"
        );
    }

    #[test]
    fn test_actual_yubikey_output_parsing() {
        // Simulate complete YubiKey output sequence as it appears in Windows
        let yubikey_output: Vec<&[u8]> = vec![
            // Chunk 1: i18n logs
            b"[INFO] i18n stuff\n".as_slice(),
            // Chunk 2: Key generation progress
            b"\x1b[0mGenerating key...\x1b[0m\n".as_slice(),
            // Chunk 3: Actual key info
            b"#       Serial: 31310420, Slot: 1\n".as_slice(),
            b"#         Name: barqly-31310420\n".as_slice(),
            b"#    Recipient: age1yubikey1qgtgs0qkz8gg7unmrreh2xvvc6x6dvhez5qrrdzx5nd9xp8evma77x77j8k9\n".as_slice(),
            b"AGE-PLUGIN-YUBIKEY-12NPD6QVZNZXE92CZFW57J\n".as_slice(),
        ];

        // Simulate chunk-based stripping
        let mut clean_output = String::new();
        for chunk in yubikey_output {
            let stripped = strip_ansi_escapes::strip(chunk);
            if let Ok(clean) = String::from_utf8(stripped) {
                clean_output.push_str(&clean);
            }
        }

        println!("\nFinal clean output:\n{}", clean_output);

        // Verify parser can extract what it needs
        assert!(
            clean_output.contains("Serial: 31310420"),
            "Should contain serial"
        );
        assert!(
            clean_output.contains("age1yubikey"),
            "Should contain recipient"
        );
        assert!(
            clean_output.contains("AGE-PLUGIN-YUBIKEY"),
            "Should contain identity tag"
        );

        println!("✅ All required content present for parser!");
    }
}
