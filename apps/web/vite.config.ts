import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@packages': path.resolve(__dirname, '../../packages'),
      '@shared': path.resolve(__dirname, '../../packages/shared/src'),
      '@shared-ui': path.resolve(__dirname, '../../packages/shared-ui/src'),
      '@business-logic': path.resolve(__dirname, '../../packages/business-logic/src'),
      '@api-client': path.resolve(__dirname, '../../packages/api-client/src'),
      '@constants': path.resolve(__dirname, '../../packages/constants/src'),
      '@packages/shared': path.resolve(__dirname, '../../packages/shared/src'),
      '@packages/shared-ui': path.resolve(__dirname, '../../packages/shared-ui/src'),
      '@packages/business-logic': path.resolve(__dirname, '../../packages/business-logic/src'),
      '@packages/api-client': path.resolve(__dirname, '../../packages/api-client/src'),
      '@packages/constants': path.resolve(__dirname, '../../packages/constants/src'),
    },
  },
  server: {
    port: 3000,
    host: '0.0.0.0'
  },
  build: {
    outDir: 'dist',
    sourcemap: true
  }
})