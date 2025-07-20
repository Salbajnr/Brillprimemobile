import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Bell, MapPin, DollarSign, Clock, Navigation, Car, Phone, CheckCircle, Star } from "lucide-react";
import { formatCurrency, formatDistance, formatTime } from "@/lib/utils";

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
    <div className="min-h-screen bg-gray-50 p-4">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-[#0b1a51]">Driver Dashboard</h1>
            <p className="text-gray-600">Welcome back, {driverProfile?.vehiclePlate || "Driver"}!</p>
          </div>
          <div className="flex items-center space-x-4">
            <Button
              variant={isOnline ? "default" : "outline"}
              onClick={() => setIsOnline(!isOnline)}
              className={isOnline ? "bg-green-600 hover:bg-green-700" : ""}
            >
              <div className={`w-2 h-2 rounded-full mr-2 ${isOnline ? 'bg-white' : 'bg-gray-400'}`} />
              {isOnline ? "Online" : "Offline"}
            </Button>
            <Button variant="outline" size="icon">
              <Bell className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Status Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <DollarSign className="h-5 w-5 text-green-600" />
                <div>
                  <p className="text-sm text-gray-600">Today's Earnings</p>
                  <p className="text-lg font-semibold">₦{earnings?.todayEarnings?.toLocaleString() || '0'}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Car className="h-5 w-5 text-blue-600" />
                <div>
                  <p className="text-sm text-gray-600">Deliveries</p>
                  <p className="text-lg font-semibold">{earnings?.completedDeliveries || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Star className="h-5 w-5 text-yellow-600" />
                <div>
                  <p className="text-sm text-gray-600">Rating</p>
                  <p className="text-lg font-semibold">{driverProfile?.rating || '0.0'}/5.0</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Clock className="h-5 w-5 text-purple-600" />
                <div>
                  <p className="text-sm text-gray-600">Weekly</p>
                  <p className="text-lg font-semibold">₦{earnings?.weeklyEarnings?.toLocaleString() || '0'}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Tabbed Interface */}
      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="jobs">Jobs</TabsTrigger>
          <TabsTrigger value="navigate">Navigate</TabsTrigger>
          <TabsTrigger value="earnings">Earnings</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>

        {/* Jobs Tab */}
        <TabsContent value="jobs" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                Available Jobs ({availableJobs.length})
                {jobsLoading && <div className="animate-spin w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full" />}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {availableJobs.length === 0 ? (
                <div className="text-center py-8">
                  <Car className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">No jobs available right now</p>
                  <p className="text-sm text-gray-500">Keep checking back for new delivery requests</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {availableJobs.map((job) => (
                    <Card key={job.id} className="border-l-4 border-l-blue-500">
                      <CardContent className="p-4">
                        <div className="flex justify-between items-start mb-3">
                          <div className="flex items-center space-x-2">
                            <Badge className={getJobTypeColor(job.deliveryType)}>
                              {job.deliveryType}
                            </Badge>
                            <Badge variant="outline">
                              {formatDistance(job.estimatedDistance)} km
                            </Badge>
                          </div>
                          <div className="text-right">
                            <p className="text-lg font-semibold text-green-600">
                              ₦{job.deliveryFee?.toLocaleString()}
                            </p>
                            <p className="text-sm text-gray-500">
                              {formatTime(job.createdAt)}
                            </p>
                          </div>
                        </div>

                        <div className="space-y-2 mb-4">
                          <div className="flex items-start space-x-2">
                            <MapPin className="h-4 w-4 text-green-600 mt-1 flex-shrink-0" />
                            <div>
                              <p className="text-sm font-medium">Pickup</p>
                              <p className="text-sm text-gray-600">{job.pickupAddress}</p>
                            </div>
                          </div>
                          <div className="flex items-start space-x-2">
                            <MapPin className="h-4 w-4 text-red-600 mt-1 flex-shrink-0" />
                            <div>
                              <p className="text-sm font-medium">Delivery</p>
                              <p className="text-sm text-gray-600">{job.deliveryAddress}</p>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                              <span className="text-xs font-medium">
                                {job.customer.fullName.charAt(0)}
                              </span>
                            </div>
                            <div>
                              <p className="text-sm font-medium">{job.customer.fullName}</p>
                              <p className="text-xs text-gray-500">{job.customer.phone}</p>
                            </div>
                          </div>
                          <div className="flex space-x-2">
                            <Button variant="outline" size="sm">
                              <Phone className="h-4 w-4 mr-1" />
                              Call
                            </Button>
                            <Button 
                              onClick={() => handleAcceptJob(job.id)}
                              disabled={acceptJobMutation.isPending}
                              className="bg-[#4682b4] hover:bg-[#0b1a51]"
                            >
                              {acceptJobMutation.isPending ? "Accepting..." : "Accept Job"}
                            </Button>
                          </div>
                        </div>

                        {job.notes && (
                          <div className="mt-3 p-2 bg-gray-50 rounded">
                            <p className="text-sm text-gray-600">{job.notes}</p>
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

        {/* Navigate Tab */}
        <TabsContent value="navigate" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Navigation className="h-5 w-5 mr-2" />
                GPS Navigation
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <MapPin className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 mb-4">Navigation will be available when you accept a job</p>
                <Button className="bg-[#4682b4] hover:bg-[#0b1a51]">
                  <MapPin className="h-4 w-4 mr-2" />
                  Update Current Location
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Earnings Tab */}
        <TabsContent value="earnings" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Earnings Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-gray-600">Today's Earnings:</span>
                  <span className="font-semibold">₦{earnings?.todayEarnings?.toLocaleString() || '0'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Weekly Earnings:</span>
                  <span className="font-semibold">₦{earnings?.weeklyEarnings?.toLocaleString() || '0'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Total Earnings:</span>
                  <span className="font-semibold">₦{earnings?.totalEarnings?.toLocaleString() || '0'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Completed Deliveries:</span>
                  <span className="font-semibold">{earnings?.completedDeliveries || 0}</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Withdrawal</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 mb-4">Available Balance: ₦{earnings?.totalEarnings?.toLocaleString() || '0'}</p>
                <Button className="w-full bg-green-600 hover:bg-green-700">
                  Withdraw Earnings
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Delivery History</CardTitle>
            </CardHeader>
            <CardContent>
              {deliveryHistory.length === 0 ? (
                <div className="text-center py-8">
                  <CheckCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">No delivery history yet</p>
                  <p className="text-sm text-gray-500">Complete your first delivery to see history here</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {deliveryHistory.map((delivery) => (
                    <Card key={delivery.id} className="border border-gray-200">
                      <CardContent className="p-4">
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="flex items-center space-x-2 mb-2">
                              <Badge className={getJobTypeColor(delivery.deliveryType)}>
                                {delivery.deliveryType}
                              </Badge>
                              <Badge className={getStatusColor(delivery.status)}>
                                {delivery.status}
                              </Badge>
                            </div>
                            <p className="text-sm text-gray-600 mb-1">
                              {delivery.customer.fullName} • {delivery.customer.phone}
                            </p>
                            <p className="text-xs text-gray-500">
                              {delivery.pickupAddress} → {delivery.deliveryAddress}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold text-green-600">
                              ₦{delivery.deliveryFee?.toLocaleString()}
                            </p>
                            <p className="text-xs text-gray-500">
                              {formatTime(delivery.deliveredAt || delivery.createdAt)}
                            </p>
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