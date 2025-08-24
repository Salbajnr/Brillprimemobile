import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    global: 'globalThis',
    Buffer: ['buffer', 'Buffer'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@assets': path.resolve(__dirname, './src/assets'),
      buffer: 'buffer',
    },
  },
  optimizeDeps: {
    include: ['buffer']
  },
  server: {
    port: 5173,
    host: '0.0.0.0',
    cors: true,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET,HEAD,PUT,PATCH,POST,DELETE',
      'Access-Control-Allow-Headers': 'Origin, X-Requested-With, Content-Type, Accept, Authorization',
    },
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        secure: false,
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
  assetsInclude: ['**/*.png', '**/*.jpg', '**/*.jpeg', '**/*.svg', '**/*.gif']
})