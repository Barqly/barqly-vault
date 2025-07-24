import React, { useState, useRef, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Key, AlertCircle, CheckCircle, Info } from 'lucide-react';
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
  const [showLabelTooltip, setShowLabelTooltip] = useState(false);
  const labelTooltipRef = useRef<HTMLDivElement>(null);
  const labelInfoButtonRef = useRef<HTMLButtonElement>(null);

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

  // Handle tooltip visibility for key label
  const handleLabelTooltipToggle = () => {
    setShowLabelTooltip(!showLabelTooltip);
  };

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
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
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
            </div>

            {/* Info icon with tooltip - positioned outside input */}
            <div className="relative flex-shrink-0">
              <button
                ref={labelInfoButtonRef}
                type="button"
                onClick={handleLabelTooltipToggle}
                className="text-gray-400 hover:text-gray-600 transition-colors duration-200"
                aria-label="Key label requirements"
                tabIndex={0}
              >
                <Info className="h-4 w-4" />
              </button>

              {/* Tooltip */}
              {showLabelTooltip && (
                <div
                  ref={labelTooltipRef}
                  className="absolute z-50 mt-2 w-80 p-3 bg-gray-900 text-white text-sm rounded-lg shadow-lg border border-gray-700"
                  style={{
                    left: '0',
                    top: '100%',
                  }}
                >
                  <div className="space-y-2">
                    <p className="font-medium text-gray-100">Key Label Requirements:</p>
                    <ul className="space-y-1 text-gray-300">
                      <li>• 3-50 characters long</li>
                      <li>• Letters, numbers, spaces, hyphens, and underscores only</li>
                      <li>• Used to identify your key in the vault</li>
                    </ul>
                  </div>

                  {/* Tooltip arrow */}
                  <div
                    className="absolute w-0 h-0 border-l-4 border-r-4 border-b-4 border-transparent border-b-gray-900"
                    style={{
                      left: '8px',
                      top: '-4px',
                    }}
                  />
                </div>
              )}
            </div>
          </div>

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
          isConfirmationField={true}
          originalPassphrase={formData.passphrase}
          showStrength={false}
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
