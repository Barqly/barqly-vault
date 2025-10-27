import React, { useState, useRef, useEffect } from 'react';
import { Info, ChevronDown } from 'lucide-react';

interface CollapsibleHelpProps {
  /** Custom trigger text */
  triggerText?: string;
  /** Context type to determine content */
  context?: 'setup' | 'encrypt' | 'decrypt' | 'vault-hub' | 'manage-keys';
}

const CollapsibleHelp: React.FC<CollapsibleHelpProps> = ({
  triggerText = 'Learn what happens next',
  context,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLElement | null>(null);
  const previousScrollTop = useRef<number>(0);

  // Find the scroll container on mount
  useEffect(() => {
    if (containerRef.current) {
      // Find the parent main element that has overflow-auto
      let parent = containerRef.current.parentElement;
      while (parent) {
        const overflowY = window.getComputedStyle(parent).overflowY;
        if (overflowY === 'auto' || overflowY === 'scroll') {
          scrollContainerRef.current = parent as HTMLElement;
          break;
        }
        parent = parent.parentElement;
      }
    }
  }, []);

  // Smart scroll behavior on expand/collapse
  useEffect(() => {
    if (!containerRef.current || !scrollContainerRef.current) return;

    if (isOpen) {
      // Save current scroll position
      previousScrollTop.current = scrollContainerRef.current.scrollTop;

      // Small delay to allow expand animation to start
      setTimeout(() => {
        if (!containerRef.current || !scrollContainerRef.current) return;

        const container = containerRef.current;
        const scrollContainer = scrollContainerRef.current;
        const rect = container.getBoundingClientRect();
        const scrollRect = scrollContainer.getBoundingClientRect();

        // Check if content will be cut off at bottom
        const contentBottom = rect.bottom;
        const viewportBottom = scrollRect.bottom;
        const isContentBelowFold = contentBottom > viewportBottom;

        // Only scroll if content extends below viewport
        if (isContentBelowFold) {
          container.scrollIntoView({
            behavior: 'smooth',
            block: 'start',
          });
        }
      }, 150);
    } else {
      // When collapsed, scroll back to top
      if (scrollContainerRef.current) {
        scrollContainerRef.current.scrollTo({
          top: 0,
          behavior: 'smooth',
        });
      }
    }
  }, [isOpen]);

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
      title: 'Create Key',
      description: 'Name your vault and set a strong passphrase.',
    },
    {
      number: '2',
      title: 'Store Key Locally',
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
      title: 'Add Files',
      description: 'Select files or folders to protect.',
    },
    {
      number: '2',
      title: 'Lock with Keys',
      description: 'Files are encrypted to all keys attached to your vault (2-4 keys).',
    },
    {
      number: '3',
      title: 'Store Vault File',
      description: 'Encrypted vault saved to Barqly-Vaults in your Documents. Safe to store anywhere.',
    },
  ];

  const decryptSteps = [
    {
      number: '1',
      title: 'Select Vault',
      description: 'Choose the encrypted .age file to open.',
    },
    {
      number: '2',
      title: 'Unlock with Any Key',
      description: "Use any one of the vault's keys to decrypt.",
    },
    {
      number: '3',
      title: 'Recover Files',
      description: 'Files are extracted to Barqly-Recovery folder in your Documents.',
    },
  ];

  const vaultHubSteps = [
    {
      number: '1',
      title: 'Create Vaults',
      description: 'Organize documents into secure containers.',
    },
    {
      number: '2',
      title: 'Attach Keys',
      description: 'Add passphrase or YubiKey for access.',
    },
    {
      number: '3',
      title: 'Encrypt & Decrypt',
      description: 'Use vaults to protect your files.',
    },
  ];

  const manageKeysSteps = [
    {
      number: '1',
      title: 'YubiKey (Hardware)',
      description:
        'Physical security key - most secure option. Requires device touch for every operation.',
    },
    {
      number: '2',
      title: 'Passphrase Key (Software)',
      description: 'Password-protected key stored on device. Convenient for regular use.',
    },
    {
      number: '3',
      title: 'Best Practice',
      description: 'Use YubiKeys for sensitive vaults. Mix key types for flexibility and security.',
    },
  ];

  const getStepsAndTitle = () => {
    switch (actualContext) {
      case 'setup':
        return { steps: setupSteps, title: 'How Setup Works' };
      case 'decrypt':
        return { steps: decryptSteps, title: 'How Decryption Works' };
      case 'vault-hub':
        return { steps: vaultHubSteps, title: 'Understanding Vaults' };
      case 'manage-keys':
        return { steps: manageKeysSteps, title: 'Understanding Key Types' };
      case 'encrypt':
      default:
        return { steps: encryptSteps, title: 'How Encryption Works' };
    }
  };

  const { steps, title } = getStepsAndTitle();

  return (
    <div ref={containerRef} className="mt-6">
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
          ${isOpen ? 'max-h-96 opacity-100 mt-4 mb-4' : 'max-h-0 opacity-0'}
        `}
        aria-hidden={!isOpen}
      >
        <div
          className="rounded-xl border p-5 md:p-6"
          style={{
            borderColor: 'rgb(var(--border-default))',
            backgroundColor: 'rgb(var(--info-panel-bg))',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05), inset 0 0 0 1px rgba(255, 255, 255, 0.05)',
          }}
        >
          <h3 className="mb-4 text-base font-semibold text-heading">{title}</h3>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3 md:gap-6">
            {steps.map((step) => (
              <div key={step.number}>
                <div className="mb-1 flex items-center gap-2">
                  <span
                    className="inline-flex h-6 w-6 items-center justify-center rounded-full text-sm font-semibold text-heading border"
                    style={{
                      backgroundColor: 'rgb(var(--surface-card))',
                      borderColor: 'rgb(var(--border-default))',
                    }}
                  >
                    {step.number}
                  </span>
                  <span className="text-sm md:text-base font-semibold text-heading">
                    {step.title}
                  </span>
                </div>
                <p className="text-sm text-secondary leading-relaxed">{step.description}</p>
              </div>
            ))}
          </div>

          <p className="mt-4 border-t border-default pt-3 text-xs text-secondary italic">
            <span className="font-semibold">Security Note:</span> Any one of your vault's keys can
            decrypt the files. Passphrase keys are stored encrypted on this computer. YubiKey
            private keys never leave the hardware device.
          </p>
        </div>
      </div>
    </div>
  );
};

export default CollapsibleHelp;
