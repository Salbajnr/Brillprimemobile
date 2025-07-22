// Minimal JavaScript server to test the basic setup
// This is a temporary solution while dependency conflicts are resolved

import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.PORT || 3000;

const server = http.createServer((req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  // Simple routing
  if (req.url === '/' || req.url === '/index.html') {
    // Try to serve the client/index.html file
    const filePath = path.join(__dirname, '../client/index.html');
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf-8');
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(content);
    } else {
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(`
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Brillprime - Migration in Progress</title>
        </head>
        <body>
          <div style="text-align: center; font-family: Arial, sans-serif; padding: 40px;">
            <h1>🚧 Brillprime Migration in Progress</h1>
            <p>The application is being migrated from Replit Agent to the standard Replit environment.</p>
            <p>Dependencies are being resolved...</p>
            <p><strong>Status:</strong> Working on dependency conflicts</p>
          </div>
        </body>
        </html>
      `);
    }
  } else if (req.url.startsWith('/api/')) {
    // Simple API response
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ 
      status: 'Migration in progress', 
      message: 'Dependencies being resolved',
      timestamp: new Date().toISOString()
    }));
  } else {
    res.writeHead(404);
    res.end('Not Found');
  }
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚧 Migration server running on port ${PORT}`);
  console.log(`📍 Server accessible at http://0.0.0.0:${PORT}`);
  console.log(`🔧 Working on resolving dependency conflicts...`);
});