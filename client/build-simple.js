const { build } = require('vite');
const react = require('@vitejs/plugin-react');
const path = require('path');

async function buildApp() {
  try {
    await build({
      root: '/home/runner/workspace/client',
      plugins: [react()],
      resolve: {
        alias: {
          "@": path.resolve('/home/runner/workspace/client/src'),
        },
      },
      build: {
        outDir: 'dist',
        sourcemap: false,
        target: 'esnext',
        minify: false,
        rollupOptions: {
          input: '/home/runner/workspace/client/index.html'
        }
      },
      define: {
        global: 'globalThis'
      }
    });
    console.log('Build completed successfully!');
  } catch (error) {
    console.error('Build failed:', error);
  }
}

buildApp();