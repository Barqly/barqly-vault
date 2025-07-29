import React from 'react';

export interface PassphraseStrength {
  isStrong: boolean;
  message: string;
  score: number;
}

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
      {!hasUserTyped ? (
        // Default state - show neutral message
        <p className="text-sm font-medium text-gray-500">Passphrase Strength:</p>
      ) : (
        // User has typed - show strength with color and progress bar
        <>
          <p
            className={`text-sm font-medium ${
              strength.isStrong ? 'text-green-600' : 'text-red-600'
            }`}
          >
            Passphrase Strength: {strength.message}
          </p>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all duration-300 ${
                strength.isStrong ? 'bg-green-500' : 'bg-red-500'
              }`}
              style={{ width: `${Math.min((strength.score / 12) * 100, 100)}%` }}
            />
          </div>
        </>
      )}
    </div>
  );
};

export default PassphraseStrengthIndicator;
