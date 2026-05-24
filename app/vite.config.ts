import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tutorialSync from './vite-plugin-tutorial-sync';

export default defineConfig({
  plugins: [react(), tutorialSync()],
  server: {
    host: true,
    port: 5173,
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
});
