import React from 'react';
import { CheckCircle } from 'lucide-react';

interface DecryptionProgressBarProps {
  currentStep: number;
  onStepClick?: (step: number) => void;
  canNavigateToStep?: (step: number) => boolean;
}

/**
 * Interactive progress bar component showing decryption workflow steps
 * Users can click on completed/available steps to navigate
 */
const DecryptionProgressBar: React.FC<DecryptionProgressBarProps> = ({
  currentStep,
  onStepClick,
  canNavigateToStep,
}) => {
  const getStepProgress = () => {
    const totalSteps = 3;
    return ((currentStep - 1) / (totalSteps - 1)) * 100;
  };

  const handleStepClick = (step: number) => {
    if (onStepClick && canNavigateToStep && canNavigateToStep(step)) {
      onStepClick(step);
    }
  };

  const getStepClasses = (step: number) => {
    const baseClasses = 'transition-all duration-200';
    const isActive = currentStep >= step;
    const isClickable = canNavigateToStep && canNavigateToStep(step);

    let classes = baseClasses;

    if (isActive) {
      classes += ' text-blue-600 font-medium';
    } else {
      classes += ' text-gray-600';
    }

    if (isClickable) {
      classes += ' cursor-pointer hover:text-blue-700 hover:font-medium';
    }

    return classes;
  };

  return (
    <div className="bg-gray-50 border-b border-gray-200">
      <div className="max-w-4xl mx-auto px-6 py-3">
        <div className="flex items-center justify-between text-xs mb-2">
          <span className={getStepClasses(1)} onClick={() => handleStepClick(1)}>
            {currentStep > 1 ? (
              <CheckCircle className="inline w-3 h-3 mr-1 text-green-600" />
            ) : null}
            Step 1: Select Vault
          </span>
          <span className={getStepClasses(2)} onClick={() => handleStepClick(2)}>
            {currentStep > 2 ? (
              <CheckCircle className="inline w-3 h-3 mr-1 text-green-600" />
            ) : null}
            Step 2: Unlock with Key
          </span>
          <span className={getStepClasses(3)} onClick={() => handleStepClick(3)}>
            {currentStep >= 3 ? (
              <CheckCircle className="inline w-3 h-3 mr-1 text-green-600" />
            ) : null}
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
