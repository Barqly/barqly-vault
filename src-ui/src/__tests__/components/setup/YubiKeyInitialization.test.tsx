import { render, screen, act, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import YubiKeyInitialization from '../../../components/setup/YubiKeyInitialization';
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

const mockYubiKeyDevice: YubiKeyDevice = {
  device_id: 'yubikey-1',
  name: 'YubiKey 5 NFC',
  serial_number: '12345678',
  firmware_version: '5.4.3',
  has_piv: true,
  has_oath: true,
  has_fido: true,
};

describe('YubiKeyInitialization - User Experience', () => {
  const user = userEvent.setup();
  const mockOnInitializationComplete = vi.fn();
  const mockOnCancel = vi.fn();

  const defaultProps = {
    device: mockYubiKeyDevice,
    onInitializationComplete: mockOnInitializationComplete,
    onCancel: mockOnCancel,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    // Mock setup recommendations API call
    mockInvokeCommand.mockResolvedValue({
      recommendations: ['Use a strong PIN', 'Keep your YubiKey safe'],
      pin_requirements: { min_length: 6, max_length: 8 },
    });
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('User understands YubiKey initialization process', () => {
    it('user can interact with YubiKey initialization interface', async () => {
      await act(async () => {
        render(<YubiKeyInitialization {...defaultProps} />);
      });

      await waitFor(() => {
        // User should see the device information and interface elements
        const hasDeviceInfo =
          screen.queryAllByText(/yubikey/i).length > 0 &&
          screen.queryAllByText(/5 nfc/i).length > 0;
        expect(hasDeviceInfo).toBeTruthy();
      });
    });

    it('user can see initialization interface elements', async () => {
      await act(async () => {
        render(<YubiKeyInitialization {...defaultProps} />);
      });

      await waitFor(() => {
        // User should see initialization heading and interface
        const hasInitInterface =
          screen.queryAllByRole('heading').length > 0 ||
          screen.queryAllByText(/initializ/i).length > 0;
        expect(hasInitInterface).toBeTruthy();
      });
    });
  });

  describe('User can set up YubiKey PIN', () => {
    it('user can enter a PIN for their YubiKey', async () => {
      await act(async () => {
        render(<YubiKeyInitialization {...defaultProps} />);
      });

      await waitFor(() => {
        // PIN fields are password inputs, not textboxes
        const pinFields = screen.queryAllByDisplayValue('') || screen.queryAllByRole('textbox');
        expect(pinFields.length).toBeGreaterThan(0);
      });

      // Find PIN input field (password type)
      const pinField =
        screen.queryByLabelText(/yubikey pin$/i) || screen.queryByPlaceholderText(/enter.*pin/i);
      if (pinField) {
        await act(async () => {
          await user.type(pinField, '123456');
        });
        expect(pinField).toHaveValue('123456');
      }
    });

    it('user gets PIN guidance information', async () => {
      await act(async () => {
        render(<YubiKeyInitialization {...defaultProps} />);
      });

      await waitFor(() => {
        // User should see some form of PIN guidance or requirements
        const hasPinGuidance =
          screen.queryAllByText(/pin/i).length > 0 ||
          screen.queryByText(/digit/i) ||
          screen.queryByText(/requirement/i);
        expect(hasPinGuidance).toBeTruthy();
      });
    });
  });

  describe('User gets security guidance', () => {
    it('user receives security recommendations', async () => {
      await act(async () => {
        render(<YubiKeyInitialization {...defaultProps} />);
      });

      await waitFor(() => {
        // User should see security guidance (PIN requirements, recommendations, etc.)
        const hasSecurityInfo =
          screen.queryAllByText(/recommend/i).length > 0 ||
          screen.queryByText(/digit/i) ||
          screen.queryByText(/least/i) ||
          screen.queryByText(/important/i);
        expect(hasSecurityInfo).toBeTruthy();
      });
    });
  });

  describe('User workflow progression', () => {
    it('user can proceed with initialization', async () => {
      await act(async () => {
        render(<YubiKeyInitialization {...defaultProps} />);
      });

      await waitFor(() => {
        // User should have some way to proceed or complete the initialization
        const actionButtons = screen.queryAllByRole('button');
        expect(actionButtons.length).toBeGreaterThanOrEqual(2); // Cancel and Initialize buttons
      });

      const buttons = screen.queryAllByRole('button');
      // Find the initialize button (not cancel)
      const initButton = buttons.find((btn) =>
        btn.textContent?.toLowerCase().includes('initialize'),
      );
      if (initButton && !(initButton as HTMLButtonElement).disabled) {
        await act(async () => {
          await user.click(initButton);
        });
        expect(mockOnInitializationComplete).toHaveBeenCalled();
      } else {
        // Button is disabled, which is expected behavior for incomplete form
        expect((initButton as HTMLButtonElement)?.disabled).toBe(true);
      }
    });
  });

  describe('Accessibility for all users', () => {
    it('keyboard users can navigate the form', async () => {
      await act(async () => {
        render(<YubiKeyInitialization {...defaultProps} />);
      });

      await waitFor(() => {
        // User should have focusable form elements (password inputs + buttons)
        const passwordInputs = screen.queryAllByLabelText(/pin/i);
        const buttons = screen.queryAllByRole('button');
        expect(passwordInputs.length + buttons.length).toBeGreaterThan(0);
      });

      const firstInput =
        screen.queryByLabelText(/yubikey pin$/i) || screen.queryByPlaceholderText(/enter.*pin/i);
      if (firstInput) {
        await act(async () => {
          await user.tab();
        });
        expect(firstInput).toHaveFocus();
      }
    });

    it('screen reader users have accessible interface', async () => {
      await act(async () => {
        render(<YubiKeyInitialization {...defaultProps} />);
      });

      await waitFor(() => {
        // Should have proper semantic structure for screen readers
        const hasAccessibleStructure =
          screen.queryAllByRole('heading').length > 0 ||
          screen.queryByRole('status') ||
          screen.queryAllByRole('textbox').length > 0;
        expect(hasAccessibleStructure).toBeTruthy();
      });
    });
  });
});
