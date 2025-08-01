import React from 'react';
import { Lock, BookOpen } from 'lucide-react';
import TrustBadge from '../ui/TrustBadge';

interface FormSectionProps {
  /** Section title */
  title: string;
  /** Optional subtitle/description */
  subtitle?: string;
  /** Form content */
  children: React.ReactNode;
  /** Additional CSS classes */
  className?: string;
  /** Show trust badges in header */
  showTrustBadges?: boolean;
}

const FormSection: React.FC<FormSectionProps> = ({
  title,
  subtitle,
  children,
  className = '',
  showTrustBadges = false,
}) => {
  return (
    <div
      className={`bg-white rounded-lg shadow-sm border border-gray-200 flex flex-col ${className}`}
      data-testid="form-section"
      style={{ minHeight: '500px' }}
    >
      {/* Title bar with trust badges - fixed height */}
      {(title || subtitle || showTrustBadges) && (
        <div className="px-6 py-3 border-b border-gray-100 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div>
              {title && (
                <h2 className="text-lg font-semibold text-gray-800" data-testid="section-title">
                  {title}
                </h2>
              )}
              {subtitle && (
                <p className="text-sm text-gray-600 mt-1" data-testid="section-subtitle">
                  {subtitle}
                </p>
              )}
            </div>
            {showTrustBadges && (
              <div className="flex gap-2">
                <TrustBadge
                  icon={Lock}
                  label="Local"
                  tooltip="Your private keys never leave this device"
                />
                <TrustBadge
                  icon={BookOpen}
                  label="Open"
                  tooltip="Audited open-source code you can verify"
                />
              </div>
            )}
          </div>
        </div>
      )}

      {/* Scrollable form content */}
      <div className="flex-1 overflow-y-auto px-6 py-4">
        <div className="space-y-6 max-w-md mx-auto" data-testid="section-content">
          {children}
        </div>
      </div>
    </div>
  );
};

export default FormSection;
