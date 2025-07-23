import React from 'react';

const DecryptPage: React.FC = () => {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Decrypt Files</h1>
      <p className="text-gray-600 mb-4">
        Select an encrypted file to decrypt with your passphrase.
      </p>
      <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
        <p className="text-purple-800">
          This page will contain file selection, passphrase input, and decryption workflow.
        </p>
      </div>
    </div>
  );
};

export default DecryptPage;
