
import React, { useState, useEffect } from 'react';
import { Activity, Users, MessageCircle, AlertTriangle, TrendingUp } from 'lucide-react';
import io, { Socket } from 'socket.io-client';

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
