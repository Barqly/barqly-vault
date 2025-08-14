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
      {/* Compact strength meter group */}
      {hasUserTyped && info.label && (
        <p className={`text-[13px] leading-5 ${info.color} mb-1`}>{info.label}</p>
      )}
      <div className="h-1.5 rounded bg-slate-200 overflow-hidden">
        {hasUserTyped && (
          <div
            className={`h-full transition-all duration-300 ${info.barColor}`}
            style={{ width: `${info.width}%` }}
          />
        )}
      </div>
    </div>
  );
};

export default PassphraseStrengthIndicator;
