import { vi } from 'vitest';

// Mock implementation of Tauri core API
export const invoke = vi.fn();

// Default export for module compatibility
export default {
  invoke,
};
