import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { wgslVitePlugin } from '@vgpu/wgsl/loader-vite';
import path from 'node:path';

export default defineConfig({
  plugins: [react(), tailwindcss(), wgslVitePlugin()],
  define: {
    global: 'globalThis',
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  optimizeDeps: {
    include: ['@strudel/soundfonts', '@strudel/core', '@strudel/webaudio', '@strudel/midi'],
  },
  server: {
    port: 5173,
    host: true,
  },
});
