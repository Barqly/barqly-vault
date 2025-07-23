import React from 'react';

const SetupPage: React.FC = () => {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Setup</h1>
      <p className="text-gray-600 mb-4">
        Generate your first encryption key to get started with Barqly Vault.
      </p>
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-blue-800">
          This page will contain the key generation form, passphrase input, and setup workflow.
        </p>
      </div>
    </div>
  );
};

export default SetupPage;
