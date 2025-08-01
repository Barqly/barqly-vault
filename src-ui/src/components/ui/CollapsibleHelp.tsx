import React, { useState } from 'react';
import { Info, ChevronDown, Key, Lock, Share2 } from 'lucide-react';

interface CollapsibleHelpProps {
  /** Custom trigger text */
  triggerText?: string;
  /** Show detailed steps or simplified version */
  detailed?: boolean;
}

const CollapsibleHelp: React.FC<CollapsibleHelpProps> = ({
  triggerText = 'Learn what happens next',
  detailed = true,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const steps = [
    {
      number: '1',
      icon: Key,
      title: 'Key Generation',
      description: 'Your encryption keypair is created and securely stored on your device.',
      detail:
        'Uses industry-standard age encryption with your passphrase protecting the private key.',
    },
    {
      number: '2',
      icon: Lock,
      title: 'File Encryption',
      description:
        'Use your key to encrypt important files like wallet backups and recovery information.',
      detail: 'Files are compressed, archived, and encrypted in a single secure bundle.',
    },
    {
      number: '3',
      icon: Share2,
      title: 'Secure Storage',
      description:
        'Store encrypted files safely and share the public key with trusted family members.',
      detail: 'Only those with your private key and passphrase can decrypt your files.',
    },
  ];

  return (
    <div className="mt-6" data-testid="collapsible-help">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded"
        aria-expanded={isOpen}
        aria-controls="help-content"
        data-testid="help-trigger"
      >
        <Info className="h-4 w-4" aria-hidden="true" />
        <span>{triggerText}</span>
        <ChevronDown
          className={`h-4 w-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
          aria-hidden="true"
          data-testid="chevron-icon"
        />
      </button>

      <div
        id="help-content"
        className={`
          overflow-hidden transition-all duration-300 ease-in-out
          ${isOpen ? 'max-h-96 opacity-100 mt-4' : 'max-h-0 opacity-0'}
        `}
        aria-hidden={!isOpen}
        data-testid="help-content"
      >
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-900 mb-4">
            How Bitcoin Legacy Protection Works
          </h3>

          <div className="grid gap-4 md:grid-cols-3">
            {steps.map((step) => (
              <div key={step.number} className="text-sm">
                <div className="flex items-center gap-2 mb-2">
                  <div className="flex items-center justify-center w-6 h-6 bg-blue-600 text-white text-xs font-bold rounded-full">
                    {step.number}
                  </div>
                  <step.icon className="h-4 w-4 text-blue-600" aria-hidden="true" />
                  <h4 className="font-medium text-blue-900">{step.title}</h4>
                </div>
                <p className="text-blue-800 mb-2">{step.description}</p>
                {detailed && <p className="text-blue-700 text-xs">{step.detail}</p>}
              </div>
            ))}
          </div>

          <div className="mt-4 pt-4 border-t border-blue-150">
            <p className="text-xs text-blue-700">
              <strong>Security Note:</strong> Your private key never leaves this device. Only share
              your public key with trusted individuals.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CollapsibleHelp;
