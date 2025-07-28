import React, { useState } from 'react';
import PassphraseInput from '@/components/forms/PassphraseInput';
import { DemoPageWrapper, DemoSection } from './shared';

const PassphraseInputDemo: React.FC = () => {
  const [passphrase, setPassphrase] = useState('');
  const [confirmPassphrase, setConfirmPassphrase] = useState('');

  return (
    <DemoPageWrapper
      title="Passphrase Input Demo"
      description="Interactive demonstration of the PassphraseInput component"
    >
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <DemoSection>
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-4 text-gray-100">Basic Usage</h3>
              <PassphraseInput
                value={passphrase}
                onChange={setPassphrase}
                label="Enter Passphrase"
                placeholder="Type your passphrase..."
                showStrength={true}
              />
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-4 text-gray-100">Confirmation Field</h3>
              <PassphraseInput
                value={confirmPassphrase}
                onChange={setConfirmPassphrase}
                label="Confirm Passphrase"
                placeholder="Re-enter your passphrase..."
                isConfirmationField={true}
                originalPassphrase={passphrase}
              />
            </div>
          </div>
        </DemoSection>

        <DemoSection>
          <h3 className="text-lg font-semibold mb-4 text-gray-100">Component Features</h3>
          <div className="space-y-4 text-gray-300">
            <div>
              <h4 className="font-medium text-gray-200">Password Strength Indicator</h4>
              <p className="text-sm">Real-time feedback on passphrase strength</p>
            </div>
            <div>
              <h4 className="font-medium text-gray-200">Show/Hide Toggle</h4>
              <p className="text-sm">Visibility toggle for better UX</p>
            </div>
            <div>
              <h4 className="font-medium text-gray-200">Confirmation Matching</h4>
              <p className="text-sm">Visual feedback for matching passphrases</p>
            </div>
          </div>
        </DemoSection>
      </div>
    </DemoPageWrapper>
  );
};

export default PassphraseInputDemo;
