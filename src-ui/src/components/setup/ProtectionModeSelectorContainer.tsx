/**
 * ProtectionModeSelector Container - Business Logic Layer
 *
 * This container component handles all business logic and state management
 * for protection mode selection. It connects the pure presentational component
 * to the YubiKey workflow state machine.
 *
 * Responsibilities:
 * - Manage protection mode selection business logic
 * - Handle YubiKey workflow integration
 * - Provide proper timing for hardware detection
 * - Pass only UI props to presentational component
 */

import React from 'react';
import { ProtectionMode } from '../../bindings';
import { useYubiKeyWorkflow } from '../../hooks/useYubiKeyWorkflow';
import { ProtectionModeSelectorPure } from './ProtectionModeSelectorPure';
import { logger } from '../../lib/logger';

export interface ProtectionModeSelectorContainerProps {
  selectedMode?: ProtectionMode;
  onModeChange: (mode: ProtectionMode) => void;
  className?: string;
  showRecommendation?: boolean;

  // Legacy props for backward compatibility (will be removed)
  onYubiKeySelected?: (device: any) => void;
  availableDevices?: any[];
  isCheckingDevices?: boolean;
  isLoading?: boolean;
}

/**
 * Container component that manages business logic for protection mode selection
 */
export const ProtectionModeSelectorContainer: React.FC<ProtectionModeSelectorContainerProps> = ({
  selectedMode,
  onModeChange,
  className,
  showRecommendation,
  // Legacy props ignored in new architecture
  onYubiKeySelected: _onYubiKeySelected,
  availableDevices: _availableDevices,
  isCheckingDevices: _isCheckingDevices,
  isLoading: _isLoading,
}) => {
  const { state, context, actions } = useYubiKeyWorkflow();

  /**
   * Handle mode selection with proper business logic
   *
   * Key architectural change: NO hardware detection happens here!
   * Hardware detection is deferred until user commitment.
   */
  const handleModeSelect = (mode: ProtectionMode) => {
    logger.logComponentLifecycle('ProtectionModeSelector', 'Mode selected', { mode });

    // Update workflow state (no hardware detection)
    actions.selectProtectionMode(mode);

    // Notify parent component
    onModeChange(mode);

    // For YubiKey modes, we could optionally show requirements next
    // but NO hardware detection happens here
    if (mode === ProtectionMode.YUBIKEY_ONLY || mode === ProtectionMode.HYBRID) {
      logger.logComponentLifecycle(
        'ProtectionModeSelector',
        'YubiKey mode selected - requirements will be shown on next step',
      );
      // Could trigger actions.showRequirements() here if we want immediate transition
    }
  };

  // Use workflow state if available, otherwise fallback to prop
  const currentMode = context.selectedMode || selectedMode;

  // Determine if component should be disabled
  const isDisabled = state === 'hardware_detecting' || state === 'device_initializing';

  return (
    <ProtectionModeSelectorPure
      selectedMode={currentMode ?? null}
      onModeSelect={handleModeSelect}
      isDisabled={isDisabled}
      className={className}
      showRecommendation={showRecommendation}
    />
  );
};

export default ProtectionModeSelectorContainer;
