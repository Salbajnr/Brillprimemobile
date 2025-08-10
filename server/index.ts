import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Simple logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  res.on("finish", () => {
    const duration = Date.now() - start;
    if (req.path.startsWith("/api")) {
      console.log(`${req.method} ${req.path} ${res.statusCode} in ${duration}ms`);
    }
  });
  next();
});

// Basic API routes
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.get("/api/users", (req, res) => {
  res.json([
    { id: "1", name: "Test User", role: "CONSUMER" },
    { id: "2", name: "Test Merchant", role: "MERCHANT" }
  ]);
});

// Serve static files in production
if (process.env.NODE_ENV === "production") {
  app.use(express.static(path.join(__dirname, "../dist")));
  app.get("*", (req, res) => {
    res.sendFile(path.join(__dirname, "../dist/index.html"));
  });
} else {
  // Development mode - serve React client
  const clientBuildPath = path.join(__dirname, "../client/dist");
  const clientHtmlPath = path.join(clientBuildPath, "index.html");
  
  // Also serve static assets from client/src/assets during development
  app.use('/src/assets', express.static(path.join(__dirname, '../client/src/assets')));
  
  if (fs.existsSync(clientHtmlPath)) {
    console.log('Serving React client from build directory');
    app.use(express.static(clientBuildPath));
    app.get("*", (req, res) => {
      if (req.path.startsWith("/api")) {
        return res.status(404).json({ error: "API endpoint not found" });
      }
      res.sendFile(clientHtmlPath);
    });
  } else {
    console.log('Client build not found, serving HTML fallback');
    // Fallback to HTML version but still serve assets
    app.use(express.static(path.join(__dirname, "..")));
    app.get("*", (req, res) => {
      if (req.path.startsWith("/api")) {
        return res.status(404).json({ error: "API endpoint not found" });
      }
      res.sendFile(path.join(__dirname, "../index.html"));
    });
  }
}

// Error handling middleware
app.use((err: any, req: any, res: any, next: any) => {
  const status = err.status || err.statusCode || 500;
  const message = err.message || "Internal Server Error";
  res.status(status).json({ message });
});

// Start server - Replit expects port 5000 for workflows
const port = 5000;
app.listen(port, '0.0.0.0', () => {
  console.log(`[${new Date().toLocaleTimeString()}] Brillprime server running on port ${port}`);
  console.log(`API endpoints: /api/health, /api/users`);
});
