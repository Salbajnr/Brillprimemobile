import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    host: '0.0.0.0',
    port: 5173,
    strictPort: false,
    hmr: {
      port: 5173
    }
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    target: 'es2015',
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, 'index.html'),
        admin: path.resolve(__dirname, 'public/admin.html')
      },
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          router: ['wouter']
        }
      }
    }
  },
  optimizeDeps: {
    include: ['react', 'react-dom', 'wouter']
  },
  define: {
    global: 'globalThis'
  }
})