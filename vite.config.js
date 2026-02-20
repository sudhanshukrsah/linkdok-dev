import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [react()],
    server: {
      proxy: {
        // Local dev proxy: Vite injects the NVIDIA API key server-side (no CORS, key never reaches browser)
        '/nvidia-local': {
          target: 'https://integrate.api.nvidia.com',
          changeOrigin: true,
          rewrite: () => '/v1/chat/completions',
          configure: (proxy) => {
            proxy.on('proxyReq', (proxyReq) => {
              proxyReq.setHeader('Authorization', `Bearer ${env.NVIDIA_API_KEY}`);
              proxyReq.setHeader('Accept', 'application/json');
            });
          }
        }
      }
    }
  }
})
