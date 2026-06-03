import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { nodePolyfills } from 'vite-plugin-node-polyfills';

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    nodePolyfills({
      // Explicitly polyfill these for browser compatibility
      include: ['buffer', 'crypto', 'stream', 'process'],
      globals: {
        Buffer: true,
        global: true,
        process: true,
      },
    }),
  ],
  // Required for loading the .wasm file in tiny-secp256k1
  assetsInclude: ['**/*.wasm'],
  resolve: {
    alias: {
      // Maps the buffer package for runtime access
      'buffer': 'buffer',
    },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      // Ensure specific crypto libs are correctly handled
      external: [],
    },
  },
  optimizeDeps: {
    // Forces Vite to pre-process these specific packages that have Node shims
    include: ['bip39', 'buffer'],
  },
});
