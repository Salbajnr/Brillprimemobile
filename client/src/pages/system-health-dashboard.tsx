
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Progress } from '../components/ui/progress';
import { 
  Activity, 
  Server, 
  Database, 
  Users, 
  TrendingUp, 
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  Cpu,
  MemoryStick,
  HardDrive
} from 'lucide-react';
import { useToast } from '../hooks/use-toast';

const COLORS = {
  PRIMARY: '#4682b4',
  SECONDARY: '#131313',
  SUCCESS: '#10b981',
  WARNING: '#f59e0b',
  ERROR: '#ef4444',
  INFO: '#3b82f6'
};

interface SystemMetrics {
  system: {
    cpuUsage: number;
    memoryUsage: number;
    uptime: number;
    loadAverage: number[];
    nodeVersion: string;
  };
  database: {
    connectionCount: number;
    queryResponseTime: number;
    activeTransactions: number;
  };
  business: {
    activeUsers: number;
    onlineDrivers: number;
    pendingOrders: number;
    todayRevenue: number;
    transactionVolume: number;
  };
  performance: {
    responseTime: number;
    errorRate: number;
    throughput: number;
  };
}

interface SystemAlert {
  id: string;
  type: string;
  severity: 'critical' | 'warning' | 'info';
  message: string;
  threshold: number;
  currentValue: number;
  timestamp: string;
}

interface ServiceHealth {
  name: string;
  status: 'healthy' | 'degraded' | 'critical';
  responseTime: number;
  uptime: number;
  lastCheck: string;
}

export default function SystemHealthDashboard() {
  const { toast } = useToast();
  const [metrics, setMetrics] = useState<SystemMetrics | null>(null);
  const [alerts, setAlerts] = useState<SystemAlert[]>([]);
  const [services, setServices] = useState<ServiceHealth[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<string>('');

  useEffect(() => {
    fetchSystemHealth();
    
    // Update every 30 seconds
    const interval = setInterval(fetchSystemHealth, 30000);
    
    return () => clearInterval(interval);
  }, []);

  const fetchSystemHealth = async () => {
    try {
      setLoading(true);
      
      // Fetch all health data
      const [metricsRes, alertsRes, servicesRes] = await Promise.all([
        fetch('/api/system-health/metrics', { credentials: 'include' }),
        fetch('/api/system-health/alerts', { credentials: 'include' }),
        fetch('/api/system-health/services', { credentials: 'include' })
      ]);

      if (metricsRes.ok) {
        const metricsData = await metricsRes.json();
        setMetrics(metricsData.metrics);
        setLastUpdated(new Date().toLocaleTimeString());
      }

      if (alertsRes.ok) {
        const alertsData = await alertsRes.json();
        setAlerts(alertsData.alerts);
        
        // Show critical alerts as toast notifications
        alertsData.alerts.filter((alert: SystemAlert) => alert.severity === 'critical')
          .forEach((alert: SystemAlert) => {
            toast({
              title: "Critical System Alert",
              description: alert.message,
              variant: "destructive"
            });
          });
      }

      if (servicesRes.ok) {
        const servicesData = await servicesRes.json();
        setServices(servicesData.services);
      }

    } catch (error) {
      console.error('Failed to fetch system health:', error);
      toast({
        title: "Connection Error",
        description: "Failed to fetch system health data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const formatUptime = (seconds: number): string => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    
    if (days > 0) return `${days}d ${hours}h ${mins}m`;
    if (hours > 0) return `${hours}h ${mins}m`;
    return `${mins}m`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return COLORS.SUCCESS;
      case 'degraded': return COLORS.WARNING;
      case 'critical': return COLORS.ERROR;
      default: return COLORS.INFO;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return COLORS.ERROR;
      case 'warning': return COLORS.WARNING;
      case 'info': return COLORS.INFO;
      default: return COLORS.INFO;
    }
  };

  if (loading && !metrics) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white p-4 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold" style={{ color: COLORS.SECONDARY }}>
              System Health Dashboard
            </h1>
            <p className="text-gray-600 mt-2">
              Real-time monitoring of system performance and business metrics
            </p>
            {lastUpdated && (
              <p className="text-sm text-gray-500 mt-1">
                Last updated: {lastUpdated}
              </p>
            )}
          </div>
          
          <div className="flex items-center space-x-4">
            <Badge
              className="px-4 py-2"
              style={{
                backgroundColor: alerts.filter(a => a.severity === 'critical').length > 0 
                  ? COLORS.ERROR : COLORS.SUCCESS,
                color: 'white'
              }}
            >
              {alerts.filter(a => a.severity === 'critical').length > 0 
                ? 'System Issues' : 'All Systems Normal'}
            </Badge>
          </div>
        </div>

        {/* System Overview Cards */}
        {metrics && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {/* CPU Usage */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center text-sm font-medium text-gray-600">
                  <Cpu className="h-4 w-4 mr-2" />
                  CPU Usage
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold mb-2">{metrics.system.cpuUsage}%</div>
                <Progress 
                  value={metrics.system.cpuUsage} 
                  className="h-2"
                  style={{ 
                    backgroundColor: metrics.system.cpuUsage > 80 ? COLORS.ERROR : 
                                   metrics.system.cpuUsage > 60 ? COLORS.WARNING : COLORS.SUCCESS 
                  }}
                />
              </CardContent>
            </Card>

            {/* Memory Usage */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center text-sm font-medium text-gray-600">
                  <MemoryStick className="h-4 w-4 mr-2" />
                  Memory Usage
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold mb-2">{metrics.system.memoryUsage}%</div>
                <Progress 
                  value={metrics.system.memoryUsage} 
                  className="h-2"
                  style={{ 
                    backgroundColor: metrics.system.memoryUsage > 85 ? COLORS.ERROR : 
                                   metrics.system.memoryUsage > 70 ? COLORS.WARNING : COLORS.SUCCESS 
                  }}
                />
              </CardContent>
            </Card>

            {/* Active Users */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center text-sm font-medium text-gray-600">
                  <Users className="h-4 w-4 mr-2" />
                  Active Users
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold mb-2">{metrics.business.activeUsers}</div>
                <p className="text-sm text-gray-500">Last 30 minutes</p>
              </CardContent>
            </Card>

            {/* Today's Revenue */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center text-sm font-medium text-gray-600">
                  <TrendingUp className="h-4 w-4 mr-2" />
                  Today's Revenue
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold mb-2">
                  ₦{metrics.business.todayRevenue.toLocaleString()}
                </div>
                <p className="text-sm text-gray-500">
                  {metrics.business.transactionVolume} transactions
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Alerts Section */}
        {alerts.length > 0 && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center" style={{ color: COLORS.SECONDARY }}>
                <AlertTriangle className="h-6 w-6 mr-3" />
                System Alerts ({alerts.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {alerts.map((alert) => (
                  <div key={alert.id} className="flex items-start p-4 border rounded-lg">
                    <div 
                      className="flex-shrink-0 w-3 h-3 rounded-full mt-1 mr-4"
                      style={{ backgroundColor: getSeverityColor(alert.severity) }}
                    />
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <h4 className="font-semibold capitalize">{alert.type} Alert</h4>
                        <Badge
                          style={{
                            backgroundColor: `${getSeverityColor(alert.severity)}20`,
                            color: getSeverityColor(alert.severity)
                          }}
                        >
                          {alert.severity.toUpperCase()}
                        </Badge>
                      </div>
                      <p className="text-gray-600 mt-1">{alert.message}</p>
                      <p className="text-sm text-gray-500 mt-1">
                        {new Date(alert.timestamp).toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Services Health */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center" style={{ color: COLORS.SECONDARY }}>
                <Server className="h-6 w-6 mr-3" />
                Service Health
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {services.map((service) => (
                  <div key={service.name} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center">
                      {service.status === 'healthy' ? (
                        <CheckCircle className="h-5 w-5 text-green-500 mr-3" />
                      ) : service.status === 'degraded' ? (
                        <AlertTriangle className="h-5 w-5 text-yellow-500 mr-3" />
                      ) : (
                        <XCircle className="h-5 w-5 text-red-500 mr-3" />
                      )}
                      <div>
                        <h4 className="font-medium">{service.name}</h4>
                        <p className="text-sm text-gray-500">
                          {service.responseTime}ms • {service.uptime}% uptime
                        </p>
                      </div>
                    </div>
                    <Badge
                      style={{
                        backgroundColor: `${getStatusColor(service.status)}20`,
                        color: getStatusColor(service.status)
                      }}
                    >
                      {service.status.toUpperCase()}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* System Information */}
          {metrics && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center" style={{ color: COLORS.SECONDARY }}>
                  <Database className="h-6 w-6 mr-3" />
                  System Information
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <span className="text-gray-600">System Uptime:</span>
                    <span className="font-medium">{formatUptime(metrics.system.uptime)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Node.js Version:</span>
                    <span className="font-medium">{metrics.system.nodeVersion}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Load Average:</span>
                    <span className="font-medium">
                      {metrics.system.loadAverage.map(avg => avg.toFixed(2)).join(', ')}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">DB Response Time:</span>
                    <span className="font-medium">{metrics.database.queryResponseTime}ms</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Online Drivers:</span>
                    <span className="font-medium">{metrics.business.onlineDrivers}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Pending Orders:</span>
                    <span className="font-medium">{metrics.business.pendingOrders}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
