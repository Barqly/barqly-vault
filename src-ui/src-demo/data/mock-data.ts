/**
 * Mock data utilities for demo components
 *
 * Provides consistent mock data across all demo pages
 */

import { KeyMetadata } from '@/lib/api-types';

/**
 * Mock encryption keys for demos
 */
export const MOCK_KEYS = [
  { id: 'key-1', label: 'Personal Backup Key' },
  { id: 'key-2', label: 'Work Documents Key' },
  { id: 'key-3', label: 'Family Photos Key' },
];

/**
 * Mock key metadata for demos
 */
export const MOCK_KEY_METADATA: KeyMetadata[] = [
  {
    label: 'Personal Backup Key',
    created_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    public_key: 'age1ql3z7hjy54pw3hyww5ayyfg7zqgvc7w3j2elw8zmrj2kg5sfn9aqmcac8p',
  },
  {
    label: 'Work Documents Key',
    created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    public_key: 'age1cy0su9fwf3gf9mw868g5yut09p6nytfmmnktexz2ya5uqg9vl9sss4euqm',
  },
  {
    label: 'Family Photos Key',
    created_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    public_key: 'age1md2gdprjpxmf0t0p9z2xn6f22smsfwmkv8qp3n0hds9xsdv0s7rsyx48mm',
  },
];

/**
 * Mock file paths for demos
 */
export const MOCK_FILE_PATHS = {
  encrypted: '/Users/demo/Documents/sensitive-data-backup.age',
  decrypted: [
    '/Users/demo/Documents/financial-records.dat',
    '/Users/demo/Documents/confidential-notes.txt',
    '/Users/demo/Documents/secure-credentials.png',
    '/Users/demo/Documents/manifest.json',
  ],
  toEncrypt: [
    '/Users/demo/Documents/financial-records.dat',
    '/Users/demo/Documents/confidential-notes.txt',
    '/Users/demo/Documents/recovery-codes.pdf',
  ],
};

/**
 * Demo delays for simulating operations
 */
export const DEMO_DELAYS = {
  fileSelection: 1000,
  progressStep: 700,
  operationStart: 500,
  operationComplete: 1500,
};

/**
 * Get formatted date string for demos
 */
export const formatDemoDate = (isoString: string): string => {
  const date = new Date(isoString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

/**
 * Get formatted file size for demos
 */
export const formatFileSize = (bytes: number): string => {
  const units = ['B', 'KB', 'MB', 'GB'];
  let size = bytes;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }

  return `${size.toFixed(1)} ${units[unitIndex]}`;
};
