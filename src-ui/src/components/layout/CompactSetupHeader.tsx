import React from 'react';
import { Shield, Lock, BookOpen } from 'lucide-react';

interface CompactSetupHeaderProps {
  /** Optional custom title override */
  title?: string;
}

const CompactSetupHeader: React.FC<CompactSetupHeaderProps> = ({ title = 'Barqly Vault' }) => {
  return (
    <header className="bg-white border-b border-gray-200 h-10 flex items-center px-4">
      {/* Skip Navigation Link - Hidden until focused */}
      <a
        href="#main-form"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-4 bg-blue-600 text-white px-3 py-1.5 rounded-md z-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 text-sm"
      >
        Skip to form
      </a>

      <div className="flex items-center gap-2 flex-1 max-w-4xl mx-auto">
        <Shield className="w-5 h-5 text-blue-600 flex-shrink-0" aria-hidden="true" />
        <span className="font-semibold text-gray-900">{title}</span>
        <span className="text-gray-400 hidden sm:inline">|</span>
        <span className="text-sm text-gray-600 hidden sm:inline">Bitcoin Legacy Protection</span>

        {/* Trust indicators inline */}
        <div className="hidden md:flex items-center gap-3 ml-auto text-xs text-gray-600">
          <span className="flex items-center gap-1">
            <Lock className="w-3 h-3" aria-hidden="true" />
            Local-only
          </span>
          <span>•</span>
          <span className="flex items-center gap-1">
            <BookOpen className="w-3 h-3" aria-hidden="true" />
            Open-source
          </span>
          <span>•</span>
          <span>90-second setup</span>
        </div>
      </div>
    </header>
  );
};

export default CompactSetupHeader;
