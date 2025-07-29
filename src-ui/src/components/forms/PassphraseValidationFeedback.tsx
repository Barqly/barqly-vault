import React from 'react';

export interface ConfirmationMatch {
  matches: boolean;
  message: string;
}

export interface PassphraseValidationFeedbackProps {
  error?: string;
  isConfirmationField?: boolean;
  confirmationMatch?: ConfirmationMatch | null;
  value?: string;
  inputId?: string;
  className?: string;
}

const PassphraseValidationFeedback: React.FC<PassphraseValidationFeedbackProps> = ({
  error,
  isConfirmationField = false,
  confirmationMatch,
  value,
  inputId,
  className = '',
}) => {
  return (
    <div className={className}>
      {/* Confirmation Match Indicator - Only for confirmation field */}
      {isConfirmationField && value && confirmationMatch && (
        <div id="passphrase-confirmation" className="space-y-2">
          <p
            className={`text-sm font-medium ${
              confirmationMatch.matches ? 'text-green-600' : 'text-red-600'
            }`}
          >
            {confirmationMatch.message}
          </p>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <p
          id={`${inputId || 'passphrase-input'}-error`}
          className="text-sm text-red-600"
          role="alert"
        >
          {error}
        </p>
      )}
    </div>
  );
};

export default PassphraseValidationFeedback;
