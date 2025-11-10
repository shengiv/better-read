import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/nlb-api': {
        target: 'https://openweb.nlb.gov.sg',
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path.replace(/^\/nlb-api/, '/api/v2/Catalogue')
      },
      '/nlb-branch-api': {
        target: 'https://openweb.nlb.gov.sg',
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path.replace(/^\/nlb-branch-api/, '/api/v1/Library')
      }
    }
  }
})
