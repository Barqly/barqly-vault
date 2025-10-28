import React, { useState, useCallback, useRef, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { GenerateKeyInput, GenerateKeyResponse } from '../bindings';
import { validateKeyGenerationForm } from '../lib/validation/key-generation-validation';
import { logger } from '../lib/logger';

export interface KeyGenerationFormData {
  label: string;
  passphrase: string;
  confirmPassphrase: string;
}

export interface KeyGenerationFormErrors {
  label?: string;
  passphrase?: string;
  confirmPassphrase?: string;
}

export interface UseKeyGenerationFormProps {
  onKeyGenerated?: (key: GenerateKeyResponse) => void;
}

export interface UseKeyGenerationFormReturn {
  formData: KeyGenerationFormData;
  errors: KeyGenerationFormErrors;
  isLoading: boolean;
  success: GenerateKeyResponse | null;
  error: string | null;
  showLabelTooltip: boolean;
  labelTooltipRef: React.RefObject<HTMLDivElement | null>;
  labelInfoButtonRef: React.RefObject<HTMLButtonElement | null>;
  handleInputChange: (field: keyof KeyGenerationFormData, value: string) => void;
  handleSubmit: (e: React.FormEvent) => Promise<void>;
  handleLabelTooltipToggle: () => void;
  resetForm: () => void;
}

/**
 * Custom hook for managing key generation form state and logic
 */
export const useKeyGenerationForm = ({
  onKeyGenerated,
}: UseKeyGenerationFormProps = {}): UseKeyGenerationFormReturn => {
  const [formData, setFormData] = useState<KeyGenerationFormData>({
    label: '',
    passphrase: '',
    confirmPassphrase: '',
  });

  const [errors, setErrors] = useState<KeyGenerationFormErrors>({});
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState<GenerateKeyResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showLabelTooltip, setShowLabelTooltip] = useState(false);

  const labelTooltipRef = useRef<HTMLDivElement>(null);
  const labelInfoButtonRef = useRef<HTMLButtonElement>(null);

  // Handle input changes
  const handleInputChange = useCallback(
    (field: keyof KeyGenerationFormData, value: string) => {
      setFormData((prev) => ({ ...prev, [field]: value }));

      // Clear error when user starts typing (but not during form submission)
      if (errors[field] && !isLoading) {
        setErrors((prev) => ({ ...prev, [field]: undefined }));
      }
    },
    [errors, isLoading],
  );

  // Validate form
  const validateForm = useCallback((): boolean => {
    const validation = validateKeyGenerationForm(
      formData.label,
      formData.passphrase,
      formData.confirmPassphrase,
    );

    const newErrors: KeyGenerationFormErrors = {};
    if (validation.label) newErrors.label = validation.label;
    if (validation.passphrase) newErrors.passphrase = validation.passphrase;
    if (validation.confirmPassphrase) newErrors.confirmPassphrase = validation.confirmPassphrase;

    setErrors(newErrors);
    return validation.isValid;
  }, [formData]);

  // Handle tooltip toggle
  const handleLabelTooltipToggle = useCallback(() => {
    setShowLabelTooltip((prev) => !prev);
  }, []);

  // Handle click outside to close tooltip
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        labelTooltipRef.current &&
        !labelTooltipRef.current.contains(event.target as Node) &&
        labelInfoButtonRef.current &&
        !labelInfoButtonRef.current.contains(event.target as Node)
      ) {
        setShowLabelTooltip(false);
      }
    };

    if (showLabelTooltip) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showLabelTooltip]);

  // Handle form submission
  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      if (!validateForm()) {
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const input: GenerateKeyInput = {
          label: formData.label,
          passphrase: formData.passphrase,
        };

        const result = await invoke<GenerateKeyResponse>('generate_key', { input });
        setSuccess(result);

        if (onKeyGenerated) {
          onKeyGenerated(result);
        }

        // Reset form after successful key generation
        setFormData({
          label: '',
          passphrase: '',
          confirmPassphrase: '',
        });
        setError(null);
      } catch (err) {
        logger.error('useKeyGenerationForm', 'Key generation failed', err as Error);
        setError(err instanceof Error ? err.message : 'Key generation failed');
      } finally {
        setIsLoading(false);
      }
    },
    [formData, validateForm, onKeyGenerated],
  );

  // Reset form
  const resetForm = useCallback(() => {
    setFormData({
      label: '',
      passphrase: '',
      confirmPassphrase: '',
    });
    setErrors({});
    setSuccess(null);
    setError(null);
    setShowLabelTooltip(false);
  }, []);

  return {
    formData,
    errors,
    isLoading,
    success,
    error,
    showLabelTooltip,
    labelTooltipRef,
    labelInfoButtonRef,
    handleInputChange,
    handleSubmit,
    handleLabelTooltipToggle,
    resetForm,
  };
};
