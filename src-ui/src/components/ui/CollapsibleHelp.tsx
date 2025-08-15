import React, { useState } from 'react';
import { Info, ChevronDown } from 'lucide-react';

interface CollapsibleHelpProps {
  /** Custom trigger text */
  triggerText?: string;
  /** Context type to determine content */
  context?: 'setup' | 'encrypt' | 'decrypt';
}

const CollapsibleHelp: React.FC<CollapsibleHelpProps> = ({
  triggerText = 'Learn what happens next',
  context,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  // Auto-detect context from trigger text if not explicitly provided
  const actualContext =
    context ||
    (triggerText?.toLowerCase().includes('decrypt')
      ? 'decrypt'
      : triggerText?.toLowerCase().includes('setup') || triggerText?.toLowerCase().includes('work')
        ? 'setup'
        : 'encrypt');

  const setupSteps = [
    {
      number: '1',
      title: 'Create Your Key',
      description: 'Name your vault and set a strong passphrase.',
    },
    {
      number: '2',
      title: 'Store Locally',
      description: 'Your private key stays on this device.',
    },
    {
      number: '3',
      title: 'Stay in Control',
      description: 'Only your passphrase can unlock it.',
    },
  ];

  const encryptSteps = [
    {
      number: '1',
      title: 'Add Your Files',
      description: 'Select files or folders to protect.',
    },
    {
      number: '2',
      title: 'Lock with Your Key',
      description: 'Encrypt so only your key + passphrase can open them.',
    },
    {
      number: '3',
      title: 'Store Securely',
      description: 'Save the vault file anywhere, even in the cloud.',
    },
  ];

  const decryptSteps = [
    {
      number: '1',
      title: 'Select Your Vault',
      description: 'Choose the encrypted file to open.',
    },
    {
      number: '2',
      title: 'Unlock with Your Key',
      description: 'Use your key + passphrase to decrypt.',
    },
    {
      number: '3',
      title: 'Recover Your Files',
      description: 'Restore them to their original folders.',
    },
  ];

  const getStepsAndTitle = () => {
    switch (actualContext) {
      case 'setup':
        return { steps: setupSteps, title: 'How Setup Works' };
      case 'decrypt':
        return { steps: decryptSteps, title: 'How Decryption Works' };
      case 'encrypt':
      default:
        return { steps: encryptSteps, title: 'How Encryption Works' };
    }
  };

  const { steps, title } = getStepsAndTitle();

  return (
    <div className="mt-6">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 transition-colors focus-visible:ring-2 focus-visible:ring-blue-300 focus-visible:ring-offset-2 focus-visible:ring-offset-white rounded-md"
        aria-expanded={isOpen}
        aria-controls="help-content"
      >
        <Info className="h-4 w-4" aria-hidden="true" />
        <span>{triggerText}</span>
        <ChevronDown
          className={`h-4 w-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
          aria-hidden="true"
        />
      </button>

      <div
        id="help-content"
        className={`
          overflow-hidden transition-all duration-300 ease-in-out
          ${isOpen ? 'max-h-96 opacity-100 mt-4' : 'max-h-0 opacity-0'}
        `}
        aria-hidden={!isOpen}
      >
        <div className="rounded-xl border border-blue-200 bg-blue-50 p-5 md:p-6">
          <h3 className="mb-4 text-base font-semibold text-blue-800">{title}</h3>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3 md:gap-6">
            {steps.map((step) => (
              <div key={step.number}>
                <div className="mb-1 flex items-center gap-2">
                  <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-white text-sm font-semibold text-blue-800 ring-1 ring-slate-200">
                    {step.number}
                  </span>
                  <span className="text-sm md:text-base font-semibold text-blue-800">
                    {step.title}
                  </span>
                </div>
                <p className="text-sm text-slate-700 leading-relaxed">{step.description}</p>
              </div>
            ))}
          </div>

          <p className="mt-4 border-t border-slate-200 pt-3 text-xs text-slate-500 italic">
            <span className="font-semibold">Security Note:</span> Your private key never leaves this
            device. Share your public key only with trusted individuals.
          </p>
        </div>
      </div>
    </div>
  );
};

export default CollapsibleHelp;
