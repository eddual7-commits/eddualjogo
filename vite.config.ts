import { defineConfig } from 'vite';

export default defineConfig({
  resolve: {
    alias: {
      '@': '/src'
    }
  },
  server: {
    host: true,
    port: 3000
  },
  build: {
    target: 'esnext',
    minify: 'terser'
  }
});
