import React from 'react';
import KeyGenerationForm from '../components/forms/KeyGenerationForm';
import { GenerateKeyResponse } from '../lib/api-types';

const SetupPage: React.FC = () => {
  const handleKeyGenerated = (key: GenerateKeyResponse) => {
    console.log('Key generated:', key);
    // TODO: Navigate to encrypt page or show next steps
  };

  return (
    <div className="p-6">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Setup Barqly Vault</h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Generate your first encryption key to get started with secure file encryption for
            Bitcoin custody backup.
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-sm border p-8">
          <KeyGenerationForm onKeyGenerated={handleKeyGenerated} />
        </div>

        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-blue-900 mb-3">What happens next?</h2>
          <div className="grid md:grid-cols-3 gap-4 text-sm text-blue-800">
            <div>
              <h3 className="font-medium mb-2">1. Key Generation</h3>
              <p>Your encryption keypair is created and securely stored on your device.</p>
            </div>
            <div>
              <h3 className="font-medium mb-2">2. File Encryption</h3>
              <p>
                Use your key to encrypt important files like wallet backups and recovery
                information.
              </p>
            </div>
            <div>
              <h3 className="font-medium mb-2">3. Secure Storage</h3>
              <p>
                Store encrypted files safely and share the public key with trusted family members.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SetupPage;
