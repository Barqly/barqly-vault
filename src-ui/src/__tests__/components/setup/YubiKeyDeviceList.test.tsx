import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import YubiKeyDeviceList from '../../../components/setup/YubiKeyDeviceList';
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

describe('YubiKeyDeviceList - User Experience', () => {
  const user = userEvent.setup();
  const mockOnDeviceSelect = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('User can find and select their YubiKey', () => {
    it('user understands when no YubiKey devices are available', () => {
      render(
        <YubiKeyDeviceList
          devices={[]}
          selectedDevice={null}
          onDeviceSelect={mockOnDeviceSelect}
        />,
      );

      expect(screen.getByText(/no yubikey devices found/i)).toBeInTheDocument();
      expect(screen.getByText(/insert.*yubikey.*device/i)).toBeInTheDocument();
    });

    it('user can see all their available YubiKey devices', () => {
      render(
        <YubiKeyDeviceList
          devices={mockYubiKeyDevices}
          selectedDevice={null}
          onDeviceSelect={mockOnDeviceSelect}
        />,
      );

      expect(screen.getByText('YubiKey 5 NFC')).toBeInTheDocument();
      expect(screen.getByText('YubiKey 5C')).toBeInTheDocument();
    });

    it('user can see device details to identify their specific YubiKey', () => {
      render(
        <YubiKeyDeviceList
          devices={[mockYubiKeyDevices[0]]}
          selectedDevice={null}
          onDeviceSelect={mockOnDeviceSelect}
        />,
      );

      expect(screen.getByText(/serial.*12345678/i)).toBeInTheDocument();
      expect(screen.getByText(/firmware.*5\.4\.3/i)).toBeInTheDocument();
    });

    it('user can select their YubiKey device', async () => {
      render(
        <YubiKeyDeviceList
          devices={mockYubiKeyDevices}
          selectedDevice={null}
          onDeviceSelect={mockOnDeviceSelect}
        />,
      );

      const deviceOption = screen.getByText('YubiKey 5 NFC');
      await user.click(deviceOption);

      expect(mockOnDeviceSelect).toHaveBeenCalledWith(mockYubiKeyDevices[0]);
    });

    it('user can see which device is currently selected', () => {
      render(
        <YubiKeyDeviceList
          devices={mockYubiKeyDevices}
          selectedDevice={mockYubiKeyDevices[0]}
          onDeviceSelect={mockOnDeviceSelect}
        />,
      );

      // The selected device should be visually distinct
      const selectedOption = screen.getByText('YubiKey 5 NFC').closest('button')!;
      expect(selectedOption).toHaveAttribute('aria-checked', 'true');
    });
  });

  describe('User understands device capabilities', () => {
    it('user can see what features their YubiKey supports', () => {
      render(
        <YubiKeyDeviceList
          devices={[mockYubiKeyDevices[0]]}
          selectedDevice={null}
          onDeviceSelect={mockOnDeviceSelect}
        />,
      );

      // User should see capability indicators
      expect(screen.getByText('PIV')).toBeInTheDocument();
      expect(screen.getByText('OATH')).toBeInTheDocument();
      expect(screen.getByText('FIDO')).toBeInTheDocument();
    });

    it('user understands when a YubiKey lacks required features', () => {
      const deviceWithoutPIV: YubiKeyDevice = {
        ...mockYubiKeyDevices[0],
        has_piv: false,
      };

      render(
        <YubiKeyDeviceList
          devices={[deviceWithoutPIV]}
          selectedDevice={null}
          onDeviceSelect={mockOnDeviceSelect}
        />,
      );

      expect(screen.getByText(/piv.*required/i)).toBeInTheDocument();

      const deviceButton = screen.getByText('YubiKey 5 NFC').closest('button')!;
      expect(deviceButton).toBeDisabled();
    });
  });

  describe('User experience during loading and errors', () => {
    it('user cannot interact with devices while system is busy', () => {
      render(
        <YubiKeyDeviceList
          devices={mockYubiKeyDevices}
          selectedDevice={null}
          onDeviceSelect={mockOnDeviceSelect}
          isLoading={true}
        />,
      );

      const deviceButtons = screen.getAllByRole('button');
      deviceButtons.forEach((button) => {
        expect(button).toBeDisabled();
      });
    });

    it('user can interact normally when system is ready', () => {
      render(
        <YubiKeyDeviceList
          devices={mockYubiKeyDevices}
          selectedDevice={null}
          onDeviceSelect={mockOnDeviceSelect}
          isLoading={false}
        />,
      );

      const deviceButton = screen.getByText('YubiKey 5 NFC').closest('button')!;
      expect(deviceButton).not.toBeDisabled();
    });
  });

  describe('Accessibility for all users', () => {
    it('keyboard users can navigate and select devices', async () => {
      render(
        <YubiKeyDeviceList
          devices={mockYubiKeyDevices}
          selectedDevice={null}
          onDeviceSelect={mockOnDeviceSelect}
        />,
      );

      const deviceButton = screen.getByText('YubiKey 5 NFC').closest('button')!;
      deviceButton.focus();

      await user.keyboard('{Enter}');
      expect(mockOnDeviceSelect).toHaveBeenCalledWith(mockYubiKeyDevices[0]);

      vi.clearAllMocks();

      await user.keyboard('{Space}');
      expect(mockOnDeviceSelect).toHaveBeenCalledWith(mockYubiKeyDevices[0]);
    });

    it('screen reader users understand device selection interface', () => {
      render(
        <YubiKeyDeviceList
          devices={mockYubiKeyDevices}
          selectedDevice={mockYubiKeyDevices[0]}
          onDeviceSelect={mockOnDeviceSelect}
        />,
      );

      const selectedDevice = screen.getByText('YubiKey 5 NFC').closest('button')!;
      const unselectedDevice = screen.getByText('YubiKey 5C').closest('button')!;

      expect(selectedDevice).toHaveAttribute('role', 'radio');
      expect(selectedDevice).toHaveAttribute('aria-checked', 'true');
      expect(unselectedDevice).toHaveAttribute('role', 'radio');
      expect(unselectedDevice).toHaveAttribute('aria-checked', 'false');
    });

    it('keyboard navigation skips disabled devices appropriately', () => {
      const deviceWithoutPIV: YubiKeyDevice = {
        ...mockYubiKeyDevices[0],
        has_piv: false,
      };

      render(
        <YubiKeyDeviceList
          devices={[deviceWithoutPIV]}
          selectedDevice={null}
          onDeviceSelect={mockOnDeviceSelect}
        />,
      );

      const disabledDevice = screen.getByText('YubiKey 5 NFC').closest('button')!;
      expect(disabledDevice).toHaveAttribute('tabIndex', '-1');
    });
  });

  describe('Device information handling', () => {
    it('user sees helpful fallback when device information is missing', () => {
      const deviceWithMissingInfo: YubiKeyDevice = {
        ...mockYubiKeyDevices[2],
        name: '',
      };

      render(
        <YubiKeyDeviceList
          devices={[deviceWithMissingInfo]}
          selectedDevice={null}
          onDeviceSelect={mockOnDeviceSelect}
        />,
      );

      expect(screen.getByText(/unknown yubikey/i)).toBeInTheDocument();
    });
  });
});
