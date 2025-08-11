import React from 'react';
import { Unlock, Shield, Lock, Clock } from 'lucide-react';
import TrustBadge from '../ui/TrustBadge';

/**
 * Header component for the decryption page
 * Shows title and trust badges
 */
const DecryptionHeader: React.FC = () => {
  return (
    <div className="bg-white border-b border-gray-200 shadow-sm">
      <div className="max-w-4xl mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Unlock className="w-6 h-6 text-blue-600" />
              Decrypt Your Vault
            </h1>
          </div>
          <div className="flex items-center gap-4">
            <TrustBadge icon={Shield} label="Military-grade" tooltip="Military-grade decryption" />
            <TrustBadge icon={Lock} label="Local-only" tooltip="Local-only recovery" />
            <TrustBadge icon={Clock} label="Under 60s" tooltip="Typical decryption time" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default DecryptionHeader;
