
import React, { useState, useEffect } from 'react';
import { Activity, Users, MessageCircle, AlertTriangle, TrendingUp, DollarSign } from 'lucide-react';
import io, { Socket } from 'socket.io-client';

interface SystemMetrics {
  activeRooms: number;
  connectedClients: number;
  onlineUsers: number;
  adminConnections: number;
  totalUsers: number;
  totalOrders: number;
  completedOrders: number;
  totalRevenue: string;
  onlineDrivers: number;
  newUsersLastHour: number;
  activeUsersLastHour: number;
  transactionsLastHour: number;
  revenueLastHour: string;
  memoryUsage: any;
  uptime: number;
  timestamp: number;
}

interface TransactionAlert {
  type: string;
  transaction: any;
  timestamp: number;
}

export default function LiveActivityMonitor() {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [systemMetrics, setSystemMetrics] = useState<SystemMetrics | null>(null);
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [transactionAlerts, setTransactionAlerts] = useState<TransactionAlert[]>([]);

  useEffect(() => {
    // Connect to WebSocket server
    const wsUrl = process.env.NODE_ENV === 'production' 
      ? `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/socket.io/`
      : `ws://${window.location.hostname}:5000/socket.io/`;

    const newSocket = io(wsUrl, {
      transports: ['websocket', 'polling']
    });

    newSocket.on('connect', () => {
      console.log('Admin dashboard connected to WebSocket');
      setIsConnected(true);
      
      // Join admin monitoring rooms
      newSocket.emit('join_admin_room', 'monitoring');
      newSocket.emit('admin_transaction_monitor', {});
    });

    newSocket.on('disconnect', () => {
      console.log('Admin dashboard disconnected from WebSocket');
      setIsConnected(false);
    });

    // Listen for system metrics updates
    newSocket.on('system_metrics_update', (metrics: SystemMetrics) => {
      console.log('Received system metrics:', metrics);
      setSystemMetrics(metrics);
    });

    // Listen for transaction alerts
    newSocket.on('new_transaction', (data: TransactionAlert) => {
      setTransactionAlerts(prev => [data, ...prev.slice(0, 19)]); // Keep last 20
    });

    newSocket.on('suspicious_transaction', (data: TransactionAlert) => {
      setTransactionAlerts(prev => [data, ...prev.slice(0, 19)]);
    });

    // Listen for real-time activity
    newSocket.on('user_status_update', (data: any) => {
      setRecentActivity(prev => [{
        type: 'user_activity',
        message: `User ${data.userId} ${data.isOnline ? 'came online' : 'went offline'}`,
        timestamp: data.timestamp
      }, ...prev.slice(0, 9)]);
    });

    newSocket.on('new_user_registered', (data: any) => {
      setRecentActivity(prev => [{
        type: 'new_user',
        message: `New user registered: ${data.email}`,
        timestamp: Date.now()
      }, ...prev.slice(0, 9)]);
    });

    setSocket(newSocket);

    return () => {
      newSocket.close();
    };
  }, []);

  if (!systemMetrics) {
    return (
      <div className="p-6 bg-white rounded-lg shadow-sm border">
        <div className="flex items-center space-x-2">
          <Activity className="h-5 w-5 animate-pulse" />
          <h3 className="text-lg font-semibold">Live Activity Monitor</h3>
          <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
        </div>
        <p className="text-gray-500 mt-2">Loading real-time data...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Connection Status */}
      <div className="flex items-center justify-between p-4 bg-white rounded-lg shadow-sm border">
        <div className="flex items-center space-x-2">
          <Activity className="h-5 w-5" />
          <h3 className="text-lg font-semibold">Live Activity Monitor</h3>
        </div>
        <div className="flex items-center space-x-2">
          <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
          <span className="text-sm text-gray-600">
            {isConnected ? 'Connected' : 'Disconnected'}
          </span>
        </div>
      </div>

      {/* Real-time Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 bg-white rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Active Connections</p>
              <p className="text-2xl font-bold text-blue-600">{systemMetrics.connectedClients}</p>
            </div>
            <Users className="h-8 w-8 text-blue-500" />
          </div>
        </div>

        <div className="p-4 bg-white rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Online Users</p>
              <p className="text-2xl font-bold text-green-600">{systemMetrics.onlineUsers}</p>
            </div>
            <Activity className="h-8 w-8 text-green-500" />
          </div>
        </div>

        <div className="p-4 bg-white rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Transactions/Hour</p>
              <p className="text-2xl font-bold text-purple-600">{systemMetrics.transactionsLastHour}</p>
            </div>
            <DollarSign className="h-8 w-8 text-purple-500" />
          </div>
        </div>

        <div className="p-4 bg-white rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Revenue/Hour</p>
              <p className="text-2xl font-bold text-orange-600">₦{systemMetrics.revenueLastHour}</p>
            </div>
            <TrendingUp className="h-8 w-8 text-orange-500" />
          </div>
        </div>
      </div>

      {/* Recent Activity & Transaction Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="p-4 bg-white rounded-lg shadow-sm border">
          <h4 className="text-lg font-semibold mb-4">Recent Activity</h4>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {recentActivity.length > 0 ? recentActivity.map((activity, index) => (
              <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                <span className="text-sm">{activity.message}</span>
                <span className="text-xs text-gray-500">
                  {new Date(activity.timestamp).toLocaleTimeString()}
                </span>
              </div>
            )) : (
              <p className="text-gray-500 text-sm">No recent activity</p>
            )}
          </div>
        </div>

        <div className="p-4 bg-white rounded-lg shadow-sm border">
          <h4 className="text-lg font-semibold mb-4">Transaction Alerts</h4>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {transactionAlerts.length > 0 ? transactionAlerts.map((alert, index) => (
              <div key={index} className={`flex items-center justify-between p-2 rounded ${
                alert.type === 'suspicious_transaction' ? 'bg-red-50 border border-red-200' : 'bg-blue-50 border border-blue-200'
              }`}>
                <div className="flex items-center space-x-2">
                  {alert.type === 'suspicious_transaction' && <AlertTriangle className="h-4 w-4 text-red-500" />}
                  <span className="text-sm">
                    {alert.type === 'suspicious_transaction' ? 'Suspicious' : 'New'} transaction: ₦{alert.transaction?.amount}
                  </span>
                </div>
                <span className="text-xs text-gray-500">
                  {new Date(alert.timestamp).toLocaleTimeString()}
                </span>
              </div>
            )) : (
              <p className="text-gray-500 text-sm">No transaction alerts</p>
            )}
          </div>
        </div>
      </div>

      {/* System Health */}
      <div className="p-4 bg-white rounded-lg shadow-sm border">
        <h4 className="text-lg font-semibold mb-4">System Health</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <p className="text-sm text-gray-600">Total Users</p>
            <p className="text-xl font-bold">{systemMetrics.totalUsers}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Total Orders</p>
            <p className="text-xl font-bold">{systemMetrics.totalOrders}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Online Drivers</p>
            <p className="text-xl font-bold">{systemMetrics.onlineDrivers}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Uptime</p>
            <p className="text-xl font-bold">{Math.floor(systemMetrics.uptime / 3600)}h</p>
          </div>
        </div>
      </div>
    </div>
  );
}

interface LiveActivity {
  id: string;
  type: 'user_registration' | 'kyc_submission' | 'support_ticket' | 'transaction' | 'user_action';
  message: string;
  timestamp: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  userId?: number;
  adminId?: number;
}

export function LiveActivityMonitor() {
  const [activities, setActivities] = useState<LiveActivity[]>([]);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    const newSocket = io('ws://localhost:5000', {
      path: '/ws',
      transports: ['websocket']
    });

    newSocket.on('connect', () => {
      console.log('Live activity monitor connected');
      setIsConnected(true);
      newSocket.emit('join_admin_room', 'live_activity');
    });

    newSocket.on('disconnect', () => {
      setIsConnected(false);
    });

    // Listen for various admin events
    newSocket.on('new_user_registered', (data) => {
      addActivity({
        id: `user_reg_${Date.now()}`,
        type: 'user_registration',
        message: `New user registered: ${data.fullName} (${data.email})`,
        timestamp: Date.now(),
        severity: 'low',
        userId: data.id
      });
    });

    newSocket.on('new_kyc_submission', (data) => {
      addActivity({
        id: `kyc_sub_${Date.now()}`,
        type: 'kyc_submission',
        message: `New KYC document submitted by ${data.userInfo?.fullName} - ${data.documentType}`,
        timestamp: Date.now(),
        severity: 'medium',
        userId: data.userId
      });
    });

    newSocket.on('new_support_ticket', (data) => {
      addActivity({
        id: `ticket_${Date.now()}`,
        type: 'support_ticket',
        message: `New support ticket: ${data.ticket.subject} from ${data.ticket.name}`,
        timestamp: Date.now(),
        severity: data.ticket.priority === 'URGENT' ? 'critical' : 'medium'
      });
    });

    newSocket.on('admin_user_action', (data) => {
      addActivity({
        id: `admin_action_${Date.now()}`,
        type: 'user_action',
        message: `Admin ${data.action}d user ${data.userId}`,
        timestamp: data.timestamp,
        severity: 'medium',
        adminId: data.adminSocket,
        userId: data.userId
      });
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, []);

  const addActivity = (activity: LiveActivity) => {
    setActivities(prev => [activity, ...prev.slice(0, 49)]); // Keep last 50 activities
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'user_registration':
        return <Users className="h-4 w-4 text-blue-500" />;
      case 'kyc_submission':
        return <TrendingUp className="h-4 w-4 text-green-500" />;
      case 'support_ticket':
        return <MessageCircle className="h-4 w-4 text-orange-500" />;
      case 'user_action':
        return <Activity className="h-4 w-4 text-purple-500" />;
      default:
        return <AlertTriangle className="h-4 w-4 text-gray-500" />;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'border-red-500 bg-red-50';
      case 'high':
        return 'border-orange-500 bg-orange-50';
      case 'medium':
        return 'border-yellow-500 bg-yellow-50';
      case 'low':
        return 'border-blue-500 bg-blue-50';
      default:
        return 'border-gray-300 bg-white';
    }
  };

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString();
  };

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">Live Activity</h3>
          <div className="flex items-center space-x-2">
            <div className={`h-2 w-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
            <span className="text-sm text-gray-500">
              {isConnected ? 'Connected' : 'Disconnected'}
            </span>
          </div>
        </div>
      </div>
      <div className="max-h-96 overflow-y-auto">
        {activities.length === 0 ? (
          <div className="p-4 text-center text-gray-500">
            No recent activity
          </div>
        ) : (
          activities.map((activity) => (
            <div
              key={activity.id}
              className={`p-3 border-l-4 border-b border-gray-100 ${getSeverityColor(activity.severity)}`}
            >
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0">
                  {getActivityIcon(activity.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-900">
                    {activity.message}
                  </p>
                  <p className="text-xs text-gray-500">
                    {formatTime(activity.timestamp)}
                  </p>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
