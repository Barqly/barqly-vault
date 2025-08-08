import React from 'react';
import { Lock, Shield, Zap } from 'lucide-react';
import TrustBadge from '../ui/TrustBadge';

/**
 * Header component for the encryption page
 * Shows title, description, and trust badges
 */
const EncryptionHeader: React.FC = () => {
  return (
    <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
      <div className="flex items-center gap-2 mb-2">
        <Lock className="w-6 h-6 text-blue-600" />
        <h2 className="text-2xl font-bold text-gray-900">Encrypt Your Bitcoin Vault</h2>
      </div>
      <p className="text-gray-600 mb-3">
        Transform sensitive files into military-grade encrypted archives · 90 seconds to complete
      </p>
      <div className="flex flex-wrap gap-2">
        <TrustBadge
          icon={Shield}
          label="Military-grade"
          tooltip="Age encryption standard used by security professionals"
        />
        <TrustBadge
          icon={Lock}
          label="Local-only"
          tooltip="All processing happens on your device"
        />
        <TrustBadge
          icon={Zap}
          label="Zero network"
          tooltip="No internet connection required or used"
        />
      </div>
    </div>
  );
};

export default EncryptionHeader;
