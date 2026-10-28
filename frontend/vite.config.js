import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [react(), tailwindcss()],
    server: {
      host: '0.0.0.0',
      proxy: {
        '/api': {
          target: env.VITE_API_PROXY_TARGET || 'http://backend:8000/',
          changeOrigin: true,
          // EZT A SORT VEDD KI VAGY KOMMENTELD KI:
          // rewrite: (path) => path.replace(/^\/api/, ''),
        },
      },
    },
  }
})