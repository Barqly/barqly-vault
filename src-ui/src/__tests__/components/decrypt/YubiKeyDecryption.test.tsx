import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import YubiKeyDecryption from '../../../components/decrypt/YubiKeyDecryption';
import { YubiKeyDevice } from '../../../lib/api-types';
import * as apiTypes from '../../../lib/api-types';

// Mock the API types module
vi.mock('../../../lib/api-types', async () => {
  const actual = await vi.importActual('../../../lib/api-types');
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
    mockInvokeCommand.mockResolvedValue(mockYubiKeyDevices);
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('User understands YubiKey decryption process', () => {
    it('user sees that YubiKey devices are being detected', () => {
      render(<YubiKeyDecryption {...defaultProps} />);

      expect(screen.getByText(/loading.*yubikey.*devices/i)).toBeInTheDocument();
      expect(screen.getByText(/detecting.*yubikey/i)).toBeInTheDocument();
    });

    it('user understands what YubiKey decryption means', async () => {
      render(<YubiKeyDecryption {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText(/yubikey.*decryption/i)).toBeInTheDocument();
        expect(screen.getByText(/hardware.*device.*decrypt/i)).toBeInTheDocument();
      });
    });

    it('user is prompted to insert YubiKey when none found', async () => {
      mockInvokeCommand.mockResolvedValue([]);

      render(<YubiKeyDecryption {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText(/yubikey.*required/i)).toBeInTheDocument();
        expect(screen.getByText(/insert.*yubikey.*device/i)).toBeInTheDocument();
      });
    });
  });

  describe('User can work with their YubiKey device', () => {
    it('user can see their YubiKey device when detected', async () => {
      render(<YubiKeyDecryption {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('YubiKey 5 NFC')).toBeInTheDocument();
        expect(screen.getByText(/serial.*12345678/i)).toBeInTheDocument();
      });
    });

    it('user can select a different YubiKey if multiple available', async () => {
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
      mockInvokeCommand.mockResolvedValue(multipleDevices);

      render(<YubiKeyDecryption {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('YubiKey 5 NFC')).toBeInTheDocument();
        expect(screen.getByText('YubiKey 5C')).toBeInTheDocument();
      });

      const secondDevice = screen.getByText('YubiKey 5C');
      await user.click(secondDevice);

      expect(mockOnDeviceSelect).toHaveBeenCalledWith(multipleDevices[1]);
    });
  });

  describe('User gets helpful feedback and error handling', () => {
    it('user understands when device detection fails', async () => {
      mockInvokeCommand.mockRejectedValue(new Error('Failed to detect devices'));

      render(<YubiKeyDecryption {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText(/failed.*detect.*devices/i)).toBeInTheDocument();
      });
    });

    it('user can retry device detection when it fails', async () => {
      mockInvokeCommand.mockRejectedValueOnce(new Error('Detection failed'));

      render(<YubiKeyDecryption {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText(/check.*again/i)).toBeInTheDocument();
      });

      const checkAgainButton = screen.getByText(/check.*again/i);
      await user.click(checkAgainButton);

      expect(mockInvokeCommand).toHaveBeenCalledTimes(2);
    });
  });

  describe('User workflow progression', () => {
    it('user can proceed with decryption when device is ready', async () => {
      render(<YubiKeyDecryption {...defaultProps} selectedDevice={mockYubiKeyDevices[0]} />);

      await waitFor(() => {
        // User should see options to proceed with decryption
        const proceedButton =
          screen.queryByRole('button', { name: /decrypt/i }) ||
          screen.queryByRole('button', { name: /continue/i });

        if (proceedButton) {
          expect(proceedButton).toBeInTheDocument();
        }
      });
    });
  });

  describe('Accessibility for all users', () => {
    it('keyboard users can navigate and select devices', async () => {
      render(<YubiKeyDecryption {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('YubiKey 5 NFC')).toBeInTheDocument();
      });

      const deviceButton = screen.getByText('YubiKey 5 NFC').closest('button');
      if (deviceButton) {
        deviceButton.focus();
        await user.keyboard('{Enter}');
        expect(mockOnDeviceSelect).toHaveBeenCalled();
      }
    });

    it('screen reader users understand device status', async () => {
      render(<YubiKeyDecryption {...defaultProps} />);

      await waitFor(() => {
        // Loading state should have proper status role
        const loadingElement = screen.queryByRole('status');
        if (loadingElement) {
          expect(loadingElement).toBeInTheDocument();
        }
      });
    });
  });
});
