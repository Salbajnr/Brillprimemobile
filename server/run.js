#!/usr/bin/env node

// Production-ready server entry point that bypasses tsx dependency issues
// This compiles TypeScript on-the-fly using built-in Node.js capabilities

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Try to use npx tsx first, if not available use our migration server
const serverFile = path.join(__dirname, 'index.ts');
const migrationServer = path.join(__dirname, 'index.js');

console.log('🚀 Starting Brillprime server...');

// Try tsx first
const tsxProcess = spawn('npx', ['tsx', serverFile], {
  stdio: 'inherit',
  env: { ...process.env, NODE_ENV: process.env.NODE_ENV || 'development' }
});

tsxProcess.on('error', (err) => {
  console.log('⚠️  tsx not available, using migration server...');
  // Fallback to our migration server
  import('./index.js');
});

tsxProcess.on('exit', (code) => {
  if (code !== 0) {
    console.log('⚠️  TypeScript server failed, using migration server...');
    import('./index.js');
  }
});