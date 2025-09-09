import React, { useState } from 'react';
import { Fingerprint, Wifi, WifiOff, AlertCircle, CheckCircle, Info } from 'lucide-react';
import { YubiKeyDevice, YubiKeyInfo, invokeCommand } from '../../lib/api-types';
import { LoadingSpinner } from '../ui/loading-spinner';

interface YubiKeyDeviceListProps {
  devices: YubiKeyDevice[];
  selectedDevice?: YubiKeyDevice | null;
  onDeviceSelect: (device: YubiKeyDevice) => void;
  onTestConnection?: (device: YubiKeyDevice) => void;
  isLoading?: boolean;
}

interface DeviceStatus {
  isConnected: boolean;
  isChecking: boolean;
  error?: string;
  info?: YubiKeyInfo;
}

/**
 * Component for displaying and selecting YubiKey devices
 * Shows device information, connection status, and allows testing
 */
const YubiKeyDeviceList: React.FC<YubiKeyDeviceListProps> = ({
  devices,
  selectedDevice,
  onDeviceSelect,
  onTestConnection,
  isLoading = false,
}) => {
  const [deviceStatuses, setDeviceStatuses] = useState<Record<string, DeviceStatus>>({});

  const testDeviceConnection = async (device: YubiKeyDevice) => {
    const deviceId = device.device_id;

    setDeviceStatuses((prev) => ({
      ...prev,
      [deviceId]: { ...prev[deviceId], isChecking: true, error: undefined },
    }));

    try {
      const connectionStatus = await invokeCommand<any>('yubikey_test_connection', {
        device_id: deviceId,
      });

      const deviceInfo = connectionStatus.is_connected
        ? await invokeCommand<YubiKeyInfo>('yubikey_get_device_info', {
            device_id: deviceId,
          })
        : null;

      setDeviceStatuses((prev) => ({
        ...prev,
        [deviceId]: {
          isConnected: connectionStatus.is_connected,
          isChecking: false,
          error: connectionStatus.error_message,
          info: deviceInfo || undefined,
        },
      }));

      if (onTestConnection) {
        onTestConnection(device);
      }
    } catch (error: any) {
      setDeviceStatuses((prev) => ({
        ...prev,
        [deviceId]: {
          isConnected: false,
          isChecking: false,
          error: error.message,
        },
      }));
    }
  };

  const getDeviceStatus = (device: YubiKeyDevice): DeviceStatus => {
    return deviceStatuses[device.device_id] || { isConnected: true, isChecking: false };
  };

  const formatCapabilities = (device: YubiKeyDevice): string[] => {
    const capabilities: string[] = [];
    if (device.has_piv) capabilities.push('PIV');
    if (device.has_oath) capabilities.push('OATH');
    if (device.has_fido) capabilities.push('FIDO');
    return capabilities;
  };

  if (devices.length === 0) {
    return (
      <div className="text-center py-8 border-2 border-dashed border-gray-300 rounded-lg">
        <Fingerprint className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No YubiKey Devices Found</h3>
        <p className="text-gray-600 mb-4">
          Please insert a YubiKey device to enable hardware authentication.
        </p>
        <div className="text-sm text-gray-500">
          <p>Supported devices:</p>
          <ul className="list-disc list-inside mt-2 space-y-1">
            <li>YubiKey 5 Series</li>
            <li>YubiKey 4 Series</li>
            <li>YubiKey NEO</li>
          </ul>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-gray-900">Available YubiKey Devices</h3>
        <span className="text-sm text-gray-500">{devices.length} device(s) found</span>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {devices.map((device) => {
          const status = getDeviceStatus(device);
          const isSelected = selectedDevice?.device_id === device.device_id;
          const capabilities = formatCapabilities(device);

          return (
            <div
              key={device.device_id}
              className={`
                relative rounded-lg border-2 p-4 transition-all duration-200 cursor-pointer
                ${
                  isSelected
                    ? 'border-blue-500 bg-blue-50 shadow-md'
                    : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'
                }
                ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}
              `}
              onClick={() => !isLoading && onDeviceSelect(device)}
              role="radio"
              aria-checked={isSelected}
              tabIndex={isLoading ? -1 : 0}
              onKeyDown={(e) => {
                if ((e.key === 'Enter' || e.key === ' ') && !isLoading) {
                  e.preventDefault();
                  onDeviceSelect(device);
                }
              }}
            >
              {/* Selection indicator */}
              {isSelected && (
                <div className="absolute -top-2 -right-2 bg-blue-500 text-white rounded-full p-1">
                  <CheckCircle className="w-4 h-4" />
                </div>
              )}

              <div className="flex items-start space-x-4">
                {/* Device Icon */}
                <div
                  className={`
                  p-3 rounded-lg flex-shrink-0
                  ${isSelected ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-600'}
                `}
                >
                  <Fingerprint className="w-6 h-6" />
                </div>

                {/* Device Information */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h4
                      className={`font-medium truncate ${isSelected ? 'text-blue-900' : 'text-gray-900'}`}
                    >
                      {device.name}
                    </h4>

                    {/* Connection Status */}
                    <div className="flex items-center space-x-2">
                      {status.isChecking ? (
                        <LoadingSpinner size="sm" />
                      ) : status.isConnected ? (
                        <div className="flex items-center text-green-600">
                          <Wifi className="w-4 h-4 mr-1" />
                          <span className="text-xs">Connected</span>
                        </div>
                      ) : (
                        <div className="flex items-center text-red-600">
                          <WifiOff className="w-4 h-4 mr-1" />
                          <span className="text-xs">Disconnected</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Device Details */}
                  <div className="mt-2 space-y-1">
                    {device.serial_number && (
                      <div className="flex items-center text-sm text-gray-600">
                        <span className="font-medium mr-2">Serial:</span>
                        <span>{device.serial_number}</span>
                      </div>
                    )}

                    {device.firmware_version && (
                      <div className="flex items-center text-sm text-gray-600">
                        <span className="font-medium mr-2">Firmware:</span>
                        <span>{device.firmware_version}</span>
                      </div>
                    )}

                    {capabilities.length > 0 && (
                      <div className="flex items-center text-sm text-gray-600">
                        <span className="font-medium mr-2">Features:</span>
                        <div className="flex space-x-1">
                          {capabilities.map((cap) => (
                            <span
                              key={cap}
                              className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs"
                            >
                              {cap}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Extended device info if available */}
                    {status.info && (
                      <div className="mt-2 pt-2 border-t border-gray-200">
                        <div className="text-sm text-gray-600 space-y-1">
                          <div className="flex items-center">
                            <span className="font-medium mr-2">Available PIV Slots:</span>
                            <span>{status.info.piv_slots.join(', ')}</span>
                          </div>
                          <div className="flex items-center">
                            <span className="font-medium mr-2">PIN Policy:</span>
                            <span className="capitalize">
                              {status.info.pin_policy.toLowerCase()}
                            </span>
                          </div>
                          <div className="flex items-center">
                            <span className="font-medium mr-2">Touch Policy:</span>
                            <span className="capitalize">
                              {status.info.touch_policy.toLowerCase()}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Error Display */}
                  {status.error && (
                    <div className="mt-2 flex items-center text-red-600 text-sm">
                      <AlertCircle className="w-4 h-4 mr-1 flex-shrink-0" />
                      <span className="truncate">{status.error}</span>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="mt-3 flex space-x-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        testDeviceConnection(device);
                      }}
                      disabled={status.isChecking || isLoading}
                      className="text-sm text-blue-600 hover:text-blue-800 underline disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {status.isChecking ? 'Testing...' : 'Test Connection'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Usage Information */}
      <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
        <div className="flex items-start">
          <Info className="w-5 h-5 text-blue-600 mr-2 mt-0.5 flex-shrink-0" />
          <div className="text-sm text-blue-800">
            <h4 className="font-medium mb-1">Getting Started with YubiKey</h4>
            <ul className="space-y-1 list-disc list-inside">
              <li>Select your YubiKey device from the list above</li>
              <li>We'll use the PIV (Personal Identity Verification) application</li>
              <li>You'll need to set up a PIN for your YubiKey during setup</li>
              <li>Keep your YubiKey accessible - you'll need it to decrypt files</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default YubiKeyDeviceList;
