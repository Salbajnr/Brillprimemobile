import { useState } from "react";
import { useLocation } from "wouter";
import { useAnalytics, useBusinessId } from "@/lib/hooks";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  ArrowLeft, 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  ShoppingBag, 
  Users, 
  Eye,
  Calendar,
  BarChart3,
  PieChart,
  Activity
} from "lucide-react";
import type { Analytics } from "@/lib/types";

export default function MerchantAnalytics() {
  const [, setLocation] = useLocation();
  const [period, setPeriod] = useState('7d');
  const businessId = useBusinessId();
  const { data: analytics, isLoading } = useAnalytics(businessId, period);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatPercentage = (value: number) => {
    return `${value > 0 ? '+' : ''}${value.toFixed(1)}%`;
  };

  const getTrendIcon = (trend: number) => {
    return trend > 0 ? (
      <TrendingUp className="w-4 h-4 text-green-500" />
    ) : (
      <TrendingDown className="w-4 h-4 text-red-500" />
    );
  };

  const getTrendColor = (trend: number) => {
    return trend > 0 ? 'text-green-600' : 'text-red-600';
  };

  const getPeriodLabel = (period: string) => {
    switch (period) {
      case '7d': return 'Last 7 days';
      case '30d': return 'Last 30 days';
      case '90d': return 'Last 90 days';
      case '1y': return 'Last year';
      default: return 'Last 7 days';
    }
  };

  if (isLoading) {
    return (
      <div className="relative w-full max-w-md mx-auto h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-500">Loading analytics...</p>
        </div>
      </div>
    );
  }

  const {
    revenue,
    orders,
    customers,
    views,
    topProducts,
    customerInsights,
    trends
  } = analytics || {};

  return (
    <div className="relative w-full max-w-md mx-auto h-screen bg-white overflow-hidden">
      {/* Header */}
      <div className="bg-white shadow-sm p-4 flex items-center justify-between">
        <div className="flex items-center">
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => setLocation('/merchant-dashboard')}
          >
            <ArrowLeft className="w-6 h-6" />
          </Button>
          <div className="ml-3">
            <h1 className="text-lg font-bold text-gray-900">Analytics</h1>
            <p className="text-xs text-gray-500">{getPeriodLabel(period)}</p>
          </div>
        </div>
        <Select value={period} onValueChange={setPeriod}>
          <SelectTrigger className="w-24">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7d">7d</SelectItem>
            <SelectItem value="30d">30d</SelectItem>
            <SelectItem value="90d">90d</SelectItem>
            <SelectItem value="1y">1y</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Main Content */}
      <div className="p-4 pb-20 overflow-y-auto" style={{ height: 'calc(100vh - 80px)' }}>
        {/* Revenue Overview */}
        <Card className="rounded-xl shadow-sm mb-6">
          <CardHeader className="pb-4">
            <CardTitle className="text-base font-bold text-gray-900 flex items-center">
              <DollarSign className="w-5 h-5 mr-2 text-green-500" />
              Revenue Overview
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-4">
              <div className="text-center">
                <p className="text-3xl font-bold text-gray-900">
                  {formatCurrency(revenue?.total || 0)}
                </p>
                <div className="flex items-center justify-center mt-2">
                  {getTrendIcon(trends?.revenue || 0)}
                  <span className={`text-sm ml-1 ${getTrendColor(trends?.revenue || 0)}`}>
                    {formatPercentage(trends?.revenue || 0)} vs previous period
                  </span>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-3 bg-green-50 rounded-lg">
                  <p className="text-lg font-bold text-green-600">
                    {formatCurrency(revenue?.average || 0)}
                  </p>
                  <p className="text-xs text-gray-600">Avg per day</p>
                </div>
                <div className="text-center p-3 bg-blue-50 rounded-lg">
                  <p className="text-lg font-bold text-blue-600">
                    {formatCurrency(revenue?.highest || 0)}
                  </p>
                  <p className="text-xs text-gray-600">Best day</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Key Metrics */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <Card className="rounded-xl shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Orders</p>
                  <p className="text-xl font-bold text-gray-900">{orders?.total || 0}</p>
                  <div className="flex items-center mt-1">
                    {getTrendIcon(trends?.orders || 0)}
                    <span className={`text-xs ml-1 ${getTrendColor(trends?.orders || 0)}`}>
                      {formatPercentage(trends?.orders || 0)}
                    </span>
                  </div>
                </div>
                <ShoppingBag className="w-8 h-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-xl shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Customers</p>
                  <p className="text-xl font-bold text-gray-900">{customers?.total || 0}</p>
                  <div className="flex items-center mt-1">
                    {getTrendIcon(trends?.customers || 0)}
                    <span className={`text-xs ml-1 ${getTrendColor(trends?.customers || 0)}`}>
                      {formatPercentage(trends?.customers || 0)}
                    </span>
                  </div>
                </div>
                <Users className="w-8 h-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-xl shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Views</p>
                  <p className="text-xl font-bold text-gray-900">{views?.total || 0}</p>
                  <div className="flex items-center mt-1">
                    {getTrendIcon(trends?.views || 0)}
                    <span className={`text-xs ml-1 ${getTrendColor(trends?.views || 0)}`}>
                      {formatPercentage(trends?.views || 0)}
                    </span>
                  </div>
                </div>
                <Eye className="w-8 h-8 text-yellow-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-xl shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Conversion</p>
                  <p className="text-xl font-bold text-gray-900">
                    {((orders?.total || 0) / (views?.total || 1) * 100).toFixed(1)}%
                  </p>
                  <div className="flex items-center mt-1">
                    {getTrendIcon(trends?.conversion || 0)}
                    <span className={`text-xs ml-1 ${getTrendColor(trends?.conversion || 0)}`}>
                      {formatPercentage(trends?.conversion || 0)}
                    </span>
                  </div>
                </div>
                <Activity className="w-8 h-8 text-orange-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Top Selling Products */}
        <Card className="rounded-xl shadow-sm mb-6">
          <CardHeader className="pb-4">
            <CardTitle className="text-base font-bold text-gray-900 flex items-center">
              <BarChart3 className="w-5 h-5 mr-2 text-blue-500" />
              Top Selling Products
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-3">
              {topProducts?.slice(0, 5).map((product, index) => (
                <div key={product.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                      <span className="text-sm font-bold text-blue-600">{index + 1}</span>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{product.name}</p>
                      <p className="text-xs text-gray-500">{product.sales} sold</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-gray-900">
                      {formatCurrency(product.revenue)}
                    </p>
                    <Badge variant="secondary" className="text-xs">
                      {product.percentage}%
                    </Badge>
                  </div>
                </div>
              )) || (
                <div className="text-center py-8">
                  <BarChart3 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-sm text-gray-500">No sales data available</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Customer Insights */}
        <Card className="rounded-xl shadow-sm">
          <CardHeader className="pb-4">
            <CardTitle className="text-base font-bold text-gray-900 flex items-center">
              <PieChart className="w-5 h-5 mr-2 text-purple-500" />
              Customer Insights
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-3 bg-purple-50 rounded-lg">
                  <p className="text-lg font-bold text-purple-600">
                    {customers?.new || 0}
                  </p>
                  <p className="text-xs text-gray-600">New customers</p>
                </div>
                <div className="text-center p-3 bg-green-50 rounded-lg">
                  <p className="text-lg font-bold text-green-600">
                    {customers?.returning || 0}
                  </p>
                  <p className="text-xs text-gray-600">Returning</p>
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Avg. order value</span>
                  <span className="text-sm font-medium">
                    {formatCurrency(customerInsights?.averageOrderValue || 0)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Orders per customer</span>
                  <span className="text-sm font-medium">
                    {(customerInsights?.ordersPerCustomer || 0).toFixed(1)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Customer lifetime value</span>
                  <span className="text-sm font-medium">
                    {formatCurrency(customerInsights?.lifetimeValue || 0)}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}