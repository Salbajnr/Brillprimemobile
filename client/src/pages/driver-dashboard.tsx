import { useState, useEffect } from "react";
import { 
  Bell, MapPin, Clock, Truck, DollarSign, Star, 
  Navigation, Package, Fuel, Phone, MessageCircle,
  TrendingUp, ArrowUp, Calendar, CheckCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";

export default function DriverDashboard() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [isOnline, setIsOnline] = useState(true);
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

  // Mock data for driver dashboard
  const todayStats = {
    earnings: 45200,
    deliveries: 12,
    distance: 185.5,
    rating: 4.9
  };

  const pendingDeliveries = [
    {
      id: "DEL-001",
      type: "FUEL",
      customer: "Sarah Johnson",
      pickup: "NNPC Station, VI",
      delivery: "Lekki Phase 1",
      distance: "8.5 km",
      amount: 3500,
      estimatedTime: "25 min",
      priority: "HIGH"
    },
    {
      id: "DEL-002", 
      type: "PACKAGE",
      customer: "Mike Chen",
      pickup: "Beauty Store, Ikeja",
      delivery: "Maryland Mall",
      distance: "12.2 km", 
      amount: 2800,
      estimatedTime: "35 min",
      priority: "MEDIUM"
    },
    {
      id: "DEL-003",
      type: "FOOD",
      customer: "Amara Okafor",
      pickup: "KFC Surulere",
      delivery: "Yaba Tech",
      distance: "6.1 km",
      amount: 1500,
      estimatedTime: "20 min",
      priority: "URGENT"
    }
  ];

  const recentDeliveries = [
    {
      id: "DEL-004",
      customer: "John Adebayo",
      type: "FUEL",
      amount: 4200,
      status: "completed",
      time: "2 hours ago",
      rating: 5
    },
    {
      id: "DEL-005",
      customer: "Grace Emeka", 
      type: "PACKAGE",
      amount: 3100,
      status: "completed",
      time: "4 hours ago",
      rating: 5
    }
  ];

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "URGENT": return "text-red-600 bg-red-100";
      case "HIGH": return "text-orange-600 bg-orange-100";
      case "MEDIUM": return "text-yellow-600 bg-yellow-100";
      default: return "text-gray-600 bg-gray-100";
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "FUEL": return <Fuel className="h-4 w-4" />;
      case "PACKAGE": return <Package className="h-4 w-4" />;
      case "FOOD": return <Truck className="h-4 w-4" />;
      default: return <Package className="h-4 w-4" />;
    }
  };

  return (
    <div className="w-full max-w-md mx-auto min-h-screen bg-white">
      {/* Header */}
      <div className="gradient-bg px-6 pt-12 pb-6 text-white">
        <div className="flex justify-between items-start mb-6">
          <div>
            <p className="text-blue-100 text-sm font-light">{getGreeting()}</p>
            <h2 className="text-xl font-bold">{user?.fullName || "Driver"}</h2>
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
                {user ? getInitials(user.fullName) : "D"}
              </span>
            </Button>
          </div>
        </div>

        {/* Status and Earnings Card */}
        <div className="bg-white bg-opacity-15 rounded-3xl p-6 backdrop-blur-sm">
          <div className="flex justify-between items-center mb-4">
            <div>
              <p className="text-blue-100 text-sm font-light">Today's Earnings</p>
              <h3 className="text-3xl font-bold">₦{todayStats.earnings.toLocaleString()}</h3>
            </div>
            <div className="text-right">
              <div className="flex items-center space-x-2 mb-2">
                <span className="text-sm">Online</span>
                <Switch 
                  checked={isOnline} 
                  onCheckedChange={setIsOnline}
                  className="data-[state=checked]:bg-green-500"
                />
              </div>
              <div className={`w-3 h-3 rounded-full ${isOnline ? 'bg-green-400' : 'bg-gray-400'} animate-pulse`}></div>
            </div>
          </div>
          
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <p className="text-2xl font-bold">{todayStats.deliveries}</p>
              <p className="text-blue-200 text-xs">Deliveries</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold">{todayStats.distance}</p>
              <p className="text-blue-200 text-xs">km driven</p>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center space-x-1">
                <p className="text-2xl font-bold">{todayStats.rating}</p>
                <Star className="h-4 w-4 text-yellow-400 fill-current" />
              </div>
              <p className="text-blue-200 text-xs">Rating</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="px-6 py-6">
        <Tabs defaultValue="deliveries" className="w-full">
          <TabsList className="grid w-full grid-cols-4 mb-6">
            <TabsTrigger value="deliveries">Jobs</TabsTrigger>
            <TabsTrigger value="navigation">Navigate</TabsTrigger>
            <TabsTrigger value="earnings">Earnings</TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
          </TabsList>

          {/* Deliveries Tab */}
          <TabsContent value="deliveries" className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-bold">Available Jobs</h3>
              <Button variant="outline" size="sm">
                <Navigation className="h-4 w-4 mr-2" />
                Filter
              </Button>
            </div>
            
            {pendingDeliveries.map((delivery) => (
              <Card key={delivery.id} className="card-3d">
                <CardContent className="p-4">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center space-x-2">
                      {getTypeIcon(delivery.type)}
                      <div>
                        <p className="font-semibold text-sm">{delivery.customer}</p>
                        <p className="text-xs text-gray-600">{delivery.type} Delivery</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-lg">₦{delivery.amount.toLocaleString()}</p>
                      <span className={`text-xs px-2 py-1 rounded-full ${getPriorityColor(delivery.priority)}`}>
                        {delivery.priority}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-2 mb-4">
                    <div className="flex items-center text-xs text-gray-600">
                      <MapPin className="h-3 w-3 mr-1 text-green-600" />
                      Pickup: {delivery.pickup}
                    </div>
                    <div className="flex items-center text-xs text-gray-600">
                      <MapPin className="h-3 w-3 mr-1 text-red-600" />
                      Delivery: {delivery.delivery}
                    </div>
                    <div className="flex justify-between items-center text-xs text-gray-600">
                      <span>{delivery.distance}</span>
                      <span>{delivery.estimatedTime}</span>
                    </div>
                  </div>

                  <div className="flex space-x-2">
                    <Button size="sm" variant="outline" className="flex-1">
                      <Phone className="h-3 w-3 mr-1" />
                      Call
                    </Button>
                    <Button size="sm" className="flex-1 bg-green-600 hover:bg-green-700">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Accept
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}

            {!isOnline && (
              <Card className="card-3d">
                <CardContent className="p-6 text-center">
                  <Truck className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-600 mb-4">You're currently offline</p>
                  <Button 
                    onClick={() => setIsOnline(true)}
                    className="w-full bg-green-600 hover:bg-green-700"
                  >
                    Go Online
                  </Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Navigation Tab */}
          <TabsContent value="navigation" className="space-y-4">
            <Card className="card-3d">
              <CardHeader>
                <CardTitle className="flex items-center text-lg">
                  <Navigation className="h-5 w-5 mr-2 text-[var(--brill-primary)]" />
                  Navigation
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <Button className="w-full h-16 flex items-center justify-center space-x-2">
                    <MapPin className="h-5 w-5" />
                    <span>Navigate to Next Pickup</span>
                  </Button>
                  <div className="grid grid-cols-2 gap-4">
                    <Button variant="outline" className="h-12">
                      <Fuel className="h-4 w-4 mr-2" />
                      Fuel Stations
                    </Button>
                    <Button variant="outline" className="h-12">
                      <Package className="h-4 w-4 mr-2" />
                      Warehouses
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="card-3d">
              <CardContent className="p-4">
                <h4 className="font-semibold mb-3">Current Location</h4>
                <div className="bg-gray-100 rounded-xl p-4 text-center">
                  <MapPin className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                  <p className="text-sm">Victoria Island, Lagos</p>
                  <p className="text-xs text-gray-600">Updated 2 min ago</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Earnings Tab */}
          <TabsContent value="earnings" className="space-y-4">
            <Card className="card-3d">
              <CardHeader>
                <CardTitle className="flex items-center text-lg">
                  <DollarSign className="h-5 w-5 mr-2 text-green-600" />
                  Earnings Summary
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="text-center p-4 bg-green-50 rounded-xl">
                    <TrendingUp className="h-6 w-6 text-green-600 mx-auto mb-2" />
                    <p className="text-2xl font-bold text-green-600">₦{todayStats.earnings.toLocaleString()}</p>
                    <p className="text-sm text-green-700">Today</p>
                  </div>
                  <div className="text-center p-4 bg-blue-50 rounded-xl">
                    <Calendar className="h-6 w-6 text-blue-600 mx-auto mb-2" />
                    <p className="text-2xl font-bold text-blue-600">₦285,400</p>
                    <p className="text-sm text-blue-700">This Week</p>
                  </div>
                </div>
                <Button variant="outline" className="w-full">
                  View Detailed Earnings
                </Button>
              </CardContent>
            </Card>

            <Card className="card-3d">
              <CardContent className="p-4">
                <h4 className="font-semibold mb-3">Payment Methods</h4>
                <div className="space-y-2">
                  <div className="flex justify-between items-center p-3 bg-gray-50 rounded-xl">
                    <span className="text-sm">Digital Wallet</span>
                    <span className="font-bold">₦{todayStats.earnings.toLocaleString()}</span>
                  </div>
                  <Button variant="outline" size="sm" className="w-full">
                    Withdraw Earnings
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* History Tab */}
          <TabsContent value="history" className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-bold">Recent Deliveries</h3>
              <Button variant="outline" size="sm">View All</Button>
            </div>
            
            {recentDeliveries.map((delivery) => (
              <Card key={delivery.id} className="card-3d">
                <CardContent className="p-4">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <p className="font-semibold text-sm">{delivery.customer}</p>
                      <p className="text-xs text-gray-600">{delivery.type} Delivery</p>
                      <p className="text-xs text-gray-500">{delivery.time}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold">₦{delivery.amount.toLocaleString()}</p>
                      <div className="flex items-center space-x-1">
                        <Star className="h-3 w-3 text-yellow-400 fill-current" />
                        <span className="text-xs">{delivery.rating}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <Button size="sm" variant="outline" className="flex-1">
                      View Details
                    </Button>
                    <Button size="sm" variant="outline" className="flex-1">
                      <MessageCircle className="h-3 w-3 mr-1" />
                      Message
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}