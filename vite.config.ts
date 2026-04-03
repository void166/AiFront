import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@integration': path.resolve(__dirname, './src/integration'),
    },
  },
  build: {
    // Standard dist/ output.
    // - Vercel deployment: Vercel picks this up automatically.
    // - Single-server / Docker: Dockerfile copies dist/ → Aintegration/public/
    outDir: 'dist',
    emptyOutDir: true,
  },
  server: {
    port: 5173,
    strictPort: false,
    proxy: {
      '/api': {
        target: 'http://localhost:4900',
        changeOrigin: true,
      },
      '/output': {
        target: 'http://localhost:4900',
        changeOrigin: true,
      },
    },
  },
})
