/**
 * YubiKeyService - Centralized service for all YubiKey hardware operations
 *
 * This service layer separates YubiKey business logic from UI components,
 * providing a clean interface for hardware detection, device management,
 * and encryption/decryption operations.
 */

import { safeInvoke } from '../lib/tauri-safe';
import { logger } from '../lib/logger';

// Types
export interface YubiKeyDevice {
  device_id: string;
  name: string;
  serial_number?: string;
  firmware_version?: string;
  has_piv: boolean;
  has_oath: boolean;
  has_fido: boolean;
  // Extended properties for service
  status?: DeviceStatus;
  available_slots?: number[];
}

export enum DeviceStatus {
  Ready = 'Ready',
  Busy = 'Busy',
  Error = 'Error',
  NotInitialized = 'NotInitialized',
}

export interface YubiKeyServiceOptions {
  timeout?: number;
  retryAttempts?: number;
}

// Service Events
export type YubiKeyServiceEvent =
  | { type: 'DETECTION_STARTED' }
  | { type: 'DETECTION_COMPLETED'; devices: YubiKeyDevice[] }
  | { type: 'DETECTION_FAILED'; error: string }
  | { type: 'DEVICE_CONNECTED'; device: YubiKeyDevice }
  | { type: 'DEVICE_DISCONNECTED'; serial: string };

export type YubiKeyServiceEventListener = (event: YubiKeyServiceEvent) => void;

/**
 * Central service for YubiKey hardware operations
 *
 * Responsibilities:
 * - Hardware detection and device listing
 * - Device initialization and management
 * - Encryption/decryption operations
 * - Event notification for UI updates
 * - Error handling and recovery
 */
export class YubiKeyService {
  private eventListeners: Set<YubiKeyServiceEventListener> = new Set();
  private detectionCache: { devices: YubiKeyDevice[]; timestamp: number } | null = null;
  private readonly cacheExpiry = 30000; // 30 seconds
  private readonly options: Required<YubiKeyServiceOptions>;

  constructor(options: YubiKeyServiceOptions = {}) {
    // Merge with defaults - options is used here
    this.options = {
      timeout: 10000, // 10 second default
      retryAttempts: 3,
      ...options,
    };
  }

  /**
   * Event subscription for UI components
   */
  addEventListener(listener: YubiKeyServiceEventListener): () => void {
    this.eventListeners.add(listener);
    return () => this.eventListeners.delete(listener);
  }

  private emit(event: YubiKeyServiceEvent): void {
    this.eventListeners.forEach((listener) => {
      try {
        listener(event);
      } catch (error) {
        logger.logComponentLifecycle('YubiKeyService', 'Event listener error', { error });
      }
    });
  }

  /**
   * Detect available YubiKey devices
   *
   * This is the ONLY method that should trigger hardware detection.
   * UI components should never call backend commands directly.
   */
  async detectDevices(options: { useCache?: boolean } = {}): Promise<YubiKeyDevice[]> {
    const { useCache = true } = options;

    // Check cache first
    if (useCache && this.detectionCache) {
      const age = Date.now() - this.detectionCache.timestamp;
      if (age < this.cacheExpiry) {
        logger.logComponentLifecycle('YubiKeyService', 'Returning cached devices', {
          deviceCount: this.detectionCache.devices.length,
          cacheAge: age,
        });
        return this.detectionCache.devices;
      }
    }

    this.emit({ type: 'DETECTION_STARTED' });

    try {
      console.log('🔍 YubiKeyService: About to call yubikey_list_devices backend command...');
      logger.logComponentLifecycle('YubiKeyService', 'Starting YubiKey device detection');

      const devices = await safeInvoke<YubiKeyDevice[]>(
        'yubikey_list_devices',
        undefined,
        'YubiKeyService.detectDevices',
      );

      console.log('✅ YubiKeyService: Backend command returned:', {
        deviceCount: devices.length,
        rawDevices: devices,
        isArray: Array.isArray(devices),
      });

      // Update cache
      this.detectionCache = {
        devices,
        timestamp: Date.now(),
      };

      logger.logComponentLifecycle('YubiKeyService', 'Device detection completed', {
        deviceCount: devices.length,
        devices: devices.map((d) => ({ device_id: d.device_id, name: d.name })),
      });

      this.emit({ type: 'DETECTION_COMPLETED', devices });
      return devices;
    } catch (error: any) {
      console.error('❌ YubiKeyService: Backend command failed:', {
        error: error.message,
        errorCode: error.code,
        errorDetails: error.details,
        recoveryGuidance: error.recovery_guidance,
        fullError: error,
      });

      logger.logComponentLifecycle('YubiKeyService', 'Device detection failed', {
        error: error.message,
      });

      // Clear cache on error
      this.detectionCache = null;

      this.emit({ type: 'DETECTION_FAILED', error: error.message });
      throw error;
    }
  }

  /**
   * Check if YubiKey devices are available without full detection
   * Useful for quick availability checks
   */
  async isAvailable(): Promise<boolean> {
    try {
      console.log('🔍 YubiKeyService: Checking YubiKey availability...');
      const available = await safeInvoke<boolean>(
        'yubikey_devices_available',
        undefined,
        'YubiKeyService.checkAvailability',
      );
      console.log('✅ YubiKeyService: Availability check result:', available);
      return available;
    } catch (error: any) {
      console.error('❌ YubiKeyService: Availability check failed:', error);
      logger.logComponentLifecycle('YubiKeyService', 'Availability check failed', {
        error: error.message,
      });
      return false;
    }
  }

  /**
   * Test connection to a specific YubiKey device
   */
  async testConnection(
    deviceId: string,
    pin: string,
  ): Promise<{ success: boolean; error?: string }> {
    try {
      await safeInvoke(
        'yubikey_test_connection',
        { device_id: deviceId, pin },
        'YubiKeyService.testConnection',
      );
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Initialize a YubiKey for use with the vault
   */
  async initializeDevice(deviceId: string, pin: string, slot: number): Promise<void> {
    try {
      await safeInvoke(
        'yubikey_initialize',
        { device_id: deviceId, pin, slot },
        'YubiKeyService.initializeDevice',
      );
      logger.logComponentLifecycle('YubiKeyService', 'Device initialized successfully', {
        device_id: deviceId,
        slot,
      });
    } catch (error: any) {
      logger.logComponentLifecycle('YubiKeyService', 'Device initialization failed', {
        device_id: deviceId,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Get detailed information about a specific device
   */
  async getDeviceInfo(deviceId: string): Promise<YubiKeyDevice> {
    try {
      return await safeInvoke<YubiKeyDevice>(
        'yubikey_get_device_info',
        { device_id: deviceId },
        'YubiKeyService.getDeviceInfo',
      );
    } catch (error: any) {
      logger.logComponentLifecycle('YubiKeyService', 'Failed to get device info', {
        device_id: deviceId,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Clear device detection cache
   * Useful when hardware state may have changed
   */
  clearCache(): void {
    this.detectionCache = null;
    logger.logComponentLifecycle('YubiKeyService', 'Device cache cleared');
  }

  /**
   * Get current service configuration
   */
  getOptions(): Required<YubiKeyServiceOptions> {
    return { ...this.options };
  }

  /**
   * Dispose of the service and clean up resources
   */
  dispose(): void {
    this.eventListeners.clear();
    this.detectionCache = null;
  }
}

// Singleton instance for application use
export const yubiKeyService = new YubiKeyService();
