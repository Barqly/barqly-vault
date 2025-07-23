import React, { useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Key, Eye, EyeOff, AlertCircle, CheckCircle } from 'lucide-react';
import { GenerateKeyInput, GenerateKeyResponse } from '../../lib/api-types';

interface KeyGenerationFormProps {
  onKeyGenerated?: (key: GenerateKeyResponse) => void;
}

interface FormData {
  label: string;
  passphrase: string;
}

interface FormErrors {
  label?: string;
  passphrase?: string;
}

interface PassphraseStrength {
  isStrong: boolean;
  message: string;
  score: number;
}

const KeyGenerationForm: React.FC<KeyGenerationFormProps> = ({ onKeyGenerated }) => {
  const [formData, setFormData] = useState<FormData>({
    label: '',
    passphrase: ''
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassphrase, setShowPassphrase] = useState(false);
  const [passphraseStrength, setPassphraseStrength] = useState<PassphraseStrength>({
    isStrong: false,
    message: '',
    score: 0
  });
  const [generatedKey, setGeneratedKey] = useState<GenerateKeyResponse | null>(null);
  const [successMessage, setSuccessMessage] = useState<string>('');

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
    if (passphrase.length < 12) {
      return 'Passphrase must be at least 12 characters long';
    }
    const strength = checkPassphraseStrength(passphrase);
    if (!strength.isStrong) {
      return 'Passphrase is too weak';
    }
    return undefined;
  };

  const checkPassphraseStrength = (passphrase: string): PassphraseStrength => {
    if (!passphrase) {
      return { isStrong: false, message: '', score: 0 };
    }

    let score = 0;
    const messages: string[] = [];

    // Length check
    if (passphrase.length >= 12) score += 2;
    if (passphrase.length >= 16) score += 1;
    if (passphrase.length >= 20) score += 1;

    // Character variety checks
    if (/[a-z]/.test(passphrase)) score += 1;
    if (/[A-Z]/.test(passphrase)) score += 1;
    if (/[0-9]/.test(passphrase)) score += 1;
    if (/[^a-zA-Z0-9]/.test(passphrase)) score += 1;

    // Common password check
    const commonPasswords = ['password', '123456', 'qwerty', 'admin', 'letmein'];
    if (commonPasswords.some(common => passphrase.toLowerCase().includes(common))) {
      score -= 2;
      messages.push('Avoid common passwords');
    }

    // Sequential patterns check
    if (/(.)\1{2,}/.test(passphrase)) {
      score -= 1;
      messages.push('Avoid repeated characters');
    }

    // Determine strength level
    let message = '';
    let isStrong = false;

    if (score >= 6) {
      message = 'Strong passphrase';
      isStrong = true;
    } else if (score >= 4) {
      message = 'Moderate passphrase';
      isStrong = false;
    } else if (score >= 2) {
      message = 'Weak passphrase';
      isStrong = false;
    } else {
      message = 'Very weak passphrase';
      isStrong = false;
    }

    // Show "passphrase is too weak" for weak passwords
    if (!isStrong) {
      message = 'Passphrase is too weak';
    }

    if (messages.length > 0) {
      message += ` - ${messages.join(', ')}`;
    }

    return { isStrong, message, score };
  };

  const handleInputChange = (field: keyof FormData, value: string) => {
    const newFormData = { ...formData, [field]: value };
    setFormData(newFormData);

    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }

    // Check passphrase strength in real-time
    if (field === 'passphrase') {
      const strength = checkPassphraseStrength(value);
      setPassphraseStrength(strength);
    }
  };

  const validateForm = (): boolean => {
    const labelError = validateKeyLabel(formData.label);
    const passphraseError = validatePassphrase(formData.passphrase);

    const newErrors: FormErrors = {};
    if (labelError) newErrors.label = labelError;
    if (passphraseError) newErrors.passphrase = passphraseError;

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    setSuccessMessage('');
    setGeneratedKey(null);

    try {
      const input: GenerateKeyInput = {
        label: formData.label.trim(),
        passphrase: formData.passphrase
      };

      const result = await invoke<GenerateKeyResponse>('generate_key', input);
      
      setGeneratedKey(result);
      setSuccessMessage('Key generated successfully!');
      
      // Reset form
      setFormData({ label: '', passphrase: '' });
      setPassphraseStrength({ isStrong: false, message: '', score: 0 });
      
      // Call callback if provided
      if (onKeyGenerated) {
        onKeyGenerated(result);
      }
    } catch (error) {
      console.error('Key generation failed:', error);
      setErrors({ 
        passphrase: error instanceof Error ? error.message : 'failed to generate key' 
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getPassphraseStrengthColor = () => {
    if (passphraseStrength.score >= 6) return 'text-green-600';
    if (passphraseStrength.score >= 4) return 'text-yellow-600';
    if (passphraseStrength.score >= 2) return 'text-orange-600';
    return 'text-red-600';
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
          <p className="text-sm text-gray-600">
            Create a new encryption key to secure your files
          </p>
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
            disabled={isSubmitting}
            aria-describedby={errors.label ? 'keyLabel-error' : undefined}
          />
          {errors.label && (
            <p id="keyLabel-error" className="mt-1 text-sm text-red-600 flex items-center" role="alert">
              <AlertCircle className="w-4 h-4 mr-1" />
              {errors.label}
            </p>
          )}
          <p className="mt-1 text-xs text-gray-500">
            Key label must be 3-50 characters, letters, numbers, spaces, hyphens, and underscores only
          </p>
        </div>

        {/* Passphrase Input */}
        <div>
          <label htmlFor="passphrase" className="block text-sm font-medium text-gray-700 mb-2">
            Passphrase
          </label>
          <div className="relative">
            <input
              id="passphrase"
              type={showPassphrase ? 'text' : 'password'}
              value={formData.passphrase}
              onChange={(e) => handleInputChange('passphrase', e.target.value)}
              className={`w-full px-3 py-2 pr-10 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                errors.passphrase ? 'border-red-300' : 'border-gray-300'
              }`}
              placeholder="Enter a strong passphrase"
              disabled={isSubmitting}
              aria-describedby={errors.passphrase ? 'passphrase-error' : 'passphrase-strength'}
            />
            <button
              type="button"
              onClick={() => setShowPassphrase(!showPassphrase)}
              className="absolute inset-y-0 right-0 pr-3 flex items-center"
              disabled={isSubmitting}
              tabIndex={-1}
              aria-label={showPassphrase ? 'Hide password' : 'Show password'}
            >
              {showPassphrase ? (
                <EyeOff className="h-4 w-4 text-gray-400" />
              ) : (
                <Eye className="h-4 w-4 text-gray-400" />
              )}
            </button>
          </div>
          
          {/* Passphrase Strength Indicator */}
          <div id="passphrase-strength" className="mt-2">
            <p className={`text-sm font-medium ${getPassphraseStrengthColor()}`}>
              Passphrase Strength: {passphraseStrength.message || 'Enter a passphrase'}
            </p>
            <div className="mt-1 w-full bg-gray-200 rounded-full h-2">
              <div
                className={`h-2 rounded-full transition-all duration-300 ${
                  passphraseStrength.score >= 6 ? 'bg-green-500' :
                  passphraseStrength.score >= 4 ? 'bg-yellow-500' :
                  passphraseStrength.score >= 2 ? 'bg-orange-500' : 'bg-red-500'
                }`}
                style={{ width: `${Math.min((passphraseStrength.score / 6) * 100, 100)}%` }}
              />
            </div>
          </div>

          {errors.passphrase && (
            <p id="passphrase-error" className="mt-1 text-sm text-red-600 flex items-center" role="alert">
              <AlertCircle className="w-4 h-4 mr-1" />
              {errors.passphrase}
            </p>
          )}
          
          <p className="mt-1 text-xs text-gray-500">
            Passphrase must be at least 12 characters with letters, numbers, and symbols
          </p>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
              Generating Key...
            </>
          ) : (
            'Generate Key'
          )}
        </button>
      </form>

      {/* Success Message */}
      {successMessage && (
        <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-md">
          <div className="flex items-center">
            <CheckCircle className="w-5 h-5 text-green-400 mr-2" />
            <p className="text-sm font-medium text-green-800">{successMessage}</p>
          </div>
        </div>
      )}

      {/* Generated Key Display */}
      {generatedKey && (
        <div className="mt-6 p-4 bg-gray-50 border border-gray-200 rounded-md">
          <h3 className="text-sm font-medium text-gray-900 mb-2">Generated Public Key</h3>
          <div className="bg-white p-3 rounded border font-mono text-xs break-all">
            {generatedKey.public_key}
          </div>
          <p className="mt-2 text-xs text-gray-600">
            Key ID: {generatedKey.key_id}
          </p>
        </div>
      )}
    </div>
  );
};

export default KeyGenerationForm; 