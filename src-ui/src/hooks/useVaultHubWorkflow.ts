import { useState, useCallback } from 'react';
import type React from 'react';
import { useVault } from '../contexts/VaultContext';
import { logger } from '../lib/logger';
import { commands } from '../bindings';

/**
 * Enhanced Vault Hub workflow hook for Phase 3 R2 redesign
 * Manages vault selection, creation, deletion, and drag-drop state
 * Follows cache-first architecture for instant UI updates
 */
export const useVaultHubWorkflow = () => {
  const {
    createVault,
    refreshVaults,
    vaults,
    currentVault,
    setCurrentVault,
    isLoading,
    error: contextError,
  } = useVault();

  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Inline creation form state
  const [isCreatingVault, setIsCreatingVault] = useState(false);

  // Vault selection state
  const [selectedVault, setSelectedVault] = useState<string | null>(null);

  // Vault deletion state
  const [isDeletingVault, setIsDeletingVault] = useState(false);
  const [vaultToDelete, setVaultToDelete] = useState<{ id: string; name: string } | null>(null);

  // Drag & drop key attachment state (for future implementation)
  const [isDraggingKey, setIsDraggingKey] = useState(false);
  const [draggedKeyId, setDraggedKeyId] = useState<string | null>(null);

  // Expanded details state - Map to track which vault cards show details
  const [expandedVaults, setExpandedVaults] = useState<Set<string>>(new Set());

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

  // Toggle inline creation form
  const toggleCreateForm = useCallback(() => {
    setIsCreatingVault(!isCreatingVault);
    if (!isCreatingVault) {
      handleClear();
    }
  }, [isCreatingVault, handleClear]);

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
        setIsCreatingVault(false);
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

  // Handle vault selection (synchronous with cache-first)
  const handleVaultSelect = useCallback(
    (vaultId: string) => {
      setSelectedVault(vaultId);
      setCurrentVault(vaultId); // Synchronous update from cache
      return vaults.find((v) => v.id === vaultId);
    },
    [vaults, setCurrentVault],
  );

  // Handle vault deletion
  const handleDeleteVault = useCallback(
    async (vaultId: string) => {
      setIsDeletingVault(true);
      try {
        const result = await commands.deleteVault({ vault_id: vaultId, force: true });
        if (result.status === 'error') {
          throw new Error(result.error.message || 'Failed to delete vault');
        }
        logger.info('VaultHubWorkflow', 'Vault deleted successfully', { vaultId });

        // Clear selection if deleted vault was selected
        if (selectedVault === vaultId) {
          setSelectedVault(null);
        }

        // Refresh vaults list
        await refreshVaults();
        setVaultToDelete(null);
      } catch (error) {
        logger.error('VaultHubWorkflow', 'Failed to delete vault', error as Error);
        throw error;
      } finally {
        setIsDeletingVault(false);
      }
    },
    [selectedVault, refreshVaults],
  );

  // Prepare vault for deletion
  const prepareDeleteVault = useCallback((vaultId: string, vaultName: string) => {
    setVaultToDelete({ id: vaultId, name: vaultName });
  }, []);

  // Cancel vault deletion
  const cancelDeleteVault = useCallback(() => {
    setVaultToDelete(null);
  }, []);

  // Toggle expanded details for a vault
  const toggleVaultDetails = useCallback((vaultId: string) => {
    setExpandedVaults((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(vaultId)) {
        newSet.delete(vaultId);
      } else {
        newSet.add(vaultId);
      }
      return newSet;
    });
  }, []);

  // Check if vault details are expanded
  const isVaultExpanded = useCallback(
    (vaultId: string) => {
      return expandedVaults.has(vaultId);
    },
    [expandedVaults],
  );

  // Drag & drop handlers (for future implementation)
  const startKeyDrag = useCallback((keyId: string) => {
    setIsDraggingKey(true);
    setDraggedKeyId(keyId);
  }, []);

  const endKeyDrag = useCallback(() => {
    setIsDraggingKey(false);
    setDraggedKeyId(null);
  }, []);

  const handleKeyDrop = useCallback(
    async (vaultId: string) => {
      if (!draggedKeyId) return;

      try {
        // Add key to vault via backend
        const result = await commands.attachKeyToVault({ vault_id: vaultId, key_id: draggedKeyId });
        if (result.status === 'error') {
          throw new Error(result.error.message);
        }
        // Refresh to update cache
        await refreshVaults();
      } catch (error) {
        logger.error('VaultHubWorkflow', 'Failed to add key to vault', error as Error);
      } finally {
        endKeyDrag();
      }
    },
    [draggedKeyId, refreshVaults, endKeyDrag],
  );

  return {
    // Form state
    name,
    description,
    formError,
    isSubmitting,
    isCreatingVault,

    // Vault data
    vaults,
    currentVault,
    selectedVault,
    isLoading,
    contextError,

    // Combined error (form takes precedence)
    error: formError || contextError,

    // Vault deletion state
    isDeletingVault,
    vaultToDelete,

    // Drag & drop state
    isDraggingKey,
    draggedKeyId,

    // Expanded details
    expandedVaults,

    // Form setters
    setName,
    setDescription,

    // Handlers
    handleSubmit,
    handleClear,
    clearError,
    handleVaultSelect,
    handleDeleteVault,
    prepareDeleteVault,
    cancelDeleteVault,
    toggleCreateForm,
    toggleVaultDetails,
    isVaultExpanded,
    startKeyDrag,
    endKeyDrag,
    handleKeyDrop,
    refreshVaults,
  };
};
