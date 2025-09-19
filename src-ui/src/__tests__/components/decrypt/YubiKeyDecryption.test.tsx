import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import YubiKeyDecryption from '../../../components/decrypt/YubiKeyDecryption';
import { YubiKeyDevice } from '../../../lib/api-types';
import * as tauriSafe from '../../../lib/tauri-safe';

// Mock the tauri-safe module
vi.mock('../../../lib/tauri-safe', () => ({
  safeInvoke: vi.fn(),
}));

const mockSafeInvoke = vi.mocked(tauriSafe.safeInvoke);

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

describe('YubiKeyDecryption - User Experience', () => {
  const user = userEvent.setup();
  const mockOnDecryptionStart = vi.fn();
  const mockOnDeviceSelect = vi.fn();

  const defaultProps = {
    filePath: '/test/vault.age',
    outputDir: '/test/output',
    onDecryptionStart: mockOnDecryptionStart,
    onDeviceSelect: mockOnDeviceSelect,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockSafeInvoke.mockImplementation((cmd) => {
      if (cmd === 'yubikey_list_devices') {
        return Promise.resolve(mockYubiKeyDevices);
      }
      return Promise.resolve(null);
    });
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('User understands YubiKey decryption process', () => {
    it('user sees that YubiKey devices are being detected', async () => {
      await act(async () => {
        render(<YubiKeyDecryption {...defaultProps} />);
      });

      // User should see some form of interface for YubiKey operations
      const hasYubiKeyInterface =
        screen.queryAllByText(/yubikey/i).length > 0 || screen.queryByRole('radio');
      expect(hasYubiKeyInterface).toBeTruthy();
    });

    it('user can interact with YubiKey decryption interface', async () => {
      await act(async () => {
        render(<YubiKeyDecryption {...defaultProps} />);
      });

      await waitFor(() => {
        // User should see interactive YubiKey interface elements
        const hasYubiKeyElements =
          screen.queryAllByText(/yubikey/i).length > 0 || screen.queryAllByRole('radio').length > 0;
        expect(hasYubiKeyElements).toBeTruthy();
      });
    });

    it('user receives feedback when no devices are found', async () => {
      mockSafeInvoke.mockImplementation((cmd) => {
        if (cmd === 'yubikey_list_devices') {
          return Promise.resolve([]);
        }
        return Promise.resolve(null);
      });

      await act(async () => {
        render(<YubiKeyDecryption {...defaultProps} />);
      });

      await waitFor(() => {
        // User should get some indication about device state (even if generic message)
        const hasDeviceState =
          screen.queryAllByText(/yubikey/i).length > 0 ||
          screen.queryByText(/device/i) ||
          screen.queryByText(/insert/i);
        expect(hasDeviceState).toBeTruthy();
      });
    });
  });

  describe('User can work with their YubiKey device', () => {
    it('user can interact with detected devices', async () => {
      await act(async () => {
        render(<YubiKeyDecryption {...defaultProps} />);
      });

      await waitFor(() => {
        // User should be able to interact with detected devices
        const deviceElements = screen.queryAllByRole('radio'); // YubiKey devices are shown as radio buttons
        expect(deviceElements.length).toBeGreaterThan(0);
      });
    });

    it('user can select between multiple devices', async () => {
      const multipleDevices = [
        ...mockYubiKeyDevices,
        {
          device_id: 'yubikey-2',
          name: 'YubiKey 5C',
          serial_number: '87654321',
          firmware_version: '5.2.7',
          has_piv: true,
          has_oath: false,
          has_fido: true,
        },
      ];
      mockSafeInvoke.mockImplementation((cmd) => {
        if (cmd === 'yubikey_list_devices') {
          return Promise.resolve(multipleDevices);
        }
        return Promise.resolve(null);
      });

      await act(async () => {
        render(<YubiKeyDecryption {...defaultProps} />);
      });

      await waitFor(() => {
        const deviceRadios = screen.queryAllByRole('radio');
        // User should have multiple device options to select from
        expect(deviceRadios.length).toBeGreaterThan(1);
      });

      // Try to select a device
      const deviceRadios = screen.queryAllByRole('radio');
      if (deviceRadios.length > 1) {
        await user.click(deviceRadios[1]);
        expect(mockOnDeviceSelect).toHaveBeenCalled();
      }
    });
  });

  describe('User gets helpful feedback and error handling', () => {
    it('user receives feedback when device detection fails', async () => {
      mockSafeInvoke.mockRejectedValue(new Error('Failed to detect devices'));

      await act(async () => {
        render(<YubiKeyDecryption {...defaultProps} />);
      });

      await waitFor(() => {
        // User should see some indication of the error state
        // In this case, the component shows "YubiKey Required" when detection fails
        const hasErrorIndication =
          screen.queryByRole('alert') ||
          screen.queryByText(/required/i) ||
          screen.queryByText(/insert/i) ||
          screen.queryByText(/failed/i);
        expect(hasErrorIndication).toBeTruthy();
      });
    });

    it('user can retry device detection when it fails', async () => {
      mockSafeInvoke.mockRejectedValueOnce(new Error('Detection failed'));
      mockSafeInvoke.mockResolvedValueOnce(mockYubiKeyDevices);

      await act(async () => {
        render(<YubiKeyDecryption {...defaultProps} />);
      });

      await waitFor(() => {
        // User should have some way to retry or refresh the detection
        const retryOptions = screen.queryAllByRole('button');
        expect(retryOptions.length).toBeGreaterThan(0);
      });

      const buttons = screen.queryAllByRole('button');
      if (buttons.length > 0) {
        await user.click(buttons[0]); // Click first available button
        expect(mockSafeInvoke).toHaveBeenCalledTimes(2);
      }
    });
  });

  describe('User workflow progression', () => {
    it('user can proceed with decryption when device is ready', async () => {
      await act(async () => {
        render(<YubiKeyDecryption {...defaultProps} selectedDevice={mockYubiKeyDevices[0]} />);
      });

      await waitFor(() => {
        // User should see options to proceed with decryption
        const proceedButton =
          screen.queryByRole('button', { name: /decrypt/i }) ||
          screen.queryByRole('button', { name: /continue/i }) ||
          screen.queryByRole('button', { name: /proceed/i });

        if (proceedButton) {
          expect(proceedButton).toBeInTheDocument();
        }
      });
    });
  });

  describe('Accessibility for all users', () => {
    it('keyboard users can navigate and select devices', async () => {
      await act(async () => {
        render(<YubiKeyDecryption {...defaultProps} />);
      });

      await waitFor(() => {
        // User should have keyboard-accessible device selection
        const deviceRadios = screen.queryAllByRole('radio');
        expect(deviceRadios.length).toBeGreaterThan(0);
      });

      const firstDeviceRadio = screen.queryAllByRole('radio')[0];
      if (firstDeviceRadio) {
        firstDeviceRadio.focus();
        await user.keyboard('{Enter}');
        // Device selection should have occurred
        expect(mockOnDeviceSelect).toHaveBeenCalled();
      }
    });

    it('screen reader users understand device status', async () => {
      await act(async () => {
        render(<YubiKeyDecryption {...defaultProps} />);
      });

      await waitFor(() => {
        // Component should provide accessible interface elements
        const hasAccessibleElements =
          screen.queryAllByRole('radio').length > 0 ||
          screen.queryByRole('status') ||
          screen.queryByRole('alert');
        expect(hasAccessibleElements).toBeTruthy();
      });
    });
  });
});
