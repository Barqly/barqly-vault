/**
 * Type guards and utilities for VaultKey discriminated union
 *
 * This module provides type-safe access patterns for the Rust-generated
 * VaultKey types using TypeScript discriminated unions.
 */

import { VaultKey, GlobalKey } from '../bindings';

// For backward compatibility with existing code
export type KeyReference = VaultKey;

// Type narrowing for specific key types
export type PassphraseKeyReference = Extract<VaultKey, { type: 'Passphrase' }>;
export type YubiKeyReference = Extract<VaultKey, { type: 'YubiKey' }>;
export type RecipientKeyReference = Extract<VaultKey, { type: 'Recipient' }>;

/**
 * Type guard to check if a VaultKey is a passphrase key
 */
export function isPassphraseKey(key: VaultKey): key is PassphraseKeyReference {
  return key.type === 'Passphrase';
}

/**
 * Type guard to check if a VaultKey is a YubiKey
 */
export function isYubiKey(key: VaultKey): key is YubiKeyReference {
  return key.type === 'YubiKey';
}

/**
 * Type guard to check if a VaultKey is a Recipient (public-key-only)
 */
export function isRecipient(key: VaultKey): key is RecipientKeyReference {
  return key.type === 'Recipient';
}

/**
 * Type guard to check if a VaultKey is an owned key (can decrypt)
 */
export function isOwnedKey(key: VaultKey): boolean {
  return key.type === 'Passphrase' || key.type === 'YubiKey';
}

/**
 * Get the serial number for a YubiKey, or undefined for other key types
 */
export function getYubiKeySerial(key: VaultKey): string | undefined {
  return isYubiKey(key) ? key.data.serial : undefined;
}

/**
 * Get the key ID for a passphrase key, or undefined for other key types
 */
export function getPassphraseKeyId(key: VaultKey): string | undefined {
  return isPassphraseKey(key) ? key.data.key_id : undefined;
}

/**
 * Get a display string for the key type
 */
export function getKeyTypeDisplay(key: VaultKey): string {
  switch (key.type) {
    case 'Passphrase':
      return 'Passphrase';
    case 'YubiKey':
      return 'YubiKey';
    case 'Recipient':
      return 'Recipient';
    default:
      return 'Unknown';
  }
}

/**
 * Filter an array of keys to only YubiKeys
 */
export function filterYubiKeys(keys: VaultKey[]): YubiKeyReference[] {
  return keys.filter(isYubiKey);
}

/**
 * Filter an array of keys to only passphrase keys
 */
export function filterPassphraseKeys(keys: VaultKey[]): PassphraseKeyReference[] {
  return keys.filter(isPassphraseKey);
}

/**
 * Filter an array of keys to only recipients
 */
export function filterRecipients(keys: VaultKey[]): RecipientKeyReference[] {
  return keys.filter(isRecipient);
}

/**
 * Filter an array of keys to only owned keys (can decrypt)
 */
export function filterOwnedKeys(keys: VaultKey[]): VaultKey[] {
  return keys.filter(isOwnedKey);
}

// ============================================
// GlobalKey Type Guards and Filters
// ============================================

/**
 * Check if a GlobalKey is a Recipient (public-key-only)
 */
export function isGlobalRecipient(key: GlobalKey): boolean {
  return key.key_type.type === 'Recipient';
}

/**
 * Check if a GlobalKey is an owned key (can decrypt)
 */
export function isGlobalOwnedKey(key: GlobalKey): boolean {
  return key.key_type.type === 'Passphrase' || key.key_type.type === 'YubiKey';
}

/**
 * Filter an array of GlobalKeys to only recipients
 */
export function filterGlobalRecipients(keys: GlobalKey[]): GlobalKey[] {
  return keys.filter(isGlobalRecipient);
}

/**
 * Filter an array of GlobalKeys to only owned keys (can decrypt)
 */
export function filterGlobalOwnedKeys(keys: GlobalKey[]): GlobalKey[] {
  return keys.filter(isGlobalOwnedKey);
}
