import { useState, useCallback } from 'react';
import type React from 'react';
import { useVault } from '../contexts/VaultContext';
import { logger } from '../lib/logger';

/**
 * Custom hook to manage the Vault Hub workflow state and logic
 * Follows the same architecture as useEncryptionWorkflow and useDecryptionWorkflow
 * for consistency across the application
 */
export const useVaultHubWorkflow = () => {
  const {
    createVault,
    refreshVaults,
    vaults,
    currentVault,
    isLoading,
    error: contextError,
  } = useVault();

  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Clear form
  const handleClear = useCallback(() => {
    setName('');
    setDescription('');
    setFormError(null);
  }, []);

  // Clear error
  const clearError = useCallback(() => {
    setFormError(null);
  }, []);

  // Handle vault creation
  const handleSubmit = useCallback(
    async (e?: React.FormEvent) => {
      e?.preventDefault();

      if (!name.trim()) {
        setFormError('Vault name is required');
        return;
      }

      setIsSubmitting(true);
      setFormError(null);

      try {
        await createVault(name.trim(), description.trim() || undefined);
        // Clear form on success
        setName('');
        setDescription('');
        // Refresh vaults list
        await refreshVaults();
        // Success feedback is handled by the context
      } catch (err: any) {
        logger.error('VaultHubWorkflow', 'Failed to create vault', err);
        setFormError(err.message || 'Failed to create vault');
      } finally {
        setIsSubmitting(false);
      }
    },
    [name, description, createVault, refreshVaults],
  );

  // Handle vault selection
  const handleVaultSelect = useCallback(
    (vaultId: string) => {
      // Use the context's setCurrentVault which is async
      // but we don't need to await it in the UI
      return vaults.find((v) => v.id === vaultId);
    },
    [vaults],
  );

  return {
    // Form state
    name,
    description,
    formError,
    isSubmitting,

    // Vault data
    vaults,
    currentVault,
    isLoading,
    contextError,

    // Combined error (form takes precedence)
    error: formError || contextError,

    // Form setters
    setName,
    setDescription,

    // Handlers
    handleSubmit,
    handleClear,
    clearError,
    handleVaultSelect,
    refreshVaults,
  };
};
