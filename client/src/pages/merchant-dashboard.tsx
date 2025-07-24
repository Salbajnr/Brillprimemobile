import { useState } from "react";
import { useLocation } from "wouter";
import { useDashboardData, useBusinessId } from "@/lib/hooks";
import { useToast } from "@/hooks/use-toast";
import { NavDrawer } from "@/components/ui/nav-drawer";
import { BottomNav } from "@/components/ui/bottom-nav";
import { MetricCard } from "@/components/ui/metric-card";
import { OrderCard } from "@/components/ui/order-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { 
  Bell, 
  DollarSign, 
  Truck, 
  Users, 
  TrendingUp,
  Fuel,
  BarChart3,
  MessageCircleMore,
  MapPin,
  Route
} from "lucide-react";

export default function MerchantDashboard() {
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState('dashboard');
  const businessId = useBusinessId();
  const { data: dashboardData, isLoading } = useDashboardData(businessId);
  const { toast } = useToast();

  const handleNavigate = (path: string) => {
    if (path === 'business-profile' || path === 'inventory' || 
        path === 'payments' || path === 'promotions' || path === 'settings') {
      toast({
        title: "Coming Soon",
        description: `${path.replace('-', ' ')} feature is under development.`,
      });
      return;
    }
    setLocation(`/${path}`);
  };

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    if (tab !== 'dashboard' && tab !== 'more') {
      setLocation(`/${tab}`);
    }
  };

  const handleSwitchMode = () => {
    toast({
      title: "Mode Switch",
      description: "Consumer mode not implemented in this demo.",
    });
  };

  const handleSignOut = () => {
    toast({
      title: "Sign Out",
      description: "Sign out functionality would be implemented here.",
    });
  };

  if (isLoading) {
    return (
      <div className="relative w-full max-w-md mx-auto h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-500">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  const stats = dashboardData?.stats;
  const business = dashboardData?.business;
  const recentOrders = dashboardData?.recentOrders || [];
  const lowStockProducts = dashboardData?.lowStockProducts || [];

  return (
    <div className="relative w-full max-w-md mx-auto h-screen bg-white overflow-hidden">
      {/* Header */}
      <div className="bg-white shadow-sm p-4 flex items-center justify-between">
        <div className="flex items-center">
          <NavDrawer
            business={business}
            onNavigate={handleNavigate}
            onSwitchMode={handleSwitchMode}
            onSignOut={handleSignOut}
          />
          <div className="ml-3">
            <h1 className="text-lg font-bold text-gray-900">Merchant Hub</h1>
            <div className="flex items-center">
              <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
              <span className="text-xs text-gray-500">
                {business?.isOpen ? 'Online' : 'Offline'}
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <Button variant="ghost" size="icon" className="relative">
            <Bell className="w-6 h-6 text-gray-500" />
            <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full"></div>
          </Button>
          <Avatar className="w-10 h-10">
            <AvatarFallback className="bg-blue-100 text-blue-600 text-sm font-bold">
              M
            </AvatarFallback>
          </Avatar>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-4 pb-20 overflow-y-auto" style={{ height: 'calc(100vh - 80px)' }}>
        {/* Quick Stats Grid */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <MetricCard
            title="Today's Sales"
            value={`₦${stats?.todaysSales?.toLocaleString() || '0'}`}
            icon={DollarSign}
            iconColor="text-green-500"
            trend={{ value: '12.5%', isPositive: true }}
          />
          <MetricCard
            title="Active Deliveries"
            value={stats?.activeOrders || 0}
            subtitle="2 en route"
            icon={Truck}
            iconColor="text-blue-500"
          />
          <MetricCard
            title="Customers"
            value={stats?.totalCustomers || 0}
            subtitle="+8 new"
            icon={Users}
            iconColor="text-purple-500"
          />
          <MetricCard
            title="Fuel Stock"
            value={`${stats?.inventoryLevel || 0}%`}
            subtitle={`${lowStockProducts.length} low stock`}
            icon={Fuel}
            iconColor="text-yellow-500"
          />
        </div>

        {/* Recent Orders Section */}
        <Card className="rounded-xl shadow-sm mb-6">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-bold text-gray-900">Recent Orders</CardTitle>
              <Button 
                variant="ghost" 
                size="sm"
                className="text-sm font-medium text-blue-600"
                onClick={() => setLocation('/merchant-orders')}
              >
                View All
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-3">
              {recentOrders.slice(0, 3).map((order) => (
                <OrderCard 
                  key={order.id} 
                  order={order} 
                  showActions={false}
                />
              ))}
              {recentOrders.length === 0 && (
                <div className="text-center py-8">
                  <Truck className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-sm text-gray-500">No recent orders</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card className="rounded-xl shadow-sm mb-6">
          <CardHeader className="pb-4">
            <CardTitle className="text-base font-bold text-gray-900">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="grid grid-cols-2 gap-3">
              <Button
                variant="ghost"
                className="p-4 bg-blue-50 rounded-xl h-auto flex-col"
                onClick={() => setLocation('/merchant-orders')}
              >
                <Truck className="w-8 h-8 mb-2 text-blue-600" />
                <span className="text-sm font-medium text-blue-600">Manage Deliveries</span>
              </Button>

              <Button
                variant="ghost"
                className="p-4 bg-green-50 rounded-xl h-auto flex-col"
                onClick={() => setLocation('/merchant-products')}
              >
                <Fuel className="w-8 h-8 mb-2 text-green-600" />
                <span className="text-sm font-medium text-green-600">Fuel & Toll Services</span>
              </Button>

              <Button
                variant="ghost"
                className="p-4 bg-purple-50 rounded-xl h-auto flex-col"
                onClick={() => setLocation('/merchant-analytics')}
              >
                <BarChart3 className="w-8 h-8 mb-2 text-purple-600" />
                <span className="text-sm font-medium text-purple-600">View Analytics</span>
              </Button>

              <Button
                variant="ghost"
                className="p-4 bg-yellow-50 rounded-xl h-auto flex-col relative"
                onClick={() => handleNavigate('chat')}
              >
                <MessageCircleMore className="w-8 h-8 mb-2 text-yellow-600" />
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full"></div>
                <span className="text-sm font-medium text-yellow-600">Customer Chat</span>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Fuel Stock Alerts */}
        {lowStockProducts.length > 0 && (
          <Card className="rounded-xl shadow-sm mb-6">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-bold text-gray-900">Fuel Stock Alerts</CardTitle>
                <Badge variant="secondary" className="bg-red-100 text-red-800">
                  {lowStockProducts.length} items
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-2">
                {lowStockProducts.slice(0, 3).map((product) => (
                  <div 
                    key={product.id}
                    className="flex items-center justify-between p-2 bg-red-50 rounded-lg border-l-4 border-red-500"
                  >
                    <div className="flex items-center">
                      <Fuel className="w-4 h-4 mr-2 text-red-600" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">{product.name}</p>
                        <p className="text-xs text-red-600">Only {product.stock} liters left</p>
                      </div>
                    </div>
                    <Button 
                      size="sm"
                      className="text-xs px-3 py-1 bg-red-600 hover:bg-red-700 rounded-lg"
                      onClick={() => handleNavigate('restock')}
                    >
                      Refill
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Performance Chart Preview */}
        <Card className="rounded-xl shadow-sm">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-bold text-gray-900">Sales Performance</CardTitle>
              <select className="text-sm border border-gray-200 rounded-lg px-2 py-1 text-gray-500">
                <option>This Week</option>
                <option>This Month</option>
                <option>This Year</option>
              </select>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="h-32 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg flex items-center justify-center mb-4">
              <p className="text-sm text-gray-500">Chart visualization would go here</p>
            </div>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-lg font-bold text-gray-900">₦285,400</p>
                <p className="text-xs text-gray-500">Total Revenue</p>
              </div>
              <div>
                <p className="text-lg font-bold text-gray-900">147</p>
                <p className="text-xs text-gray-500">Orders</p>
              </div>
              <div>
                <p className="text-lg font-bold text-gray-900">₦1,940</p>
                <p className="text-xs text-gray-500">Avg Order</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bottom Navigation */}
      <BottomNav activeTab={activeTab} onTabChange={handleTabChange} />
    </div>
  );
}