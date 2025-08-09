import React from 'react';
import { Lock, BookOpen, Shield, Clock } from 'lucide-react';
import TrustBadge from '../ui/TrustBadge';
import NavigationTabs from '../ui/NavigationTabs';

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
  /** Show navigation tabs in header */
  showNavigation?: boolean;
  /** Show brand header with navigation */
  showBrandHeader?: boolean;
}

const FormSection: React.FC<FormSectionProps> = ({
  title,
  subtitle,
  children,
  className = '',
  showTrustBadges = false,
  showNavigation = false,
  showBrandHeader = false,
}) => {
  return (
    <div className={`bg-white rounded-lg shadow-sm border border-gray-200 ${className}`}>
      {/* Enhanced header with brand, navigation, and trust badges */}
      <div className="px-6 py-4 border-b border-gray-100">
        {showBrandHeader && (
          <>
            {/* Brand and navigation row */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <Shield className="w-6 h-6 text-blue-600" />
                <h1 className="text-xl font-semibold">Barqly Vault</h1>
                <span className="text-gray-400">|</span>
                <span className="text-sm text-gray-600">Bitcoin Legacy Protection</span>
              </div>
              {showNavigation && <NavigationTabs />}
            </div>
            {/* Section title and trust badges row */}
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-medium">{title}</h2>
              {showTrustBadges && (
                <div className="flex items-center gap-4 text-xs text-gray-600">
                  <span className="flex items-center gap-1">
                    <Lock className="w-3 h-3" />
                    Local-only
                  </span>
                  <span className="flex items-center gap-1">
                    <BookOpen className="w-3 h-3" />
                    Open-source
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    90s setup
                  </span>
                </div>
              )}
            </div>
          </>
        )}
        {!showBrandHeader && (
          <div className="flex items-center justify-between">
            <div>
              {title && <h2 className="text-lg font-semibold text-gray-800">{title}</h2>}
              {subtitle && <p className="text-sm text-gray-600 mt-1">{subtitle}</p>}
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
        )}
      </div>

      {/* Form content - no fixed height or scrolling */}
      <div className="px-5 py-5">
        <div className="space-y-4 max-w-md mx-auto">{children}</div>
      </div>
    </div>
  );
};

export default FormSection;
