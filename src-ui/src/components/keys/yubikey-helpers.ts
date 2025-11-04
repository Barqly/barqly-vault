import { YubiKeyState } from '../../bindings';

/**
 * Get simplified badge for YubiKey registration
 * Philosophy: Don't make users think - all non-registered YubiKeys just need to be "registered"
 * The form will handle device-specific setup after selection
 */
export const getYubiKeyBadge = (state: YubiKeyState) => {
  if (state === 'registered') {
    return {
      label: 'Registered',
      bgClass: 'bg-green-100',
      textClass: 'text-green-700',
    };
  }

  // All other states (new, reused, orphaned) = ready to register
  // Use premium blue CTA styling for clear call-to-action
  return {
    label: 'Register',
    bgClass: '', // Custom inline style
    textClass: '', // Custom inline style
    customStyle: {
      backgroundColor: '#1D4ED8',
      color: '#ffffff',
    },
  };
};

/**
 * Get simplified description for YubiKey
 */
export const getYubiKeyDescription = (state: YubiKeyState) => {
  if (state === 'registered') {
    return 'Already in registry';
  }
  return 'New device - ready to register';
};

/**
 * Convert backend errors into user-friendly messages
 * Order matters: Check specific errors before generic patterns
 */
export const getUserFriendlyError = (errorMessage: string): string => {
  const lowerError = errorMessage.toLowerCase();

  // PIN blocked - critical error requiring recovery PIN (Check FIRST)
  if (lowerError.includes('pin is blocked') || lowerError.includes('pin blocked')) {
    return 'PIN is blocked due to too many incorrect attempts. Use your Recovery PIN to unblock it, or reset the YubiKey.';
  }

  // Wrong PIN - Check BEFORE touch timeout (more specific)
  if (
    lowerError.includes('invalid pin') ||
    lowerError.includes('incorrect pin') ||
    lowerError.includes('wrong pin') ||
    lowerError.includes('pin verification failed') ||
    lowerError.includes('tries remaining')
  ) {
    return 'Incorrect PIN. Please check your PIN and try again.';
  }

  // Device not found
  if (lowerError.includes('device not found') || lowerError.includes('no yubikey')) {
    return 'YubiKey not found. Please ensure your YubiKey is connected and try again.';
  }

  // Touch timeout errors - Check AFTER PIN errors (less specific)
  if (
    lowerError.includes('touch') ||
    lowerError.includes('timeout') ||
    lowerError.includes('failed to decrypt yubikey stanza') || // age CLI error
    lowerError.includes('yubikey plugin') || // age plugin error
    lowerError.includes('pty operation failed') ||
    lowerError.includes('authentication error') ||
    lowerError.includes('communicating with yubikey')
  ) {
    return 'YubiKey touch not detected. Please touch your YubiKey when the light blinks and try again.';
  }

  // Generic fallback
  return errorMessage;
};
