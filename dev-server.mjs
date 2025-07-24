#!/usr/bin/env node

import { spawn } from 'child_process';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import path from 'path';

const require = createRequire(import.meta.url);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🚀 Starting Brillprime Development Server...');

// Set environment variables
process.env.NODE_ENV = 'development';
process.env.PORT = process.env.PORT || '3000';

// Import and start the server directly
try {
  // Try to run the TypeScript server with direct Node.js import
  const { default: server } = await import('./server/index.js');
  if (server) {
    console.log('✅ Server started successfully');
    console.log(`🌐 Live preview available at: http://localhost:${process.env.PORT}`);
  }
} catch (error) {
  console.log('TypeScript server not available, using migration server...');
  
  // Fallback to migration server
  try {
    const { default: migrationServer } = await import('./start-server.mjs');
    console.log('✅ Migration server started successfully');
    console.log(`🌐 Live preview available at: http://localhost:${process.env.PORT}`);
  } catch (migrationError) {
    console.error('❌ Failed to start development server:', migrationError);
    process.exit(1);
  }
}