import React, { useCallback } from 'react';
import { ChevronLeft } from 'lucide-react';
import { KeySelectionDropdown } from '../../forms/KeySelectionDropdown';
import { useEncryptFlow } from '../../../contexts/EncryptFlowContext';

/**
 * Step 2: Key Selection
 * Clean design matching Decrypt screen - just key dropdown and navigation
 */
const EncryptStep2: React.FC = () => {
  const { selectedKeyId, setSelectedKeyId, navigateToStep, markStepCompleted, selectedFiles } =
    useEncryptFlow();

  const handleKeyChange = useCallback(
    (keyId: string) => {
      setSelectedKeyId(keyId);
      if (keyId) {
        markStepCompleted(2);
        // Auto-advance to next step
        setTimeout(() => navigateToStep(3), 500);
      }
    },
    [setSelectedKeyId, markStepCompleted, navigateToStep],
  );

  const handleBack = useCallback(() => {
    navigateToStep(1);
  }, [navigateToStep]);

  const handleContinue = useCallback(() => {
    if (selectedKeyId) {
      navigateToStep(3);
    }
  }, [selectedKeyId, navigateToStep]);

  if (!selectedFiles) {
    return null; // Should not render if no files selected
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
      {/* Card Content */}
      <div className="p-6">
        <div className="min-h-[200px] max-h-[350px] mb-6">
          <div className="space-y-4">
            <div>
              <KeySelectionDropdown
                value={selectedKeyId || ''}
                onChange={handleKeyChange}
                placeholder="Choose an encryption key..."
              />
            </div>
          </div>
        </div>

        {/* Navigation Buttons */}
        <div className="flex items-center justify-between pt-4 border-t border-gray-100">
          <button
            onClick={handleBack}
            className="flex items-center gap-1 px-4 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-300 hover:text-gray-800 hover:bg-gray-50 rounded-md transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            Previous
          </button>

          <button
            onClick={handleContinue}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              selectedKeyId
                ? 'bg-blue-600 text-white hover:bg-blue-700'
                : 'bg-gray-100 text-gray-400 cursor-not-allowed'
            }`}
            disabled={!selectedKeyId}
          >
            Continue
          </button>
        </div>
      </div>
    </div>
  );
};

export default EncryptStep2;
