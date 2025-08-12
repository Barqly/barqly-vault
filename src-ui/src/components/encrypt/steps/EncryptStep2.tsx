import React, { useCallback, useEffect, useState } from 'react';
import { Key, Shield, Check, AlertCircle, ChevronLeft } from 'lucide-react';
import { KeySelectionDropdown } from '../../forms/KeySelectionDropdown';
import AnimatedTransition from '../../ui/AnimatedTransition';
import { useEncryptFlow } from '../../../contexts/EncryptFlowContext';
import { useToast } from '../../../hooks/useToast';

/**
 * Step 2: Key Selection
 * Guides user through selecting the encryption key
 */
const EncryptStep2: React.FC = () => {
  const { selectedKeyId, setSelectedKeyId, navigateToStep, markStepCompleted, selectedFiles } =
    useEncryptFlow();

  const { showInfo } = useToast();
  const [showKeyInfo, setShowKeyInfo] = useState(false);

  // Auto-show key info on first visit
  useEffect(() => {
    if (!selectedKeyId) {
      const timer = setTimeout(() => setShowKeyInfo(true), 500);
      return () => clearTimeout(timer);
    }
  }, [selectedKeyId]);

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

  const handleLearnMore = useCallback(() => {
    showInfo(
      'About Encryption Keys',
      'Your encryption key is like a digital lock that protects your files. Only someone with the matching private key can decrypt them. Make sure you have backed up your private key securely!',
    );
  }, [showInfo]);

  if (!selectedFiles) {
    return null; // Should not render if no files selected
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border">
      {/* Header */}
      <div className="px-6 py-4 border-b bg-gradient-to-r from-indigo-50 to-purple-50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className={`flex items-center justify-center w-8 h-8 rounded-full ${
                selectedKeyId ? 'bg-green-100' : 'bg-blue-100'
              }`}
            >
              {selectedKeyId ? (
                <Check className="w-5 h-5 text-green-600" />
              ) : (
                <span className="text-blue-600 font-semibold">2</span>
              )}
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                {selectedKeyId ? 'Encryption Key Selected' : 'Choose Your Encryption Key'}
              </h2>
              {!selectedKeyId && (
                <p className="text-sm text-gray-600 mt-0.5">
                  Select the key that will protect your files
                </p>
              )}
            </div>
          </div>

          {selectedKeyId && (
            <button
              onClick={() => setSelectedKeyId('')}
              className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
            >
              Change key
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        <div className="space-y-4">
          {/* Key selection dropdown */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Encryption Key
            </label>
            <KeySelectionDropdown
              value={selectedKeyId}
              onChange={handleKeyChange}
              placeholder="Choose an encryption key..."
            />
          </div>

          {/* Key information panel */}
          <AnimatedTransition show={showKeyInfo && !selectedKeyId} duration={300}>
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <div className="flex gap-3">
                <Shield className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div className="space-y-2">
                  <h3 className="text-sm font-medium text-amber-900">
                    Why Do I Need an Encryption Key?
                  </h3>
                  <p className="text-xs text-amber-700 leading-relaxed">
                    Your encryption key acts like a digital lock for your files. Only someone with
                    the matching private key can decrypt them. This ensures your files remain secure
                    even if they're intercepted or accessed by unauthorized parties.
                  </p>
                  <button
                    onClick={handleLearnMore}
                    className="text-xs font-medium text-amber-700 hover:text-amber-800 underline"
                  >
                    Learn more about key security
                  </button>
                </div>
              </div>
            </div>
          </AnimatedTransition>

          {/* Selected key confirmation */}
          <AnimatedTransition show={!!selectedKeyId} duration={300}>
            {selectedKeyId && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex gap-3">
                  <Key className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <div className="space-y-2">
                    <h3 className="text-sm font-medium text-green-900">
                      Key Selected Successfully
                    </h3>
                    <p className="text-xs text-green-700">
                      Your files will be encrypted with this key. Make sure you have access to the
                      corresponding private key for future decryption.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </AnimatedTransition>

          {/* Important reminder */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex gap-3">
              <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="space-y-1">
                <h3 className="text-sm font-medium text-blue-900">Important Reminder</h3>
                <p className="text-xs text-blue-700 leading-relaxed">
                  Files encrypted with this key can only be decrypted using the matching private
                  key. Ensure you have securely backed up your private key before proceeding.
                </p>
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-between pt-2">
            <button
              onClick={handleBack}
              className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-800 
                       transition-colors font-medium"
            >
              <ChevronLeft className="w-4 h-4" />
              Back to Files
            </button>

            {selectedKeyId && (
              <button
                onClick={handleContinue}
                className="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 
                         transition-colors font-medium shadow-sm hover:shadow-md"
              >
                Continue to Output Settings
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default EncryptStep2;
