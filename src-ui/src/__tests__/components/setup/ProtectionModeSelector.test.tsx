import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import ProtectionModeSelector from '../../../components/setup/ProtectionModeSelector';
import { ProtectionMode, YubiKeyDevice } from '../../../lib/api-types';
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

describe('ProtectionModeSelector - User Experience', () => {
  const user = userEvent.setup();
  const mockOnModeChange = vi.fn();
  const mockOnYubiKeySelected = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockInvokeCommand.mockResolvedValue(mockYubiKeyDevices);
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('User can choose protection method', () => {
    it('user sees protection options to choose from', async () => {
      render(
        <ProtectionModeSelector
          onModeChange={mockOnModeChange}
          onYubiKeySelected={mockOnYubiKeySelected}
        />,
      );

      // User should see the main heading and options
      expect(screen.getByText(/choose.*protection/i)).toBeInTheDocument();

      // User should see all three protection modes
      await waitFor(() => {
        expect(screen.getByText(/passphrase.*only/i)).toBeInTheDocument();
        expect(screen.getByText(/yubikey.*only/i)).toBeInTheDocument();
        expect(screen.getByText(/hybrid.*protection/i)).toBeInTheDocument();
      });
    });

    it('user can select passphrase-only protection', async () => {
      render(
        <ProtectionModeSelector
          onModeChange={mockOnModeChange}
          onYubiKeySelected={mockOnYubiKeySelected}
        />,
      );

      await waitFor(() => {
        expect(screen.getByText(/passphrase.*only/i)).toBeInTheDocument();
      });

      const passphraseOption = screen.getByText(/passphrase.*only/i);
      await user.click(passphraseOption);

      expect(mockOnModeChange).toHaveBeenCalledWith(ProtectionMode.PASSPHRASE_ONLY);
    });

    it('user can select YubiKey-only protection when device available', async () => {
      render(
        <ProtectionModeSelector
          onModeChange={mockOnModeChange}
          onYubiKeySelected={mockOnYubiKeySelected}
        />,
      );

      await waitFor(() => {
        expect(screen.getByText(/yubikey.*only/i)).toBeInTheDocument();
      });

      const yubiKeyOption = screen.getByText(/yubikey.*only/i);
      await user.click(yubiKeyOption);

      expect(mockOnModeChange).toHaveBeenCalledWith(ProtectionMode.YUBIKEY_ONLY);
    });

    it('user can select hybrid protection when device available', async () => {
      render(
        <ProtectionModeSelector
          onModeChange={mockOnModeChange}
          onYubiKeySelected={mockOnYubiKeySelected}
        />,
      );

      await waitFor(() => {
        expect(screen.getByText(/hybrid.*protection/i)).toBeInTheDocument();
      });

      const hybridOption = screen.getByText(/hybrid.*protection/i);
      await user.click(hybridOption);

      expect(mockOnModeChange).toHaveBeenCalledWith(ProtectionMode.HYBRID);
    });
  });

  describe('User gets helpful guidance', () => {
    it('user sees recommendation when hybrid mode is best choice', async () => {
      render(
        <ProtectionModeSelector
          onModeChange={mockOnModeChange}
          onYubiKeySelected={mockOnYubiKeySelected}
        />,
      );

      // Hybrid should be marked as recommended
      await waitFor(() => {
        expect(screen.getByText(/recommended/i)).toBeInTheDocument();
      });
    });

    it('user understands when YubiKey is not available', async () => {
      mockInvokeCommand.mockResolvedValue([]); // No devices

      render(
        <ProtectionModeSelector
          onModeChange={mockOnModeChange}
          onYubiKeySelected={mockOnYubiKeySelected}
        />,
      );

      await waitFor(() => {
        // User should see that YubiKey devices are not available
        expect(screen.getByText(/no yubikey devices/i)).toBeInTheDocument();
      });
    });

    it('user understands device detection errors', async () => {
      mockInvokeCommand.mockRejectedValue(new Error('Device detection failed'));

      render(
        <ProtectionModeSelector
          onModeChange={mockOnModeChange}
          onYubiKeySelected={mockOnYubiKeySelected}
        />,
      );

      await waitFor(() => {
        // User should see helpful error message
        expect(screen.getByText(/failed.*detect/i)).toBeInTheDocument();
      });
    });
  });

  describe('User experience during loading', () => {
    it('user sees loading state while options are being prepared', () => {
      render(
        <ProtectionModeSelector
          onModeChange={mockOnModeChange}
          onYubiKeySelected={mockOnYubiKeySelected}
          isLoading={true}
        />,
      );

      // User should see that system is working
      expect(screen.getByText(/loading/i) || screen.getByRole('status')).toBeInTheDocument();
    });
  });

  describe('Accessibility for all users', () => {
    it('keyboard users can navigate and select options', async () => {
      render(
        <ProtectionModeSelector
          onModeChange={mockOnModeChange}
          onYubiKeySelected={mockOnYubiKeySelected}
        />,
      );

      await waitFor(() => {
        expect(screen.getByText(/passphrase.*only/i)).toBeInTheDocument();
      });

      // Find the passphrase option button
      const passphraseButton = screen.getByText(/passphrase.*only/i).closest('button');
      expect(passphraseButton).toBeInTheDocument();

      // Keyboard navigation should work
      passphraseButton?.focus();
      await user.keyboard('{Enter}');

      expect(mockOnModeChange).toHaveBeenCalledWith(ProtectionMode.PASSPHRASE_ONLY);
    });

    it('screen reader users get meaningful information', async () => {
      render(
        <ProtectionModeSelector
          onModeChange={mockOnModeChange}
          onYubiKeySelected={mockOnYubiKeySelected}
        />,
      );

      await waitFor(() => {
        expect(screen.getByText(/passphrase.*only/i)).toBeInTheDocument();
      });

      // Screen readers should get proper role information
      const options = screen.getAllByRole('radio');
      expect(options.length).toBeGreaterThan(0);
    });
  });
});
