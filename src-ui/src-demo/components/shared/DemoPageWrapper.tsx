/**
 * Demo page wrapper component
 *
 * Provides consistent layout and styling for all demo pages
 * with browser environment detection and common UI elements
 */

import React from 'react';
import { Link } from 'react-router-dom';
import { Info, ArrowLeft } from 'lucide-react';
import { isBrowser } from '@/lib/environment/platform';

export interface DemoPageWrapperProps {
  title: string;
  description: string;
  children: React.ReactNode;
  showBackButton?: boolean;
  showBrowserNotice?: boolean;
}

/**
 * Wrapper component for demo pages
 *
 * Provides:
 * - Consistent layout with title and description
 * - Optional browser environment notice
 * - Back to demos navigation
 * - Responsive design
 */
export const DemoPageWrapper: React.FC<DemoPageWrapperProps> = ({
  title,
  description,
  children,
  showBackButton = true,
  showBrowserNotice = true,
}) => {
  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 p-8">
      <div className="max-w-4xl mx-auto">
        {/* Back Button */}
        {showBackButton && (
          <Link
            to="/demos"
            className="inline-flex items-center gap-2 text-gray-400 hover:text-gray-200 mb-8 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Demos
          </Link>
        )}

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">{title}</h1>
          <p className="text-gray-400">{description}</p>
        </div>

        {/* Browser Notice */}
        {showBrowserNotice && isBrowser() && (
          <div className="bg-yellow-900/20 border border-yellow-800 rounded-lg p-4 mb-8">
            <div className="flex items-start gap-3">
              <Info className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="text-yellow-200 font-medium mb-1">Demo Mode</p>
                <p className="text-yellow-300/80">
                  You're viewing this in a browser. In the desktop app, this would interact with
                  your actual files and encryption keys.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Content */}
        <div className="space-y-6">{children}</div>
      </div>
    </div>
  );
};

export default DemoPageWrapper;
