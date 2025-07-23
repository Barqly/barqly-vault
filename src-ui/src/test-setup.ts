import { vi } from 'vitest';

// Global mocks for Tauri APIs
// This ensures Tauri APIs are mocked before any test files are loaded

// Create mock functions
const mockOpen = vi.fn();
const mockInvoke = vi.fn();

// Mock dialog plugin
vi.mock('@tauri-apps/plugin-dialog', () => ({
  open: mockOpen,
}));

// Mock core API
vi.mock('@tauri-apps/api/core', () => ({
  invoke: mockInvoke,
}));

// Mock the main API module
vi.mock('@tauri-apps/api', () => ({
  core: {
    invoke: mockInvoke,
  },
}));

// Export mocks for use in tests
export { mockOpen, mockInvoke };
