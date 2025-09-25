import { useState, useCallback, useEffect } from 'react';
import { useSetupWorkflow } from './useSetupWorkflow';
// import { useKeyGeneration } from './useKeyGeneration'; // Commented out - not currently used
import {
  ProtectionMode,
  YubiKeyInfo,
  // CommandErrorClass, // Commented out - not currently used
} from '../bindings';
import { YubiKeyStateInfo, commands } from '../bindings';
import { logger } from '../lib/logger';

/**
 * Enhanced setup workflow hook that adds YubiKey functionality
 * Extends the basic setup workflow with protection mode selection and YubiKey support
 */
export const useYubiKeySetupWorkflow = () => {
  // Use existing setup workflow as base
  const baseWorkflow = useSetupWorkflow();

  // Also get direct access to key generation for state management
  // const keyGeneration = useKeyGeneration(); // Commented out - not currently used

  // YubiKey-specific state
  const [protectionMode, setProtectionMode] = useState<ProtectionMode>(
    ProtectionMode.PASSPHRASE_ONLY,
  );
  const [availableDevices, setAvailableDevices] = useState<YubiKeyStateInfo[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<YubiKeyStateInfo | null>(null);
  const [yubiKeyInfo, setYubiKeyInfo] = useState<YubiKeyInfo | null>(null);
  const [isCheckingDevices, setIsCheckingDevices] = useState(false);
  const [hasCheckedDevices, setHasCheckedDevices] = useState(false);
  const [deviceError, setDeviceError] = useState<string | null>(null);
  const [setupStep, setSetupStep] = useState<'mode-selection' | 'configuration' | 'generation'>(
    'mode-selection',
  );
  const [yubiKeyPin, setYubiKeyPin] = useState<string>('');

  // Enhanced loading state for YubiKey operations
  const [isEnhancedLoading, setIsEnhancedLoading] = useState<boolean>(false);
  const [enhancedSuccess, setEnhancedSuccess] = useState<any>(null);
  const [enhancedError, setEnhancedError] = useState<any>(null);

  // YubiKey detection is now triggered when configuration step loads

  const checkForYubiKeys = useCallback(async () => {
    setIsCheckingDevices(true);
    setDeviceError(null);

    try {
      logger.logComponentLifecycle('useYubiKeySetupWorkflow', 'Checking for YubiKey devices');
      const result = await commands.listYubikeys();

      if (result.status === 'error') {
        throw new Error(result.error.message || 'Failed to list YubiKey devices');
      }

      const yubikeys = result.data;

      console.log('🎯 Streamlined YubiKey detection DEBUG:', {
        yubikeys,
        yukikeysLength: yubikeys.length,
        firstYubikey: yubikeys[0],
      });

      // Store the YubiKey state information directly
      setAvailableDevices(yubikeys);
      setHasCheckedDevices(true);

      // Auto-select the first (and typically only) YubiKey
      if (yubikeys.length > 0 && !selectedDevice) {
        console.log('🎯 Auto-selecting first YubiKey:', yubikeys[0]);
        setSelectedDevice(yubikeys[0]);
      }

      // Check YubiKey states and provide appropriate messaging
      const registeredKeys = yubikeys.filter((yk: YubiKeyStateInfo) => yk.state === 'registered');
      const newKeys = yubikeys.filter((yk: YubiKeyStateInfo) => yk.state === 'new');
      const reusedKeys = yubikeys.filter((yk: YubiKeyStateInfo) => yk.state === 'reused');

      if (registeredKeys.length > 0) {
        console.log('✅ Found registered YubiKey(s):', registeredKeys);
        // Auto-select first registered device
        if (!selectedDevice) {
          setSelectedDevice(devices[0]);
          logger.logComponentLifecycle(
            'useYubiKeySetupWorkflow',
            'Auto-selected registered YubiKey',
            {
              deviceName: (registeredKeys[0] as any).label,
              serial: registeredKeys[0].serial,
              state: registeredKeys[0].state,
            },
          );
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

  // Auto-trigger YubiKey detection when entering configuration step for YubiKey modes
  useEffect(() => {
    if (
      setupStep === 'configuration' &&
      (protectionMode === ProtectionMode.YUBIKEY_ONLY ||
        protectionMode === ProtectionMode.HYBRID) &&
      !hasCheckedDevices &&
      !isCheckingDevices
    ) {
      console.log('🚀 Configuration step reached for YubiKey mode - triggering detection');
      checkForYubiKeys();
    }
  }, [setupStep, protectionMode, hasCheckedDevices, isCheckingDevices, checkForYubiKeys]);

  const handleProtectionModeChange = useCallback(
    (mode: ProtectionMode) => {
      logger.logComponentLifecycle('useYubiKeySetupWorkflow', 'Protection mode changed', { mode });
      setProtectionMode(mode);

      // Trigger YubiKey detection immediately for YubiKey modes when entering configuration step
      if (
        (mode === ProtectionMode.YUBIKEY_ONLY || mode === ProtectionMode.HYBRID) &&
        !hasCheckedDevices
      ) {
        console.log(
          '🔍 YubiKey mode selected - triggering immediate detection for configuration step',
        );
        setTimeout(() => checkForYubiKeys(), 100); // Small delay to ensure state is updated
      }
    },
    [hasCheckedDevices, checkForYubiKeys],
  );

  const handleDeviceSelect = useCallback((device: YubiKeyStateInfo) => {
    logger.logComponentLifecycle('useYubiKeySetupWorkflow', 'Device selected', {
      deviceName: device.label || `YubiKey (${device.serial})`,
      deviceId: device.serial,
    });
    setSelectedDevice(device);
  }, []);

  const handleYubiKeyConfigured = useCallback((device: YubiKeyStateInfo, info: YubiKeyInfo) => {
    logger.logComponentLifecycle('useYubiKeySetupWorkflow', 'YubiKey configured', {
      deviceName: device.label || `YubiKey (${device.serial})`,
      deviceId: device.serial,
      slots: info.piv_slots,
    });
    setYubiKeyInfo(info);
    // Don't auto-advance steps - user should click "Create Key" button
    console.log(
      '🔧 YubiKey configured but staying in configuration step - user must click Create Key',
    );
  }, []);

  // Handler for when vault label changes - trigger YubiKey detection for YubiKey modes
  const handleVaultLabelChange = useCallback(
    (label: string) => {
      console.log('🏷️ Vault label change DEBUG:', {
        label,
        protectionMode,
        hasCheckedDevices,
        isCheckingDevices,
        shouldTriggerDetection:
          (protectionMode === ProtectionMode.YUBIKEY_ONLY ||
            protectionMode === ProtectionMode.HYBRID) &&
          label.trim().length > 0 &&
          !hasCheckedDevices &&
          !isCheckingDevices,
      });

      baseWorkflow.handleKeyLabelChange(label);

      // Trigger YubiKey detection when user enters vault label for YubiKey modes
      if (
        (protectionMode === ProtectionMode.YUBIKEY_ONLY ||
          protectionMode === ProtectionMode.HYBRID) &&
        label.trim().length > 0 &&
        !hasCheckedDevices &&
        !isCheckingDevices
      ) {
        console.log('🔍 Vault label entered, triggering YubiKey detection:', label);
        checkForYubiKeys();
      }
    },
    [protectionMode, hasCheckedDevices, isCheckingDevices, checkForYubiKeys, baseWorkflow],
  );

  const handleEnhancedKeyGeneration = useCallback(async () => {
    console.log('🎯 TRACER: handleEnhancedKeyGeneration called - START', {
      protectionMode,
      hasCheckedDevices,
      isCheckingDevices,
      yubiKeyPin: yubiKeyPin ? `[${yubiKeyPin.length} chars]` : 'null/empty',
      keyLabel: baseWorkflow.keyLabel,
      selectedDevice: selectedDevice
        ? `${selectedDevice.name} (${selectedDevice.serial_number})`
        : 'null',
      timestamp: new Date().toISOString(),
    });

    // For passphrase-only mode, delegate to base workflow entirely
    if (protectionMode === ProtectionMode.PASSPHRASE_ONLY) {
      console.log('🎯 TRACER: Passphrase-only mode - delegating to base workflow');
      return await baseWorkflow.handleKeyGeneration();
    }

    try {
      // For YubiKey modes, ensure we have detected devices before proceeding
      if (
        (protectionMode === ProtectionMode.YUBIKEY_ONLY ||
          protectionMode === ProtectionMode.HYBRID) &&
        !hasCheckedDevices
      ) {
        console.log(
          '🔍 TRACER: YubiKey mode detected but no devices checked - triggering detection now',
        );
        await checkForYubiKeys();
      }

      // For YubiKey-only mode, skip generation step and show loading immediately
      if (protectionMode === ProtectionMode.YUBIKEY_ONLY) {
        console.log('🎯 TRACER: YubiKey-only mode - staying in configuration step');
        // Stay on current step but start loading
      } else {
        console.log('🎯 TRACER: Non-YubiKey mode - advancing to generation step');
        // For other modes, advance to generation step
        setSetupStep('generation');
      }

      console.log('🚀 TRACER: Starting enhanced key generation with state:', {
        protectionMode,
        hasYubiKey: !!selectedDevice,
        keyLabel: baseWorkflow.keyLabel,
        deviceCount: availableDevices.length,
        yubiKeyStatesCount: yubiKeyStates.length,
      });

      logger.logComponentLifecycle('useYubiKeySetupWorkflow', 'Enhanced key generation started', {
        protectionMode,
        hasYubiKey: !!selectedDevice,
        keyLabel: baseWorkflow.keyLabel,
      });

      // Clear any existing errors and set enhanced loading state
      baseWorkflow.clearError();
      setEnhancedError(null);
      setEnhancedSuccess(null);
      setIsEnhancedLoading(true);
      console.log('⏳ TRACER: Starting enhanced key generation with enhanced loading state');

      // For YubiKey modes, use the new multi-recipient key generation
      // Clean parameter object - no undefined values
      const generateKeyParams: any = {
        label: baseWorkflow.keyLabel,
      };

      // Set protection mode with correct backend structure
      // Use the actual serial number from the selected device or first available YubiKey
      const yubiKeySerial =
        selectedDevice?.serial_number || // This should now be the actual serial
        yubiKeyStates[0]?.serial || // Fallback to first YubiKey's serial
        'auto-detect'; // Last resort fallback

      console.log('🔍 YubiKey serial resolution DEBUG:', {
        selectedDevice,
        selectedDeviceSerial: selectedDevice?.serial_number,
        selectedDeviceId: selectedDevice?.device_id,
        yubiKeyStatesLength: yubiKeyStates.length,
        yubiKeyStates,
        firstYubiKeyState: yubiKeyStates[0]?.serial,
        resolvedSerial: yubiKeySerial,
        yubiKeyPin,
      });

      if (protectionMode === ProtectionMode.YUBIKEY_ONLY) {
        generateKeyParams.protection_mode = {
          YubiKeyOnly: {
            serial: yubiKeySerial,
          },
        };
      } else if (protectionMode === ProtectionMode.HYBRID) {
        generateKeyParams.protection_mode = {
          Hybrid: {
            yubikey_serial: yubiKeySerial,
          },
        };
      } else {
        generateKeyParams.protection_mode = 'PassphraseOnly';
      }

      // Add YubiKey parameters - required for YubiKey modes
      if (
        protectionMode === ProtectionMode.YUBIKEY_ONLY ||
        protectionMode === ProtectionMode.HYBRID
      ) {
        // Use the actual serial number as device_id (they should be the same now)
        generateKeyParams.yubikey_device_id = yubiKeySerial;
        generateKeyParams.yubikey_info = yubiKeyInfo || null;
        generateKeyParams.yubikey_pin = yubiKeyPin || null; // Add PIN for initialization
      }

      // Only include passphrase for hybrid mode
      if (protectionMode === ProtectionMode.HYBRID && baseWorkflow.passphrase?.trim()) {
        generateKeyParams.passphrase = baseWorkflow.passphrase;
      }

      console.log('🔍 TRACER: Clean parameters (no undefined):', {
        ...generateKeyParams,
        yubikey_pin: generateKeyParams.yubikey_pin
          ? `[${generateKeyParams.yubikey_pin.length} chars]`
          : 'null/empty',
        passphrase: generateKeyParams.passphrase ? '[REDACTED]' : 'null/empty',
      });

      console.log('🔑 TRACER: Calling generate_key_multi with parameters:', {
        ...generateKeyParams,
        yubikey_pin: generateKeyParams.yubikey_pin
          ? `[${generateKeyParams.yubikey_pin.length} chars]`
          : 'null/empty',
        passphrase: generateKeyParams.passphrase ? '[REDACTED]' : 'null/empty',
        timestamp: new Date().toISOString(),
      });

      logger.logComponentLifecycle('useYubiKeySetupWorkflow', 'Calling enhanced key generation', {
        params: {
          ...generateKeyParams,
          passphrase: generateKeyParams.passphrase ? '[REDACTED]' : undefined,
          yubikey_pin: generateKeyParams.yubikey_pin ? '[REDACTED]' : undefined,
        },
      });

      // Use new multi-recipient key generation command
      console.log('📡 TRACER: About to call commands.generateKeyMulti');
      const result = await commands.generateKeyMulti(generateKeyParams);

      if (result.status === 'error') {
        throw new Error(result.error.message || 'Key generation failed');
      }

      console.log('✅ TRACER: generateKeyMulti successful:', result.data);

      // Set enhanced success state
      setIsEnhancedLoading(false);
      setEnhancedSuccess(result.data);
      console.log('🎉 TRACER: Enhanced loading complete - success state set');

      return result.data;
    } catch (error: any) {
      console.log('❌ TRACER: Enhanced key generation failed:', error);
      logger.logComponentLifecycle('useYubiKeySetupWorkflow', 'Enhanced key generation failed', {
        error: error.message,
      });

      // Set enhanced error state
      setIsEnhancedLoading(false);
      setEnhancedError(error);
      console.log('💥 TRACER: Enhanced loading complete - error state set');

      throw error;
    }
  }, [
    protectionMode,
    selectedDevice,
    yubiKeyInfo,
    yubiKeyPin,
    yubiKeyStates,
    hasCheckedDevices,
    checkForYubiKeys,
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

  // Unused but keeping for potential future use
  // const clearError = useCallback(() => {
  //   baseWorkflow.clearError();
  //   setDeviceError(null);
  // }, [baseWorkflow.clearError]);

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

  // Unused but keeping for potential future use
  // const getCurrentError = useCallback(() => {
  //   if (deviceError) {
  //     return new CommandErrorClass({
  //       code: 'YUBIKEY_COMMUNICATION_ERROR' as any,
  //       message: 'YubiKey device error',
  //       details: deviceError,
  //       user_actionable: true,
  //       recovery_guidance: 'Check your YubiKey connection and try again',
  //     });
  //   }
  //   return baseWorkflow.error;
  // }, [deviceError, baseWorkflow.error]);

  // Enhanced state management: Override base workflow state when enhanced operations are active
  const getEffectiveLoadingState = () => {
    return isEnhancedLoading || baseWorkflow.isLoading;
  };

  const getEffectiveSuccessState = () => {
    return enhancedSuccess || baseWorkflow.success;
  };

  const getEffectiveErrorState = () => {
    return enhancedError || baseWorkflow.error;
  };

  const handleEnhancedReset = useCallback(() => {
    console.log('🔄 TRACER: Enhanced reset called - clearing enhanced states');
    setIsEnhancedLoading(false);
    setEnhancedSuccess(null);
    setEnhancedError(null);
    handleReset();
  }, [handleReset]);

  const handleEnhancedClearError = useCallback(() => {
    console.log('🧹 TRACER: Enhanced clear error called');
    setEnhancedError(null);
    baseWorkflow.clearError();
  }, [baseWorkflow]);

  return {
    // Base workflow properties (overridden by enhanced state)
    ...baseWorkflow,

    // Override state with enhanced state when active
    isLoading: getEffectiveLoadingState(),
    success: getEffectiveSuccessState(),
    error: getEffectiveErrorState(),

    // Override key generation and label change handlers
    handleKeyGeneration: handleEnhancedKeyGeneration,
    handleKeyLabelChange: handleVaultLabelChange,
    handleReset: handleEnhancedReset,
    clearError: handleEnhancedClearError,

    // Enhanced validation
    isFormValid: isSetupValid(),
    canProceedToNextStep: canProceedToNextStep(),

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
    yubiKeyPin,

    // YubiKey-specific handlers
    handleProtectionModeChange,
    handleDeviceSelect,
    handleYubiKeyConfigured,
    checkForYubiKeys,
    setSetupStep,
    setYubiKeyPin,
  };
};
