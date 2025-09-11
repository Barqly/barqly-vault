import { useState, useCallback } from 'react';
import { useSetupWorkflow } from './useSetupWorkflow';
import { 
  ProtectionMode, 
  YubiKeyDevice, 
  YubiKeyInfo, 
  CommandErrorClass,
  YubiKeyStateInfo,
  YubiKeyState 
} from '../lib/api-types';
import { safeInvoke } from '../lib/tauri-safe';
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
  const [yubiKeyStates, setYubiKeyStates] = useState<YubiKeyStateInfo[]>([]);
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
      const yubikeys = await safeInvoke<YubiKeyStateInfo[]>(
        'list_yubikeys',
        undefined,
        'useYubiKeySetupWorkflow.checkForYubiKeys',
      );
      
      console.log('🎯 Streamlined YubiKey detection:', yubikeys);

      // Store the YubiKey state information
      setYubiKeyStates(yubikeys);

      // Convert YubiKeyStateInfo to YubiKeyDevice format for backward compatibility
      const devices: YubiKeyDevice[] = yubikeys.map(yk => ({
        device_id: yk.serial,
        name: yk.label || `YubiKey (${yk.serial})`,
        serial_number: yk.serial,
        firmware_version: undefined,
        has_piv: true,
        has_oath: false,
        has_fido: false,
      }));

      setAvailableDevices(devices);
      setHasCheckedDevices(true);

      // Check YubiKey states and provide appropriate messaging
      const registeredKeys = yubikeys.filter(yk => yk.state === YubiKeyState.REGISTERED);
      const newKeys = yubikeys.filter(yk => yk.state === YubiKeyState.NEW);
      const reusedKeys = yubikeys.filter(yk => yk.state === YubiKeyState.REUSED);

      if (registeredKeys.length > 0) {
        console.log('✅ Found registered YubiKey(s):', registeredKeys);
        // Auto-select first registered device
        if (!selectedDevice) {
          setSelectedDevice(devices[0]);
          logger.logComponentLifecycle('useYubiKeySetupWorkflow', 'Auto-selected registered YubiKey', {
            deviceName: registeredKeys[0].label,
            serial: registeredKeys[0].serial,
            state: registeredKeys[0].state,
          });
        }
      } else if (newKeys.length > 0 || reusedKeys.length > 0) {
        setDeviceError(`YubiKey needs setup: ${newKeys.length} new, ${reusedKeys.length} reused`);
      } else if (yubikeys.length === 0) {
        setDeviceError('No YubiKey detected - please insert YubiKey');
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
    // Don't auto-advance steps - user should click "Create Key" button
    console.log('🔧 YubiKey configured but staying in configuration step - user must click Create Key');
  }, []);

  const handleEnhancedKeyGeneration = useCallback(async () => {
    try {
      // Advance to generation step when user clicks "Create Key"
      setSetupStep('generation');
      
      console.log('🚀 Starting enhanced key generation:', {
        protectionMode,
        hasYubiKey: !!selectedDevice,
        keyLabel: baseWorkflow.keyLabel,
        deviceCount: availableDevices.length,
      });
      
      logger.logComponentLifecycle('useYubiKeySetupWorkflow', 'Enhanced key generation started', {
        protectionMode,
        hasYubiKey: !!selectedDevice,
        keyLabel: baseWorkflow.keyLabel,
      });

      if (protectionMode === ProtectionMode.PASSPHRASE_ONLY) {
        // Use standard key generation for passphrase-only mode
        return await baseWorkflow.handleKeyGeneration();
      }

      // For YubiKey modes, use the new multi-recipient key generation
      // Clean parameter object - no undefined values
      const generateKeyParams: any = {
        label: baseWorkflow.keyLabel,
      };

      // Set protection mode with correct backend structure
      if (protectionMode === ProtectionMode.YUBIKEY_ONLY) {
        generateKeyParams.protection_mode = { 
          YubiKeyOnly: { 
            serial: selectedDevice?.serial_number || "unknown" 
          } 
        };
      } else if (protectionMode === ProtectionMode.HYBRID) {
        generateKeyParams.protection_mode = { 
          Hybrid: { 
            yubikey_serial: selectedDevice?.serial_number || "unknown" 
          } 
        };
      } else {
        generateKeyParams.protection_mode = "PassphraseOnly";
      }

      // Add YubiKey parameters - required for YubiKey modes
      if (protectionMode === ProtectionMode.YUBIKEY_ONLY || protectionMode === ProtectionMode.HYBRID) {
        // Use detected device or placeholder for backend to handle
        generateKeyParams.yubikey_device_id = selectedDevice?.device_id || "auto-detect";
        generateKeyParams.yubikey_info = yubiKeyInfo || null;
      }

      // Only include passphrase for hybrid mode
      if (protectionMode === ProtectionMode.HYBRID && baseWorkflow.passphrase?.trim()) {
        generateKeyParams.passphrase = baseWorkflow.passphrase;
      }
      
      console.log('🔍 Clean parameters (no undefined):', generateKeyParams);

      console.log('🔑 Calling generate_key_multi with parameters:', generateKeyParams);

      logger.logComponentLifecycle('useYubiKeySetupWorkflow', 'Calling enhanced key generation', {
        params: {
          ...generateKeyParams,
          passphrase: generateKeyParams.passphrase ? '[REDACTED]' : undefined,
        },
      });

      // Use new multi-recipient key generation command
      const result = await safeInvoke('generate_key_multi', generateKeyParams, 'useYubiKeySetupWorkflow.generateKey');
      
      console.log('✅ generate_key_multi successful:', result);
      return result;
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
        // For YubiKey-only mode, only require key label
        // YubiKey can be connected and configured later
        return baseWorkflow.keyLabel.trim().length > 0;
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
        } else if (protectionMode === ProtectionMode.YUBIKEY_ONLY) {
          // For YubiKey-only mode, only require key label - YubiKey can be connected later
          return baseWorkflow.keyLabel.trim().length > 0;
        } else {
          // Hybrid mode requires both passphrase validation and YubiKey
          return baseWorkflow.isFormValid && selectedDevice;
        }
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
    yubiKeyStates,
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
