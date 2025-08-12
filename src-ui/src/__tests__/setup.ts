import '@testing-library/jest-dom';
import { vi, afterEach } from 'vitest';

// Mock Tauri API
vi.mock('@tauri-apps/api', () => ({
  invoke: vi.fn(),
}));

// Mock Tauri dialog plugin
vi.mock('@tauri-apps/plugin-dialog', () => ({
  open: vi.fn(),
}));

// Mock matchMedia for responsive design tests
Object.defineProperty(window, 'matchMedia', {
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // deprecated
    removeListener: vi.fn(), // deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
  writable: true,
});

// Handle unhandled promise rejections in tests (Node.js environment only)
// This prevents test isolation issues where async mocks create global errors
// eslint-disable-next-line no-undef
if (typeof process !== 'undefined' && process.on) {
  // eslint-disable-next-line no-undef
  process.on('unhandledRejection', (reason) => {
    // Log for debugging but don't fail the test suite
    console.warn('Unhandled promise rejection in test:', reason);
  });
}

// Global cleanup to prevent test isolation issues
afterEach(() => {
  // Clear any pending timers
  vi.clearAllTimers();
  // Clear all mocks to prevent state leakage
  vi.clearAllMocks();
});
