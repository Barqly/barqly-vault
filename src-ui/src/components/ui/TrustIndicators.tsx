import React from 'react';
import { Lock, BookOpen, Shield } from 'lucide-react';

interface TrustIndicatorsProps {
  /** Optional custom layout for mobile vs desktop */
  layout?: 'horizontal' | 'vertical';
  /** Show additional security indicators */
  extended?: boolean;
}

const TrustIndicators: React.FC<TrustIndicatorsProps> = ({
  layout = 'horizontal',
  extended = false,
}) => {
  const indicators = [
    {
      icon: Lock,
      text: 'Your keys never leave your device',
    },
    {
      icon: BookOpen,
      text: 'Open-source audited',
    },
  ];

  if (extended) {
    indicators.push({
      icon: Shield,
      text: 'Military-grade encryption',
    });
  }

  const containerClasses =
    layout === 'horizontal'
      ? 'flex items-center justify-center gap-6 text-xs text-gray-600'
      : 'flex flex-col items-center gap-3 text-xs text-gray-600';

  const dividerClasses = layout === 'horizontal' ? 'h-4 w-px bg-gray-300' : 'h-px w-12 bg-gray-300';

  return (
    <div
      className="bg-gray-50 border border-gray-200 rounded-md px-4 py-3 mb-6"
      role="region"
      aria-label="Security indicators"
    >
      <div className={`${containerClasses} ${layout === 'vertical' ? 'sm:flex-row sm:gap-6' : ''}`}>
        {indicators.map((indicator, index) => (
          <React.Fragment key={indicator.text}>
            <div className="flex items-center gap-1.5">
              <indicator.icon className="h-4 w-4 text-gray-500" aria-hidden="true" />
              <span>{indicator.text}</span>
            </div>
            {index < indicators.length - 1 && (
              <div
                className={`${dividerClasses} ${layout === 'vertical' ? 'sm:h-4 sm:w-px' : ''}`}
                aria-hidden="true"
              />
            )}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
};

export default TrustIndicators;
