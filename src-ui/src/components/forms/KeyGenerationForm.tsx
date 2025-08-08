import React from 'react';
import { GenerateKeyResponse } from '../../lib/api-types';
import PassphraseInput from './PassphraseInput';
import { useKeyGenerationForm } from '../../hooks/useKeyGenerationForm';
import FormHeader from './KeyGenerationForm/FormHeader';
import KeyLabelInput from './KeyGenerationForm/KeyLabelInput';
import FormMessages from './KeyGenerationForm/FormMessages';

interface KeyGenerationFormProps {
  onKeyGenerated?: (key: GenerateKeyResponse) => void;
}

/**
 * Key generation form component
 *
 * Provides a user-friendly interface for generating encryption keys
 * with validation, error handling, and success feedback.
 */
const KeyGenerationForm: React.FC<KeyGenerationFormProps> = ({ onKeyGenerated }) => {
  const {
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
  } = useKeyGenerationForm({ onKeyGenerated });

  return (
    <div className="max-w-md mx-auto">
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Form Header */}
        <FormHeader />

        {/* Key Label Input */}
        <KeyLabelInput
          value={formData.label}
          onChange={(value) => handleInputChange('label', value)}
          error={errors.label}
          disabled={isLoading}
          showTooltip={showLabelTooltip}
          onTooltipToggle={handleLabelTooltipToggle}
          tooltipRef={labelTooltipRef}
          infoButtonRef={labelInfoButtonRef}
        />

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

      {/* Success/Error Messages and Generated Key Display */}
      <FormMessages error={error} success={success} />
    </div>
  );
};

export default KeyGenerationForm;
