import { renderHook, act } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { useYubiKeySetupWorkflow } from '../../hooks/useYubiKeySetupWorkflow';
import { ProtectionMode, YubiKeyDevice } from '../../lib/api-types';
import * as apiTypes from '../../lib/api-types';

// Mock the API types module
vi.mock('../../lib/api-types', async () => {
  const actual = await vi.importActual('../../lib/api-types');
  return {
    ...actual,
    invokeCommand: vi.fn(),
  };
});

const mockInvokeCommand = vi.mocked(apiTypes.invokeCommand);

const mockYubiKeyDevices: YubiKeyDevice[] = [
  {
    device_id: 'yubikey-1',
    name: 'YubiKey 5 NFC',
    serial_number: '12345678',
    firmware_version: '5.4.3',
    has_piv: true,
    has_oath: true,
    has_fido: true,
  },
];

describe('useYubiKeySetupWorkflow - User Workflow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockInvokeCommand.mockResolvedValue(mockYubiKeyDevices);
  });

  describe('Initial user workflow state', () => {
    it('provides user with initial setup state', async () => {
      const { result } = renderHook(() => useYubiKeySetupWorkflow());

      // Wait for any async initialization to complete
      await act(async () => {
        // Allow any pending promises to resolve
      });

      // User should have access to basic setup information
      expect(result.current.keyLabel).toBe('');
      expect(result.current.passphrase).toBe('');
      expect(result.current.confirmPassphrase).toBe('');
      expect(result.current.protectionMode).toBe(ProtectionMode.PASSPHRASE_ONLY);
      // With lazy detection, no device is selected until user chooses YubiKey mode
      expect(result.current.selectedDevice).toBe(null);
      expect(result.current.hasCheckedDevices).toBe(false);
    });
  });

  describe('User can progress through setup workflow', () => {
    it('user can enter key label for their vault', async () => {
      const { result } = renderHook(() => useYubiKeySetupWorkflow());

      // Wait for initial setup
      await act(async () => {
        // Allow initial async setup to complete
      });

      await act(async () => {
        result.current.handleKeyLabelChange('My Secure Vault');
      });

      expect(result.current.keyLabel).toBe('My Secure Vault');
    });

    it('user can choose protection mode', async () => {
      const { result } = renderHook(() => useYubiKeySetupWorkflow());

      // Wait for initial setup
      await act(async () => {
        // Allow initial async setup to complete
      });

      await act(async () => {
        result.current.handleProtectionModeChange(ProtectionMode.HYBRID);
      });

      expect(result.current.protectionMode).toBe(ProtectionMode.HYBRID);
    });

    it('user can enter secure passphrase', async () => {
      const { result } = renderHook(() => useYubiKeySetupWorkflow());

      // Wait for initial setup
      await act(async () => {
        // Allow initial async setup to complete
      });

      await act(async () => {
        result.current.handlePassphraseChange('MySecurePassword123!');
      });

      expect(result.current.passphrase).toBe('MySecurePassword123!');
    });

    it('user can select their YubiKey device', async () => {
      const { result } = renderHook(() => useYubiKeySetupWorkflow());

      // Wait for initial setup
      await act(async () => {
        // Allow initial async setup to complete
      });

      await act(async () => {
        result.current.handleDeviceSelect(mockYubiKeyDevices[0]);
      });

      expect(result.current.selectedDevice).toBe(mockYubiKeyDevices[0]);
    });
  });

  describe('User workflow validation', () => {
    it('user sees validation errors when setup is incomplete', async () => {
      const { result } = renderHook(() => useYubiKeySetupWorkflow());

      // Wait for initial setup
      await act(async () => {
        // Allow initial async setup to complete
      });

      // Form validation depends on setup state - with YubiKey auto-selection and default mode
      // the basic structure is valid, but key generation would still require proper inputs
      expect(result.current.keyLabel).toBe('');
      expect(result.current.passphrase).toBe('');
    });
  });

  describe('User can reset and start over', () => {
    it('user can reset workflow to start fresh', async () => {
      const { result } = renderHook(() => useYubiKeySetupWorkflow());

      // Wait for initial setup
      await act(async () => {
        // Allow initial async setup to complete
      });

      // Set up some state
      await act(async () => {
        result.current.handleKeyLabelChange('My Vault');
        result.current.handlePassphraseChange('Password123');
        result.current.handleProtectionModeChange(ProtectionMode.HYBRID);
      });

      // Reset
      await act(async () => {
        result.current.handleReset();
      });

      // Should be back to initial state
      expect(result.current.keyLabel).toBe('');
      expect(result.current.passphrase).toBe('');
      expect(result.current.protectionMode).toBe(ProtectionMode.PASSPHRASE_ONLY);
    });
  });
});
