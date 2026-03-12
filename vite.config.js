import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [react()],
    build: {
      chunkSizeWarningLimit: 1500, // pdfjs-dist worker is ~1MB — expected
      ...(mode === 'production' && {
        // Strip all console.* and debugger statements from production bundle
        minify: 'esbuild',
      }),
    },
    esbuild: {
      // In production: drop console logs and debugger statements entirely
      // In development: keep everything so you can see all logs in VS Code / browser devtools
      drop: mode === 'production' ? ['console', 'debugger'] : [],
    },
    server: {
      proxy: {
        // Local dev proxy: Vite injects the NVIDIA API key server-side (no CORS, key never reaches browser)
        '/nvidia-local': {
          target: 'https://integrate.api.nvidia.com',
          changeOrigin: true,
          rewrite: () => '/v1/chat/completions',
          configure: (proxy) => {
            proxy.on('proxyReq', (proxyReq) => {
              proxyReq.setHeader('Authorization', `Bearer ${env.VITE_NVIDIA_API_KEY}`);
              proxyReq.setHeader('Accept', 'application/json');
            });
          }
        }
      }
    }
  }
})
