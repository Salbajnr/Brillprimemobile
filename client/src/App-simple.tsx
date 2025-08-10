import React, { useState, useEffect } from 'react';
import './index.css';

interface HealthCheck {
  status: string;
  timestamp: string;
  stats: {
    cpuUsage: number;
    memoryUsage: number;
    activeConnections: number;
    requestsPerSecond: number;
    uptime: number;
  };
  version: string;
  nodeVersion: string;
  instanceId: string;
}

function App() {
  const [health, setHealth] = useState<HealthCheck | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/health')
      .then(response => response.json())
      .then((data: HealthCheck) => {
        setHealth(data);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading BrillPrime...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 text-xl mb-4">⚠️ Connection Error</div>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <header className="text-center mb-8">
          <h1 className="text-4xl font-bold text-blue-600 mb-2">🚀 BrillPrime</h1>
          <p className="text-gray-600">Multi-Service Delivery Platform</p>
        </header>

        {health && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-2">Server Status</h3>
              <div className="flex items-center">
                <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
                <span className="text-green-600 font-medium">{health.status}</span>
              </div>
              <p className="text-sm text-gray-500 mt-1">
                Uptime: {Math.floor(health.stats.uptime / 60)}m {health.stats.uptime % 60}s
              </p>
            </div>

            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-2">Performance</h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">CPU Usage:</span>
                  <span className="text-sm font-medium">{health.stats.cpuUsage.toFixed(1)}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Memory:</span>
                  <span className="text-sm font-medium">{health.stats.memoryUsage.toFixed(1)}%</span>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-2">Connections</h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Active:</span>
                  <span className="text-sm font-medium">{health.stats.activeConnections}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Req/sec:</span>
                  <span className="text-sm font-medium">{health.stats.requestsPerSecond.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h2 className="text-2xl font-semibold text-gray-800 mb-4">Available Services</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 border border-gray-200 rounded-lg">
              <h3 className="font-semibold text-gray-800 mb-2">🏪 Merchant Dashboard</h3>
              <p className="text-sm text-gray-600">Product management and order processing</p>
            </div>
            <div className="p-4 border border-gray-200 rounded-lg">
              <h3 className="font-semibold text-gray-800 mb-2">🚚 Driver Dashboard</h3>
              <p className="text-sm text-gray-600">Delivery tracking and route management</p>
            </div>
            <div className="p-4 border border-gray-200 rounded-lg">
              <h3 className="font-semibold text-gray-800 mb-2">💳 Payment System</h3>
              <p className="text-sm text-gray-600">Secure payment processing with Paystack</p>
            </div>
            <div className="p-4 border border-gray-200 rounded-lg">
              <h3 className="font-semibold text-gray-800 mb-2">⛽ Fuel Delivery</h3>
              <p className="text-sm text-gray-600">On-demand fuel delivery services</p>
            </div>
            <div className="p-4 border border-gray-200 rounded-lg">
              <h3 className="font-semibold text-gray-800 mb-2">🏗️ Admin Center</h3>
              <p className="text-sm text-gray-600">Platform management and analytics</p>
            </div>
            <div className="p-4 border border-gray-200 rounded-lg">
              <h3 className="font-semibold text-gray-800 mb-2">💬 Real-time Chat</h3>
              <p className="text-sm text-gray-600">Live support and communication</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-2xl font-semibold text-gray-800 mb-4">API Endpoints</h2>
          <div className="space-y-2 text-sm">
            <div className="flex"><span className="font-mono bg-gray-100 px-2 py-1 rounded mr-2">GET</span> /api/health - Server health check</div>
            <div className="flex"><span className="font-mono bg-gray-100 px-2 py-1 rounded mr-2">POST</span> /api/auth/login - User authentication</div>
            <div className="flex"><span className="font-mono bg-gray-100 px-2 py-1 rounded mr-2">POST</span> /api/auth/register - User registration</div>
            <div className="flex"><span className="font-mono bg-gray-100 px-2 py-1 rounded mr-2">GET</span> /api/ws-test - WebSocket test endpoint</div>
            <div className="text-gray-500 mt-2">... and many more endpoints for comprehensive functionality</div>
          </div>
        </div>

        <footer className="text-center mt-8 text-gray-500 text-sm">
          <p>BrillPrime v{health?.version} | Node.js {health?.nodeVersion}</p>
          <p>Backend Migration Completed Successfully</p>
        </footer>
      </div>
    </div>
  );
}

export default App;