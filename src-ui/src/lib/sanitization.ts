/**
 * Label Sanitization
 *
 * Mirrors backend sanitization logic (label_sanitization.rs) for consistent
 * validation and sanitization across frontend and backend.
 */

export interface SanitizedLabel {
  /** Filesystem-safe name (sanitized) */
  sanitized: string;
  /** Original display name (preserved for UI) */
  display: string;
}

/**
 * Sanitize a label for filesystem and cross-platform compatibility
 *
 * Mirrors backend rules from label_sanitization.rs:
 * 1. Remove emojis and non-ASCII characters
 * 2. Replace invalid filesystem chars (`/\:*?"<>|`) with hyphens
 * 3. Replace spaces with hyphens
 * 4. Collapse multiple hyphens into single hyphen
 * 5. Trim leading/trailing hyphens
 * 6. Limit to 200 characters
 * 7. Prevent leading dot (Unix hidden files)
 *
 * @param input - User-provided label (vault name or key label)
 * @returns SanitizedLabel with both sanitized and display versions
 * @throws Error if label is empty or invalid after sanitization
 *
 * @example
 * ```ts
 * const result = sanitizeLabel("My Family Photos! 🎉 / Test");
 * // result.sanitized: "My-Family-Photos-Test"
 * // result.display:   "My Family Photos! 🎉 / Test"
 * ```
 */
export function sanitizeLabel(input: string): SanitizedLabel {
  const display = input;
  const trimmed = input.trim();

  if (!trimmed) {
    throw new Error('Label cannot be empty');
  }

  // Step 1: Remove emojis and non-ASCII characters
  // eslint-disable-next-line no-control-regex
  const asciiOnly = trimmed.replace(/[^\x00-\x7F]/g, '');

  // Step 2: Replace invalid filesystem characters and spaces with hyphens
  const invalidChars = /[\/\\:*?"<>|\s]/g;
  const replaced = asciiOnly.replace(invalidChars, '-');

  // Step 3: Collapse multiple hyphens into single hyphen
  const collapsed = collapseSeparators(replaced);

  // Step 4: Trim leading/trailing hyphens
  const trimmedResult = collapsed.replace(/^-+|-+$/g, '');

  // Check if empty after sanitization
  if (!trimmedResult) {
    throw new Error('Label contains only invalid characters');
  }

  // Step 5: Enforce max 200 characters
  let sanitized = trimmedResult.length > 200 ? trimmedResult.substring(0, 200) : trimmedResult;

  // Step 6: Prevent leading dot (Unix hidden files)
  if (sanitized.startsWith('.')) {
    sanitized = `vault-${sanitized.substring(1)}`;
  }

  // Step 7: Check for Windows reserved names
  checkReservedNames(sanitized);

  return { sanitized, display };
}

/**
 * Collapse multiple consecutive hyphens and spaces into single hyphens
 */
function collapseSeparators(s: string): string {
  const result: string[] = [];
  let lastWasSeparator = false;

  for (const c of s) {
    const isSeparator = c === '-' || c === ' ';

    if (isSeparator) {
      if (!lastWasSeparator) {
        result.push('-');
        lastWasSeparator = true;
      }
    } else {
      result.push(c);
      lastWasSeparator = false;
    }
  }

  return result.join('');
}

/**
 * Check if name is a Windows reserved name
 */
function checkReservedNames(name: string): void {
  const reserved = [
    'CON',
    'PRN',
    'AUX',
    'NUL',
    'COM1',
    'COM2',
    'COM3',
    'COM4',
    'COM5',
    'COM6',
    'COM7',
    'COM8',
    'COM9',
    'LPT1',
    'LPT2',
    'LPT3',
    'LPT4',
    'LPT5',
    'LPT6',
    'LPT7',
    'LPT8',
    'LPT9',
  ];

  if (reserved.includes(name.toUpperCase())) {
    throw new Error(`'${name}' is a reserved name on Windows`);
  }
}

/**
 * Validate label (frontend validation before backend call)
 *
 * @param label - User input to validate
 * @returns Error message if invalid, null if valid
 */
export function validateLabel(label: string): string | null {
  try {
    sanitizeLabel(label);
    return null; // Valid
  } catch (error) {
    return error instanceof Error ? error.message : 'Invalid label';
  }
}
