#!/usr/bin/env node

// Simple script to run the server with the working Node.js version
import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const server = spawn('node', ['server/index.js'], {
  stdio: 'inherit',
  env: { ...process.env, NODE_ENV: 'development' }
});

server.on('close', (code) => {
  console.log(`Server process exited with code ${code}`);
});

process.on('SIGINT', () => {
  server.kill('SIGINT');
});

process.on('SIGTERM', () => {
  server.kill('SIGTERM');
});