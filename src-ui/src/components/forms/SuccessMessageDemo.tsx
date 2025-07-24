import React, { useState } from 'react';
import { SuccessMessage } from '@/components/ui/success-message';
import { Button } from '@/components/ui/button';
import { Copy, Download, FolderOpen, ExternalLink } from 'lucide-react';

const SuccessMessageDemo: React.FC = () => {
  const [currentMessage, setCurrentMessage] = useState<{
    title: string;
    message: string;
    variant?: 'default' | 'info' | 'warning';
    actions?: Array<{
      label: string;
      action: () => void;
      icon?: React.ComponentType<{ className?: string }>;
      variant?: 'primary' | 'secondary' | 'outline';
    }>;
    details?: React.ReactNode;
    showDetails?: boolean;
    autoHide?: boolean;
  } | null>(null);

  const demoScenarios = [
    {
      name: 'Key Generation Success',
      title: 'Key Generated Successfully!',
      message: 'Your encryption key has been created and saved securely.',
      variant: 'default' as const,
      actions: [
        {
          label: 'Copy Public Key',
          action: () => {
            navigator.clipboard.writeText('age1testpublickey123456789');
            console.log('Public key copied to clipboard');
          },
          icon: Copy,
          variant: 'primary' as const,
        },
        {
          label: 'View Key Details',
          action: () => console.log('Opening key details'),
          icon: ExternalLink,
          variant: 'secondary' as const,
        },
      ],
      details: (
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Key ID:</span>
            <span className="font-mono">test-key-123</span>
          </div>
          <div className="flex justify-between text-sm">
            <span>Public Key:</span>
            <span className="font-mono text-xs">age1testpublickey123456789</span>
          </div>
          <div className="flex justify-between text-sm">
            <span>Saved Location:</span>
            <span className="text-xs">~/.config/barqly-vault/keys/</span>
          </div>
        </div>
      ),
      showDetails: true,
    },
    {
      name: 'Encryption Complete',
      title: 'Files Encrypted Successfully!',
      message: 'Your files have been encrypted and saved securely.',
      variant: 'default' as const,
      actions: [
        {
          label: 'Download Encrypted File',
          action: () => console.log('Downloading encrypted file'),
          icon: Download,
          variant: 'primary' as const,
        },
        {
          label: 'Open Output Folder',
          action: () => console.log('Opening output folder'),
          icon: FolderOpen,
          variant: 'secondary' as const,
        },
      ],
      details: (
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Files Processed:</span>
            <span>5 files</span>
          </div>
          <div className="flex justify-between text-sm">
            <span>Total Size:</span>
            <span>2.5 MB</span>
          </div>
          <div className="flex justify-between text-sm">
            <span>Output File:</span>
            <span className="text-xs">backup-2024-01-15.enc</span>
          </div>
        </div>
      ),
      showDetails: true,
    },
    {
      name: 'Decryption Complete',
      title: 'Files Decrypted Successfully!',
      message: 'Your files have been decrypted and extracted.',
      variant: 'default' as const,
      actions: [
        {
          label: 'Open Extracted Folder',
          action: () => console.log('Opening extracted folder'),
          icon: FolderOpen,
          variant: 'primary' as const,
        },
        {
          label: 'Verify Integrity',
          action: () => console.log('Verifying file integrity'),
          icon: ExternalLink,
          variant: 'outline' as const,
        },
      ],
      details: (
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Files Extracted:</span>
            <span>5 files</span>
          </div>
          <div className="flex justify-between text-sm">
            <span>Manifest Verified:</span>
            <span className="text-green-600">✓ Valid</span>
          </div>
          <div className="flex justify-between text-sm">
            <span>Output Directory:</span>
            <span className="text-xs">~/Downloads/decrypted-backup/</span>
          </div>
        </div>
      ),
      showDetails: true,
    },
    {
      name: 'Auto-hide Message',
      title: 'Settings Saved',
      message: 'Your preferences have been updated successfully.',
      variant: 'info' as const,
      autoHide: true,
    },
    {
      name: 'Warning Success',
      title: 'Backup Completed with Warnings',
      message: 'Your backup was completed, but some files were skipped due to size limits.',
      variant: 'warning' as const,
      actions: [
        {
          label: 'View Details',
          action: () => console.log('Viewing warning details'),
          icon: ExternalLink,
          variant: 'outline' as const,
        },
      ],
      details: (
        <div className="space-y-2">
          <div className="text-sm text-yellow-700">
            <strong>Skipped Files:</strong>
            <ul className="mt-1 ml-4 list-disc">
              <li>large-video.mp4 (exceeds 100MB limit)</li>
              <li>temp-files/ (excluded by pattern)</li>
            </ul>
          </div>
        </div>
      ),
      showDetails: true,
    },
  ];

  const handleShowMessage = (scenario: (typeof demoScenarios)[0]) => {
    setCurrentMessage(scenario);
  };

  const handleCloseMessage = () => {
    setCurrentMessage(null);
  };

  return (
    <div className="space-y-6 p-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">SuccessMessage Component Demo</h2>
        <p className="text-gray-600">
          Interactive demonstration of the SuccessMessage component with various scenarios and
          features.
        </p>
      </div>

      {/* Demo Controls */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Demo Scenarios</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {demoScenarios.map((scenario, index) => (
            <Button
              key={index}
              onClick={() => handleShowMessage(scenario)}
              variant="outline"
              className="justify-start"
            >
              {scenario.name}
            </Button>
          ))}
        </div>
      </div>

      {/* Current Success Message */}
      {currentMessage && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Current Message</h3>
            <Button onClick={handleCloseMessage} variant="outline" size="sm">
              Clear Message
            </Button>
          </div>

          <SuccessMessage
            title={currentMessage.title}
            message={currentMessage.message}
            variant={currentMessage.variant}
            actions={currentMessage.actions}
            details={currentMessage.details}
            showDetails={currentMessage.showDetails}
            autoHide={currentMessage.autoHide}
            autoHideDelay={3000}
            onClose={handleCloseMessage}
            showCloseButton
          />
        </div>
      )}

      {/* Component Features */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Component Features</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <h4 className="font-medium">Visual Variants</h4>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• Default (green) - Success states</li>
              <li>• Info (blue) - Information messages</li>
              <li>• Warning (yellow) - Success with warnings</li>
            </ul>
          </div>

          <div className="space-y-2">
            <h4 className="font-medium">Interactive Features</h4>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• Action buttons with icons</li>
              <li>• Expandable details section</li>
              <li>• Auto-hide functionality</li>
              <li>• Manual close button</li>
            </ul>
          </div>

          <div className="space-y-2">
            <h4 className="font-medium">Accessibility</h4>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• ARIA live regions</li>
              <li>• Proper focus management</li>
              <li>• Screen reader support</li>
              <li>• Keyboard navigation</li>
            </ul>
          </div>

          <div className="space-y-2">
            <h4 className="font-medium">Integration</h4>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• Clipboard API integration</li>
              <li>• File system operations</li>
              <li>• Tauri command integration</li>
              <li>• Custom action handlers</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Usage Examples */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Usage Examples</h3>
        <div className="bg-gray-50 p-4 rounded-lg">
          <pre className="text-sm overflow-x-auto">
            {`// Basic usage
<SuccessMessage
  title="Operation Complete"
  message="Your files have been encrypted successfully."
/>

// With actions
<SuccessMessage
  title="Key Generated"
  message="Your encryption key is ready."
  actions={[
    {
      label: 'Copy Key',
      action: () => copyToClipboard(key),
      icon: Copy,
      variant: 'primary'
    }
  ]}
/>

// Auto-hide
<SuccessMessage
  title="Settings Saved"
  message="Preferences updated."
  autoHide
  autoHideDelay={3000}
/>`}
          </pre>
        </div>
      </div>
    </div>
  );
};

export default SuccessMessageDemo;
