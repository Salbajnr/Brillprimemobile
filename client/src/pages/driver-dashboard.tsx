import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Bell, MapPin, DollarSign, Clock, Navigation, Car, Phone, CheckCircle, Star,
  Menu, Home, User, Settings, HelpCircle, LogOut, MessageSquare, Shield,
  TrendingUp, Calendar, Award, Target, Activity
} from "lucide-react";
import { formatCurrency, formatDistance, formatTime } from "@/lib/utils";
import { Link } from "wouter";

interface DeliveryJob {
  id: string;
  customerId: number;
  merchantId?: number;
  deliveryType: string;
  pickupAddress: string;
  deliveryAddress: string;
  estimatedDistance: number;
  deliveryFee: number;
  status: string;
  scheduledTime?: Date;
  notes?: string;
  createdAt: Date;
  customer: {
    fullName: string;
    phone: string;
  };
}

interface DriverProfile {
  id: number;
  userId: number;
  vehicleType: string;
  vehiclePlate: string;
  vehicleModel?: string;
  isAvailable: boolean;
  currentLocation?: any;
  totalDeliveries: number;
  totalEarnings: number;
  rating: number;
  reviewCount: number;
}

interface DriverEarnings {
  todayEarnings: number;
  weeklyEarnings: number;
  totalEarnings: number;
  completedDeliveries: number;
}

export default function DriverDashboard() {
  const [selectedTab, setSelectedTab] = useState("jobs");
  const [isOnline, setIsOnline] = useState(true);
  const [showMenu, setShowMenu] = useState(false);
  const queryClient = useQueryClient();

  // Fetch driver profile
  const { data: driverProfile } = useQuery<DriverProfile>({
    queryKey: ["driver", "profile"],
    queryFn: () => apiRequest("GET", "/api/driver/profile"),
  });

  // Fetch available jobs
  const { data: availableJobs = [], isLoading: jobsLoading } = useQuery<DeliveryJob[]>({
    queryKey: ["driver", "available-jobs"],
    queryFn: () => apiRequest("GET", "/api/driver/available-jobs"),
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Fetch earnings data
  const { data: earnings } = useQuery<DriverEarnings>({
    queryKey: ["driver", "earnings"],
    queryFn: () => apiRequest("GET", "/api/driver/earnings"),
  });

  // Fetch delivery history
  const { data: deliveryHistory = [] } = useQuery<DeliveryJob[]>({
    queryKey: ["driver", "delivery-history"],
    queryFn: () => apiRequest("GET", "/api/driver/delivery-history"),
  });

  // Accept job mutation
  const acceptJobMutation = useMutation({
    mutationFn: (jobId: string) => 
      apiRequest("POST", `/api/driver/accept-job/${jobId}`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["driver", "available-jobs"] });
      queryClient.invalidateQueries({ queryKey: ["driver", "delivery-history"] });
    },
  });

  // Location update mutation
  const updateLocationMutation = useMutation({
    mutationFn: (location: { latitude: string; longitude: string }) =>
      apiRequest("PUT", "/api/driver/update-location", location),
  });

  // Update location periodically
  useEffect(() => {
    if (isOnline && navigator.geolocation) {
      const watchId = navigator.geolocation.watchPosition(
        (position) => {
          updateLocationMutation.mutate({
            latitude: position.coords.latitude.toString(),
            longitude: position.coords.longitude.toString(),
          });
        },
        (error) => console.error("Location error:", error),
        { enableHighAccuracy: true, maximumAge: 60000, timeout: 10000 }
      );

      return () => navigator.geolocation.clearWatch(watchId);
    }
  }, [isOnline]);

  const handleAcceptJob = (jobId: string) => {
    acceptJobMutation.mutate(jobId);
  };

  const getJobTypeColor = (type: string) => {
    switch (type) {
      case 'FUEL': return 'bg-orange-100 text-orange-800';
      case 'FOOD': return 'bg-green-100 text-green-800';
      case 'PACKAGE': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING': return 'bg-yellow-100 text-yellow-800';
      case 'ACCEPTED': return 'bg-blue-100 text-blue-800';
      case 'IN_TRANSIT': return 'bg-purple-100 text-purple-800';
      case 'DELIVERED': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      {/* Enhanced Menu Bar */}
      <div className="bg-white shadow-lg border-b border-blue-200 mb-6">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowMenu(!showMenu)}
                className="text-[#0b1a51] hover:bg-blue-50"
              >
                <Menu className="h-5 w-5" />
              </Button>
              <div>
                <h1 className="text-xl font-bold text-[#0b1a51]">Driver Dashboard</h1>
                <p className="text-sm text-gray-600">Welcome back, {driverProfile?.vehiclePlate || "Driver"}!</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <Button
                variant={isOnline ? "default" : "outline"}
                onClick={() => setIsOnline(!isOnline)}
                className={`rounded-full px-4 py-2 transition-all duration-300 ${
                  isOnline 
                    ? "bg-green-600 hover:bg-green-700 shadow-lg hover:shadow-green-200" 
                    : "border-2 border-gray-300 hover:border-green-300"
                }`}
              >
                <div className={`w-2 h-2 rounded-full mr-2 ${isOnline ? 'bg-white' : 'bg-gray-400'}`} />
                {isOnline ? "Online" : "Offline"}
              </Button>
              
              <Button 
                variant="outline" 
                size="icon"
                className="rounded-full border-2 border-blue-200 hover:border-blue-400 hover:bg-blue-50 transition-all duration-300"
              >
                <Bell className="h-4 w-4 text-[#0b1a51]" />
              </Button>
              
              <Button 
                variant="outline" 
                size="icon"
                className="rounded-full border-2 border-blue-200 hover:border-blue-400 hover:bg-blue-50 transition-all duration-300"
              >
                <User className="h-4 w-4 text-[#0b1a51]" />
              </Button>
            </div>
          </div>

          {/* Expandable Menu */}
          {showMenu && (
            <div className="mt-4 p-4 bg-gradient-to-r from-blue-50 to-blue-100 rounded-2xl border-2 border-blue-200 animate-in slide-in-from-top-2 duration-300">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <Link href="/dashboard">
                  <Button variant="ghost" className="w-full justify-start space-x-2 hover:bg-white hover:shadow-md transition-all duration-300">
                    <Home className="h-4 w-4" />
                    <span>Dashboard</span>
                  </Button>
                </Link>
                <Link href="/profile">
                  <Button variant="ghost" className="w-full justify-start space-x-2 hover:bg-white hover:shadow-md transition-all duration-300">
                    <User className="h-4 w-4" />
                    <span>Profile</span>
                  </Button>
                </Link>
                <Link href="/chat">
                  <Button variant="ghost" className="w-full justify-start space-x-2 hover:bg-white hover:shadow-md transition-all duration-300">
                    <MessageSquare className="h-4 w-4" />
                    <span>Messages</span>
                  </Button>
                </Link>
                <Link href="/account-settings">
                  <Button variant="ghost" className="w-full justify-start space-x-2 hover:bg-white hover:shadow-md transition-all duration-300">
                    <Settings className="h-4 w-4" />
                    <span>Settings</span>
                  </Button>
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="px-4 pb-4">
        {/* Enhanced Status Cards with 3D Effects */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-6">
          <Card className="rounded-2xl border-2 border-blue-200 bg-gradient-to-br from-white to-blue-50 shadow-xl hover:shadow-2xl transform hover:-translate-y-2 transition-all duration-300 hover:border-blue-300">
            <CardContent className="p-6">
              <div className="flex items-center space-x-3">
                <div className="p-3 bg-gradient-to-br from-green-400 to-green-600 rounded-full shadow-lg">
                  <DollarSign className="h-6 w-6 text-white" />
                </div>
                <div>
                  <p className="text-sm text-gray-600 font-medium">Today's Earnings</p>
                  <p className="text-xl font-bold text-[#0b1a51]">₦{earnings?.todayEarnings?.toLocaleString() || '0'}</p>
                  <div className="flex items-center mt-1">
                    <TrendingUp className="h-3 w-3 text-green-500 mr-1" />
                    <span className="text-xs text-green-600">+12% vs yesterday</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-2xl border-2 border-blue-200 bg-gradient-to-br from-white to-blue-50 shadow-xl hover:shadow-2xl transform hover:-translate-y-2 transition-all duration-300 hover:border-blue-300">
            <CardContent className="p-6">
              <div className="flex items-center space-x-3">
                <div className="p-3 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full shadow-lg">
                  <Car className="h-6 w-6 text-white" />
                </div>
                <div>
                  <p className="text-sm text-gray-600 font-medium">Deliveries</p>
                  <p className="text-xl font-bold text-[#0b1a51]">{earnings?.completedDeliveries || 0}</p>
                  <div className="flex items-center mt-1">
                    <Activity className="h-3 w-3 text-blue-500 mr-1" />
                    <span className="text-xs text-blue-600">Today's trips</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-2xl border-2 border-blue-200 bg-gradient-to-br from-white to-blue-50 shadow-xl hover:shadow-2xl transform hover:-translate-y-2 transition-all duration-300 hover:border-blue-300">
            <CardContent className="p-6">
              <div className="flex items-center space-x-3">
                <div className="p-3 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-full shadow-lg">
                  <Star className="h-6 w-6 text-white" />
                </div>
                <div>
                  <p className="text-sm text-gray-600 font-medium">Rating</p>
                  <p className="text-xl font-bold text-[#0b1a51]">{driverProfile?.rating || '0.0'}/5.0</p>
                  <div className="flex items-center mt-1">
                    <Award className="h-3 w-3 text-yellow-500 mr-1" />
                    <span className="text-xs text-yellow-600">Excellent service</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-2xl border-2 border-blue-200 bg-gradient-to-br from-white to-blue-50 shadow-xl hover:shadow-2xl transform hover:-translate-y-2 transition-all duration-300 hover:border-blue-300">
            <CardContent className="p-6">
              <div className="flex items-center space-x-3">
                <div className="p-3 bg-gradient-to-br from-purple-400 to-purple-600 rounded-full shadow-lg">
                  <Calendar className="h-6 w-6 text-white" />
                </div>
                <div>
                  <p className="text-sm text-gray-600 font-medium">Weekly</p>
                  <p className="text-xl font-bold text-[#0b1a51]">₦{earnings?.weeklyEarnings?.toLocaleString() || '0'}</p>
                  <div className="flex items-center mt-1">
                    <Target className="h-3 w-3 text-purple-500 mr-1" />
                    <span className="text-xs text-purple-600">On track</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

        {/* Enhanced Tabbed Interface */}
        <Tabs value={selectedTab} onValueChange={setSelectedTab}>
          <TabsList className="grid w-full grid-cols-4 bg-white border-2 border-blue-200 rounded-2xl p-2 shadow-lg mb-6">
            <TabsTrigger 
              value="jobs" 
              className="rounded-xl data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-blue-600 data-[state=active]:text-white data-[state=active]:shadow-lg transition-all duration-300 hover:bg-blue-50"
            >
              <Car className="h-4 w-4 mr-2" />
              Jobs
            </TabsTrigger>
            <TabsTrigger 
              value="navigate" 
              className="rounded-xl data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-blue-600 data-[state=active]:text-white data-[state=active]:shadow-lg transition-all duration-300 hover:bg-blue-50"
            >
              <Navigation className="h-4 w-4 mr-2" />
              Navigate
            </TabsTrigger>
            <TabsTrigger 
              value="earnings" 
              className="rounded-xl data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-blue-600 data-[state=active]:text-white data-[state=active]:shadow-lg transition-all duration-300 hover:bg-blue-50"
            >
              <DollarSign className="h-4 w-4 mr-2" />
              Earnings
            </TabsTrigger>
            <TabsTrigger 
              value="history" 
              className="rounded-xl data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-blue-600 data-[state=active]:text-white data-[state=active]:shadow-lg transition-all duration-300 hover:bg-blue-50"
            >
              <Clock className="h-4 w-4 mr-2" />
              History
            </TabsTrigger>
          </TabsList>

          {/* Enhanced Jobs Tab */}
          <TabsContent value="jobs" className="space-y-6 px-4">
            <Card className="rounded-2xl border-2 border-blue-200 bg-gradient-to-br from-white to-blue-50 shadow-xl">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center justify-between text-[#0b1a51]">
                  <div className="flex items-center space-x-2">
                    <div className="p-2 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full">
                      <Car className="h-5 w-5 text-white" />
                    </div>
                    <span>Available Jobs ({availableJobs.length})</span>
                  </div>
                  {jobsLoading && <div className="animate-spin w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full" />}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {availableJobs.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="p-6 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full w-24 h-24 mx-auto mb-6 flex items-center justify-center">
                      <Car className="h-12 w-12 text-gray-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-700 mb-2">No jobs available right now</h3>
                    <p className="text-gray-500">Keep checking back for new delivery requests</p>
                    <Button className="mt-4 rounded-full bg-blue-600 hover:bg-blue-700">
                      Refresh Jobs
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {availableJobs.map((job) => (
                      <Card 
                        key={job.id} 
                        className="rounded-2xl border-2 border-blue-300 bg-gradient-to-r from-white to-blue-50 shadow-lg hover:shadow-2xl transform hover:-translate-y-1 transition-all duration-300 hover:border-blue-400"
                      >
                        <CardContent className="p-6">
                          <div className="flex justify-between items-start mb-4">
                            <div className="flex items-center space-x-3">
                              <Badge className={`px-3 py-1 rounded-full font-medium ${getJobTypeColor(job.deliveryType)}`}>
                                {job.deliveryType}
                              </Badge>
                              <Badge variant="outline" className="rounded-full border-blue-300 text-blue-700">
                                {formatDistance(job.estimatedDistance)} km
                              </Badge>
                            </div>
                            <div className="text-right">
                              <p className="text-2xl font-bold text-green-600">
                                ₦{job.deliveryFee?.toLocaleString()}
                              </p>
                              <p className="text-sm text-gray-500">
                                {formatTime(job.createdAt)}
                              </p>
                            </div>
                          </div>

                          <div className="space-y-3 mb-6">
                            <div className="flex items-start space-x-3 p-3 bg-green-50 rounded-xl border border-green-200">
                              <div className="p-2 bg-green-500 rounded-full">
                                <MapPin className="h-4 w-4 text-white" />
                              </div>
                              <div>
                                <p className="text-sm font-semibold text-green-700">Pickup Location</p>
                                <p className="text-sm text-gray-700">{job.pickupAddress}</p>
                              </div>
                            </div>
                            <div className="flex items-start space-x-3 p-3 bg-red-50 rounded-xl border border-red-200">
                              <div className="p-2 bg-red-500 rounded-full">
                                <MapPin className="h-4 w-4 text-white" />
                              </div>
                              <div>
                                <p className="text-sm font-semibold text-red-700">Delivery Location</p>
                                <p className="text-sm text-gray-700">{job.deliveryAddress}</p>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                              <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center shadow-lg">
                                <span className="text-sm font-bold text-white">
                                  {job.customer.fullName.charAt(0)}
                                </span>
                              </div>
                              <div>
                                <p className="font-semibold text-gray-800">{job.customer.fullName}</p>
                                <p className="text-sm text-gray-500">{job.customer.phone}</p>
                              </div>
                            </div>
                            <div className="flex space-x-3">
                              <Button 
                                variant="outline" 
                                size="sm" 
                                className="rounded-full border-2 border-blue-300 hover:bg-blue-50 hover:border-blue-400 transition-all duration-300"
                              >
                                <Phone className="h-4 w-4 mr-2" />
                                Call
                              </Button>
                              <Button 
                                onClick={() => handleAcceptJob(job.id)}
                                disabled={acceptJobMutation.isPending}
                                className="rounded-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
                              >
                                {acceptJobMutation.isPending ? "Accepting..." : "Accept Job"}
                              </Button>
                            </div>
                          </div>

                          {job.notes && (
                            <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-xl">
                              <p className="text-sm text-yellow-800 font-medium">Special Instructions:</p>
                              <p className="text-sm text-gray-700 mt-1">{job.notes}</p>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Enhanced Navigate Tab */}
          <TabsContent value="navigate" className="space-y-6 px-4">
            <Card className="rounded-2xl border-2 border-blue-200 bg-gradient-to-br from-white to-blue-50 shadow-xl">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center text-[#0b1a51]">
                  <div className="p-2 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full mr-3">
                    <Navigation className="h-5 w-5 text-white" />
                  </div>
                  GPS Navigation & Routes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {/* Quick Action Buttons */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Card className="rounded-xl border-2 border-green-200 bg-gradient-to-br from-green-50 to-green-100 hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1">
                      <CardContent className="p-4 text-center">
                        <div className="p-3 bg-green-500 rounded-full w-fit mx-auto mb-3">
                          <MapPin className="h-6 w-6 text-white" />
                        </div>
                        <h3 className="font-semibold text-green-800 mb-2">Current Location</h3>
                        <p className="text-sm text-green-600 mb-3">Share your location with customers</p>
                        <Button className="w-full rounded-full bg-green-600 hover:bg-green-700">
                          Update Location
                        </Button>
                      </CardContent>
                    </Card>
                    
                    <Card className="rounded-xl border-2 border-purple-200 bg-gradient-to-br from-purple-50 to-purple-100 hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1">
                      <CardContent className="p-4 text-center">
                        <div className="p-3 bg-purple-500 rounded-full w-fit mx-auto mb-3">
                          <Navigation className="h-6 w-6 text-white" />
                        </div>
                        <h3 className="font-semibold text-purple-800 mb-2">Navigation</h3>
                        <p className="text-sm text-purple-600 mb-3">Open GPS navigation</p>
                        <Button className="w-full rounded-full bg-purple-600 hover:bg-purple-700">
                          Start Navigation
                        </Button>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Route Information */}
                  <Card className="rounded-xl border-2 border-blue-200 bg-gradient-to-r from-blue-50 to-blue-100">
                    <CardContent className="p-6">
                      <h3 className="font-semibold text-blue-800 mb-4 flex items-center">
                        <Clock className="h-5 w-5 mr-2" />
                        Current Route Status
                      </h3>
                      <div className="text-center py-6">
                        <Navigation className="h-12 w-12 text-blue-400 mx-auto mb-4" />
                        <p className="text-blue-600 font-medium">No active route</p>
                        <p className="text-sm text-gray-500">Accept a job to see navigation details</p>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Enhanced Earnings Tab */}
          <TabsContent value="earnings" className="space-y-6 px-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="rounded-2xl border-2 border-blue-200 bg-gradient-to-br from-white to-blue-50 shadow-xl hover:shadow-2xl transition-all duration-300">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center text-[#0b1a51]">
                    <div className="p-2 bg-gradient-to-br from-green-400 to-green-600 rounded-full mr-3">
                      <DollarSign className="h-5 w-5 text-white" />
                    </div>
                    Earnings Summary
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-center p-3 bg-green-50 rounded-xl border border-green-200">
                    <span className="text-green-700 font-medium">Today's Earnings:</span>
                    <span className="font-bold text-lg text-green-800">₦{earnings?.todayEarnings?.toLocaleString() || '0'}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-blue-50 rounded-xl border border-blue-200">
                    <span className="text-blue-700 font-medium">Weekly Earnings:</span>
                    <span className="font-bold text-lg text-blue-800">₦{earnings?.weeklyEarnings?.toLocaleString() || '0'}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-purple-50 rounded-xl border border-purple-200">
                    <span className="text-purple-700 font-medium">Total Earnings:</span>
                    <span className="font-bold text-lg text-purple-800">₦{earnings?.totalEarnings?.toLocaleString() || '0'}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-gray-50 rounded-xl border border-gray-200">
                    <span className="text-gray-700 font-medium">Completed Deliveries:</span>
                    <span className="font-bold text-lg text-gray-800">{earnings?.completedDeliveries || 0}</span>
                  </div>
                </CardContent>
              </Card>

              <Card className="rounded-2xl border-2 border-blue-200 bg-gradient-to-br from-white to-blue-50 shadow-xl hover:shadow-2xl transition-all duration-300">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center text-[#0b1a51]">
                    <div className="p-2 bg-gradient-to-br from-green-400 to-green-600 rounded-full mr-3">
                      <DollarSign className="h-5 w-5 text-white" />
                    </div>
                    Withdraw Earnings
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="text-center p-6 bg-gradient-to-br from-green-50 to-green-100 rounded-xl border-2 border-green-200">
                    <h3 className="text-green-800 font-semibold text-lg mb-2">Available Balance</h3>
                    <p className="text-3xl font-bold text-green-700">₦{earnings?.totalEarnings?.toLocaleString() || '0'}</p>
                  </div>
                  <Button className="w-full rounded-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 py-3">
                    <DollarSign className="h-5 w-5 mr-2" />
                    Withdraw Earnings
                  </Button>
                  <div className="grid grid-cols-2 gap-3">
                    <Button variant="outline" className="rounded-full border-2 border-blue-300 hover:bg-blue-50">
                      View History
                    </Button>
                    <Button variant="outline" className="rounded-full border-2 border-blue-300 hover:bg-blue-50">
                      Tax Info
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Enhanced History Tab */}
          <TabsContent value="history" className="space-y-6 px-4">
            <Card className="rounded-2xl border-2 border-blue-200 bg-gradient-to-br from-white to-blue-50 shadow-xl">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center text-[#0b1a51]">
                  <div className="p-2 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full mr-3">
                    <Clock className="h-5 w-5 text-white" />
                  </div>
                  Delivery History
                </CardTitle>
              </CardHeader>
              <CardContent>
                {deliveryHistory.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="p-6 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full w-24 h-24 mx-auto mb-6 flex items-center justify-center">
                      <CheckCircle className="h-12 w-12 text-gray-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-700 mb-2">No delivery history yet</h3>
                    <p className="text-gray-500 mb-4">Complete your first delivery to see history here</p>
                    <Button className="rounded-full bg-blue-600 hover:bg-blue-700">
                      View Available Jobs
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {deliveryHistory.map((delivery) => (
                      <Card 
                        key={delivery.id} 
                        className="rounded-xl border-2 border-blue-200 bg-gradient-to-r from-white to-blue-50 shadow-lg hover:shadow-xl transition-all duration-300 hover:border-blue-300"
                      >
                        <CardContent className="p-5">
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <div className="flex items-center space-x-3 mb-3">
                                <Badge className={`px-3 py-1 rounded-full font-medium ${getJobTypeColor(delivery.deliveryType)}`}>
                                  {delivery.deliveryType}
                                </Badge>
                                <Badge className={`px-3 py-1 rounded-full font-medium ${getStatusColor(delivery.status)}`}>
                                  {delivery.status}
                                </Badge>
                              </div>
                              <div className="flex items-center space-x-2 mb-2">
                                <div className="w-8 h-8 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center">
                                  <span className="text-xs font-bold text-white">
                                    {delivery.customer.fullName.charAt(0)}
                                  </span>
                                </div>
                                <div>
                                  <p className="font-semibold text-gray-800">{delivery.customer.fullName}</p>
                                  <p className="text-sm text-gray-500">{delivery.customer.phone}</p>
                                </div>
                              </div>
                              <div className="text-sm text-gray-600 bg-gray-50 p-2 rounded-lg">
                                <span className="font-medium">Route:</span> {delivery.pickupAddress} → {delivery.deliveryAddress}
                              </div>
                            </div>
                            <div className="text-right ml-4">
                              <p className="text-2xl font-bold text-green-600 mb-1">
                                ₦{delivery.deliveryFee?.toLocaleString()}
                              </p>
                              <p className="text-sm text-gray-500">
                                {formatTime(delivery.deliveredAt || delivery.createdAt)}
                              </p>
                              <Button 
                                variant="outline" 
                                size="sm" 
                                className="mt-2 rounded-full border-blue-300 text-blue-600 hover:bg-blue-50"
                              >
                                View Details
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
      </Tabs>
    </div>
  );
}