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
    },
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true
      }
    }
  },
  build: {
    sourcemap: true,
    rollupOptions: {
      input: {
        main: './index.html',
        admin: './public/admin.html'
      },
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          router: ['wouter'],
          ui: ['lucide-react'],
          admin: ['./src/admin.tsx']
        }
      }
    }
  },
  optimizeDeps: {
    include: ['react', 'react-dom', 'wouter'],
    exclude: ['lucide-react'],
  },
  define: {
    global: 'globalThis'
  }
})