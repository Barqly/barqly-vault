import React from 'react';
import { useNavigate } from 'react-router-dom';
import { YubiKeyStreamlined } from '../components/setup/YubiKeyStreamlined';
import { YubiKeyInitResult } from '../lib/api-types';
import { logger } from '../lib/logger';

/**
 * Simple page for YubiKey setup workflow
 * Can be accessed directly for testing
 */
const YubiKeySetupPage: React.FC = () => {
  const navigate = useNavigate();

  const handleComplete = (result: YubiKeyInitResult) => {
    logger.info('YubiKeySetupPage', 'YubiKey setup completed', result);

    // Store result in session storage for next step
    sessionStorage.setItem('yubikey_setup_result', JSON.stringify(result));

    // Navigate to success or key generation page
    navigate('/setup/complete');
  };

  const handleCancel = () => {
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto px-4">
        <YubiKeyStreamlined
          onComplete={handleComplete}
          onCancel={handleCancel}
        />
      </div>
    </div>
  );
};

export default YubiKeySetupPage;