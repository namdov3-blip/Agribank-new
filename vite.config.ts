import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  return {
    server: {
      port: 3000,
      host: '0.0.0.0',
      proxy: {
        '/api': {
          target: 'http://localhost:3001',
          changeOrigin: true,
          secure: false,
          ws: false, // Disable WebSocket proxy to avoid connection errors
          configure: (proxy, _options) => {
            proxy.on('error', (err, _req, _res) => {
              // Suppress all connection errors - backend might not be running
              // Only log unexpected errors
              if (err.code !== 'ECONNREFUSED' && err.code !== 'ECONNRESET' && err.code !== 'ETIMEDOUT') {
                console.log('Proxy error:', err);
              }
            });
          }
        }
      }
    },
    plugins: [react()],
    define: {
      'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      }
    }
  };
});
