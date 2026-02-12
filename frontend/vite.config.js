import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'https://naviyabackend-je3hanh5.b4a.run',
        changeOrigin: true,
      }
    }
  }
})
