import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/__tests__/setup.ts', './src/test-setup.ts'],
    globals: true,
    css: true,
    // Externalize Tauri APIs to prevent resolution errors
    deps: {
      optimizer: {
        web: {
          exclude: ['@tauri-apps/api', '@tauri-apps/plugin-dialog', '@tauri-apps/api/core'],
        },
      },
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'src/__tests__/',
        'src/test-mocks/',
        'src/test-setup.ts',
        '**/*.d.ts',
        '**/*.config.*',
        'dist/',
        'coverage/',
      ],
    },
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
