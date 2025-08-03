
import React, { useState, useEffect } from 'react';
import { adminApi } from '../lib/api';
import { DashboardMetrics, UserWithKYC, SupportTicket, Transaction, FraudAlert, DriverLocation } from '../types/admin';

export function Dashboard() {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [pendingKYC, setPendingKYC] = useState<UserWithKYC[]>([]);
  const [recentTickets, setRecentTickets] = useState<SupportTicket[]>([]);
  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([]);
  const [fraudAlerts, setFraudAlerts] = useState<FraudAlert[]>([]);
  const [driverLocations, setDriverLocations] = useState<DriverLocation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setIsLoading(true);
      const [
        metricsRes,
        kycRes,
        ticketsRes,
        transactionsRes,
        fraudRes,
        driversRes
      ] = await Promise.all([
        adminApi.getDashboardMetrics(),
        adminApi.getPendingKYC({ limit: 5 }),
        adminApi.getSupportTickets({ limit: 5, status: 'OPEN' }),
        adminApi.getTransactions({ limit: 10 }),
        adminApi.getFraudAlerts({ limit: 5, status: 'PENDING' }),
        adminApi.getDriverLocations()
      ]);

      if (metricsRes.success) setMetrics(metricsRes.data);
      if (kycRes.success) setPendingKYC(kycRes.data.items || []);
      if (ticketsRes.success) setRecentTickets(ticketsRes.data.items || []);
      if (transactionsRes.success) setRecentTransactions(transactionsRes.data.items || []);
      if (fraudRes.success) setFraudAlerts(fraudRes.data.items || []);
      if (driversRes.success) setDriverLocations(driversRes.data || []);
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKYCReview = async (documentId: number, action: 'approve' | 'reject', reason?: string) => {
    try {
      await adminApi.reviewKYC(documentId, action, reason);
      loadDashboardData(); // Refresh data
    } catch (error) {
      console.error('KYC review failed:', error);
    }
  };

  const handleTicketUpdate = async (ticketId: string, updates: any) => {
    try {
      await adminApi.updateTicket(ticketId, updates);
      loadDashboardData(); // Refresh data
    } catch (error) {
      console.error('Ticket update failed:', error);
    }
  };

  const handleTransactionAction = async (transactionId: string, action: 'refund' | 'hold' | 'release', reason?: string) => {
    try {
      switch (action) {
        case 'refund':
          await adminApi.refundTransaction(transactionId, reason || '');
          break;
        case 'hold':
          await adminApi.holdTransaction(transactionId, reason || '');
          break;
        case 'release':
          await adminApi.releaseTransaction(transactionId);
          break;
      }
      loadDashboardData(); // Refresh data
    } catch (error) {
      console.error('Transaction action failed:', error);
    }
  };

  const handleFraudAlert = async (alertId: number, status: string, notes?: string) => {
    try {
      await adminApi.updateFraudAlert(alertId, status, notes);
      loadDashboardData(); // Refresh data
    } catch (error) {
      console.error('Fraud alert update failed:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white shadow rounded-lg p-6">
        <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
        <p className="text-gray-600">Monitor and manage the BrillPrime platform</p>
      </div>

      {/* Metrics Cards */}
      {metrics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <span className="text-2xl">👥</span>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Total Users</dt>
                    <dd className="text-lg font-medium text-gray-900">{metrics.totalUsers.toLocaleString()}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <span className="text-2xl">💰</span>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Total Revenue</dt>
                    <dd className="text-lg font-medium text-gray-900">₦{metrics.totalRevenue.toLocaleString()}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <span className="text-2xl">📋</span>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Active Orders</dt>
                    <dd className="text-lg font-medium text-gray-900">{metrics.activeOrders}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <span className="text-2xl">🚨</span>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Fraud Alerts</dt>
                    <dd className="text-lg font-medium text-gray-900">{metrics.fraudAlerts}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="bg-white shadow rounded-lg">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8 px-6">
            {[
              { id: 'overview', name: 'Overview', icon: '📊' },
              { id: 'kyc', name: 'KYC Verification', icon: '✅' },
              { id: 'support', name: 'Support Tickets', icon: '🎫' },
              { id: 'transactions', name: 'Transactions', icon: '💰' },
              { id: 'fraud', name: 'Fraud Detection', icon: '🚨' },
              { id: 'drivers', name: 'Driver Monitoring', icon: '📡' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`${
                  activeTab === tab.id
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center space-x-2`}
              >
                <span>{tab.icon}</span>
                <span>{tab.name}</span>
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6">
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Quick Actions</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <button className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 text-left">
                      <div className="text-2xl mb-2">👤</div>
                      <div className="text-sm font-medium">User Management</div>
                    </button>
                    <button className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 text-left">
                      <div className="text-2xl mb-2">🏪</div>
                      <div className="text-sm font-medium">Merchant Apps</div>
                    </button>
                    <button className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 text-left">
                      <div className="text-2xl mb-2">🚗</div>
                      <div className="text-sm font-medium">Driver Apps</div>
                    </button>
                    <button className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 text-left">
                      <div className="text-2xl mb-2">⚙️</div>
                      <div className="text-sm font-medium">System Health</div>
                    </button>
                  </div>
                </div>
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">System Status</h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                      <span className="text-sm text-green-800">API Server</span>
                      <span className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded-full">Online</span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                      <span className="text-sm text-green-800">Database</span>
                      <span className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded-full">Healthy</span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                      <span className="text-sm text-green-800">Payment Gateway</span>
                      <span className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded-full">Active</span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
                      <span className="text-sm text-yellow-800">WebSocket</span>
                      <span className="px-2 py-1 text-xs bg-yellow-100 text-yellow-800 rounded-full">Warning</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* KYC Verification Tab */}
          {activeTab === 'kyc' && (
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Pending KYC Verifications</h3>
              <div className="space-y-4">
                {pendingKYC.map((user) => (
                  <div key={user.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium text-gray-900">{user.fullName}</h4>
                        <p className="text-sm text-gray-500">{user.email} • {user.role}</p>
                        <p className="text-xs text-gray-400">Submitted: {new Date(user.createdAt).toLocaleDateString()}</p>
                      </div>
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleKYCReview(user.id, 'approve')}
                          className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => handleKYCReview(user.id, 'reject', 'Documents not clear')}
                          className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700"
                        >
                          Reject
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
                {pendingKYC.length === 0 && (
                  <p className="text-gray-500 text-center py-8">No pending KYC verifications</p>
                )}
              </div>
            </div>
          )}

          {/* Support Tickets Tab */}
          {activeTab === 'support' && (
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Recent Support Tickets</h3>
              <div className="space-y-4">
                {recentTickets.map((ticket) => (
                  <div key={ticket.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-900">{ticket.subject}</h4>
                        <p className="text-sm text-gray-600 mt-1">{ticket.message.substring(0, 100)}...</p>
                        <div className="flex items-center space-x-4 mt-2">
                          <span className="text-xs text-gray-500">{ticket.name} • {ticket.email}</span>
                          <span className={`px-2 py-1 text-xs rounded-full ${
                            ticket.priority === 'URGENT' ? 'bg-red-100 text-red-800' :
                            ticket.priority === 'HIGH' ? 'bg-orange-100 text-orange-800' :
                            'bg-blue-100 text-blue-800'
                          }`}>
                            {ticket.priority}
                          </span>
                        </div>
                      </div>
                      <div className="flex space-x-2">
                        <select
                          onChange={(e) => handleTicketUpdate(ticket.id, { status: e.target.value })}
                          className="text-sm border border-gray-300 rounded"
                          defaultValue={ticket.status}
                        >
                          <option value="OPEN">Open</option>
                          <option value="IN_PROGRESS">In Progress</option>
                          <option value="RESOLVED">Resolved</option>
                          <option value="CLOSED">Closed</option>
                        </select>
                      </div>
                    </div>
                  </div>
                ))}
                {recentTickets.length === 0 && (
                  <p className="text-gray-500 text-center py-8">No recent support tickets</p>
                )}
              </div>
            </div>
          )}

          {/* Transactions Tab */}
          {activeTab === 'transactions' && (
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Recent Transactions</h3>
              <div className="space-y-4">
                {recentTransactions.map((transaction) => (
                  <div key={transaction.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium text-gray-900">₦{parseFloat(transaction.amount).toLocaleString()}</h4>
                        <p className="text-sm text-gray-600">{transaction.type} • {transaction.description}</p>
                        <p className="text-xs text-gray-400">
                          {new Date(transaction.initiatedAt).toLocaleString()}
                        </p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          transaction.status === 'SUCCESS' ? 'bg-green-100 text-green-800' :
                          transaction.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' :
                          transaction.status === 'FAILED' ? 'bg-red-100 text-red-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {transaction.status}
                        </span>
                        <div className="flex space-x-1">
                          <button
                            onClick={() => handleTransactionAction(transaction.id, 'refund', 'Admin initiated refund')}
                            className="px-2 py-1 bg-yellow-600 text-white text-xs rounded hover:bg-yellow-700"
                          >
                            Refund
                          </button>
                          <button
                            onClick={() => handleTransactionAction(transaction.id, 'hold', 'Under investigation')}
                            className="px-2 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700"
                          >
                            Hold
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                {recentTransactions.length === 0 && (
                  <p className="text-gray-500 text-center py-8">No recent transactions</p>
                )}
              </div>
            </div>
          )}

          {/* Fraud Detection Tab */}
          {activeTab === 'fraud' && (
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Fraud Alerts</h3>
              <div className="space-y-4">
                {fraudAlerts.map((alert) => (
                  <div key={alert.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-medium text-gray-900">{alert.alertType}</h4>
                        <p className="text-sm text-gray-600">{alert.description}</p>
                        <div className="flex items-center space-x-4 mt-2">
                          <span className="text-xs text-gray-500">
                            User: {alert.user?.fullName} ({alert.user?.email})
                          </span>
                          <span className={`px-2 py-1 text-xs rounded-full ${
                            alert.severity === 'CRITICAL' ? 'bg-red-100 text-red-800' :
                            alert.severity === 'HIGH' ? 'bg-orange-100 text-orange-800' :
                            alert.severity === 'MEDIUM' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-blue-100 text-blue-800'
                          }`}>
                            {alert.severity}
                          </span>
                        </div>
                      </div>
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleFraudAlert(alert.id, 'INVESTIGATING', 'Under review')}
                          className="px-3 py-1 bg-yellow-600 text-white text-sm rounded hover:bg-yellow-700"
                        >
                          Investigate
                        </button>
                        <button
                          onClick={() => handleFraudAlert(alert.id, 'FALSE_POSITIVE', 'False alarm')}
                          className="px-3 py-1 bg-gray-600 text-white text-sm rounded hover:bg-gray-700"
                        >
                          False Positive
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
                {fraudAlerts.length === 0 && (
                  <p className="text-gray-500 text-center py-8">No active fraud alerts</p>
                )}
              </div>
            </div>
          )}

          {/* Driver Monitoring Tab */}
          {activeTab === 'drivers' && (
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Live Driver Locations</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {driverLocations.map((driver) => (
                  <div key={driver.driverId} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium text-gray-900">{driver.driver.fullName}</h4>
                        <p className="text-sm text-gray-600">{driver.driver.vehicleType} • {driver.driver.vehiclePlate}</p>
                        <p className="text-xs text-gray-400">
                          Last Update: {new Date(driver.lastUpdate).toLocaleTimeString()}
                        </p>
                      </div>
                      <div className="text-right">
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          driver.isAvailable ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                        }`}>
                          {driver.isAvailable ? 'Available' : 'Busy'}
                        </span>
                        <p className="text-xs text-gray-500 mt-1">
                          {driver.latitude.toFixed(4)}, {driver.longitude.toFixed(4)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
                {driverLocations.length === 0 && (
                  <p className="text-gray-500 text-center py-8 col-span-3">No active drivers</p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
