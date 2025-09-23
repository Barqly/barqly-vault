/**
 * Type guards and utilities for KeyReference discriminated union
 *
 * This module provides type-safe access patterns for the Rust-generated
 * KeyReference types using TypeScript discriminated unions.
 */

import { KeyReference } from '../bindings';

// Type narrowing for specific key types
export type PassphraseKeyReference = Extract<KeyReference, { type: 'passphrase' }>;
export type YubiKeyReference = Extract<KeyReference, { type: 'yubikey' }>;

/**
 * Type guard to check if a KeyReference is a passphrase key
 */
export function isPassphraseKey(key: KeyReference): key is PassphraseKeyReference {
  return key.type === 'passphrase';
}

/**
 * Type guard to check if a KeyReference is a YubiKey
 */
export function isYubiKey(key: KeyReference): key is YubiKeyReference {
  return key.type === 'yubikey';
}

/**
 * Get the slot index for a YubiKey, or undefined for other key types
 */
export function getYubiKeySlotIndex(key: KeyReference): number | undefined {
  return isYubiKey(key) ? key.slot_index : undefined;
}

/**
 * Get the serial number for a YubiKey, or undefined for other key types
 */
export function getYubiKeySerial(key: KeyReference): string | undefined {
  return isYubiKey(key) ? key.serial : undefined;
}

/**
 * Get the key ID for a passphrase key, or undefined for other key types
 */
export function getPassphraseKeyId(key: KeyReference): string | undefined {
  return isPassphraseKey(key) ? key.key_id : undefined;
}

/**
 * Get a display string for the key type
 */
export function getKeyTypeDisplay(key: KeyReference): string {
  switch (key.type) {
    case 'passphrase':
      return 'Passphrase';
    case 'yubikey':
      return 'YubiKey';
    default:
      return 'Unknown';
  }
}

/**
 * Filter an array of keys to only YubiKeys
 */
export function filterYubiKeys(keys: KeyReference[]): YubiKeyReference[] {
  return keys.filter(isYubiKey);
}

/**
 * Filter an array of keys to only passphrase keys
 */
export function filterPassphraseKeys(keys: KeyReference[]): PassphraseKeyReference[] {
  return keys.filter(isPassphraseKey);
}
