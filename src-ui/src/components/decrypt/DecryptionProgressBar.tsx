import React from 'react';
import { CheckCircle } from 'lucide-react';

interface DecryptionProgressBarProps {
  currentStep: number;
}

/**
 * Progress bar component showing decryption workflow steps
 * Extracted from DecryptPage to reduce component size
 */
const DecryptionProgressBar: React.FC<DecryptionProgressBarProps> = ({ currentStep }) => {
  const getStepProgress = () => {
    const totalSteps = 3;
    return ((currentStep - 1) / (totalSteps - 1)) * 100;
  };

  return (
    <div className="bg-gray-50 border-b border-gray-200">
      <div className="max-w-4xl mx-auto px-6 py-3">
        <div className="flex items-center justify-between text-xs text-gray-600 mb-2">
          <span className={currentStep >= 1 ? 'text-blue-600 font-medium' : ''}>
            {currentStep > 1 ? <CheckCircle className="inline w-3 h-3 mr-1" /> : null}
            Step 1: Select Vault
          </span>
          <span className={currentStep >= 2 ? 'text-blue-600 font-medium' : ''}>
            {currentStep > 2 ? <CheckCircle className="inline w-3 h-3 mr-1" /> : null}
            Step 2: Unlock with Key
          </span>
          <span className={currentStep >= 3 ? 'text-blue-600 font-medium' : ''}>
            <CheckCircle className="inline w-3 h-3 mr-1" />
            Ready to Decrypt
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-1">
          <div
            className="bg-gradient-to-r from-blue-500 to-green-500 h-1 rounded-full transition-all duration-500"
            style={{ width: `${getStepProgress()}%` }}
          />
        </div>
      </div>
    </div>
  );
};

export default DecryptionProgressBar;
