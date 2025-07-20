import { useState, useEffect } from "react";
import { 
  Bell, Plus, TrendingUp, Package, ShoppingCart, Users, 
  Eye, MessageCircle, Star, ArrowUp, ArrowDown, BarChart3,
  Calendar, Clock, MapPin, Truck
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";

export default function MerchantDashboard() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const getInitials = (name: string) => {
    return name.split(" ").map(n => n[0]).join("").toUpperCase();
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  };

  // Mock data for merchant dashboard
  const todayStats = {
    sales: 125400,
    orders: 23,
    views: 1240,
    messages: 8
  };

  const recentOrders = [
    {
      id: "ORD-001",
      customer: "Sarah Johnson",
      product: "Premium Face Cream",
      amount: 15200,
      status: "pending",
      time: "2 min ago"
    },
    {
      id: "ORD-002", 
      customer: "Mike Chen",
      product: "Wireless Headphones",
      amount: 35000,
      status: "confirmed",
      time: "15 min ago"
    },
    {
      id: "ORD-003",
      customer: "Adama Kanu",
      product: "Organic Skincare Set",
      amount: 28500,
      status: "processing",
      time: "1 hour ago"
    }
  ];

  const deliveryRequests = [
    {
      id: "DEL-001",
      customer: "Sarah Johnson",
      address: "Victoria Island, Lagos",
      distance: "2.5 km",
      fee: 1500,
      status: "pending"
    },
    {
      id: "DEL-002",
      customer: "Mike Chen", 
      address: "Ikeja GRA, Lagos",
      distance: "8.1 km",
      fee: 2500,
      status: "assigned"
    }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending": return "text-yellow-600 bg-yellow-100";
      case "confirmed": return "text-green-600 bg-green-100";
      case "processing": return "text-blue-600 bg-blue-100";
      case "assigned": return "text-purple-600 bg-purple-100";
      default: return "text-gray-600 bg-gray-100";
    }
  };

  return (
    <div className="w-full max-w-md mx-auto min-h-screen bg-white">
      {/* Header */}
      <div className="gradient-bg px-6 pt-12 pb-6 text-white">
        <div className="flex justify-between items-start mb-6">
          <div>
            <p className="text-blue-100 text-sm font-light">{getGreeting()}</p>
            <h2 className="text-xl font-bold">{user?.fullName || "Merchant"}</h2>
            <p className="text-blue-200 text-sm">ID: {user?.userId}</p>
          </div>
          <div className="flex items-center space-x-4">
            <Button 
              onClick={() => setLocation("/notifications")}
              className="w-10 h-10 bg-white bg-opacity-20 rounded-full flex items-center justify-center p-0 hover:bg-white hover:bg-opacity-30"
            >
              <Bell className="text-white h-5 w-5" />
              <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full"></span>
            </Button>
            <Button 
              onClick={() => setLocation("/profile")}
              className="w-12 h-12 bg-white bg-opacity-20 rounded-full flex items-center justify-center p-0 hover:bg-white hover:bg-opacity-30"
            >
              <span className="text-white font-bold text-lg">
                {user ? getInitials(user.fullName) : "M"}
              </span>
            </Button>
          </div>
        </div>

        {/* Business Status Card */}
        <div className="bg-white bg-opacity-15 rounded-3xl p-6 backdrop-blur-sm">
          <div className="flex justify-between items-center mb-4">
            <div>
              <p className="text-blue-100 text-sm font-light">Today's Sales</p>
              <h3 className="text-3xl font-bold">₦{todayStats.sales.toLocaleString()}</h3>
            </div>
            <div className="text-right">
              <p className="text-green-200 text-sm flex items-center">
                <TrendingUp className="h-4 w-4 mr-1" />
                +18.5%
              </p>
              <p className="text-blue-100 text-xs">vs yesterday</p>
            </div>
          </div>
          
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <p className="text-2xl font-bold">{todayStats.orders}</p>
              <p className="text-blue-200 text-xs">Orders</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold">{todayStats.views}</p>
              <p className="text-blue-200 text-xs">Views</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold">{todayStats.messages}</p>
              <p className="text-blue-200 text-xs">Messages</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="px-6 py-6">
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-4 mb-6">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="orders">Orders</TabsTrigger>
            <TabsTrigger value="products">Products</TabsTrigger>
            <TabsTrigger value="delivery">Delivery</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            {/* Quick Actions */}
            <Card className="card-3d">
              <CardHeader>
                <CardTitle className="flex items-center text-lg">
                  <Plus className="h-5 w-5 mr-2 text-[var(--brill-primary)]" />
                  Quick Actions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <Button 
                    onClick={() => setLocation("/add-product")}
                    className="btn-3d h-16 flex flex-col items-center justify-center space-y-1"
                  >
                    <Package className="h-5 w-5" />
                    <span className="text-xs">Add Product</span>
                  </Button>
                  <Button 
                    onClick={() => setLocation("/vendor-feed")}
                    className="btn-3d h-16 flex flex-col items-center justify-center space-y-1"
                  >
                    <MessageCircle className="h-5 w-5" />
                    <span className="text-xs">Create Post</span>
                  </Button>
                  <Button 
                    onClick={() => setLocation("/merchant-analytics")}
                    className="btn-3d h-16 flex flex-col items-center justify-center space-y-1"
                  >
                    <BarChart3 className="h-5 w-5" />
                    <span className="text-xs">Analytics</span>
                  </Button>
                  <Button 
                    onClick={() => setLocation("/customer-chat")}
                    className="btn-3d h-16 flex flex-col items-center justify-center space-y-1"
                  >
                    <Users className="h-5 w-5" />
                    <span className="text-xs">Customers</span>
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Performance Metrics */}
            <Card className="card-3d">
              <CardHeader>
                <CardTitle className="text-lg">Today's Performance</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-4 bg-green-50 rounded-xl">
                    <ArrowUp className="h-6 w-6 text-green-600 mx-auto mb-2" />
                    <p className="text-2xl font-bold text-green-600">{todayStats.orders}</p>
                    <p className="text-sm text-green-700">New Orders</p>
                  </div>
                  <div className="text-center p-4 bg-blue-50 rounded-xl">
                    <Eye className="h-6 w-6 text-blue-600 mx-auto mb-2" />
                    <p className="text-2xl font-bold text-blue-600">{todayStats.views}</p>
                    <p className="text-sm text-blue-700">Product Views</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Orders Tab */}
          <TabsContent value="orders" className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-bold">Recent Orders</h3>
              <Button variant="outline" size="sm">View All</Button>
            </div>
            
            {recentOrders.map((order) => (
              <Card key={order.id} className="card-3d">
                <CardContent className="p-4">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <p className="font-semibold text-sm">{order.customer}</p>
                      <p className="text-xs text-gray-600">{order.product}</p>
                      <p className="text-xs text-gray-500">{order.time}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-lg">₦{order.amount.toLocaleString()}</p>
                      <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(order.status)}`}>
                        {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                      </span>
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <Button size="sm" variant="outline" className="flex-1">
                      View Details
                    </Button>
                    <Button size="sm" className="flex-1">
                      Process Order
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          {/* Products Tab */}
          <TabsContent value="products" className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-bold">Product Management</h3>
              <Button onClick={() => setLocation("/add-product")}>
                <Plus className="h-4 w-4 mr-2" />
                Add Product
              </Button>
            </div>

            <Card className="card-3d">
              <CardContent className="p-4">
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="text-center p-3 bg-blue-50 rounded-xl">
                    <Package className="h-6 w-6 text-blue-600 mx-auto mb-2" />
                    <p className="text-xl font-bold text-blue-600">24</p>
                    <p className="text-sm text-blue-700">Active Products</p>
                  </div>
                  <div className="text-center p-3 bg-yellow-50 rounded-xl">
                    <Star className="h-6 w-6 text-yellow-600 mx-auto mb-2" />
                    <p className="text-xl font-bold text-yellow-600">4.8</p>
                    <p className="text-sm text-yellow-700">Avg Rating</p>
                  </div>
                </div>
                <Button variant="outline" className="w-full">
                  Manage Products
                </Button>
              </CardContent>
            </Card>

            <Button 
              onClick={() => setLocation("/commodities")}
              variant="outline" 
              className="w-full"
            >
              View Marketplace
            </Button>
          </TabsContent>

          {/* Delivery Tab */}
          <TabsContent value="delivery" className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-bold">Delivery Requests</h3>
              <Button variant="outline" size="sm">
                <MapPin className="h-4 w-4 mr-2" />
                Track All
              </Button>
            </div>

            {deliveryRequests.map((delivery) => (
              <Card key={delivery.id} className="card-3d">
                <CardContent className="p-4">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <p className="font-semibold text-sm">{delivery.customer}</p>
                      <p className="text-xs text-gray-600 flex items-center">
                        <MapPin className="h-3 w-3 mr-1" />
                        {delivery.address}
                      </p>
                      <p className="text-xs text-gray-500">{delivery.distance}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold">₦{delivery.fee.toLocaleString()}</p>
                      <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(delivery.status)}`}>
                        {delivery.status.charAt(0).toUpperCase() + delivery.status.slice(1)}
                      </span>
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <Button size="sm" variant="outline" className="flex-1">
                      <Clock className="h-3 w-3 mr-1" />
                      Schedule
                    </Button>
                    <Button size="sm" className="flex-1">
                      <Truck className="h-3 w-3 mr-1" />
                      Assign Driver
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}

            <Card className="card-3d">
              <CardContent className="p-4 text-center">
                <Truck className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-600 mb-4">Need delivery for your products?</p>
                <Button className="w-full">
                  Request Driver Network
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}