import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import UnlockMethodChooser from '../../../components/decrypt/UnlockMethodChooser';
import { UnlockMethodType, AvailableMethod } from '../../../lib/api-types';
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

const mockAvailableMethods: AvailableMethod[] = [
  {
    method_type: UnlockMethodType.PASSPHRASE,
    display_name: 'Passphrase',
    description: 'Unlock with your secure passphrase',
    requires_hardware: false,
    estimated_time: '1-2 seconds',
    confidence_level: 'High' as any,
  },
  {
    method_type: UnlockMethodType.YUBIKEY,
    display_name: 'YubiKey',
    description: 'Unlock with your YubiKey hardware device',
    requires_hardware: true,
    estimated_time: '2-3 seconds',
    confidence_level: 'High' as any,
  },
];

describe('UnlockMethodChooser - User Experience', () => {
  const user = userEvent.setup();
  const mockOnMethodSelect = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockInvokeCommand.mockResolvedValue({ status: 'success', data: mockAvailableMethods });
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('User can choose how to decrypt their vault', () => {
    it('user understands they need to choose an unlock method', async () => {
      render(
        <UnlockMethodChooser filePath="/test/vault.age" onMethodSelect={mockOnMethodSelect} />,
      );

      expect(screen.getByText(/choose.*unlock.*method/i)).toBeInTheDocument();
      expect(screen.getByText(/select.*decrypt.*vault/i)).toBeInTheDocument();
    });

    it('user can choose passphrase method when available', async () => {
      render(
        <UnlockMethodChooser filePath="/test/vault.age" onMethodSelect={mockOnMethodSelect} />,
      );

      await waitFor(() => {
        expect(screen.getByText('Passphrase')).toBeInTheDocument();
      });

      const passphraseOption = screen.getByText('Passphrase');
      await user.click(passphraseOption);

      expect(mockOnMethodSelect).toHaveBeenCalledWith(UnlockMethodType.PASSPHRASE);
    });

    it('user can choose YubiKey method when available', async () => {
      render(
        <UnlockMethodChooser filePath="/test/vault.age" onMethodSelect={mockOnMethodSelect} />,
      );

      await waitFor(() => {
        expect(screen.getByText('YubiKey')).toBeInTheDocument();
      });

      const yubiKeyOption = screen.getByText('YubiKey');
      await user.click(yubiKeyOption);

      expect(mockOnMethodSelect).toHaveBeenCalledWith(UnlockMethodType.YUBIKEY);
    });
  });

  describe('User gets helpful feedback', () => {
    it('user sees loading state while vault is being analyzed', () => {
      render(
        <UnlockMethodChooser filePath="/test/vault.age" onMethodSelect={mockOnMethodSelect} />,
      );

      // User should see that analysis is in progress
      expect(screen.getByRole('status') || screen.getByText(/analyz/i)).toBeInTheDocument();
    });

    it('user understands when vault analysis fails', async () => {
      mockInvokeCommand.mockRejectedValue(new Error('Analysis failed'));

      render(
        <UnlockMethodChooser filePath="/test/vault.age" onMethodSelect={mockOnMethodSelect} />,
      );

      await waitFor(() => {
        expect(screen.getByText(/failed.*analyze/i)).toBeInTheDocument();
      });
    });

    it('user can retry when analysis fails', async () => {
      mockInvokeCommand.mockRejectedValueOnce(new Error('Network error'));
      mockInvokeCommand.mockResolvedValueOnce({ status: 'success', data: mockAvailableMethods });

      render(
        <UnlockMethodChooser filePath="/test/vault.age" onMethodSelect={mockOnMethodSelect} />,
      );

      await waitFor(() => {
        expect(screen.getByText(/failed/i)).toBeInTheDocument();
      });

      const retryButton = screen.getByRole('button', { name: /retry/i });
      await user.click(retryButton);

      await waitFor(() => {
        expect(screen.getByText('Passphrase')).toBeInTheDocument();
      });
    });
  });

  describe('User experience during loading and errors', () => {
    it('user cannot interact with methods while they are loading', () => {
      render(
        <UnlockMethodChooser
          filePath="/test/vault.age"
          onMethodSelect={mockOnMethodSelect}
          isLoading={true}
        />,
      );

      // Find any method buttons that might be disabled during loading
      const buttons = screen.queryAllByRole('button');
      buttons.forEach((button) => {
        if (!button.textContent?.includes('retry')) {
          expect(button).toBeDisabled();
        }
      });
    });
  });

  describe('Accessibility for all users', () => {
    it('keyboard users can select unlock methods', async () => {
      render(
        <UnlockMethodChooser filePath="/test/vault.age" onMethodSelect={mockOnMethodSelect} />,
      );

      await waitFor(() => {
        expect(screen.getByText('Passphrase')).toBeInTheDocument();
      });

      const passphraseButton = screen.getByRole('button', { name: /passphrase/i });
      passphraseButton.focus();

      await user.keyboard('{Enter}');
      expect(mockOnMethodSelect).toHaveBeenCalledWith(UnlockMethodType.PASSPHRASE);
    });

    it('screen reader users understand available methods', async () => {
      render(
        <UnlockMethodChooser filePath="/test/vault.age" onMethodSelect={mockOnMethodSelect} />,
      );

      await waitFor(() => {
        expect(screen.getByText('Passphrase')).toBeInTheDocument();
      });

      // Methods should be presented as interactive buttons
      expect(screen.getByRole('button', { name: /passphrase/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /yubikey/i })).toBeInTheDocument();
    });
  });

  describe('User workflow integration', () => {
    it('user gets updated methods when vault file changes', async () => {
      const { rerender } = render(
        <UnlockMethodChooser filePath="/test/vault1.age" onMethodSelect={mockOnMethodSelect} />,
      );

      await waitFor(() => {
        expect(mockInvokeCommand).toHaveBeenCalledWith('yubikey_get_available_unlock_methods', {
          file_path: '/test/vault1.age',
        });
      });

      vi.clearAllMocks();

      rerender(
        <UnlockMethodChooser filePath="/test/vault2.age" onMethodSelect={mockOnMethodSelect} />,
      );

      await waitFor(() => {
        expect(mockInvokeCommand).toHaveBeenCalledWith('yubikey_get_available_unlock_methods', {
          file_path: '/test/vault2.age',
        });
      });
    });
  });
});
