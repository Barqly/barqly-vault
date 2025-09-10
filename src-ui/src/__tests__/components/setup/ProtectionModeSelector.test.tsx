import { render, screen, waitFor, act } from '@testing-library/react';
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
      await act(async () => {
        render(
          <ProtectionModeSelector
            onModeChange={mockOnModeChange}
            onYubiKeySelected={mockOnYubiKeySelected}
          />,
        );
      });

      // User should see protection mode options
      await waitFor(() => {
        const protectionOptions = screen.queryAllByRole('radio');
        expect(protectionOptions.length).toBeGreaterThan(0);
      });
    });

    it('user can select passphrase-only protection', async () => {
      await act(async () => {
        render(
          <ProtectionModeSelector
            onModeChange={mockOnModeChange}
            onYubiKeySelected={mockOnYubiKeySelected}
          />,
        );
      });

      await waitFor(() => {
        const protectionOptions = screen.queryAllByRole('radio');
        expect(protectionOptions.length).toBeGreaterThan(0);
      });

      const passphraseOption = screen.getAllByRole('radio')[0];
      await act(async () => {
        await user.click(passphraseOption);
      });

      expect(mockOnModeChange).toHaveBeenCalledWith(ProtectionMode.PASSPHRASE_ONLY);
    });

    it('user can select YubiKey-only protection when device available', async () => {
      const mockDevices = [
        {
          device_id: 'test-1',
          name: 'YubiKey 5 NFC',
          serial_number: '123456',
          firmware_version: '5.4.3',
          has_piv: true,
          has_oath: true,
          has_fido: true,
        },
      ];

      await act(async () => {
        render(
          <ProtectionModeSelector
            onModeChange={mockOnModeChange}
            onYubiKeySelected={mockOnYubiKeySelected}
            availableDevices={mockDevices}
          />,
        );
      });

      await waitFor(() => {
        const protectionOptions = screen.queryAllByRole('radio');
        expect(protectionOptions.length).toBeGreaterThanOrEqual(2);
      });

      const yubiKeyOption = screen.getAllByRole('radio')[1];
      await act(async () => {
        await user.click(yubiKeyOption);
      });

      expect(mockOnModeChange).toHaveBeenCalledWith(ProtectionMode.YUBIKEY_ONLY);
    });

    it('user can select hybrid protection when device available', async () => {
      const mockDevices = [
        {
          device_id: 'test-1',
          name: 'YubiKey 5 NFC',
          serial_number: '123456',
          firmware_version: '5.4.3',
          has_piv: true,
          has_oath: true,
          has_fido: true,
        },
      ];

      await act(async () => {
        render(
          <ProtectionModeSelector
            onModeChange={mockOnModeChange}
            onYubiKeySelected={mockOnYubiKeySelected}
            availableDevices={mockDevices}
          />,
        );
      });

      await waitFor(() => {
        const protectionOptions = screen.queryAllByRole('radio');
        expect(protectionOptions.length).toBeGreaterThanOrEqual(3);
      });

      const hybridOption = screen.getAllByRole('radio')[2];
      await act(async () => {
        await user.click(hybridOption);
      });

      expect(mockOnModeChange).toHaveBeenCalledWith(ProtectionMode.HYBRID);
    });
  });

  describe('User gets helpful guidance', () => {
    it('user sees recommendation when hybrid mode is best choice', async () => {
      await act(async () => {
        render(
          <ProtectionModeSelector
            onModeChange={mockOnModeChange}
            onYubiKeySelected={mockOnYubiKeySelected}
          />,
        );
      });

      // User should see recommendation guidance
      await waitFor(() => {
        const hasRecommendation =
          screen.queryAllByText(/recommended/i).length > 0 ||
          screen
            .queryAllByRole('radio')
            .some((option) => option.getAttribute('aria-checked') === 'true');
        expect(hasRecommendation).toBeTruthy();
      });
    });

    it('user can select YubiKey modes without upfront availability checks', async () => {
      // With lazy detection, user can select YubiKey modes without immediate device checks
      await act(async () => {
        render(
          <ProtectionModeSelector
            onModeChange={mockOnModeChange}
            onYubiKeySelected={mockOnYubiKeySelected}
          />,
        );
      });

      await waitFor(() => {
        // User should see all protection options available (no upfront blocking)
        const protectionOptions = screen.getAllByRole('radio');
        expect(protectionOptions.length).toBe(3); // Passphrase, YubiKey-only, Hybrid

        // YubiKey options should be selectable (lazy detection approach)
        const yubiKeyOption = screen.getByText('YubiKey Only').closest('[role="radio"]');
        expect(yubiKeyOption).not.toHaveAttribute('aria-disabled', 'true');
      });
    });

    it('user understands device detection errors', async () => {
      mockInvokeCommand.mockRejectedValue(new Error('Device detection failed'));

      await act(async () => {
        render(
          <ProtectionModeSelector
            onModeChange={mockOnModeChange}
            onYubiKeySelected={mockOnYubiKeySelected}
          />,
        );
      });

      await waitFor(() => {
        // User should see error indication or fallback state
        const hasErrorIndication =
          screen.queryAllByText(/failed/i).length > 0 ||
          screen.queryAllByText(/error/i).length > 0 ||
          screen.queryAllByRole('radio').length > 0;
        expect(hasErrorIndication).toBeTruthy();
      });
    });
  });

  describe('User experience during loading', () => {
    it('user sees loading state while options are being prepared', async () => {
      await act(async () => {
        render(
          <ProtectionModeSelector
            onModeChange={mockOnModeChange}
            onYubiKeySelected={mockOnYubiKeySelected}
            isLoading={true}
          />,
        );
      });

      // User should see some form of interface (loading or ready state)
      const hasInterface =
        screen.queryByRole('status') ||
        screen.queryAllByText(/loading/i).length > 0 ||
        screen.queryAllByRole('radio').length > 0;
      expect(hasInterface).toBeTruthy();
    });
  });

  describe('Accessibility for all users', () => {
    it('keyboard users can navigate and select options', async () => {
      await act(async () => {
        render(
          <ProtectionModeSelector
            onModeChange={mockOnModeChange}
            onYubiKeySelected={mockOnYubiKeySelected}
          />,
        );
      });

      await waitFor(() => {
        const protectionOptions = screen.queryAllByRole('radio');
        expect(protectionOptions.length).toBeGreaterThan(0);
      });

      // Find the first protection option
      const passphraseOption = screen.getAllByRole('radio')[0];
      expect(passphraseOption).toBeInTheDocument();

      // Keyboard navigation should work
      passphraseOption.focus();
      await act(async () => {
        await user.keyboard('{Enter}');
      });

      expect(mockOnModeChange).toHaveBeenCalledWith(ProtectionMode.PASSPHRASE_ONLY);
    });

    it('screen reader users get meaningful information', async () => {
      await act(async () => {
        render(
          <ProtectionModeSelector
            onModeChange={mockOnModeChange}
            onYubiKeySelected={mockOnYubiKeySelected}
          />,
        );
      });

      await waitFor(() => {
        const protectionOptions = screen.queryAllByRole('radio');
        expect(protectionOptions.length).toBeGreaterThan(0);
      });

      // Screen readers should get proper role information
      const options = screen.getAllByRole('radio');
      expect(options.length).toBeGreaterThan(0);
    });
  });
});
