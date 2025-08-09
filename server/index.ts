import express from "express";
import path from "path";
import { fileURLToPath } from "url";

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
  // Development - serve a simple HTML page
  app.get("*", (req, res) => {
    res.send(`
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="UTF-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <title>Brillprime - Financial Solutions</title>
          <meta name="description" content="Comprehensive financial services platform with web, native mobile, and admin applications for Nigeria.">
          <script src="https://unpkg.com/react@18/umd/react.development.js"></script>
          <script src="https://unpkg.com/react-dom@18/umd/react-dom.development.js"></script>
          <script src="https://cdn.tailwindcss.com"></script>
          <script src="https://unpkg.com/wouter@3.3.5/index.js"></script>
        </head>
        <body>
          <div id="root"></div>
          <script type="module" src="/client/src/main.tsx"></script>
          <script>
            // Inline fallback if module loading fails
            if (!window.React) {
              const { useState, useEffect } = React;
              const { createRoot } = ReactDOM;
              const { Route, Switch, useLocation } = wouter;

              // Simple splash screen fallback
              function SplashPage() {
                const [, setLocation] = useLocation();

                React.useEffect(() => {
                  const timer = setTimeout(() => {
                    const hasSeenOnboarding = localStorage.getItem("hasSeenOnboarding");
                    if (hasSeenOnboarding) {
                      setLocation("/role-selection");
                    } else {
                      setLocation("/onboarding");
                    }
                  }, 3000);
                  return () => clearTimeout(timer);
                }, [setLocation]);

                return React.createElement('div', {
                  className: 'w-full max-w-md mx-auto min-h-screen bg-white flex flex-col items-center justify-center'
                },
                  React.createElement('div', {
                    className: 'w-32 h-32 bg-blue-600 rounded-full flex items-center justify-center shadow-2xl animate-pulse'
                  },
                    React.createElement('div', {
                      className: 'text-white text-4xl font-bold'
                    }, 'B')
                  ),
                  React.createElement('div', {
                    className: 'mt-6 text-center'
                  },
                    React.createElement('h1', {
                      className: 'text-2xl font-bold text-gray-900'
                    }, 'Brillprime'),
                    React.createElement('p', {
                      className: 'text-gray-600 mt-2 text-sm'
                    }, 'Financial Solutions')
                  ),
                  React.createElement('div', {
                    className: 'mt-8 flex space-x-2'
                  },
                    React.createElement('div', {
                      className: 'w-3 h-3 bg-blue-600 rounded-full animate-bounce'
                    }),
                    React.createElement('div', {
                      className: 'w-3 h-3 bg-blue-600 rounded-full animate-bounce',
                      style: { animationDelay: '0.2s' }
                    }),
                    React.createElement('div', {
                      className: 'w-3 h-3 bg-blue-600 rounded-full animate-bounce',
                      style: { animationDelay: '0.4s' }
                    })
                  )
                );
              }

              function App() {
                return React.createElement(Switch, {},
                  React.createElement(Route, { path: '/', component: SplashPage })
                );
              }

              const root = createRoot(document.getElementById('root'));
              root.render(React.createElement(App));
            }
          </script>
        </body>
      </html>
    `);
  });
}

// Error handling middleware
app.use((err: any, req: any, res: any, next: any) => {
  const status = err.status || err.statusCode || 500;
  const message = err.message || "Internal Server Error";
  res.status(status).json({ message });
});

// Start server
const port = parseInt(process.env.PORT || '5000', 10);
app.listen(port, '0.0.0.0', () => {
  console.log(`[${new Date().toLocaleTimeString()}] Server running on port ${port}`);
  console.log(`Visit: http://localhost:${port}`);
}).on('error', (err: any) => {
  if (err.code === 'EADDRINUSE') {
    console.log(`Port ${port} is in use, trying port ${port + 1}`);
    app.listen(port + 1, '0.0.0.0', () => {
      console.log(`[${new Date().toLocaleTimeString()}] Server running on port ${port + 1}`);
      console.log(`Visit: http://localhost:${port + 1}`);
    });
  } else {
    throw err;
  }
});
