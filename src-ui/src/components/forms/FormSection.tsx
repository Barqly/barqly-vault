import React from 'react';

interface FormSectionProps {
  /** Section title */
  title: string;
  /** Optional subtitle/description */
  subtitle?: string;
  /** Form content */
  children: React.ReactNode;
  /** Show bottom border */
  showBorder?: boolean;
  /** Additional CSS classes */
  className?: string;
}

const FormSection: React.FC<FormSectionProps> = ({
  title,
  subtitle,
  children,
  showBorder = true,
  className = '',
}) => {
  return (
    <div
      className={`bg-white rounded-lg shadow-sm border border-gray-200 ${className}`}
      data-testid="form-section"
    >
      <div className="p-8">
        <div className={`${showBorder ? 'pb-4 mb-6 border-b border-gray-100' : 'mb-6'}`}>
          <h2 className="text-lg font-semibold text-gray-800" data-testid="section-title">
            {title}
          </h2>
          {subtitle && (
            <p className="text-sm text-gray-600 mt-1" data-testid="section-subtitle">
              {subtitle}
            </p>
          )}
        </div>

        <div className="space-y-6" data-testid="section-content">
          {children}
        </div>
      </div>
    </div>
  );
};

export default FormSection;
