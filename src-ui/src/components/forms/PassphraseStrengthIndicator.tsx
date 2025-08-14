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
  return (
    <div className={`space-y-2 ${className}`} id="passphrase-strength">
      {hasUserTyped && (
        // User has typed - show strength with color and progress bar
        <React.Fragment>
          <p
            className={`text-sm font-medium ${
              strength.isStrong ? 'text-green-600' : 'text-red-600'
            }`}
          >
            {strength.isStrong ? 'Strong passphrase' : 'Too short'}
          </p>
          <div className="h-1.5 w-full rounded-full bg-slate-200">
            <div
              className={`h-1.5 rounded-full transition-all duration-300 ${
                strength.isStrong ? 'bg-green-600' : 'bg-red-700'
              }`}
              style={{ width: `${Math.min((strength.score / 12) * 100, 100)}%` }}
            />
          </div>
        </React.Fragment>
      )}
    </div>
  );
};

export default PassphraseStrengthIndicator;
