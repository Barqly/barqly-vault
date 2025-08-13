# Backup Verification System (Manifest + Digital Signature)

## Executive Summary

The Backup Verification System combines integrity verification (manifest) and authenticity verification (digital signatures) into a unified Phase 2 feature for Barqly Vault. This system protects Bitcoin custody documents stored in cloud environments against both accidental corruption and sophisticated replacement attacks.

## Strategic Context

### Why Combined Implementation

- **Risk Mitigation**: Cloud storage of Bitcoin recovery documents requires both integrity and authenticity verification
- **User Experience**: Single unified verification workflow vs. two separate features
- **Attack Prevention**: Digital signatures prevent sophisticated replacement attacks that manifest-only detection cannot stop

### Business Priority

- **Classification**: Must-have for Bitcoin custody solution
- **Timeline**: Phase 2 (fast follower within 2 weeks of Phase 1)
- **Success Metric**: 100% verification success rate with zero false positives

## Feature Definition

### What We're Building

**Core Feature**: Automated backup verification system that:

1. **Creates** verification data during encryption
2. **Validates** backup integrity and authenticity during decryption
3. **Reports** verification status to users in simple terms

**User-Facing Name**: "Backup Verification Report" (not "manifest")

### Components

#### 1. Integrity Verification (Manifest)

**Purpose**: Detect any corruption or accidental changes
**Implementation**:

- JSON file with SHA-256 hashes of all encrypted files
- File metadata (names, sizes, timestamps)
- Total backup statistics

#### 2. Authenticity Verification (Digital Signature)

**Purpose**: Prevent malicious replacement attacks
**Implementation**:

- Cryptographic signature of the manifest
- Verifies the backup creator's identity
- Prevents sophisticated encrypted file replacement attacks

## User Perspectives

### Target Users and Value

#### Primary: Bitcoin Families (Inheritance Planning)

**Problem**: "How do I know my encrypted Bitcoin recovery documents will work years from now when my family needs them?"
**Solution**: Automatic verification confirms backup integrity and authenticity
**Value**: Peace of mind for long-term inheritance planning

#### Secondary: Bitcoin Professionals

**Problem**: "How can I prove to clients their backups are complete and unmodified?"
**Solution**: Exportable verification reports with cryptographic proof
**Value**: Professional-grade backup verification workflows

#### Tertiary: Bitcoin Newcomers

**Problem**: "How do I know if something went wrong with my backup stored in the cloud?"
**Solution**: Simple pass/fail verification with clear explanations
**Value**: Confidence in self-custody practices

### User Mental Model

Users should think of this as:

- **Creating backup** = "Adding a security seal to prove it's authentic"
- **Opening backup** = "Checking the security seal before trusting the contents"
- **Verification success** = "Your backup is guaranteed authentic and complete"
- **Verification failure** = "Warning: This backup may be corrupted or tampered with"

## Technical Requirements

### Data Structure

```json
{
  "version": "2.0",
  "created_at": "2025-08-07T10:30:00Z",
  "creator_identity": "user_public_key_hash",
  "files": [
    {
      "path": "relative/path/to/file",
      "size": 1024,
      "sha256": "hash_value",
      "last_modified": "2025-08-07T10:25:00Z"
    }
  ],
  "total_size": 2048,
  "file_count": 5,
  "signature": "cryptographic_signature_of_manifest"
}
```

### Integration Points

#### Encryption Workflow

1. Calculate SHA-256 hashes of all files being encrypted
2. Generate manifest JSON with file metadata
3. Create cryptographic signature of manifest
4. Store signed manifest inside encrypted archive
5. Optionally save verification report alongside .age file

#### Decryption Workflow

1. Extract signed manifest from encrypted archive
2. Verify cryptographic signature
3. Recalculate SHA-256 hashes of decrypted files
4. Compare against manifest hashes
5. Display verification results to user

### Security Requirements

#### Cryptographic Standards

- **Hashing**: SHA-256 for file integrity
- **Signatures**: Ed25519 or RSA-2048 minimum
- **Key Management**: Secure key derivation from user passphrase or separate key

#### Attack Resistance

- **Tampering Detection**: Any modification detected via hash mismatch
- **Replacement Prevention**: Invalid signature prevents acceptance of malicious backups
- **Rollback Protection**: Timestamp verification prevents replay of old valid backups

## User Experience Requirements

### Terminology (User-Facing)

- **"Backup Verification Report"** instead of "manifest"
- **"Security Seal"** instead of "digital signature"
- **"Integrity Check"** instead of "hash verification"
- **"Authenticity Verification"** instead of "signature validation"

### User Interactions

#### During Encryption

- **Automatic**: Verification report created silently
- **Optional**: Preview verification report before encrypting
- **Messaging**: "Adding security seal to your backup..."

#### During Decryption

- **Automatic**: Verification performed before showing contents
- **Visual**: Clear pass/fail indicator with explanation
- **Success**: "✓ Your backup is verified authentic and complete"
- **Failure**: "⚠️ Warning: This backup may be corrupted or tampered with"

### Error Handling

- **Hash Mismatch**: "Backup integrity check failed - files may be corrupted"
- **Invalid Signature**: "Backup authenticity check failed - may be tampered with"
- **Missing Manifest**: "This backup was created without verification - contents cannot be verified"

## Success Metrics

### Technical Metrics

- 100% verification success rate for legitimate backups
- Zero false positive verification failures
- Sub-100ms verification time for typical backups

### User Experience Metrics

- User understanding of verification feature (>90% in surveys)
- Confidence score in backup integrity (>4.5/5)
- Support tickets related to verification (<1% of total)

### Adoption Metrics

- % of backups created with verification enabled (target: 100%)
- % of users who view verification details (target: >50%)
- % of decryptions that complete verification (target: 100%)

## Implementation Dependencies

### Phase 1 Prerequisites

- Core encryption/decryption workflow stable
- File handling and archive creation complete
- Basic UI screens implemented and tested

### Technical Dependencies

- Cryptographic signature library selection
- Key derivation mechanism design
- JSON serialization/deserialization
- Hash calculation performance optimization

### Future Enhancements (Post-Phase 2)

- **Selective Verification**: Verify individual files without full decryption
- **Verification History**: Track verification results over time
- **Third-Party Verification**: Allow external parties to verify without decryption
- **Hardware Security Module**: Integration with HSM for enterprise users
