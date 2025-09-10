import { useState, useCallback } from 'react';
import { useSetupWorkflow } from './useSetupWorkflow';
import {
  ProtectionMode,
  YubiKeyDevice,
  YubiKeyInfo,
  invokeCommand,
  CommandErrorClass,
} from '../lib/api-types';
import { logger } from '../lib/logger';

/**
 * Enhanced setup workflow hook that adds YubiKey functionality
 * Extends the basic setup workflow with protection mode selection and YubiKey support
 */
export const useYubiKeySetupWorkflow = () => {
  // Use existing setup workflow as base
  const baseWorkflow = useSetupWorkflow();

  // YubiKey-specific state
  const [protectionMode, setProtectionMode] = useState<ProtectionMode>(
    ProtectionMode.PASSPHRASE_ONLY,
  );
  const [availableDevices, setAvailableDevices] = useState<YubiKeyDevice[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<YubiKeyDevice | null>(null);
  const [yubiKeyInfo, setYubiKeyInfo] = useState<YubiKeyInfo | null>(null);
  const [isCheckingDevices, setIsCheckingDevices] = useState(false);
  const [hasCheckedDevices, setHasCheckedDevices] = useState(false);
  const [deviceError, setDeviceError] = useState<string | null>(null);
  const [setupStep, setSetupStep] = useState<'mode-selection' | 'configuration' | 'generation'>(
    'mode-selection',
  );

  // YubiKey detection is now lazy - only happens when user selects YubiKey modes

  const checkForYubiKeys = useCallback(async () => {
    setIsCheckingDevices(true);
    setDeviceError(null);

    try {
      logger.logComponentLifecycle('useYubiKeySetupWorkflow', 'Checking for YubiKey devices');
      const devices = await invokeCommand<YubiKeyDevice[]>('yubikey_list_devices');

      setAvailableDevices(devices);
      setHasCheckedDevices(true);

      // Auto-select first device if available
      if (devices.length > 0 && !selectedDevice) {
        setSelectedDevice(devices[0]);
        logger.logComponentLifecycle('useYubiKeySetupWorkflow', 'Auto-selected first device', {
          deviceName: devices[0].name,
          deviceId: devices[0].device_id,
        });
      }

      // If no devices found and YubiKey protection is selected, fall back to passphrase-only
      if (devices.length === 0 && protectionMode !== ProtectionMode.PASSPHRASE_ONLY) {
        logger.logComponentLifecycle(
          'useYubiKeySetupWorkflow',
          'No devices found, falling back to passphrase-only',
        );
        setProtectionMode(ProtectionMode.PASSPHRASE_ONLY);
      }
    } catch (error: any) {
      logger.logComponentLifecycle('useYubiKeySetupWorkflow', 'Device detection failed', {
        error: error.message,
      });

      // TODO: Replace this fragile string-based error filtering with proper error classification
      // See: /docs/product/roadmap/yubikey/architecture-analysis-systematic-fixes.md
      // This is a temporary band-aid - the real fix is implementing YubiKeyError types
      // and proper graceful degradation when age-plugin-yubikey is unavailable
      if (
        !error.message.includes('No YubiKey devices found') &&
        !error.message.includes('not found') &&
        !error.message.includes('not available') &&
        !error.message.includes('age-plugin-yubikey binary not found') &&
        !error.message.includes('binary not found')
      ) {
        setDeviceError(error.message);
      }
      setAvailableDevices([]);
      setHasCheckedDevices(true);
    } finally {
      setIsCheckingDevices(false);
    }
  }, [selectedDevice, protectionMode]);

  const handleProtectionModeChange = useCallback(
    (mode: ProtectionMode) => {
      logger.logComponentLifecycle('useYubiKeySetupWorkflow', 'Protection mode changed', { mode });
      setProtectionMode(mode);

      // Trigger lazy YubiKey detection only when user selects YubiKey modes
      if (mode === ProtectionMode.YUBIKEY_ONLY || mode === ProtectionMode.HYBRID) {
        // Only check if we haven't checked yet
        if (!hasCheckedDevices && !isCheckingDevices) {
          checkForYubiKeys();
        }
      }
    },
    [hasCheckedDevices, isCheckingDevices, checkForYubiKeys],
  );

  const handleDeviceSelect = useCallback((device: YubiKeyDevice) => {
    logger.logComponentLifecycle('useYubiKeySetupWorkflow', 'Device selected', {
      deviceName: device.name,
      deviceId: device.device_id,
    });
    setSelectedDevice(device);
  }, []);

  const handleYubiKeyConfigured = useCallback((device: YubiKeyDevice, info: YubiKeyInfo) => {
    logger.logComponentLifecycle('useYubiKeySetupWorkflow', 'YubiKey configured', {
      deviceName: device.name,
      deviceId: device.device_id,
      slots: info.piv_slots,
    });
    setYubiKeyInfo(info);
    setSetupStep('generation');
  }, []);

  const handleEnhancedKeyGeneration = useCallback(async () => {
    try {
      logger.logComponentLifecycle('useYubiKeySetupWorkflow', 'Enhanced key generation started', {
        protectionMode,
        hasYubiKey: !!selectedDevice,
        keyLabel: baseWorkflow.keyLabel,
      });

      if (protectionMode === ProtectionMode.PASSPHRASE_ONLY) {
        // Use standard key generation for passphrase-only mode
        return await baseWorkflow.handleKeyGeneration();
      }

      // For YubiKey modes, we need to implement multi-recipient encryption
      // This will be handled by the backend based on the protection mode
      const generateKeyParams = {
        label: baseWorkflow.keyLabel,
        passphrase: baseWorkflow.passphrase,
        protection_mode: protectionMode,
        yubikey_device_id: selectedDevice?.device_id,
        yubikey_info: yubiKeyInfo,
      };

      logger.logComponentLifecycle('useYubiKeySetupWorkflow', 'Calling enhanced key generation', {
        params: {
          ...generateKeyParams,
          passphrase: '[REDACTED]',
        },
      });

      // For now, call the standard generation - the backend will be enhanced later
      // to handle multi-recipient encryption based on setup status
      return await baseWorkflow.handleKeyGeneration();
    } catch (error: any) {
      logger.logComponentLifecycle('useYubiKeySetupWorkflow', 'Enhanced key generation failed', {
        error: error.message,
      });
      throw error;
    }
  }, [
    protectionMode,
    selectedDevice,
    yubiKeyInfo,
    baseWorkflow.handleKeyGeneration,
    baseWorkflow.keyLabel,
    baseWorkflow.passphrase,
  ]);

  const handleReset = useCallback(() => {
    logger.logComponentLifecycle('useYubiKeySetupWorkflow', 'Reset called');
    baseWorkflow.handleReset();
    setProtectionMode(ProtectionMode.PASSPHRASE_ONLY);
    setSelectedDevice(null);
    setYubiKeyInfo(null);
    setSetupStep('mode-selection');
    setDeviceError(null);
  }, [baseWorkflow.handleReset]);

  const clearError = useCallback(() => {
    baseWorkflow.clearError();
    setDeviceError(null);
  }, [baseWorkflow.clearError]);

  // Enhanced validation that considers protection mode
  const isSetupValid = useCallback(() => {
    const baseValid = baseWorkflow.isFormValid;

    switch (protectionMode) {
      case ProtectionMode.PASSPHRASE_ONLY:
        return baseValid;
      case ProtectionMode.YUBIKEY_ONLY:
        return baseWorkflow.keyLabel.trim().length > 0 && selectedDevice && yubiKeyInfo;
      case ProtectionMode.HYBRID:
        return baseValid && selectedDevice && yubiKeyInfo;
      default:
        return false;
    }
  }, [
    baseWorkflow.isFormValid,
    baseWorkflow.keyLabel,
    protectionMode,
    selectedDevice,
    yubiKeyInfo,
  ]);

  // Determine if we can proceed to the next step
  const canProceedToNextStep = useCallback(() => {
    switch (setupStep) {
      case 'mode-selection':
        return protectionMode !== undefined;
      case 'configuration':
        if (protectionMode === ProtectionMode.PASSPHRASE_ONLY) {
          return baseWorkflow.isFormValid;
        }
        return (
          selectedDevice &&
          (protectionMode === ProtectionMode.YUBIKEY_ONLY ? true : baseWorkflow.isFormValid)
        );
      case 'generation':
        return isSetupValid();
      default:
        return false;
    }
  }, [setupStep, protectionMode, selectedDevice, baseWorkflow.isFormValid, isSetupValid]);

  // Get current error (either from base workflow or device error)
  const getCurrentError = useCallback(() => {
    if (deviceError) {
      return new CommandErrorClass({
        code: 'YUBIKEY_COMMUNICATION_ERROR' as any,
        message: 'YubiKey device error',
        details: deviceError,
        user_actionable: true,
        recovery_guidance: 'Check your YubiKey connection and try again',
      });
    }
    return baseWorkflow.error;
  }, [deviceError, baseWorkflow.error]);

  return {
    // Base workflow properties
    ...baseWorkflow,

    // Override key generation handler
    handleKeyGeneration: handleEnhancedKeyGeneration,
    handleReset,
    clearError,

    // Enhanced validation
    isFormValid: isSetupValid(),
    canProceedToNextStep: canProceedToNextStep(),
    error: getCurrentError(),

    // YubiKey-specific properties
    protectionMode,
    availableDevices,
    selectedDevice,
    yubiKeyInfo,
    isCheckingDevices,
    hasCheckedDevices,
    deviceError,
    setupStep,

    // YubiKey-specific handlers
    handleProtectionModeChange,
    handleDeviceSelect,
    handleYubiKeyConfigured,
    checkForYubiKeys,
    setSetupStep,
  };
};
