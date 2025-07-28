import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { resolve } from 'path';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

// Vite configuration for demo application
export default defineConfig({
  plugins: [react(), tailwindcss()],

  // Demo-specific build configuration
  root: 'src-demo',

  build: {
    outDir: '../dist-demo',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'src-demo/index.html'),
      },
    },
  },

  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
      '@demo': resolve(__dirname, './src-demo'),
    },
  },

  server: {
    port: 5174, // Different port for demo
  },
});
