import React, { useRef, useEffect } from 'react';
import { Info } from 'lucide-react';

export interface PassphraseRequirementsTooltipProps {
  show: boolean;
  onToggle: () => void;
  className?: string;
}

const PassphraseRequirementsTooltip: React.FC<PassphraseRequirementsTooltipProps> = ({
  show,
  onToggle,
  className = '',
}) => {
  const tooltipRef = useRef<HTMLDivElement>(null);
  const infoButtonRef = useRef<HTMLButtonElement>(null);

  // Handle click outside to close tooltip
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        tooltipRef.current &&
        !tooltipRef.current.contains(event.target as Node) &&
        infoButtonRef.current &&
        !infoButtonRef.current.contains(event.target as Node)
      ) {
        onToggle();
      }
    };

    if (show) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [show, onToggle]);

  return (
    <div className={`relative flex-shrink-0 ${className}`}>
      <button
        ref={infoButtonRef}
        type="button"
        onClick={onToggle}
        className="text-gray-400 hover:text-gray-600 transition-colors duration-200"
        aria-label="Passphrase requirements"
        tabIndex={0}
      >
        <Info className="h-4 w-4" />
      </button>

      {/* Tooltip */}
      {show && (
        <div
          ref={tooltipRef}
          className="absolute z-50 mt-2 w-80 p-3 bg-gray-900 text-white text-sm rounded-lg shadow-lg border border-gray-700"
          style={{
            left: '0',
            top: '100%',
          }}
        >
          <div className="space-y-2">
            <p className="font-medium text-gray-100">Passphrase Requirements:</p>
            <ul className="space-y-1 text-gray-300">
              <li>• Minimum 12 characters</li>
              <li>• Must include ALL: uppercase, lowercase, numbers, and symbols</li>
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
  );
};

export default PassphraseRequirementsTooltip;
