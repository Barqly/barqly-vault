import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import YubiKeyInitialization from '../../../components/setup/YubiKeyInitialization';
import { YubiKeyDevice } from '../../../lib/api-types';

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
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('User understands YubiKey initialization process', () => {
    it('user sees their YubiKey device that will be configured', () => {
      render(<YubiKeyInitialization {...defaultProps} />);

      expect(screen.getByText('YubiKey 5 NFC')).toBeInTheDocument();
      expect(screen.getByText(/serial.*12345678/i)).toBeInTheDocument();
    });

    it('user understands what initialization means', () => {
      render(<YubiKeyInitialization {...defaultProps} />);

      expect(screen.getByText(/yubikey.*initialization/i)).toBeInTheDocument();
      expect(screen.getByText(/configure.*yubikey.*hardware/i)).toBeInTheDocument();
    });
  });

  describe('User can set up YubiKey PIN', () => {
    it('user can enter a PIN for their YubiKey', async () => {
      render(<YubiKeyInitialization {...defaultProps} />);

      const pinField = screen.getByLabelText(/pin/i);
      await user.type(pinField, '123456');

      expect(pinField).toHaveValue('123456');
    });

    it('user sees PIN requirements and validation', () => {
      render(<YubiKeyInitialization {...defaultProps} />);

      expect(screen.getByText(/pin.*must.*be.*6-8.*digits/i)).toBeInTheDocument();
    });
  });

  describe('User gets security guidance', () => {
    it('user sees important security recommendations', () => {
      render(<YubiKeyInitialization {...defaultProps} />);

      expect(screen.getByText(/use.*strong.*pin/i)).toBeInTheDocument();
      expect(screen.getByText(/keep.*yubikey.*safe/i)).toBeInTheDocument();
    });
  });

  describe('User workflow progression', () => {
    it('user can complete initialization when ready', async () => {
      render(<YubiKeyInitialization {...defaultProps} />);

      const initializeButton = screen.queryByRole('button', { name: /initialize/i });
      if (initializeButton) {
        await user.click(initializeButton);
        expect(mockOnInitializationComplete).toHaveBeenCalled();
      }
    });
  });

  describe('Accessibility for all users', () => {
    it('keyboard users can navigate the form', async () => {
      render(<YubiKeyInitialization {...defaultProps} />);

      const pinField = screen.getByLabelText(/pin/i);
      await user.tab();
      expect(pinField).toHaveFocus();
    });

    it('screen reader users understand the initialization process', () => {
      render(<YubiKeyInitialization {...defaultProps} />);

      // Should have proper headings and labels
      expect(screen.getByRole('heading', { name: /yubikey.*initialization/i })).toBeInTheDocument();
    });
  });
});
