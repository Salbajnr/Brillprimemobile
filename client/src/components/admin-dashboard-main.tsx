import { useState, useEffect } from 'react';
import { 
  Users, 
  DollarSign, 
  TrendingUp, 
  AlertTriangle,
  Activity,
  UserCheck,
  Shield,
  BarChart3,
  ArrowUp,
  ArrowDown
} from 'lucide-react';

interface DashboardStats {
  totalUsers: number;
  activeUsers: number;
  totalTransactions: number;
  totalRevenue: number;
  pendingKyc: number;
  fraudAlerts: number;
  systemUptime: number;
  responseTime: number;
}

export function AdminDashboardMain() {
  const [stats, setStats] = useState<DashboardStats>({
    totalUsers: 0,
    activeUsers: 0,
    totalTransactions: 0,
    totalRevenue: 0,
    pendingKyc: 0,
    fraudAlerts: 0,
    systemUptime: 99.9,
    responseTime: 245
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  const fetchDashboardStats = async () => {
    try {
      setLoading(true);
      // Simulate API call
      setTimeout(() => {
        setStats({
          totalUsers: 15847,
          activeUsers: 3421,
          totalTransactions: 89234,
          totalRevenue: 2450000,
          pendingKyc: 127,
          fraudAlerts: 8,
          systemUptime: 99.9,
          responseTime: 245
        });
        setLoading(false);
      }, 1000);
    } catch (error) {
      console.error('Failed to fetch dashboard stats:', error);
      setLoading(false);
    }
  };

  const statCards = [
    {
      title: 'Total Users',
      value: stats.totalUsers.toLocaleString(),
      icon: Users,
      trend: '+12%',
      trendUp: true,
      color: 'bg-blue-500'
    },
    {
      title: 'Active Users',
      value: stats.activeUsers.toLocaleString(),
      icon: Activity,
      trend: '+8%',
      trendUp: true,
      color: 'bg-green-500'
    },
    {
      title: 'Total Transactions',
      value: stats.totalTransactions.toLocaleString(),
      icon: DollarSign,
      trend: '+15%',
      trendUp: true,
      color: 'bg-purple-500'
    },
    {
      title: 'Total Revenue',
      value: `₦${(stats.totalRevenue / 1000000).toFixed(1)}M`,
      icon: TrendingUp,
      trend: '+22%',
      trendUp: true,
      color: 'bg-yellow-500'
    },
    {
      title: 'Pending KYC',
      value: stats.pendingKyc.toString(),
      icon: UserCheck,
      trend: '-5%',
      trendUp: false,
      color: 'bg-orange-500'
    },
    {
      title: 'Fraud Alerts',
      value: stats.fraudAlerts.toString(),
      icon: Shield,
      trend: '-12%',
      trendUp: false,
      color: 'bg-red-500'
    }
  ];

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-white p-6 rounded-lg shadow">
                <div className="h-4 bg-gray-200 rounded w-1/2 mb-4"></div>
                <div className="h-8 bg-gray-200 rounded w-3/4"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
        <p className="text-gray-600">Overview of platform metrics and system health</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {statCards.map((card, index) => {
          const Icon = card.icon;
          return (
            <div key={index} className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">{card.title}</p>
                  <p className="text-2xl font-bold text-gray-900" data-testid={`stat-${card.title.toLowerCase().replace(/\s+/g, '-')}`}>
                    {card.value}
                  </p>
                  <div className="flex items-center mt-2">
                    {card.trendUp ? (
                      <ArrowUp className="w-4 h-4 text-green-500" />
                    ) : (
                      <ArrowDown className="w-4 h-4 text-red-500" />
                    )}
                    <span className={`text-sm ml-1 ${card.trendUp ? 'text-green-500' : 'text-red-500'}`}>
                      {card.trend}
                    </span>
                    <span className="text-sm text-gray-500 ml-1">vs last month</span>
                  </div>
                </div>
                <div className={`p-3 rounded-full ${card.color}`}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* System Health */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">System Health</h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">System Uptime</span>
              <span className="font-semibold text-green-600" data-testid="stat-uptime">
                {stats.systemUptime}%
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Average Response Time</span>
              <span className="font-semibold text-blue-600" data-testid="stat-response-time">
                {stats.responseTime}ms
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Server Status</span>
              <span className="px-2 py-1 bg-green-100 text-green-800 text-sm rounded-full">
                Healthy
              </span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
          <div className="space-y-2">
            <button className="w-full text-left p-3 hover:bg-gray-50 rounded-lg transition-colors" data-testid="button-review-kyc">
              <div className="flex items-center">
                <UserCheck className="w-5 h-5 text-orange-500 mr-3" />
                <span>Review Pending KYC ({stats.pendingKyc})</span>
              </div>
            </button>
            <button className="w-full text-left p-3 hover:bg-gray-50 rounded-lg transition-colors" data-testid="button-fraud-alerts">
              <div className="flex items-center">
                <AlertTriangle className="w-5 h-5 text-red-500 mr-3" />
                <span>View Fraud Alerts ({stats.fraudAlerts})</span>
              </div>
            </button>
            <button className="w-full text-left p-3 hover:bg-gray-50 rounded-lg transition-colors" data-testid="button-system-reports">
              <div className="flex items-center">
                <BarChart3 className="w-5 h-5 text-blue-500 mr-3" />
                <span>Generate System Reports</span>
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}