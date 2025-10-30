/**
 * Pure Presentational ProtectionModeSelector - Clean Architecture
 *
 * This component is purely presentational - it receives props and renders UI.
 * It contains NO business logic, NO hardware detection, NO side effects.
 *
 * All business logic is handled by parent container components that use
 * the YubiKey workflow state machine.
 */

import React from 'react';
import { Shield, Key, Fingerprint, CheckCircle } from 'lucide-react';
import { ProtectionMode } from '../../bindings';

// Pure UI Props - only what's needed for rendering
export interface ProtectionModeSelectorPureProps {
  selectedMode: ProtectionMode | null;
  onModeSelect: (mode: ProtectionMode) => void;

  // UI state
  isDisabled?: boolean;
  className?: string;

  // Optional customization
  showRecommendation?: boolean;
  compactMode?: boolean;
}

interface ProtectionModeOption {
  mode: ProtectionMode;
  title: string;
  description: string;
  icon: React.ElementType;
  features: string[];
  considerations: string[];
  recommended?: boolean;
}

// Static configuration - no dynamic logic
const PROTECTION_MODES: ProtectionModeOption[] = [
  {
    mode: ProtectionMode.PASSPHRASE_ONLY,
    title: 'Passphrase Only',
    description: 'Protect your vault with a strong passphrase',
    icon: Key,
    features: ['Works on any device', 'No hardware required'],
    considerations: ['Must remember passphrase securely'],
    recommended: true,
  },
  {
    mode: ProtectionMode.YUBIKEY_ONLY,
    title: 'YubiKey Only',
    description: 'Use YubiKey hardware authentication',
    icon: Fingerprint,
    features: ['Maximum security', 'No passwords to remember'],
    considerations: ['Requires YubiKey hardware'],
  },
  {
    mode: ProtectionMode.HYBRID,
    title: 'Hybrid Protection',
    description: 'Combine YubiKey + passphrase for ultimate security',
    icon: Shield,
    features: ['Dual-factor protection', 'Recovery options'],
    considerations: ['Requires YubiKey hardware', 'More complex setup'],
  },
];

/**
 * Pure presentational component for protection mode selection
 * NO business logic, NO side effects, NO hardware detection
 */
export const ProtectionModeSelectorPure: React.FC<ProtectionModeSelectorPureProps> = ({
  selectedMode,
  onModeSelect,
  isDisabled = false,
  className = '',
  showRecommendation = true,
  compactMode = false,
}) => {
  return (
    <div className={`space-y-4 ${className}`}>
      <div>
        <h2 className="text-2xl font-semibold mb-2 text-center">Choose Your Protection Method</h2>
        <p className="text-gray-600 text-center mb-6">
          Select how you want to protect your vault. You can always change this later.
        </p>
      </div>

      <div className={`grid gap-4 ${compactMode ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-3'}`}>
        {PROTECTION_MODES.map((option) => {
          const isSelected = selectedMode === option.mode;
          const Icon = option.icon;

          return (
            <div
              key={option.mode}
              className={`
                relative rounded-lg border-2 p-4 cursor-pointer transition-all duration-200
                ${
                  isSelected
                    ? 'border-blue-500 bg-blue-50 shadow-md'
                    : isDisabled
                      ? 'border-gray-200 bg-gray-50 cursor-not-allowed opacity-60'
                      : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'
                }
              `}
              onClick={() => !isDisabled && onModeSelect(option.mode)}
              role="radio"
              aria-checked={isSelected}
              aria-disabled={isDisabled}
              tabIndex={isDisabled ? -1 : 0}
              onKeyDown={(e) => {
                if ((e.key === 'Enter' || e.key === ' ') && !isDisabled) {
                  e.preventDefault();
                  onModeSelect(option.mode);
                }
              }}
            >
              {/* Recommended badge */}
              {option.recommended && showRecommendation && (
                <div className="absolute -top-2 -right-2 bg-green-500 text-white text-xs px-2 py-1 rounded-full font-medium">
                  Recommended
                </div>
              )}

              {/* Selection indicator */}
              {isSelected && (
                <div className="absolute top-3 right-3">
                  <CheckCircle className="w-5 h-5 text-blue-500 fill-current" />
                </div>
              )}

              {/* Icon and title */}
              <div className="flex items-center mb-3">
                <div
                  className={`
                  flex items-center justify-center w-12 h-12 rounded-lg mr-3
                  ${isSelected ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-600'}
                `}
                >
                  <Icon className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">{option.title}</h3>
                  <p className="text-sm text-gray-600">{option.description}</p>
                </div>
              </div>

              {/* Features and considerations */}
              {!compactMode && (
                <div className="space-y-2">
                  {option.features.map((feature, index) => (
                    <div key={index} className="flex items-start text-sm">
                      <div className="w-1.5 h-1.5 rounded-full bg-green-500 mt-2 mr-2 flex-shrink-0" />
                      <span className="text-green-700">{feature}</span>
                    </div>
                  ))}
                  {option.considerations.map((consideration, index) => (
                    <div key={index} className="flex items-start text-sm">
                      <div className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-2 mr-2 flex-shrink-0" />
                      <span className="text-amber-700">{consideration}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ProtectionModeSelectorPure;
