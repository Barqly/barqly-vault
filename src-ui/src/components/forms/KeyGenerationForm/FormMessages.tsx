import React from 'react';
import { AlertCircle, CheckCircle } from 'lucide-react';
import { GenerateKeyResponse } from '../../../lib/api-types';

interface FormMessagesProps {
  error: string | null;
  success: GenerateKeyResponse | null;
}

/**
 * Display success/error messages and generated key information
 */
const FormMessages: React.FC<FormMessagesProps> = ({ error, success }) => {
  return (
    <>
      {/* Error Message */}
      {error && (
        <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-md">
          <div className="flex items-center">
            <AlertCircle className="w-5 h-5 text-red-400 mr-2" />
            <p className="text-sm font-medium text-red-800">{error}</p>
          </div>
        </div>
      )}

      {/* Success Message */}
      {success && (
        <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-md">
          <div className="flex items-center">
            <CheckCircle className="w-5 h-5 text-green-400 mr-2" />
            <p className="text-sm font-medium text-green-800">Key generated successfully!</p>
          </div>
        </div>
      )}

      {/* Generated Key Display */}
      {success && (
        <div className="mt-6 p-4 bg-gray-50 border border-gray-200 rounded-md">
          <h3 className="text-sm font-medium text-gray-900 mb-2">Generated Public Key</h3>
          <div className="bg-white p-3 rounded border font-mono text-xs break-all">
            {success.public_key}
          </div>
          <p className="mt-2 text-xs text-gray-600">Key ID: {success.key_id}</p>
        </div>
      )}
    </>
  );
};

export default FormMessages;
