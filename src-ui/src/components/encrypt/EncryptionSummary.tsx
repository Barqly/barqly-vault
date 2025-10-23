import React from 'react';
import VaultOperationSummary from '../common/VaultOperationSummary';

interface EncryptionSummaryProps {
  vaultName: string;
  fileCount: number;
  totalSize: number;
  recipientCount: number;
  outputFileName: string;
  outputPath: string;
  hasRecoveryItems: boolean;
}

/**
 * EncryptionSummary - Post-encryption summary panel
 * Wrapper around shared VaultOperationSummary component
 */
const EncryptionSummary: React.FC<EncryptionSummaryProps> = ({
  vaultName,
  fileCount,
  totalSize,
  recipientCount: _recipientCount,
  outputFileName: _outputFileName,
  outputPath,
  hasRecoveryItems: _hasRecoveryItems,
}) => {
  return (
    <VaultOperationSummary
      title="Encryption Summary:"
      vaultName={vaultName}
      fileCount={fileCount}
      totalSize={totalSize}
      outputPath={outputPath}
    />
  );
};

export default EncryptionSummary;
