
import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  TrendingUp, 
  DollarSign, 
  Clock, 
  Star, 
  MapPin, 
  Package,
  Award,
  Target,
  Calendar,
  Filter
} from 'lucide-react';

interface DriverPerformance {
  earnings: {
    today: number;
    thisWeek: number;
    thisMonth: number;
    total: number;
  };
  deliveries: {
    completed: number;
    cancelled: number;
    total: number;
    onTime: number;
  };
  ratings: {
    average: number;
    total: number;
    breakdown: Record<number, number>;
  };
  efficiency: {
    avgDeliveryTime: number;
    fuelEfficiency: number;
    distance: number;
  };
  achievements: Array<{
    id: string;
    title: string;
    description: string;
    dateEarned: string;
    type: 'earnings' | 'deliveries' | 'rating' | 'efficiency';
  }>;
}

const DriverPerformanceDashboard = () => {
  const [timeRange, setTimeRange] = useState('7d');
  const [activeTab, setActiveTab] = useState('overview');

  const { data: performance, isLoading } = useQuery({
    queryKey: ['driver-performance', timeRange],
    queryFn: async (): Promise<DriverPerformance> => {
      const response = await fetch(`/api/driver/performance?range=${timeRange}`, {
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to fetch performance data');
      return response.json();
    }
  });

  const formatCurrency = (amount: number) => 
    new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' }).format(amount);

  const getAchievementIcon = (type: string) => {
    switch (type) {
      case 'earnings': return <DollarSign className="h-4 w-4" />;
      case 'deliveries': return <Package className="h-4 w-4" />;
      case 'rating': return <Star className="h-4 w-4" />;
      case 'efficiency': return <Target className="h-4 w-4" />;
      default: return <Award className="h-4 w-4" />;
    }
  };

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
          <h1 className="text-3xl font-bold text-gray-900">Performance Dashboard</h1>
          <p className="text-gray-600">Track your delivery performance and earnings</p>
        </div>
        <div className="flex space-x-4">
          <div className="flex items-center space-x-2">
            <Calendar className="h-4 w-4" />
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-2 text-sm"
            >
              <option value="1d">Today</option>
              <option value="7d">Last 7 days</option>
              <option value="30d">Last 30 days</option>
              <option value="90d">Last 90 days</option>
            </select>
          </div>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="earnings">Earnings</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="achievements">Achievements</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Earnings</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(performance?.earnings.total || 0)}</div>
                <p className="text-xs text-muted-foreground">
                  This month: {formatCurrency(performance?.earnings.thisMonth || 0)}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Deliveries</CardTitle>
                <Package className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{performance?.deliveries.completed || 0}</div>
                <p className="text-xs text-muted-foreground">
                  {((performance?.deliveries.completed || 0) / (performance?.deliveries.total || 1) * 100).toFixed(1)}% success rate
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Average Rating</CardTitle>
                <Star className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold flex items-center">
                  {performance?.ratings.average.toFixed(1) || 0}
                  <Star className="h-4 w-4 text-yellow-400 ml-1" />
                </div>
                <p className="text-xs text-muted-foreground">
                  {performance?.ratings.total || 0} reviews
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">On-Time Delivery</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {((performance?.deliveries.onTime || 0) / (performance?.deliveries.completed || 1) * 100).toFixed(1)}%
                </div>
                <p className="text-xs text-muted-foreground">
                  {performance?.deliveries.onTime || 0} on-time deliveries
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <TrendingUp className="h-5 w-5 mr-2" />
                  Earnings Trend
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64 flex items-center justify-center text-gray-500">
                  Earnings trend chart would be displayed here
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <MapPin className="h-5 w-5 mr-2" />
                  Delivery Efficiency
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Average Delivery Time</span>
                    <span className="text-sm font-medium">{performance?.efficiency.avgDeliveryTime || 0} min</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Total Distance</span>
                    <span className="text-sm font-medium">{performance?.efficiency.distance || 0} km</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Fuel Efficiency</span>
                    <span className="text-sm font-medium">{performance?.efficiency.fuelEfficiency || 0} km/L</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Recent Achievements */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Achievements</CardTitle>
              <CardDescription>Your latest accomplishments and milestones</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {performance?.achievements?.slice(0, 3).map((achievement) => (
                  <div key={achievement.id} className="flex items-center space-x-4 p-4 border rounded-lg">
                    <div className="flex-shrink-0">
                      <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                        {getAchievementIcon(achievement.type)}
                      </div>
                    </div>
                    <div className="flex-1">
                      <h4 className="font-medium">{achievement.title}</h4>
                      <p className="text-sm text-gray-500">{achievement.description}</p>
                      <p className="text-xs text-gray-400">
                        Earned on {new Date(achievement.dateEarned).toLocaleDateString()}
                      </p>
                    </div>
                    <Badge variant="outline" className="capitalize">
                      {achievement.type}
                    </Badge>
                  </div>
                )) || (
                  <p className="text-center text-gray-500 py-8">No achievements yet</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="earnings">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <DollarSign className="h-5 w-5 mr-2" />
                Earnings Analytics
              </CardTitle>
              <CardDescription>Detailed breakdown of your earnings and payment history</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-96 flex items-center justify-center text-gray-500">
                Detailed earnings analytics charts and breakdown would be implemented here
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="performance">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Target className="h-5 w-5 mr-2" />
                Performance Metrics
              </CardTitle>
              <CardDescription>Detailed performance analytics and improvement suggestions</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-96 flex items-center justify-center text-gray-500">
                Performance metrics and improvement recommendations would be implemented here
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="achievements">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Award className="h-5 w-5 mr-2" />
                All Achievements
              </CardTitle>
              <CardDescription>Complete list of your achievements and progress</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {performance?.achievements?.map((achievement) => (
                  <div key={achievement.id} className="flex items-center space-x-4 p-4 border rounded-lg">
                    <div className="flex-shrink-0">
                      <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                        {getAchievementIcon(achievement.type)}
                      </div>
                    </div>
                    <div className="flex-1">
                      <h4 className="font-medium text-lg">{achievement.title}</h4>
                      <p className="text-sm text-gray-500">{achievement.description}</p>
                      <p className="text-xs text-gray-400 mt-1">
                        Earned on {new Date(achievement.dateEarned).toLocaleDateString()}
                      </p>
                    </div>
                    <Badge variant="outline" className="capitalize">
                      {achievement.type}
                    </Badge>
                  </div>
                )) || (
                  <p className="text-center text-gray-500 py-8">No achievements yet. Keep delivering to earn your first achievement!</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default DriverPerformanceDashboard;
