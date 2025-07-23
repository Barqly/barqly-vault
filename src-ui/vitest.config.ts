import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/__tests__/setup.ts', './src/test-setup.ts'],
    globals: true,
    css: true,
    // Externalize Tauri APIs to prevent resolution errors
    deps: {
      external: ['@tauri-apps/api', '@tauri-apps/plugin-dialog', '@tauri-apps/api/core']
    }
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      // Mock Tauri APIs during tests
      '@tauri-apps/plugin-dialog': path.resolve(__dirname, './src/test-mocks/tauri-dialog.ts'),
      '@tauri-apps/api/core': path.resolve(__dirname, './src/test-mocks/tauri-core.ts'),
    },
  },
}); 