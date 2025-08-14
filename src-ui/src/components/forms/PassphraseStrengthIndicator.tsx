import React from 'react';
import { type PassphraseStrength } from '../../lib/validation';

export interface PassphraseStrengthIndicatorProps {
  strength: PassphraseStrength;
  hasUserTyped: boolean;
  className?: string;
}

const PassphraseStrengthIndicator: React.FC<PassphraseStrengthIndicatorProps> = ({
  strength,
  hasUserTyped,
  className = '',
}) => {
  // Determine strength level and colors
  const getStrengthInfo = () => {
    if (!hasUserTyped || strength.score === 0) {
      return { label: '', color: '', barColor: '', width: 0 };
    }

    if (strength.isStrong) {
      return {
        label: 'Strong passphrase',
        color: 'text-green-700',
        barColor: 'bg-green-600',
        width: 100,
      };
    }

    // Check if it's just missing character types but has good length
    const hasMinLength = strength.score >= 8;
    if (hasMinLength) {
      return {
        label: 'Medium passphrase',
        color: 'text-amber-700',
        barColor: 'bg-amber-500',
        width: 60,
      };
    }

    // Too short
    const charCount = strength.message.match(/\((\d+)\/12/)?.[1] || '0';
    return {
      label: `Too short (${charCount}/12 characters)`,
      color: 'text-red-700',
      barColor: 'bg-red-500',
      width: Math.min((parseInt(charCount) / 12) * 40, 40),
    };
  };

  const info = getStrengthInfo();

  return (
    <div className={`${className}`} id="passphrase-strength">
      {/* Reserved space for strength indicator to prevent jumps */}
      <div className="h-6">
        {hasUserTyped && info.label && (
          <p className={`text-sm font-medium ${info.color}`}>{info.label}</p>
        )}
      </div>
      <div className="h-1.5 w-full rounded-full bg-slate-200">
        {hasUserTyped && (
          <div
            className={`h-1.5 rounded-full transition-all duration-300 ${info.barColor}`}
            style={{ width: `${info.width}%` }}
          />
        )}
      </div>
    </div>
  );
};

export default PassphraseStrengthIndicator;
