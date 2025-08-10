
import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  TrendingUp, 
  DollarSign, 
  Users, 
  ShoppingCart, 
  Star, 
  ArrowUp, 
  ArrowDown,
  Calendar,
  Download,
  Filter,
  BarChart3,
  PieChart,
  Activity
} from 'lucide-react';

interface AnalyticsData {
  revenue: {
    total: number;
    thisMonth: number;
    lastMonth: number;
    growth: number;
  };
  orders: {
    total: number;
    thisMonth: number;
    pending: number;
    completed: number;
    cancelled: number;
  };
  customers: {
    total: number;
    new: number;
    returning: number;
    retention: number;
  };
  products: {
    bestselling: Array<{
      id: string;
      name: string;
      sales: number;
      revenue: number;
    }>;
    lowStock: Array<{
      id: string;
      name: string;
      stock: number;
    }>;
  };
  ratings: {
    average: number;
    total: number;
    distribution: Record<number, number>;
  };
}

const MerchantAnalytics = () => {
  const [timeRange, setTimeRange] = useState('30d');
  const [activeTab, setActiveTab] = useState('overview');

  const { data: analytics, isLoading } = useQuery({
    queryKey: ['merchant-analytics', timeRange],
    queryFn: async (): Promise<AnalyticsData> => {
      const response = await fetch(`/api/merchant/analytics?range=${timeRange}`, {
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to fetch analytics');
      return response.json();
    }
  });

  const formatCurrency = (amount: number) => 
    new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' }).format(amount);

  const formatPercentage = (value: number) => `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Analytics Dashboard</h1>
          <p className="text-gray-600">Track your business performance and insights</p>
        </div>
        <div className="flex space-x-4">
          <div className="flex items-center space-x-2">
            <Calendar className="h-4 w-4" />
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-2 text-sm"
            >
              <option value="7d">Last 7 days</option>
              <option value="30d">Last 30 days</option>
              <option value="90d">Last 90 days</option>
              <option value="1y">Last year</option>
            </select>
          </div>
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="revenue">Revenue</TabsTrigger>
          <TabsTrigger value="customers">Customers</TabsTrigger>
          <TabsTrigger value="products">Products</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(analytics?.revenue.total || 0)}</div>
                <div className="flex items-center text-xs text-muted-foreground">
                  {analytics?.revenue.growth >= 0 ? (
                    <ArrowUp className="h-3 w-3 text-green-500 mr-1" />
                  ) : (
                    <ArrowDown className="h-3 w-3 text-red-500 mr-1" />
                  )}
                  <span className={analytics?.revenue.growth >= 0 ? 'text-green-600' : 'text-red-600'}>
                    {formatPercentage(analytics?.revenue.growth || 0)}
                  </span>
                  <span className="ml-1">from last month</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
                <ShoppingCart className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{analytics?.orders.total.toLocaleString() || 0}</div>
                <div className="text-xs text-muted-foreground">
                  {analytics?.orders.thisMonth || 0} this month
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Customers</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{analytics?.customers.total.toLocaleString() || 0}</div>
                <div className="text-xs text-muted-foreground">
                  {analytics?.customers.new || 0} new this month
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Average Rating</CardTitle>
                <Star className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold flex items-center">
                  {analytics?.ratings.average.toFixed(1) || 0}
                  <Star className="h-4 w-4 text-yellow-400 ml-1" />
                </div>
                <div className="text-xs text-muted-foreground">
                  {analytics?.ratings.total || 0} reviews
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <BarChart3 className="h-5 w-5 mr-2" />
                  Revenue Trend
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64 flex items-center justify-center text-gray-500">
                  Revenue chart visualization would go here
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <PieChart className="h-5 w-5 mr-2" />
                  Order Status Distribution
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Completed</span>
                    <div className="flex items-center space-x-2">
                      <div className="w-20 bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-green-500 h-2 rounded-full" 
                          style={{ 
                            width: `${((analytics?.orders.completed || 0) / (analytics?.orders.total || 1)) * 100}%` 
                          }}
                        ></div>
                      </div>
                      <span className="text-sm font-medium">{analytics?.orders.completed || 0}</span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Pending</span>
                    <div className="flex items-center space-x-2">
                      <div className="w-20 bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-yellow-500 h-2 rounded-full" 
                          style={{ 
                            width: `${((analytics?.orders.pending || 0) / (analytics?.orders.total || 1)) * 100}%` 
                          }}
                        ></div>
                      </div>
                      <span className="text-sm font-medium">{analytics?.orders.pending || 0}</span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Cancelled</span>
                    <div className="flex items-center space-x-2">
                      <div className="w-20 bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-red-500 h-2 rounded-full" 
                          style={{ 
                            width: `${((analytics?.orders.cancelled || 0) / (analytics?.orders.total || 1)) * 100}%` 
                          }}
                        ></div>
                      </div>
                      <span className="text-sm font-medium">{analytics?.orders.cancelled || 0}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Best Selling Products */}
          <Card>
            <CardHeader>
              <CardTitle>Best Selling Products</CardTitle>
              <CardDescription>Your top performing products this period</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {analytics?.products.bestselling?.map((product, index) => (
                  <div key={product.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center space-x-4">
                      <Badge variant="outline" className="w-8 h-8 rounded-full flex items-center justify-center">
                        {index + 1}
                      </Badge>
                      <div>
                        <h4 className="font-medium">{product.name}</h4>
                        <p className="text-sm text-gray-500">{product.sales} units sold</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">{formatCurrency(product.revenue)}</p>
                      <p className="text-sm text-gray-500">Revenue</p>
                    </div>
                  </div>
                )) || (
                  <p className="text-center text-gray-500 py-8">No sales data available</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="revenue">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Activity className="h-5 w-5 mr-2" />
                Revenue Analytics
              </CardTitle>
              <CardDescription>Detailed revenue breakdown and trends</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-96 flex items-center justify-center text-gray-500">
                Detailed revenue analytics charts and data would be implemented here
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="customers">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Users className="h-5 w-5 mr-2" />
                Customer Analytics
              </CardTitle>
              <CardDescription>Customer behavior and retention insights</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-96 flex items-center justify-center text-gray-500">
                Customer analytics and segmentation data would be implemented here
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="products">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <BarChart3 className="h-5 w-5 mr-2" />
                Product Performance
              </CardTitle>
              <CardDescription>Product sales and inventory insights</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-96 flex items-center justify-center text-gray-500">
                Product performance analytics would be implemented here
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default MerchantAnalytics;
