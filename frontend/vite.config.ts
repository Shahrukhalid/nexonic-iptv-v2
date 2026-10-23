import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: '127.0.0.1',
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
      },
      '/player_api.php': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
      },
      '/get.php': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
      },
      '/xmltv.php': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
      },
      '/live': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
      },
      '/series': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
      },
    },
  },
});
