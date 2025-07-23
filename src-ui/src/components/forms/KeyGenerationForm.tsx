import React, { useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Key, AlertCircle, CheckCircle } from 'lucide-react';
import { GenerateKeyInput, GenerateKeyResponse } from '../../lib/api-types';
import PassphraseInput from './PassphraseInput';

interface KeyGenerationFormProps {
  // eslint-disable-next-line no-unused-vars
  onKeyGenerated?: (key: GenerateKeyResponse) => void;
}

interface FormData {
  label: string;
  passphrase: string;
  confirmPassphrase: string;
}

interface FormErrors {
  label?: string;
  passphrase?: string;
  confirmPassphrase?: string;
}

const KeyGenerationForm: React.FC<KeyGenerationFormProps> = ({ onKeyGenerated }) => {
  const [formData, setFormData] = useState<FormData>({
    label: '',
    passphrase: '',
    confirmPassphrase: '',
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState<GenerateKeyResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Validation functions
  const validateKeyLabel = (label: string): string | undefined => {
    if (!label.trim()) {
      return 'Key label is required';
    }
    if (label.length < 3) {
      return 'Key label must be at least 3 characters long';
    }
    if (label.length > 50) {
      return 'Key label must be less than 50 characters';
    }
    if (!/^[a-zA-Z0-9\s\-_]+$/.test(label)) {
      return 'Key label contains invalid characters (only letters, numbers, spaces, hyphens, and underscores allowed)';
    }
    return undefined;
  };

  const validatePassphrase = (passphrase: string): string | undefined => {
    if (!passphrase) {
      return 'Passphrase is required';
    }
    if (passphrase.length < 8) {
      return 'Passphrase must be at least 8 characters long';
    }
    return undefined;
  };

  const validateConfirmPassphrase = (
    confirmPassphrase: string,
    passphrase: string,
  ): string | undefined => {
    if (!confirmPassphrase) {
      return 'Please confirm your passphrase';
    }
    if (confirmPassphrase !== passphrase) {
      return 'Passphrases do not match';
    }
    return undefined;
  };

  const handleInputChange = (field: keyof FormData, value: string) => {
    const newFormData = { ...formData, [field]: value };
    setFormData(newFormData);

    // Clear error when user starts typing (but not during form submission)
    if (errors[field] && !isLoading) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const validateForm = (): boolean => {
    const labelError = validateKeyLabel(formData.label);
    const passphraseError = validatePassphrase(formData.passphrase);
    const confirmPassphraseError = validateConfirmPassphrase(
      formData.confirmPassphrase,
      formData.passphrase,
    );

    const newErrors: FormErrors = {};
    if (labelError) newErrors.label = labelError;
    if (passphraseError) newErrors.passphrase = passphraseError;
    if (confirmPassphraseError) newErrors.confirmPassphrase = confirmPassphraseError;

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
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
      console.error('Key generation failed:', err);
      setError(err instanceof Error ? err.message : 'Key generation failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto">
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Form Header */}
        <div className="text-center">
          <div className="mx-auto w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-4">
            <Key className="w-6 h-6 text-blue-600" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Generate Encryption Key</h2>
          <p className="text-sm text-gray-600">Create a new encryption key to secure your files</p>
        </div>

        {/* Key Label Input */}
        <div>
          <label htmlFor="keyLabel" className="block text-sm font-medium text-gray-700 mb-2">
            Key Label
          </label>
          <input
            id="keyLabel"
            type="text"
            value={formData.label}
            onChange={(e) => handleInputChange('label', e.target.value)}
            className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
              errors.label ? 'border-red-300' : 'border-gray-300'
            }`}
            placeholder="e.g., My Backup Key"
            disabled={isLoading}
            aria-describedby={errors.label ? 'keyLabel-error' : undefined}
          />
          {errors.label && (
            <p
              id="keyLabel-error"
              className="mt-1 text-sm text-red-600 flex items-center"
              role="alert"
            >
              <AlertCircle className="w-4 h-4 mr-1" />
              {errors.label}
            </p>
          )}
          <p className="mt-1 text-xs text-gray-500">
            Key label must be 3-50 characters, letters, numbers, spaces, hyphens, and underscores
            only
          </p>
        </div>

        {/* Passphrase Input */}
        <PassphraseInput
          value={formData.passphrase}
          onChange={(value) => handleInputChange('passphrase', value)}
          label="Passphrase"
          placeholder="Enter a strong passphrase"
          disabled={isLoading}
          required
          error={errors.passphrase}
          minLength={8}
          requireStrong
          showStrength
          id="passphrase-input"
        />

        {/* Confirm Passphrase Input */}
        <PassphraseInput
          value={formData.confirmPassphrase}
          onChange={(value) => handleInputChange('confirmPassphrase', value)}
          label="Confirm Passphrase"
          placeholder="Confirm your passphrase"
          disabled={isLoading}
          required
          error={errors.confirmPassphrase}
          minLength={8}
          id="confirm-passphrase-input"
        />

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isLoading}
          className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
              Generating Key...
            </>
          ) : (
            'Generate Key'
          )}
        </button>
      </form>

      {/* Error Message */}
      {error && (
        <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-md">
          <div className="flex items-center">
            <AlertCircle className="w-5 h-5 text-red-400 mr-2" />
            <p className="text-sm font-medium text-red-800">{error}</p>
          </div>
        </div>
      )}

      {/* Success Message */}
      {success && (
        <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-md">
          <div className="flex items-center">
            <CheckCircle className="w-5 h-5 text-green-400 mr-2" />
            <p className="text-sm font-medium text-green-800">Key generated successfully!</p>
          </div>
        </div>
      )}

      {/* Generated Key Display */}
      {success && (
        <div className="mt-6 p-4 bg-gray-50 border border-gray-200 rounded-md">
          <h3 className="text-sm font-medium text-gray-900 mb-2">Generated Public Key</h3>
          <div className="bg-white p-3 rounded border font-mono text-xs break-all">
            {success.public_key}
          </div>
          <p className="mt-2 text-xs text-gray-600">Key ID: {success.key_id}</p>
        </div>
      )}
    </div>
  );
};

export default KeyGenerationForm;
