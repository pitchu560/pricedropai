import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
      proxy: {
        '/products': {
          target: 'http://127.0.0.1:8080',
          changeOrigin: true,
        },
        '/alerts': {
          target: 'http://127.0.0.1:8080',
          changeOrigin: true,
        },
        '/approvals': {
          target: 'http://127.0.0.1:8080',
          changeOrigin: true,
        },
        '/verification-logs': {
          target: 'http://127.0.0.1:8080',
          changeOrigin: true,
        },
        '/dataset': {
          target: 'http://127.0.0.1:8080',
          changeOrigin: true,
        },
        '/monitoring': {
          target: 'http://127.0.0.1:8080',
          changeOrigin: true,
        },
        '/health': {
          target: 'http://127.0.0.1:8080',
          changeOrigin: true,
        },
        '/docs': {
          target: 'http://127.0.0.1:8080',
          changeOrigin: true,
        },
        '/openapi.json': {
          target: 'http://127.0.0.1:8080',
          changeOrigin: true,
        },
      },
    },
  };
});
