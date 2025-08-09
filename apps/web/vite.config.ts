import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@packages': path.resolve(__dirname, '../../packages'),
      '@shared-ui': path.resolve(__dirname, '../../packages/shared-ui/src'),
      '@business-logic': path.resolve(__dirname, '../../packages/business-logic/src'),
      '@api-client': path.resolve(__dirname, '../../packages/api-client/src'),
      '@constants': path.resolve(__dirname, '../../packages/constants/src'),
    },
  },
  server: {
    port: 5000,
    host: '0.0.0.0'
  },
  build: {
    outDir: 'dist',
    sourcemap: true
  }
})
