import React from 'react';
import { Shield } from 'lucide-react';

interface SetupHeaderProps {
  /** Optional custom title override */
  title?: string;
  /** Optional custom subtitle override */
  subtitle?: string;
}

const SetupHeader: React.FC<SetupHeaderProps> = ({
  title = 'Secure Your Bitcoin Legacy',
  subtitle = 'Create your encryption identity with military-grade age encryption',
}) => {
  return (
    <header className="bg-white border-b border-gray-200 px-6 py-4">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-3">
          {/* Shield Icon */}
          <div className="flex-shrink-0">
            <Shield
              className="w-6 h-6 text-blue-600"
              aria-hidden="true"
              data-testid="setup-header-shield"
            />
          </div>

          {/* Title and Subtitle */}
          <div className="min-w-0 flex-1">
            <h1 className="text-xl font-bold text-gray-900 leading-tight">{title}</h1>
            <p className="text-sm text-gray-700 mt-1 leading-tight">{subtitle}</p>
          </div>
        </div>
      </div>
    </header>
  );
};

export default SetupHeader;
