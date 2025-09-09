import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import HybridProtectionSetup from '../../../components/setup/HybridProtectionSetup';
import { YubiKeyDevice } from '../../../lib/api-types';

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

describe('HybridProtectionSetup - User Experience', () => {
  const user = userEvent.setup();
  const mockOnPassphraseChange = vi.fn();
  const mockOnConfirmPassphraseChange = vi.fn();
  const mockOnYubiKeyConfigured = vi.fn();

  const defaultProps = {
    keyLabel: 'My Vault Key',
    passphrase: '',
    confirmPassphrase: '',
    onPassphraseChange: mockOnPassphraseChange,
    onConfirmPassphraseChange: mockOnConfirmPassphraseChange,
    onYubiKeyConfigured: mockOnYubiKeyConfigured,
    availableDevices: mockYubiKeyDevices,
    selectedDevice: mockYubiKeyDevices[0],
    yubiKeyInfo: null,
    isLoadingDevices: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('User understands hybrid protection concept', () => {
    it('user understands they are setting up dual protection', () => {
      render(<HybridProtectionSetup {...defaultProps} />);

      expect(screen.getByText(/hybrid.*protection.*setup/i)).toBeInTheDocument();
      expect(screen.getByText(/both.*passphrase.*yubikey/i)).toBeInTheDocument();
    });

    it('user sees both passphrase and YubiKey setup sections', () => {
      render(<HybridProtectionSetup {...defaultProps} />);

      expect(screen.getByText(/passphrase.*protection/i)).toBeInTheDocument();
      expect(screen.getByText(/yubikey.*protection/i)).toBeInTheDocument();
    });
  });

  describe('User can set up passphrase protection', () => {
    it('user can enter their secure passphrase', async () => {
      render(<HybridProtectionSetup {...defaultProps} />);

      const passphraseField = screen.getByLabelText(/passphrase/i);
      await user.type(passphraseField, 'MySecurePassword123!');

      expect(mockOnPassphraseChange).toHaveBeenCalledWith('MySecurePassword123!');
    });

    it('user must confirm their passphrase to avoid typos', async () => {
      render(<HybridProtectionSetup {...defaultProps} />);

      const confirmField = screen.getByLabelText(/confirm.*passphrase/i);
      await user.type(confirmField, 'MySecurePassword123!');

      expect(mockOnConfirmPassphraseChange).toHaveBeenCalledWith('MySecurePassword123!');
    });

    it('user sees validation when passphrases do not match', () => {
      render(
        <HybridProtectionSetup
          {...defaultProps}
          passphrase="MySecurePassword123!"
          confirmPassphrase="DifferentPassword"
        />,
      );

      expect(screen.getByText(/passphrases.*not.*match/i)).toBeInTheDocument();
    });

    it('user sees validation when passphrase is too weak', () => {
      render(
        <HybridProtectionSetup {...defaultProps} passphrase="weak" confirmPassphrase="weak" />,
      );

      expect(screen.getByText(/passphrase.*too.*short/i)).toBeInTheDocument();
    });
  });

  describe('User can set up YubiKey protection', () => {
    it('user can see their selected YubiKey device', () => {
      render(<HybridProtectionSetup {...defaultProps} />);

      expect(screen.getByText('YubiKey 5 NFC')).toBeInTheDocument();
      expect(screen.getByText(/serial.*12345678/i)).toBeInTheDocument();
    });

    it('user sees YubiKey initialization interface when ready', () => {
      render(
        <HybridProtectionSetup
          {...defaultProps}
          passphrase="MySecurePassword123!"
          confirmPassphrase="MySecurePassword123!"
        />,
      );

      // When passphrase is ready, YubiKey setup should be available
      expect(screen.getByText(/yubikey.*initialization/i)).toBeInTheDocument();
    });
  });

  describe('User workflow and validation', () => {
    it('user understands when setup is incomplete', () => {
      render(<HybridProtectionSetup {...defaultProps} />);

      // User should see what steps remain
      expect(screen.getByText(/enter.*passphrase/i)).toBeInTheDocument();
    });

    it('user sees when both protections are properly configured', () => {
      render(
        <HybridProtectionSetup
          {...defaultProps}
          passphrase="MySecurePassword123!"
          confirmPassphrase="MySecurePassword123!"
        />,
      );

      expect(screen.getByText(/both.*protections.*configured/i)).toBeInTheDocument();
    });
  });

  describe('User gets helpful feedback', () => {
    it('user sees loading state while devices are being detected', () => {
      render(<HybridProtectionSetup {...defaultProps} isLoading={true} />);

      expect(screen.getByText(/detecting.*yubikey/i)).toBeInTheDocument();
    });

    it('user understands when no YubiKey devices are available', () => {
      render(<HybridProtectionSetup {...defaultProps} availableDevices={[]} />);

      expect(screen.getByText(/no.*yubikey.*devices/i)).toBeInTheDocument();
      expect(screen.getByText(/insert.*yubikey/i)).toBeInTheDocument();
    });
  });

  describe('Accessibility for all users', () => {
    it('keyboard users can navigate all form fields', async () => {
      render(<HybridProtectionSetup {...defaultProps} />);

      // User should be able to tab through form fields
      const passphraseField = screen.getByLabelText(/^passphrase/i);
      const confirmField = screen.getByLabelText(/confirm.*passphrase/i);

      await user.tab();
      expect(passphraseField).toHaveFocus();

      await user.tab();
      expect(confirmField).toHaveFocus();
    });

    it('screen reader users understand the setup progress', () => {
      render(<HybridProtectionSetup {...defaultProps} />);

      // Form sections should be properly labeled
      expect(screen.getByRole('heading', { name: /passphrase.*protection/i })).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: /yubikey.*protection/i })).toBeInTheDocument();
    });
  });
});
