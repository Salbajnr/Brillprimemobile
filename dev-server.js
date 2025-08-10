import { spawn } from 'child_process';
import path from 'path';

const __dirname = path.dirname(new URL(import.meta.url).pathname);

console.log('Starting Brill Prime development servers...');

// Start the backend server
const server = spawn('tsx', ['server/index.ts'], {
  stdio: 'pipe',
  env: { ...process.env, NODE_ENV: 'development' }
});

// Start the frontend development server
const client = spawn('npm', ['run', 'dev'], {
  cwd: path.join(__dirname, 'client'),
  stdio: 'pipe'
});

// Handle server output
server.stdout.on('data', (data) => {
  console.log(`[SERVER] ${data}`);
});

server.stderr.on('data', (data) => {
  console.error(`[SERVER ERROR] ${data}`);
});

// Handle client output
client.stdout.on('data', (data) => {
  console.log(`[CLIENT] ${data}`);
});

client.stderr.on('data', (data) => {
  console.error(`[CLIENT ERROR] ${data}`);
});

// Handle process termination
process.on('SIGINT', () => {
  console.log('Shutting down development servers...');
  server.kill();
  client.kill();
  process.exit(0);
});

server.on('close', (code) => {
  console.log(`Server process exited with code ${code}`);
  client.kill();
});

client.on('close', (code) => {
  console.log(`Client process exited with code ${code}`);
  server.kill();
});