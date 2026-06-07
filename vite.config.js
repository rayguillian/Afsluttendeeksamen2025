import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// The local API server (server.mjs) handles DeepSeek + OSRM proxying so no
// secrets ever reach the browser. Vite forwards every /api/* call to it.
const API_PORT = process.env.API_PORT || 5174;

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: `http://127.0.0.1:${API_PORT}`,
        changeOrigin: true,
      },
    },
  },
});
