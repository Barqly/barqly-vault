import React from 'react';
import { Key } from 'lucide-react';

/**
 * Header section for the key generation form
 */
const FormHeader: React.FC = () => {
  return (
    <div className="text-center">
      <div className="mx-auto w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-4">
        <Key className="w-6 h-6 text-blue-600" />
      </div>
      <h2 className="text-xl font-semibold text-gray-900 mb-2">Generate Encryption Key</h2>
      <p className="text-sm text-gray-600">Create a new encryption key to secure your files</p>
    </div>
  );
};

export default FormHeader;
