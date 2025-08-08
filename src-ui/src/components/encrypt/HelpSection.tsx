import React from 'react';

/**
 * Help section with quick tips for encryption
 * Extracted from EncryptPage to reduce component size
 */
const HelpSection: React.FC = () => {
  const tips = [
    'Drag multiple files or an entire folder into the drop zone',
    'Common Bitcoin files: wallet.dat, descriptors, seed phrases',
    'Maximum recommended size: 100MB for optimal performance',
    'Store encrypted vaults in multiple secure locations',
  ];

  return (
    <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
      <h3 className="text-base font-semibold text-blue-900 mb-3">Quick Tips</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-blue-800">
        {tips.map((tip, index) => (
          <div key={index} className="flex items-start gap-2">
            <span className="text-blue-600">•</span>
            <span>{tip}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default HelpSection;
