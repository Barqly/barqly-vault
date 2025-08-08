import React from 'react';
import { AlertCircle, Info } from 'lucide-react';

interface KeyLabelInputProps {
  value: string;
  onChange: (value: string) => void;
  error?: string;
  disabled?: boolean;
  showTooltip: boolean;
  onTooltipToggle: () => void;
  tooltipRef: React.RefObject<HTMLDivElement | null>;
  infoButtonRef: React.RefObject<HTMLButtonElement | null>;
}

/**
 * Key label input component with validation and tooltip
 */
const KeyLabelInput: React.FC<KeyLabelInputProps> = ({
  value,
  onChange,
  error,
  disabled,
  showTooltip,
  onTooltipToggle,
  tooltipRef,
  infoButtonRef,
}) => {
  return (
    <div>
      <label htmlFor="keyLabel" className="block text-sm font-medium text-gray-700 mb-2">
        Key Label
      </label>
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <input
            id="keyLabel"
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
              error ? 'border-red-300' : 'border-gray-300'
            }`}
            placeholder="e.g., My Backup Key"
            disabled={disabled}
            aria-describedby={error ? 'keyLabel-error' : undefined}
          />
        </div>

        {/* Info icon with tooltip */}
        <div className="relative flex-shrink-0">
          <button
            ref={infoButtonRef}
            type="button"
            onClick={onTooltipToggle}
            className="text-gray-400 hover:text-gray-600 transition-colors duration-200"
            aria-label="Key label requirements"
            tabIndex={0}
          >
            <Info className="h-4 w-4" />
          </button>

          {/* Tooltip */}
          {showTooltip && (
            <div
              ref={tooltipRef}
              className="absolute z-50 mt-2 w-80 p-3 bg-gray-900 text-white text-sm rounded-lg shadow-lg border border-gray-700"
              style={{
                left: '0',
                top: '100%',
              }}
            >
              <div className="space-y-2">
                <p className="font-medium text-gray-100">Key Label Requirements:</p>
                <ul className="space-y-1 text-gray-300">
                  <li>• 3-50 characters long</li>
                  <li>• Letters, numbers, spaces, hyphens, and underscores only</li>
                  <li>• Used to identify your key in the vault</li>
                </ul>
              </div>

              {/* Tooltip arrow */}
              <div
                className="absolute w-0 h-0 border-l-4 border-r-4 border-b-4 border-transparent border-b-gray-900"
                style={{
                  left: '8px',
                  top: '-4px',
                }}
              />
            </div>
          )}
        </div>
      </div>

      {error && (
        <p id="keyLabel-error" className="mt-1 text-sm text-red-600 flex items-center" role="alert">
          <AlertCircle className="w-4 h-4 mr-1" />
          {error}
        </p>
      )}
    </div>
  );
};

export default KeyLabelInput;
