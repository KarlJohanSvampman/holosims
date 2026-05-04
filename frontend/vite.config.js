import { defineConfig } from 'vite';

export default defineConfig({
  base: "/", 
  server: {
    host: true,
    port: 5173,
    proxy: {
      // HTTP API
      '/api': {
        target: 'http://backend:8000',
        changeOrigin: true
      },

      // WebSocket
      '/ws': {
        target: 'ws://backend:8000',
        ws: true
      },

      // static assets from backend
      '/resources': {
        target: 'http://backend:8000',
        changeOrigin: true
      }
    }
  }
});