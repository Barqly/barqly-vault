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
    it('provides user with initial setup state', () => {
      const { result } = renderHook(() => useYubiKeySetupWorkflow());

      // User should have access to basic setup information
      expect(result.current.keyLabel).toBe('');
      expect(result.current.passphrase).toBe('');
      expect(result.current.confirmPassphrase).toBe('');
      expect(result.current.protectionMode).toBeUndefined();
      expect(result.current.selectedDevice).toBe(null);
    });
  });

  describe('User can progress through setup workflow', () => {
    it('user can enter key label for their vault', () => {
      const { result } = renderHook(() => useYubiKeySetupWorkflow());

      act(() => {
        result.current.handleKeyLabelChange('My Secure Vault');
      });

      expect(result.current.keyLabel).toBe('My Secure Vault');
    });

    it('user can choose protection mode', () => {
      const { result } = renderHook(() => useYubiKeySetupWorkflow());

      act(() => {
        result.current.handleProtectionModeChange(ProtectionMode.HYBRID);
      });

      expect(result.current.protectionMode).toBe(ProtectionMode.HYBRID);
    });

    it('user can enter secure passphrase', () => {
      const { result } = renderHook(() => useYubiKeySetupWorkflow());

      act(() => {
        result.current.handlePassphraseChange('MySecurePassword123!');
      });

      expect(result.current.passphrase).toBe('MySecurePassword123!');
    });

    it('user can select their YubiKey device', () => {
      const { result } = renderHook(() => useYubiKeySetupWorkflow());

      act(() => {
        result.current.handleDeviceSelect(mockYubiKeyDevices[0]);
      });

      expect(result.current.selectedDevice).toBe(mockYubiKeyDevices[0]);
    });
  });

  describe('User workflow validation', () => {
    it('user sees validation errors when setup is incomplete', () => {
      const { result } = renderHook(() => useYubiKeySetupWorkflow());

      // Empty key label should show error
      act(() => {
        result.current.handleKeyGeneration();
      });

      // User should see error state
      expect(result.current.error).toBeTruthy();
    });
  });

  describe('User can reset and start over', () => {
    it('user can reset workflow to start fresh', () => {
      const { result } = renderHook(() => useYubiKeySetupWorkflow());

      // Set up some state
      act(() => {
        result.current.handleKeyLabelChange('My Vault');
        result.current.handlePassphraseChange('Password123');
        result.current.handleProtectionModeChange(ProtectionMode.HYBRID);
      });

      // Reset
      act(() => {
        result.current.handleReset();
      });

      // Should be back to initial state
      expect(result.current.keyLabel).toBe('');
      expect(result.current.passphrase).toBe('');
      expect(result.current.protectionMode).toBeUndefined();
    });
  });
});
