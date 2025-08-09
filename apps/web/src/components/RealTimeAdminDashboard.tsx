import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Package, 
  DollarSign, 
  TrendingUp, 
  AlertCircle, 
  Clock, 
  MapPin, 
  MessageSquare,
  Bell,
  Activity
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useRealTimeUpdates } from '../hooks/useRealTimeUpdates';
import { formatDistanceToNow } from 'date-fns';

interface SystemMetrics {
  activeUsers: number;
  totalOrders: number;
  totalRevenue: number;
  pendingDisputes: number;
  escrowBalance: number;
  successRate: number;
}

interface LiveActivity {
  id: string;
  type: 'order' | 'payment' | 'user_action' | 'dispute' | 'location_update';
  description: string;
  timestamp: Date;
  userId?: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  metadata?: any;
}

export const RealTimeAdminDashboard: React.FC = () => {
  const [systemMetrics, setSystemMetrics] = useState<SystemMetrics>({
    activeUsers: 0,
    totalOrders: 0,
    totalRevenue: 0,
    pendingDisputes: 0,
    escrowBalance: 0,
    successRate: 0
  });

  const [liveActivities, setLiveActivities] = useState<LiveActivity[]>([]);
  const [selectedTimeRange, setSelectedTimeRange] = useState<'1h' | '24h' | '7d'>('1h');

  const {
    connected,
    updates,
    notifications,
    orderUpdates,
    deliveryUpdates,
    getOnlineUsers,
    getActiveDeliveries,
    getPendingOrders
  } = useRealTimeUpdates();

  // Calculate real-time metrics
  const activeUsers = getOnlineUsers().length;
  const activeDeliveries = getActiveDeliveries().length;
  const pendingOrders = getPendingOrders().length;

  // Process real-time updates into activities
  useEffect(() => {
    const newActivities = updates.slice(0, 50).map(update => ({
      id: update.id,
      type: update.type as any,
      description: getActivityDescription(update),
      timestamp: update.timestamp,
      severity: getActivitySeverity(update) as any,
      metadata: update.data
    }));

    setLiveActivities(newActivities);
  }, [updates]);

  const getActivityDescription = (update: any): string => {
    switch (update.type) {
      case 'order_update':
        return `Order #${update.data.orderId} status changed to ${update.data.status}`;
      case 'delivery_update':
        return `Delivery #${update.data.deliveryId} - ${update.data.status}`;
      case 'notification':
        return `Notification sent: ${update.data.title}`;
      case 'chat_message':
        return `New message in room ${update.data.roomId}`;
      case 'location_update':
        return `Location updated for user ${update.data.userId}`;
      default:
        return `System activity: ${update.type}`;
    }
  };

  const getActivitySeverity = (update: any): string => {
    if (update.data?.priority === 'urgent' || update.data?.status === 'failed') {
      return 'critical';
    }
    if (update.data?.priority === 'high' || update.data?.status === 'cancelled') {
      return 'high';
    }
    if (update.data?.priority === 'medium') {
      return 'medium';
    }
    return 'low';
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'high':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'order_update':
        return <Package className="h-4 w-4 text-blue-500" />;
      case 'delivery_update':
        return <MapPin className="h-4 w-4 text-green-500" />;
      case 'notification':
        return <Bell className="h-4 w-4 text-purple-500" />;
      case 'chat_message':
        return <MessageSquare className="h-4 w-4 text-blue-500" />;
      case 'location_update':
        return <MapPin className="h-4 w-4 text-orange-500" />;
      default:
        return <Activity className="h-4 w-4 text-gray-500" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* System Status Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Real-Time Admin Dashboard</h1>
          <p className="text-gray-600">Monitor live system activity and performance</p>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className={`h-3 w-3 rounded-full ${connected ? 'bg-green-500' : 'bg-red-500'}`} />
            <span className="text-sm font-medium">
              {connected ? 'Live Data' : 'Disconnected'}
            </span>
          </div>
          
          <div className="flex gap-2">
            {(['1h', '24h', '7d'] as const).map((range) => (
              <Button
                key={range}
                variant={selectedTimeRange === range ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedTimeRange(range)}
              >
                {range}
              </Button>
            ))}
          </div>
        </div>
      </div>

      {/* Real-Time Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Users</CardTitle>
            <Users className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeUsers}</div>
            <p className="text-xs text-gray-600">
              {connected ? 'Live count' : 'Last known'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Orders</CardTitle>
            <Package className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingOrders}</div>
            <p className="text-xs text-gray-600">
              {orderUpdates.length} total updates
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Live Deliveries</CardTitle>
            <MapPin className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeDeliveries}</div>
            <p className="text-xs text-gray-600">
              {deliveryUpdates.length} tracking updates
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">System Health</CardTitle>
            <TrendingUp className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {connected ? '99.9%' : 'N/A'}
            </div>
            <p className="text-xs text-gray-600">
              Uptime {selectedTimeRange}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Live Activity Feed and Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Live Activity Feed */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Live Activity Feed
            </CardTitle>
          </CardHeader>
          
          <CardContent className="p-0">
            <ScrollArea className="h-96">
              {liveActivities.length === 0 ? (
                <div className="p-4 text-center text-gray-500">
                  <Activity className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>No recent activity</p>
                  {!connected && (
                    <p className="text-xs">Waiting for connection...</p>
                  )}
                </div>
              ) : (
                <div className="divide-y">
                  {liveActivities.map((activity) => (
                    <div key={activity.id} className="p-4 hover:bg-gray-50">
                      <div className="flex items-start gap-3">
                        <div className="mt-0.5">
                          {getActivityIcon(activity.type)}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium truncate">
                              {activity.description}
                            </p>
                            <Badge 
                              variant="outline"
                              className={`text-xs ${getSeverityColor(activity.severity)}`}
                            >
                              {activity.severity}
                            </Badge>
                          </div>
                          
                          <p className="text-xs text-gray-500 mt-1">
                            {formatDistanceToNow(activity.timestamp, { addSuffix: true })}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>

        {/* System Performance */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              System Performance
            </CardTitle>
          </CardHeader>
          
          <CardContent className="space-y-6">
            {/* Performance Metrics */}
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span>WebSocket Connection</span>
                  <span className={connected ? 'text-green-600' : 'text-red-600'}>
                    {connected ? 'Connected' : 'Disconnected'}
                  </span>
                </div>
                <Progress value={connected ? 100 : 0} className="h-2" />
              </div>

              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span>Active Sessions</span>
                  <span>{activeUsers}</span>
                </div>
                <Progress value={(activeUsers / 100) * 100} className="h-2" />
              </div>

              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span>Order Processing</span>
                  <span>98.5%</span>
                </div>
                <Progress value={98.5} className="h-2" />
              </div>

              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span>Delivery Tracking</span>
                  <span>{activeDeliveries} active</span>
                </div>
                <Progress value={activeDeliveries > 0 ? 100 : 0} className="h-2" />
              </div>
            </div>

            {/* Quick Actions */}
            <div className="space-y-2">
              <h4 className="font-medium text-sm">Quick Actions</h4>
              <div className="grid grid-cols-2 gap-2">
                <Button variant="outline" size="sm">
                  <AlertCircle className="h-4 w-4 mr-2" />
                  View Alerts
                </Button>
                <Button variant="outline" size="sm">
                  <Users className="h-4 w-4 mr-2" />
                  User Management
                </Button>
                <Button variant="outline" size="sm">
                  <Package className="h-4 w-4 mr-2" />
                  Order Overview
                </Button>
                <Button variant="outline" size="sm">
                  <DollarSign className="h-4 w-4 mr-2" />
                  Financial Report
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Real-Time Notifications Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Recent Notifications
          </CardTitle>
        </CardHeader>
        
        <CardContent>
          {notifications.length === 0 ? (
            <div className="text-center text-gray-500 py-4">
              <Bell className="h-8 w-8 mx-auto mb-2 text-gray-300" />
              <p>No recent notifications</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {notifications.slice(0, 6).map((notification) => (
                <div key={notification.id} className="border rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="h-2 w-2 rounded-full bg-blue-500" />
                    <span className="font-medium text-sm">{notification.title}</span>
                  </div>
                  <p className="text-xs text-gray-600 mb-2">
                    {notification.message}
                  </p>
                  <p className="text-xs text-gray-400">
                    {formatDistanceToNow(new Date(notification.timestamp), { addSuffix: true })}
                  </p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default RealTimeAdminDashboard;