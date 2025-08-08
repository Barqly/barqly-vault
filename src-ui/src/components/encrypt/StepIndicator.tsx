import React from 'react';
import { Check } from 'lucide-react';

interface StepIndicatorProps {
  currentStep: number;
  selectedFiles: boolean;
  selectedKeyId: boolean;
  outputPath: boolean;
}

/**
 * Step indicator component showing encryption workflow progress
 * Extracted from EncryptPage to reduce component size
 */
const StepIndicator: React.FC<StepIndicatorProps> = ({
  currentStep,
  selectedFiles,
  selectedKeyId,
  outputPath,
}) => {
  const steps = [
    { id: 1, label: 'Select Files', completed: selectedFiles },
    { id: 2, label: 'Choose Key', completed: selectedKeyId },
    { id: 3, label: 'Set Destination', completed: outputPath },
  ];

  return (
    <div className="bg-gray-50 rounded-lg p-4 mb-6">
      <div className="flex items-center justify-between">
        {steps.map((step, index) => (
          <React.Fragment key={step.id}>
            <div
              className={`flex items-center gap-2 ${
                currentStep >= step.id ? 'text-blue-600' : 'text-gray-400'
              }`}
            >
              <div
                className={`flex items-center justify-center w-8 h-8 rounded-full ${
                  step.completed
                    ? 'bg-green-500 text-white'
                    : currentStep === step.id
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-300 text-gray-600'
                }`}
              >
                {step.completed ? <Check className="w-4 h-4" /> : step.id}
              </div>
              <span className="text-sm font-medium">{step.label}</span>
            </div>
            {index < steps.length - 1 && <div className="flex-1 h-0.5 bg-gray-300 mx-2" />}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
};

export default StepIndicator;
