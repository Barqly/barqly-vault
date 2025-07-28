/**
 * Demo section component
 *
 * Provides consistent section styling for demo pages
 */

import React from 'react';

export interface DemoSectionProps {
  title?: string;
  children: React.ReactNode;
  className?: string;
}

/**
 * Section component for demo pages
 *
 * Provides consistent styling for sections within demo pages
 */
export const DemoSection: React.FC<DemoSectionProps> = ({ title, children, className = '' }) => {
  return (
    <div className={`bg-gray-800 rounded-lg p-6 ${className}`}>
      {title && <h2 className="text-xl font-semibold mb-4">{title}</h2>}
      {children}
    </div>
  );
};

export default DemoSection;
