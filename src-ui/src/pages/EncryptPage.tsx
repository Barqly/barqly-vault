import React from 'react';

const EncryptPage: React.FC = () => {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Encrypt Files</h1>
      <p className="text-gray-600 mb-4">Select files or folders to encrypt with your chosen key.</p>
      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <p className="text-green-800">
          This page will contain file selection, key dropdown, and encryption workflow.
        </p>
      </div>
    </div>
  );
};

export default EncryptPage;
