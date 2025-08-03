
import React, { useState, useEffect } from 'react';

interface DashboardMetrics {
  totalUsers: number;
  totalTransactions: number;
  totalRevenue: number;
  activeOrders: number;
  pendingKYC: number;
  flaggedAccounts: number;
  supportTickets: number;
  fraudAlerts: number;
}

export function AdminDashboardMain() {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setIsLoading(true);
      const token = localStorage.getItem('admin_token');
      const response = await fetch('/api/admin/dashboard/metrics', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setMetrics(data.data);
        }
      }
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
      // Use fallback data for demo purposes
      setMetrics({
        totalUsers: 24847,
        totalTransactions: 156800000,
        totalRevenue: 12400000,
        activeOrders: 2847,
        pendingKYC: 23,
        flaggedAccounts: 7,
        supportTickets: 48,
        fraudAlerts: 3
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2" style={{borderColor: 'var(--button-color)'}}></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Critical Alerts */}
      <div className="grid gap-4">
        <div className="p-4 curved-card" style={{backgroundColor: 'rgba(200, 16, 46, 0.1)', borderLeft: '4px solid rgb(200, 16, 46)'}}>
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <svg className="w-6 h-6 mr-3" style={{color: 'var(--error-color)'}} fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <div>
                <h3 className="font-bold text-sm" style={{color: 'var(--error-color)'}}>Critical: Fraudulent Transaction Detected</h3>
                <p className="text-xs" style={{color: 'var(--light-text-color)'}}>Transaction ID: TXN-4521 flagged for review - ₦45,000</p>
              </div>
            </div>
            <button className="text-sm font-medium px-4 py-2 curved-button text-white" style={{backgroundColor: 'var(--error-color)'}}>
              Review Now
            </button>
          </div>
        </div>

        <div className="p-4 curved-card" style={{backgroundColor: 'rgba(245, 158, 11, 0.1)', borderLeft: '4px solid #f59e0b'}}>
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <svg className="w-6 h-6 mr-3 text-yellow-600" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
              <div>
                <h3 className="font-bold text-sm text-yellow-700">Escrow Dispute Escalated</h3>
                <p className="text-xs" style={{color: 'var(--light-text-color)'}}>Order #1245 - Customer vs Merchant dispute requires admin intervention</p>
              </div>
            </div>
            <button className="text-sm font-medium px-4 py-2 curved-button bg-yellow-500 text-white">
              Handle Dispute
            </button>
          </div>
        </div>
      </div>

      {/* Key Metrics Grid */}
      {metrics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Total Users */}
          <div className="bg-white curved-card shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6" style={{color: 'var(--button-color)'}} fill="currentColor" viewBox="0 0 20 20">
                  <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3z" />
                </svg>
              </div>
              <span className="text-xs px-2 py-1 bg-green-100 text-green-800 rounded-full">+12.5%</span>
            </div>
            <div>
              <p className="text-2xl font-bold" style={{color: 'var(--black-text-color)'}}>{metrics.totalUsers.toLocaleString()}</p>
              <p className="text-sm" style={{color: 'var(--light-text-color)'}}>Total Active Users</p>
              <div className="flex items-center mt-2 text-xs" style={{color: 'var(--light-text-color)'}}>
                <span>Consumers: 18,250 • Merchants: 4,100 • Drivers: 2,497</span>
              </div>
            </div>
          </div>

          {/* Escrow Balance */}
          <div className="bg-white curved-card shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6" style={{color: 'var(--savings-green)'}} fill="currentColor" viewBox="0 0 20 20">
                  <path d="M4 4a2 2 0 00-2 2v4a2 2 0 002 2V6h10a2 2 0 00-2-2H4zm2 6a2 2 0 012-2h8a2 2 0 012 2v4a2 2 0 01-2 2H8a2 2 0 01-2-2v-4zm6 4a2 2 0 100-4 2 2 0 000 4z" />
                </svg>
              </div>
              <span className="text-xs px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full">7 Pending</span>
            </div>
            <div>
              <p className="text-2xl font-bold" style={{color: 'var(--black-text-color)'}}>₦{(metrics.totalRevenue / 1000000).toFixed(1)}M</p>
              <p className="text-sm" style={{color: 'var(--light-text-color)'}}>Total Escrow Balance</p>
              <div className="flex items-center mt-2 text-xs" style={{color: 'var(--light-text-color)'}}>
                <span>Active: ₦8.2M • Disputed: ₦4.2M</span>
              </div>
            </div>
          </div>

          {/* Transactions */}
          <div className="bg-white curved-card shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6" style={{color: 'var(--marketplace-primary)'}} fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1z" clipRule="evenodd" />
                </svg>
              </div>
              <span className="text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded-full">Real-time</span>
            </div>
            <div>
              <p className="text-2xl font-bold" style={{color: 'var(--black-text-color)'}}>₦{(metrics.totalTransactions / 1000000).toFixed(1)}M</p>
              <p className="text-sm" style={{color: 'var(--light-text-color)'}}>Daily Transaction Volume</p>
              <div className="flex items-center mt-2 text-xs" style={{color: 'var(--light-text-color)'}}>
                <span>{metrics.activeOrders.toLocaleString()} transactions today</span>
              </div>
            </div>
          </div>

          {/* Support Tickets */}
          <div className="bg-white curved-card shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-orange-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7z" clipRule="evenodd" />
                </svg>
              </div>
              <span className="text-xs px-2 py-1 bg-red-100 text-red-800 rounded-full">15 Open</span>
            </div>
            <div>
              <p className="text-2xl font-bold" style={{color: 'var(--black-text-color)'}}>{metrics.supportTickets}</p>
              <p className="text-sm" style={{color: 'var(--light-text-color)'}}>Support Tickets Today</p>
              <div className="flex items-center mt-2 text-xs" style={{color: 'var(--light-text-color)'}}>
                <span>Avg response: 2.4 hours</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Recent Activities & System Status */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Admin Actions */}
        <div className="bg-white curved-card shadow-sm p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold" style={{color: 'var(--deep-blue-color)'}}>Recent Admin Actions</h2>
            <button className="text-sm font-medium" style={{color: 'var(--button-color)'}}>View All</button>
          </div>
          
          <div className="space-y-4">
            <div className="flex items-center p-3 bg-gray-50 rounded-lg">
              <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center mr-3">
                <svg className="w-4 h-4 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M13.477 14.89A6 6 0 015.11 6.524l8.367 8.368zm1.414-1.414L6.524 5.11a6 6 0 018.367 8.367zM18 10a8 8 0 11-16 0 8 8 0 0116 0z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium" style={{color: 'var(--black-text-color)'}}>Merchant Account Suspended</p>
                <p className="text-xs" style={{color: 'var(--light-text-color)'}}>TechStore247 - Violation of terms • 5 min ago</p>
              </div>
            </div>

            <div className="flex items-center p-3 bg-gray-50 rounded-lg">
              <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center mr-3">
                <svg className="w-4 h-4" style={{color: 'var(--savings-green)'}} fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium" style={{color: 'var(--black-text-color)'}}>Escrow Released</p>
                <p className="text-xs" style={{color: 'var(--light-text-color)'}}>Order #4521 - ₦12,500 released to merchant • 12 min ago</p>
              </div>
            </div>

            <div className="flex items-center p-3 bg-gray-50 rounded-lg">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                <svg className="w-4 h-4" style={{color: 'var(--button-color)'}} fill="currentColor" viewBox="0 0 20 20">
                  <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3z" />
                </svg>
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium" style={{color: 'var(--black-text-color)'}}>Driver Account Approved</p>
                <p className="text-xs" style={{color: 'var(--light-text-color)'}}>John Driver - Lagos Zone • 25 min ago</p>
              </div>
            </div>
          </div>
        </div>

        {/* System Health */}
        <div className="bg-white curved-card shadow-sm p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold" style={{color: 'var(--deep-blue-color)'}}>System Health</h2>
            <div className="flex items-center">
              <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
              <span className="text-sm" style={{color: 'var(--savings-green)'}}>All Systems Operational</span>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="w-3 h-3 bg-green-500 rounded-full mr-3"></div>
                <span className="text-sm font-medium" style={{color: 'var(--black-text-color)'}}>Payment Gateway</span>
              </div>
              <span className="text-sm" style={{color: 'var(--savings-green)'}}>Online</span>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="w-3 h-3 bg-green-500 rounded-full mr-3"></div>
                <span className="text-sm font-medium" style={{color: 'var(--black-text-color)'}}>Database</span>
              </div>
              <span className="text-sm" style={{color: 'var(--savings-green)'}}>Optimal</span>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="w-3 h-3 bg-yellow-500 rounded-full mr-3"></div>
                <span className="text-sm font-medium" style={{color: 'var(--black-text-color)'}}>API Response Time</span>
              </div>
              <span className="text-sm text-yellow-600">245ms</span>
            </div>
          </div>

          {/* Server Stats */}
          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <div className="grid grid-cols-2 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold" style={{color: 'var(--black-text-color)'}}>99.9%</p>
                <p className="text-xs" style={{color: 'var(--light-text-color)'}}>Uptime</p>
              </div>
              <div>
                <p className="text-2xl font-bold" style={{color: 'var(--black-text-color)'}}>125ms</p>
                <p className="text-xs" style={{color: 'var(--light-text-color)'}}>Response</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
