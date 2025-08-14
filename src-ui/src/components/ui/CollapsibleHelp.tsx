import React, { useState } from 'react';
import { Info, ChevronDown } from 'lucide-react';

interface CollapsibleHelpProps {
  /** Custom trigger text */
  triggerText?: string;
  /** Context type to determine content */
  context?: 'encrypt' | 'decrypt';
}

const CollapsibleHelp: React.FC<CollapsibleHelpProps> = ({
  triggerText = 'Learn what happens next',
  context,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  // Auto-detect context from trigger text if not explicitly provided
  const actualContext =
    context || (triggerText?.toLowerCase().includes('decrypt') ? 'decrypt' : 'encrypt');

  const encryptSteps = [
    {
      number: '1',
      title: 'Key Generation',
      description:
        '<span class="font-semibold">Your keypair is created and stored securely</span> on this device. Uses industry-standard <code>age</code> encryption. Your passphrase protects the private key.',
    },
    {
      number: '2',
      title: 'File Encryption',
      description:
        '<span class="font-semibold">Encrypt important files or entire folders</span> like wallet backups or recovery docs. Files are compressed and locked into a single secure bundle.',
    },
    {
      number: '3',
      title: 'Secure Storage',
      description:
        '<span class="font-semibold">Store encrypted files safely</span> and share your public key with trusted family. Only your private key + passphrase can unlock your files.',
    },
  ];

  const decryptSteps = [
    {
      number: '1',
      title: 'Select Your Vault',
      description:
        '<span class="font-semibold">Choose the encrypted .age file</span> you want to decrypt. Only files created with Barqly Vault are supported.',
    },
    {
      number: '2',
      title: 'Provide Key & Passphrase',
      description:
        '<span class="font-semibold">Select the key used for encryption</span> and enter your passphrase. Remember: passphrases are case-sensitive.',
    },
    {
      number: '3',
      title: 'Recover Files',
      description:
        '<span class="font-semibold">Files are extracted and verified</span> against the manifest. Your original folder structure is restored.',
    },
  ];

  const steps = actualContext === 'decrypt' ? decryptSteps : encryptSteps;
  const title =
    actualContext === 'decrypt'
      ? 'How Vault Decryption Works'
      : 'How Bitcoin Legacy Protection Works';

  return (
    <div className="mt-6">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex items-center gap-1.5 text-sm text-blue-700 hover:underline transition-colors focus:outline-none focus:ring-2 focus:ring-blue-300 focus:ring-offset-2 rounded"
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
                <p
                  className="text-sm text-slate-700 leading-relaxed"
                  dangerouslySetInnerHTML={{ __html: step.description }}
                ></p>
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
