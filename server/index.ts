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
          <script src="https://unpkg.com/react@18/umd/react.development.js"></script>
          <script src="https://unpkg.com/react-dom@18/umd/react-dom.development.js"></script>
          <script src="https://cdn.tailwindcss.com"></script>
        </head>
        <body>
          <div id="root"></div>
          <script>
            const { useState, useEffect } = React;
            const { createRoot } = ReactDOM;

            function App() {
              const [users, setUsers] = useState([]);
              const [loading, setLoading] = useState(true);

              useEffect(() => {
                fetch('/api/users')
                  .then(res => res.json())
                  .then(data => {
                    setUsers(data);
                    setLoading(false);
                  })
                  .catch(err => {
                    console.error('Error fetching users:', err);
                    setLoading(false);
                  });
              }, []);

              return React.createElement('div', {
                className: 'min-h-screen bg-gray-50 py-12 px-4'
              },
                React.createElement('div', {
                  className: 'max-w-md mx-auto bg-white rounded-lg shadow-md p-6'
                },
                  React.createElement('h1', {
                    className: 'text-2xl font-bold text-gray-900 mb-2'
                  }, 'Brillprime'),
                  React.createElement('p', {
                    className: 'text-gray-600 mb-6'
                  }, 'Cross-Platform Financial Solutions'),
                  React.createElement('div', {
                    className: 'space-y-3'
                  },
                    React.createElement('button', {
                      className: 'w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors',
                      'data-testid': 'button-consumer'
                    }, 'Consumer Portal'),
                    React.createElement('button', {
                      className: 'w-full bg-gray-600 text-white py-2 px-4 rounded-md hover:bg-gray-700 transition-colors',
                      'data-testid': 'button-merchant'
                    }, 'Merchant Dashboard'),
                    React.createElement('button', {
                      className: 'w-full bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 transition-colors',
                      'data-testid': 'button-driver'
                    }, 'Driver Hub')
                  ),
                  React.createElement('div', {
                    className: 'mt-6 p-4 bg-gray-50 rounded-md'
                  },
                    React.createElement('h3', {
                      className: 'font-semibold text-gray-900 mb-2'
                    }, 'System Status'),
                    loading 
                      ? React.createElement('p', {
                          className: 'text-gray-600'
                        }, 'Loading...')
                      : React.createElement('p', {
                          className: 'text-green-600'
                        }, \`API Connected - \${users.length} users loaded\`)
                  )
                )
              );
            }

            const root = createRoot(document.getElementById('root'));
            root.render(React.createElement(App));
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
