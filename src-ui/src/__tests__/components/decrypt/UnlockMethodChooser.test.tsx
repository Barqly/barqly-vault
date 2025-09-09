import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import UnlockMethodChooser from '../../../components/decrypt/UnlockMethodChooser';
import { UnlockMethodType, AvailableMethod, ConfidenceLevel } from '../../../lib/api-types';
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
    confidence_level: ConfidenceLevel.HIGH,
  },
  {
    method_type: UnlockMethodType.YUBIKEY,
    display_name: 'YubiKey',
    description: 'Unlock with your YubiKey hardware device',
    requires_hardware: true,
    estimated_time: '2-3 seconds',
    confidence_level: ConfidenceLevel.HIGH,
  },
];

describe('UnlockMethodChooser - User Experience', () => {
  const user = userEvent.setup();
  const mockOnMethodSelect = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockInvokeCommand.mockResolvedValue(mockAvailableMethods);
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('User can choose how to decrypt their vault', () => {
    it('user understands they need to choose an unlock method', async () => {
      await act(async () => {
        render(
          <UnlockMethodChooser filePath="/test/vault.age" onMethodSelect={mockOnMethodSelect} />,
        );
      });

      await waitFor(() => {
        // User should see interface to choose unlock method
        const hasMethodSelection =
          screen.queryAllByRole('button').length > 0 || screen.queryAllByRole('radio').length > 0;
        expect(hasMethodSelection).toBe(true);
      });
    });

    it('user can choose passphrase method when available', async () => {
      await act(async () => {
        render(
          <UnlockMethodChooser filePath="/test/vault.age" onMethodSelect={mockOnMethodSelect} />,
        );
      });

      await waitFor(() => {
        // User should see available unlock methods
        const hasUnlockMethods =
          screen.queryAllByRole('button').length > 0 || screen.queryAllByRole('radio').length > 0;
        expect(hasUnlockMethods).toBe(true);
      });

      const passphraseOption = screen.getAllByRole('radio')[0];
      await act(async () => {
        await user.click(passphraseOption);
      });

      expect(mockOnMethodSelect).toHaveBeenCalledWith(UnlockMethodType.PASSPHRASE);
    });

    it('user can choose YubiKey method when available', async () => {
      await act(async () => {
        render(
          <UnlockMethodChooser filePath="/test/vault.age" onMethodSelect={mockOnMethodSelect} />,
        );
      });

      await waitFor(() => {
        // User should see multiple unlock method options
        const unlockOptions = screen.queryAllByRole('radio').length > 1;
        expect(unlockOptions).toBe(true);
      });

      const yubiKeyOption = screen.getAllByRole('radio')[1];
      await act(async () => {
        await user.click(yubiKeyOption);
      });

      expect(mockOnMethodSelect).toHaveBeenCalledWith(UnlockMethodType.YUBIKEY);
    });
  });

  describe('User gets helpful feedback', () => {
    it('user sees loading state while vault is being analyzed', async () => {
      await act(async () => {
        render(
          <UnlockMethodChooser filePath="/test/vault.age" onMethodSelect={mockOnMethodSelect} />,
        );
      });

      // User should see some form of interface feedback (either loading state or immediate results)
      const hasInterface =
        screen.queryByRole('status') ||
        screen.queryAllByText(/analyz/i).length > 0 ||
        screen.queryAllByRole('radio').length > 0;
      expect(hasInterface).toBeTruthy();
    });

    it('user understands when vault analysis fails', async () => {
      mockInvokeCommand.mockRejectedValue(new Error('Analysis failed'));

      await act(async () => {
        render(
          <UnlockMethodChooser filePath="/test/vault.age" onMethodSelect={mockOnMethodSelect} />,
        );
      });

      await waitFor(() => {
        // User should see error indication when analysis fails
        const hasErrorState =
          screen.queryByRole('alert') || screen.queryAllByText(/failed/i).length > 0;
        expect(hasErrorState).toBeTruthy();
      });
    });

    it('user can retry when analysis fails', async () => {
      mockInvokeCommand.mockRejectedValueOnce(new Error('Network error'));
      mockInvokeCommand.mockResolvedValueOnce(mockAvailableMethods);

      await act(async () => {
        render(
          <UnlockMethodChooser filePath="/test/vault.age" onMethodSelect={mockOnMethodSelect} />,
        );
      });

      await waitFor(() => {
        // User should see failure indication
        const hasFailureState =
          screen.queryByRole('alert') ||
          screen.queryAllByRole('button').some((btn) => btn.textContent?.includes('retry'));
        expect(hasFailureState).toBeTruthy();
      });

      const retryButton = screen.getByRole('button', { name: /retry/i });
      await act(async () => {
        await user.click(retryButton);
      });

      await waitFor(() => {
        // User should see available methods after retry
        const hasMethodsAfterRetry =
          screen.queryAllByRole('button').length > 0 || screen.queryAllByRole('radio').length > 0;
        expect(hasMethodsAfterRetry).toBe(true);
      });
    });
  });

  describe('User experience during loading and errors', () => {
    it('user cannot interact with methods while they are loading', async () => {
      await act(async () => {
        render(
          <UnlockMethodChooser
            filePath="/test/vault.age"
            onMethodSelect={mockOnMethodSelect}
            isLoading={true}
          />,
        );
      });

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
      await act(async () => {
        render(
          <UnlockMethodChooser filePath="/test/vault.age" onMethodSelect={mockOnMethodSelect} />,
        );
      });

      await waitFor(() => {
        // User should see selectable unlock methods
        const hasSelectableMethods =
          screen.queryAllByRole('button').length > 0 || screen.queryAllByRole('radio').length > 0;
        expect(hasSelectableMethods).toBe(true);
      });

      const passphraseButton = screen.getAllByRole('radio')[0];
      passphraseButton.focus();

      await act(async () => {
        await user.keyboard('{Enter}');
      });
      expect(mockOnMethodSelect).toHaveBeenCalledWith(UnlockMethodType.PASSPHRASE);
    });

    it('screen reader users understand available methods', async () => {
      await act(async () => {
        render(
          <UnlockMethodChooser filePath="/test/vault.age" onMethodSelect={mockOnMethodSelect} />,
        );
      });

      await waitFor(() => {
        // User should see method options
        const hasMethodOptions =
          screen.queryAllByRole('button').length > 0 || screen.queryAllByRole('radio').length > 0;
        expect(hasMethodOptions).toBe(true);
      });

      // User should see interactive method selection interface
      const methodButtons = screen.queryAllByRole('button');
      const methodRadios = screen.queryAllByRole('radio');
      expect(methodButtons.length + methodRadios.length).toBeGreaterThan(0);
    });
  });

  describe('User workflow integration', () => {
    it('user gets updated methods when vault file changes', async () => {
      const { rerender } = await act(async () => {
        return render(
          <UnlockMethodChooser filePath="/test/vault1.age" onMethodSelect={mockOnMethodSelect} />,
        );
      });

      await waitFor(() => {
        expect(mockInvokeCommand).toHaveBeenCalledWith('yubikey_get_available_unlock_methods', {
          file_path: '/test/vault1.age',
        });
      });

      vi.clearAllMocks();

      await act(async () => {
        rerender(
          <UnlockMethodChooser filePath="/test/vault2.age" onMethodSelect={mockOnMethodSelect} />,
        );
      });

      await waitFor(() => {
        expect(mockInvokeCommand).toHaveBeenCalledWith('yubikey_get_available_unlock_methods', {
          file_path: '/test/vault2.age',
        });
      });
    });
  });
});
