import { vi } from 'vitest';

// Mock implementation of Tauri dialog API
export const open = vi.fn();

// Default export for module compatibility
export default {
  open,
};
