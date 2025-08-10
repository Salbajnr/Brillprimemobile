import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/use-auth-simple";
import { useWebSocket, useNotifications } from "@/hooks/use-websocket";
import { apiClient, DashboardData } from "@/lib/api";
import { 
  User, 
  ShoppingBag, 
  CreditCard, 
  Settings, 
  Bell, 
  TrendingUp,
  Package,
  Clock,
  CheckCircle,
  AlertCircle
} from "lucide-react";

export default function DashboardPage() {
  const [, setLocation] = useLocation();
  const { user, logout, loading: authLoading } = useAuth();
  const { connected } = useWebSocket();
  const { notifications } = useNotifications();
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setLocation('/signin');
      return;
    }

    const loadDashboardData = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await apiClient.getDashboardData();

        if (response.success && response.data) {
          setDashboardData(response.data);
        } else {
          setError(response.error || 'Failed to load dashboard data');
        }
      } catch (err) {
        setError('Failed to load dashboard data');
        console.error('Dashboard error:', err);
      } finally {
        setLoading(false);
      }
    };

    loadDashboardData();
  }, [user, setLocation]);

  const handleRoleBasedRedirect = () => {
    if (!user) return;
    if (user.role === 'CONSUMER') {
      setLocation("/consumer-home");
    } else if (user.role === 'MERCHANT') {
      setLocation("/merchant-dashboard");
    } else if (user.role === 'DRIVER') {
      setLocation("/driver-dashboard");
    }
  };

  const handleQuickAction = (action: string) => {
    switch(action) {
      case 'Fund Wallet':
        setLocation('/wallet-fund');
        break;
      case 'View Transactions':
        setLocation('/wallet/transactions');
        break;
      case 'Send Money':
        setLocation('/transfer');
        break;
      case 'Pay Bills':
        setLocation('/bills');
        break;
      case 'View Orders':
        setLocation('/merchant/orders');
        break;
      case 'Start Trip':
        setLocation('/driver/trip-start');
        break;
      default:
        console.log('Quick action:', action);
    }
  };

  const renderRecentActivity = () => {
    if (!dashboardData?.recentActivity || dashboardData.recentActivity.length === 0) {
      return <p className="text-gray-500">No recent activity.</p>;
    }

    return dashboardData.recentActivity.map((activity) => (
      <div key={activity.id} className="flex items-center justify-between mb-3 last:mb-0">
        <div className="flex items-center">
          {activity.type === 'order' && <Package className="h-5 w-5 text-blue-500 mr-2" />}
          {activity.type === 'payment' && <CreditCard className="h-5 w-5 text-green-500 mr-2" />}
          {activity.type === 'delivery' && <Clock className="h-5 w-5 text-yellow-500 mr-2" />}
          
          <div>
            <p className="text-sm font-medium text-gray-900">{activity.description}</p>
            <p className="text-xs text-gray-500">{activity.time}</p>
          </div>
        </div>
        {activity.type === 'order' && <Badge variant="outline">New</Badge>}
        {activity.type === 'payment' && <Badge variant="secondary">Completed</Badge>}
        {activity.type === 'delivery' && <Badge variant="outline">Pending</Badge>}
      </div>
    ));
  };

  return (
    <div className="w-full min-h-screen bg-gray-50 p-6">
      <Card className="w-full max-w-xl mx-auto shadow-lg">
        <CardHeader className="flex flex-row items-center justify-between bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-t-lg p-6">
          <div className="flex items-center">
            <User className="h-8 w-8 mr-4" />
            <div>
              <CardTitle className="text-2xl font-bold">
                {user?.name || 'Dashboard'}
              </CardTitle>
              <CardDescription className="text-blue-100">
                {user?.role || 'User'}
              </CardDescription>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <Badge variant="outline" className="text-white border-white">
              {connected ? 'Online' : 'Offline'}
            </Badge>
            <Button variant="ghost" className="text-white hover:text-blue-200 p-0" onClick={() => setLocation('/notifications')}>
              <Bell className="h-6 w-6" />
              {notifications.length > 0 && (
                <span className="ml-1 bg-red-500 text-white rounded-full px-2 py-0.5 text-xs">
                  {notifications.length}
                </span>
              )}
            </Button>
            <Button variant="ghost" className="text-white hover:text-red-300 p-0" onClick={logout}>
              <Settings className="h-6 w-6" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <div className="text-center mb-8">
            <p className="text-lg text-gray-700 mb-1">Welcome back, {user?.name || 'Valued User'}!</p>
            <p className="text-sm text-gray-500">Your financial hub.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <Card className="border-gray-200">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-base font-normal text-muted-foreground">Total Orders</CardTitle>
                <ShoppingBag className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {loading ? (
                  <p className="text-2xl font-bold">Loading...</p>
                ) : error ? (
                  <p className="text-2xl font-bold text-red-600">Error</p>
                ) : (
                  <p className="text-2xl font-bold">{dashboardData?.stats.totalOrders ?? 0}</p>
                )}
                <p className="text-xs text-muted-foreground">
                  {dashboardData?.stats.pendingOrders ?? 0} pending
                </p>
              </CardContent>
            </Card>

            <Card className="border-gray-200">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-base font-normal text-muted-foreground">
                  {user?.role === 'MERCHANT' ? 'Total Earnings' : user?.role === 'DRIVER' ? 'Total Earned' : 'Total Spent'}
                </CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {loading ? (
                  <p className="text-2xl font-bold">Loading...</p>
                ) : error ? (
                  <p className="text-2xl font-bold text-red-600">Error</p>
                ) : (
                  <p className="text-2xl font-bold">
                    ${dashboardData?.stats.totalEarnings?.toLocaleString() ?? (dashboardData?.stats.totalSpent?.toLocaleString() ?? 0)}
                  </p>
                )}
                <p className="text-xs text-muted-foreground">
                  {user?.role === 'MERCHANT' ? `${dashboardData?.stats.completedOrders ?? 0} completed` : ''}
                </p>
              </CardContent>
            </Card>

            <Card className="border-gray-200">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-base font-normal text-muted-foreground">Payment Status</CardTitle>
                <CreditCard className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {loading ? (
                  <p className="text-2xl font-bold">Loading...</p>
                ) : error ? (
                  <p className="text-2xl font-bold text-red-600">Error</p>
                ) : (
                  <p className={`text-2xl font-bold ${dashboardData?.stats.pendingOrders ?? 0 > 0 ? 'text-yellow-600' : 'text-green-600'}`}>
                    {dashboardData?.stats.pendingOrders ?? 0 > 0 ? 'Pending' : 'Cleared'}
                  </p>
                )}
                <p className="text-xs text-muted-foreground">
                  {dashboardData?.stats.pendingOrders ?? 0} pending
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="border rounded-lg p-4 bg-gray-50">
            <h3 className="text-lg font-semibold text-gray-800 mb-3">Recent Activity</h3>
            {loading ? (
              <div className="flex justify-center items-center h-20">
                <p className="text-gray-600">Loading activity...</p>
              </div>
            ) : error ? (
              <div className="flex flex-col justify-center items-center h-20">
                <AlertCircle className="h-6 w-6 text-red-500 mb-2" />
                <p className="text-red-600">Error loading activity.</p>
              </div>
            ) : (
              renderRecentActivity()
            )}
          </div>

          <div className="mt-8">
            <Button 
              className="w-full py-3 px-4 rounded-lg text-lg"
              onClick={handleRoleBasedRedirect}
              disabled={authLoading || loading}
            >
              Go to {user?.role || 'Main'} Dashboard
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}