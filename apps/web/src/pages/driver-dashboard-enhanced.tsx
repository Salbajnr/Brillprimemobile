import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { useWebSocketOrders, useWebSocketLocation, useWebSocketNotifications } from "@/hooks/use-websocket";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import {
  Power, PowerOff, MapPin, Clock, DollarSign, Star, Navigation, 
  Phone, MessageSquare, CheckCircle, XCircle, Camera, Package,
  Fuel, AlertTriangle, TrendingUp, Users, Settings, Bell,
  Truck, Route, Timer, Shield, Target, Award, BarChart3
} from "lucide-react";

interface DriverProfile {
  id: number;
  userId: number;
  vehicleType: string;
  vehiclePlate: string;
  vehicleModel?: string;
  isAvailable: boolean;
  isOnline: boolean;
  currentLocation?: { lat: number; lng: number };
  totalDeliveries: number;
  totalEarnings: number;
  rating: number;
  reviewCount: number;
  tier: 'PREMIUM' | 'STANDARD';
  verificationStatus: 'PENDING' | 'VERIFIED' | 'REJECTED';
}

interface DeliveryRequest {
  id: string;
  orderId: string;
  deliveryType: 'FUEL' | 'FOOD' | 'PACKAGE' | 'COMMODITY' | 'HIGH_VALUE';
  pickupAddress: string;
  deliveryAddress: string;
  pickupCoords: { lat: number; lng: number };
  deliveryCoords: { lat: number; lng: number };
  customerName: string;
  customerPhone: string;
  merchantName: string;
  merchantPhone?: string;
  deliveryFee: number;
  distance: number;
  estimatedTime: number;
  orderValue: number;
  paymentMethod: string;
  specialInstructions?: string;
  urgentDelivery: boolean;
  temperatureSensitive: boolean;
  fragile: boolean;
  requiresVerification: boolean;
  expiresAt: Date;
  createdAt: Date;
}

interface ActiveDelivery {
  id: string;
  orderId: string;
  status: 'ACCEPTED' | 'HEADING_TO_PICKUP' | 'AT_PICKUP' | 'PICKED_UP' | 'IN_TRANSIT' | 'DELIVERED';
  customerName: string;
  customerPhone: string;
  pickupAddress: string;
  deliveryAddress: string;
  deliveryFee: number;
  estimatedDeliveryTime: Date;
  orderItems: Array<{
    name: string;
    quantity: number;
    unit: string;
  }>;
  specialHandling: string[];
  deliveryInstructions?: string;
}

interface DriverEarnings {
  todayEarnings: number;
  weeklyEarnings: number;
  monthlyEarnings: number;
  totalEarnings: number;
  completedDeliveries: number;
  bonusEarnings: number;
  pendingEarnings: number;
  averageDeliveryTime: number;
  onTimeDeliveryRate: number;
}

export default function EnhancedDriverDashboard() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // State management
  const [selectedTab, setSelectedTab] = useState("status");
  const [isOnline, setIsOnline] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [selectedRequest, setSelectedRequest] = useState<DeliveryRequest | null>(null);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [requestTimer, setRequestTimer] = useState<number | null>(null);
  const [activeDelivery, setActiveDelivery] = useState<ActiveDelivery | null>(null);

  // WebSocket integration
  const { connected: orderConnected, orderUpdates } = useWebSocketOrders();
  const { connected: locationConnected, sendLocationUpdate } = useWebSocketLocation();
  const { connected: notificationConnected, notifications } = useWebSocketNotifications();

  // Driver profile query
  const { data: driverProfile } = useQuery<DriverProfile>({
    queryKey: ["/api/driver/profile"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/driver/profile");
      return response.json();
    }
  });

  // Available delivery requests query
  const { data: deliveryRequests = [], refetch: refetchRequests } = useQuery<DeliveryRequest[]>({
    queryKey: ["/api/driver/requests"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/driver/delivery-requests");
      return response.json();
    },
    enabled: isOnline,
    refetchInterval: isOnline ? 5000 : false // Refresh every 5 seconds when online
  });

  // Driver earnings query
  const { data: earnings } = useQuery<DriverEarnings>({
    queryKey: ["/api/driver/earnings"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/driver/earnings");
      return response.json();
    }
  });

  // Get current location
  useEffect(() => {
    if (isOnline && navigator.geolocation) {
      const watchId = navigator.geolocation.watchPosition(
        (position) => {
          const coords = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          };
          setCurrentLocation(coords);
          
          // Send location update via WebSocket if connected
          if (locationConnected) {
            sendLocationUpdate(coords);
          }
        },
        (error) => {
          console.error("Location error:", error);
        },
        { enableHighAccuracy: true, maximumAge: 10000, timeout: 5000 }
      );

      return () => navigator.geolocation.clearWatch(watchId);
    }
  }, [isOnline, locationConnected, sendLocationUpdate]);

  // Listen for new delivery requests
  useEffect(() => {
    if (deliveryRequests.length > 0 && isOnline) {
      // Check for new requests that haven't been shown yet
      const newRequest = deliveryRequests.find(req => 
        !req.expiresAt || new Date(req.expiresAt) > new Date()
      );
      
      if (newRequest && !showRequestModal) {
        handleNewDeliveryRequest(newRequest);
      }
    }
  }, [deliveryRequests, isOnline, showRequestModal]);

  // Online/Offline status toggle
  const toggleOnlineStatusMutation = useMutation({
    mutationFn: async (online: boolean) => {
      return apiRequest("PUT", "/api/driver/status", { 
        isOnline: online,
        location: currentLocation 
      });
    },
    onSuccess: (data, online) => {
      setIsOnline(online);
      if (online) {
        refetchRequests();
        toast({ 
          title: "You're now online",
          description: "You'll start receiving delivery requests"
        });
      } else {
        toast({ 
          title: "You're now offline",
          description: "You won't receive new delivery requests"
        });
      }
    }
  });

  // Accept delivery request
  const acceptDeliveryMutation = useMutation({
    mutationFn: async (requestId: string) => {
      return apiRequest("POST", `/api/driver/accept-delivery/${requestId}`);
    },
    onSuccess: async (response) => {
      const data = await response.json();
      setActiveDelivery(data.delivery);
      setShowRequestModal(false);
      setRequestTimer(null);
      refetchRequests();
      toast({ title: "Delivery accepted successfully" });
    }
  });

  // Update delivery status
  const updateDeliveryStatusMutation = useMutation({
    mutationFn: async ({ deliveryId, status, proof }: { 
      deliveryId: string; 
      status: string; 
      proof?: { type: string; data: string } 
    }) => {
      return apiRequest("PUT", `/api/driver/delivery/${deliveryId}/status`, { 
        status, 
        proof,
        location: currentLocation 
      });
    },
    onSuccess: (data, variables) => {
      if (variables.status === 'DELIVERED') {
        setActiveDelivery(null);
        toast({ title: "Delivery completed successfully!" });
      } else {
        setActiveDelivery(prev => prev ? { ...prev, status: variables.status as any } : null);
        toast({ title: `Status updated to ${variables.status.replace('_', ' ').toLowerCase()}` });
      }
      queryClient.invalidateQueries({ queryKey: ["/api/driver/earnings"] });
    }
  });

  // Handle new delivery request with 15-second timer
  const handleNewDeliveryRequest = (request: DeliveryRequest) => {
    setSelectedRequest(request);
    setShowRequestModal(true);
    setRequestTimer(15);
    
    const countdown = setInterval(() => {
      setRequestTimer(prev => {
        if (prev && prev <= 1) {
          clearInterval(countdown);
          handleDeclineRequest();
          return null;
        }
        return prev ? prev - 1 : null;
      });
    }, 1000);
  };

  const handleAcceptRequest = () => {
    if (selectedRequest) {
      acceptDeliveryMutation.mutate(selectedRequest.id);
    }
  };

  const handleDeclineRequest = () => {
    setShowRequestModal(false);
    setSelectedRequest(null);
    setRequestTimer(null);
  };

  const handleStatusUpdate = (status: string, proof?: { type: string; data: string }) => {
    if (activeDelivery) {
      updateDeliveryStatusMutation.mutate({ 
        deliveryId: activeDelivery.id, 
        status, 
        proof 
      });
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const formatDistance = (distanceKm: number) => {
    return distanceKm < 1 ? `${Math.round(distanceKm * 1000)}m` : `${distanceKm.toFixed(1)}km`;
  };

  const formatTime = (minutes: number) => {
    if (minutes < 60) return `${minutes}min`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}min`;
  };

  const getDeliveryTypeIcon = (type: string) => {
    switch (type) {
      case 'FUEL': return <Fuel className="h-5 w-5" />;
      case 'FOOD': return <Package className="h-5 w-5" />;
      case 'HIGH_VALUE': return <Shield className="h-5 w-5" />;
      default: return <Package className="h-5 w-5" />;
    }
  };

  const getDeliveryTypeColor = (type: string) => {
    switch (type) {
      case 'FUEL': return 'bg-orange-100 text-orange-800';
      case 'FOOD': return 'bg-green-100 text-green-800';
      case 'HIGH_VALUE': return 'bg-purple-100 text-purple-800';
      default: return 'bg-blue-100 text-blue-800';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 p-4 sticky top-0 z-10">
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <h1 className="text-2xl font-bold text-gray-900">Driver Dashboard</h1>
            <div className="flex items-center space-x-2">
              <Button
                onClick={() => toggleOnlineStatusMutation.mutate(!isOnline)}
                className={`text-sm ${isOnline 
                  ? 'bg-green-100 text-green-800 hover:bg-green-200' 
                  : 'bg-gray-100 text-gray-800 hover:bg-gray-200'}`}
                variant="ghost"
              >
                {isOnline ? <Power className="h-4 w-4 mr-1" /> : <PowerOff className="h-4 w-4 mr-1" />}
                {isOnline ? 'Online' : 'Offline'}
              </Button>
              {isOnline && locationConnected && (
                <div className="flex items-center space-x-1 text-green-600">
                  <div className="w-2 h-2 bg-green-600 rounded-full animate-pulse"></div>
                  <span className="text-sm">Live Location</span>
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="ghost"
              size="sm"
              className="relative"
            >
              <Bell className="h-5 w-5" />
              {notifications.length > 0 && (
                <Badge className="absolute -top-1 -right-1 h-4 w-4 p-0 text-xs flex items-center justify-center bg-red-500">
                  {notifications.length}
                </Badge>
              )}
            </Button>
          </div>
        </div>
      </div>

      <div className="p-6">
        <Tabs value={selectedTab} onValueChange={setSelectedTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="status">Status</TabsTrigger>
            <TabsTrigger value="delivery">Delivery</TabsTrigger>
            <TabsTrigger value="earnings">Earnings</TabsTrigger>
            <TabsTrigger value="performance">Performance</TabsTrigger>
          </TabsList>

          {/* Online/Offline Status Management */}
          <TabsContent value="status" className="space-y-6">
            {/* Status Overview */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Status</CardTitle>
                  {isOnline ? <Power className="h-4 w-4 text-green-600" /> : <PowerOff className="h-4 w-4 text-gray-400" />}
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {isOnline ? 'Online' : 'Offline'}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {isOnline ? 'Receiving requests' : 'Not receiving requests'}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Today's Earnings</CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{formatCurrency(earnings?.todayEarnings || 0)}</div>
                  <p className="text-xs text-muted-foreground">
                    {earnings?.completedDeliveries || 0} deliveries completed
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Rating</CardTitle>
                  <Star className="h-4 w-4 text-yellow-400" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{driverProfile?.rating.toFixed(1) || '0.0'}</div>
                  <p className="text-xs text-muted-foreground">
                    {driverProfile?.reviewCount || 0} reviews
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Driver Profile Card */}
            <Card>
              <CardHeader>
                <CardTitle>Driver Profile</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium">Vehicle Type</Label>
                    <p className="text-sm">{driverProfile?.vehicleType || 'Not set'}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">License Plate</Label>
                    <p className="text-sm">{driverProfile?.vehiclePlate || 'Not set'}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Driver Tier</Label>
                    <Badge variant={driverProfile?.tier === 'PREMIUM' ? 'default' : 'secondary'}>
                      {driverProfile?.tier || 'STANDARD'}
                    </Badge>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Verification Status</Label>
                    <Badge variant={driverProfile?.verificationStatus === 'VERIFIED' ? 'default' : 'secondary'}>
                      {driverProfile?.verificationStatus || 'PENDING'}
                    </Badge>
                  </div>
                </div>
                
                {driverProfile?.verificationStatus !== 'VERIFIED' && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded p-3">
                    <div className="flex items-center space-x-2">
                      <AlertTriangle className="h-4 w-4 text-yellow-600" />
                      <span className="text-sm text-yellow-700">
                        Complete KYC verification to access all delivery types
                      </span>
                    </div>
                    <Button size="sm" className="mt-2" onClick={() => setLocation("/kyc-verification")}>
                      Complete Verification
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Location Sharing */}
            <Card>
              <CardHeader>
                <CardTitle>Real-time Location</CardTitle>
              </CardHeader>
              <CardContent>
                {isOnline && currentLocation ? (
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2 text-green-600">
                      <MapPin className="h-4 w-4" />
                      <span className="text-sm">Location sharing active</span>
                    </div>
                    <p className="text-xs text-gray-600">
                      Lat: {currentLocation.lat.toFixed(6)}, Lng: {currentLocation.lng.toFixed(6)}
                    </p>
                  </div>
                ) : (
                  <div className="flex items-center space-x-2 text-gray-400">
                    <MapPin className="h-4 w-4" />
                    <span className="text-sm">Location sharing inactive</span>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Delivery Workflow */}
          <TabsContent value="delivery" className="space-y-4">
            {activeDelivery ? (
              // Active Delivery View
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>Active Delivery</span>
                    <Badge className="bg-blue-100 text-blue-800">
                      {activeDelivery.status.replace('_', ' ')}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <h4 className="font-medium">Customer</h4>
                      <p className="text-sm">{activeDelivery.customerName}</p>
                      <p className="text-sm text-gray-600">{activeDelivery.customerPhone}</p>
                    </div>
                    <div>
                      <h4 className="font-medium">Delivery Fee</h4>
                      <p className="text-sm font-semibold">{formatCurrency(activeDelivery.deliveryFee)}</p>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-medium mb-2">Route</h4>
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                        <span className="text-sm">Pickup: {activeDelivery.pickupAddress}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <div className="w-3 h-3 rounded-full bg-green-500"></div>
                        <span className="text-sm">Delivery: {activeDelivery.deliveryAddress}</span>
                      </div>
                    </div>
                  </div>

                  {activeDelivery.orderItems.length > 0 && (
                    <div>
                      <h4 className="font-medium mb-2">Items</h4>
                      {activeDelivery.orderItems.map((item, index) => (
                        <p key={index} className="text-sm">
                          {item.name} x{item.quantity} {item.unit}
                        </p>
                      ))}
                    </div>
                  )}

                  {/* Status Update Buttons */}
                  <div className="flex space-x-2 pt-4">
                    {activeDelivery.status === 'ACCEPTED' && (
                      <Button onClick={() => handleStatusUpdate('HEADING_TO_PICKUP')}>
                        <Navigation className="h-4 w-4 mr-2" />
                        Head to Pickup
                      </Button>
                    )}
                    {activeDelivery.status === 'HEADING_TO_PICKUP' && (
                      <Button onClick={() => handleStatusUpdate('AT_PICKUP')}>
                        <MapPin className="h-4 w-4 mr-2" />
                        Arrived at Pickup
                      </Button>
                    )}
                    {activeDelivery.status === 'AT_PICKUP' && (
                      <Button onClick={() => handleStatusUpdate('PICKED_UP', { type: 'photo', data: 'pickup_proof' })}>
                        <Camera className="h-4 w-4 mr-2" />
                        Confirm Pickup
                      </Button>
                    )}
                    {activeDelivery.status === 'PICKED_UP' && (
                      <Button onClick={() => handleStatusUpdate('IN_TRANSIT')}>
                        <Truck className="h-4 w-4 mr-2" />
                        Start Delivery
                      </Button>
                    )}
                    {activeDelivery.status === 'IN_TRANSIT' && (
                      <Button onClick={() => handleStatusUpdate('DELIVERED', { type: 'signature', data: 'delivery_proof' })}>
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Complete Delivery
                      </Button>
                    )}
                    <Button variant="outline">
                      <Phone className="h-4 w-4 mr-2" />
                      Call Customer
                    </Button>
                    <Button variant="outline">
                      <MessageSquare className="h-4 w-4 mr-2" />
                      Chat
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : (
              // Available Requests View
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>Available Deliveries</span>
                    <Badge variant="secondary">{deliveryRequests.length} available</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {!isOnline ? (
                    <div className="text-center py-8">
                      <PowerOff className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-600 mb-4">You're offline</p>
                      <Button onClick={() => toggleOnlineStatusMutation.mutate(true)}>
                        Go Online to Receive Requests
                      </Button>
                    </div>
                  ) : deliveryRequests.length === 0 ? (
                    <div className="text-center py-8">
                      <Timer className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-600">No delivery requests available</p>
                      <p className="text-sm text-gray-500">Stay online to receive new requests</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {deliveryRequests.map((request) => (
                        <div key={request.id} className="border rounded-lg p-4 space-y-3">
                          <div className="flex justify-between items-start">
                            <div className="flex items-center space-x-2">
                              {getDeliveryTypeIcon(request.deliveryType)}
                              <div>
                                <Badge className={getDeliveryTypeColor(request.deliveryType)}>
                                  {request.deliveryType}
                                </Badge>
                                {request.urgentDelivery && (
                                  <Badge variant="destructive" className="ml-2">Urgent</Badge>
                                )}
                                {request.requiresVerification && (
                                  <Badge variant="outline" className="ml-2">
                                    <Shield className="h-3 w-3 mr-1" />
                                    Verified Required
                                  </Badge>
                                )}
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-lg font-bold text-green-600">
                                {formatCurrency(request.deliveryFee)}
                              </div>
                              <p className="text-sm text-gray-500">
                                {formatDistance(request.distance)} • {formatTime(request.estimatedTime)}
                              </p>
                            </div>
                          </div>

                          <div className="space-y-1">
                            <div className="flex items-center space-x-2">
                              <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                              <span className="text-sm">{request.pickupAddress}</span>
                            </div>
                            <div className="flex items-center space-x-2">
                              <div className="w-3 h-3 rounded-full bg-green-500"></div>
                              <span className="text-sm">{request.deliveryAddress}</span>
                            </div>
                          </div>

                          <div className="flex justify-between items-center pt-2">
                            <div>
                              <p className="text-sm font-medium">{request.customerName}</p>
                              <p className="text-xs text-gray-600">
                                Order Value: {formatCurrency(request.orderValue)}
                              </p>
                            </div>
                            <Button 
                              size="sm"
                              onClick={() => handleNewDeliveryRequest(request)}
                              disabled={request.requiresVerification && driverProfile?.verificationStatus !== 'VERIFIED'}
                            >
                              View Details
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Earnings & Performance */}
          <TabsContent value="earnings" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Today</CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{formatCurrency(earnings?.todayEarnings || 0)}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">This Week</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{formatCurrency(earnings?.weeklyEarnings || 0)}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">This Month</CardTitle>
                  <BarChart3 className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{formatCurrency(earnings?.monthlyEarnings || 0)}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Earned</CardTitle>
                  <Award className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{formatCurrency(earnings?.totalEarnings || 0)}</div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Earnings Breakdown</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex justify-between">
                    <span>Base Earnings</span>
                    <span className="font-semibold">
                      {formatCurrency((earnings?.todayEarnings || 0) - (earnings?.bonusEarnings || 0))}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Bonus Earnings</span>
                    <span className="font-semibold text-green-600">
                      {formatCurrency(earnings?.bonusEarnings || 0)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Pending Earnings</span>
                    <span className="font-semibold text-orange-600">
                      {formatCurrency(earnings?.pendingEarnings || 0)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Completed Deliveries</span>
                    <span className="font-semibold">{earnings?.completedDeliveries || 0}</span>
                  </div>
                </div>
                
                <div className="pt-4">
                  <Button className="w-full">
                    <DollarSign className="h-4 w-4 mr-2" />
                    Withdraw Earnings
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Performance Tab */}
          <TabsContent value="performance" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Customer Rating</CardTitle>
                  <Star className="h-4 w-4 text-yellow-400" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{driverProfile?.rating.toFixed(1) || '0.0'}</div>
                  <p className="text-xs text-muted-foreground">
                    {driverProfile?.reviewCount || 0} reviews
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">On-time Rate</CardTitle>
                  <Target className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{earnings?.onTimeDeliveryRate || 0}%</div>
                  <p className="text-xs text-muted-foreground">Delivery performance</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Avg. Delivery Time</CardTitle>
                  <Clock className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{earnings?.averageDeliveryTime || 0}min</div>
                  <p className="text-xs text-muted-foreground">Per delivery</p>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Performance Insights</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Customer Satisfaction</span>
                    <span className="text-sm font-semibold">{driverProfile?.rating.toFixed(1) || '0.0'}/5.0</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-green-600 h-2 rounded-full" 
                      style={{ width: `${((driverProfile?.rating || 0) / 5) * 100}%` }}
                    ></div>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">On-time Deliveries</span>
                    <span className="text-sm font-semibold">{earnings?.onTimeDeliveryRate || 0}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full" 
                      style={{ width: `${earnings?.onTimeDeliveryRate || 0}%` }}
                    ></div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Delivery Request Modal with Timer */}
      <Dialog open={showRequestModal} onOpenChange={setShowRequestModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>New Delivery Request</span>
              {requestTimer && (
                <Badge variant="destructive" className="text-lg">
                  {requestTimer}s
                </Badge>
              )}
            </DialogTitle>
          </DialogHeader>
          {selectedRequest && (
            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded p-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    {getDeliveryTypeIcon(selectedRequest.deliveryType)}
                    <Badge className={getDeliveryTypeColor(selectedRequest.deliveryType)}>
                      {selectedRequest.deliveryType}
                    </Badge>
                  </div>
                  <div className="text-lg font-bold text-green-600">
                    {formatCurrency(selectedRequest.deliveryFee)}
                  </div>
                </div>
                <p className="text-sm text-gray-600">
                  {formatDistance(selectedRequest.distance)} • {formatTime(selectedRequest.estimatedTime)}
                </p>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                  <span className="text-sm">{selectedRequest.pickupAddress}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 rounded-full bg-green-500"></div>
                  <span className="text-sm">{selectedRequest.deliveryAddress}</span>
                </div>
              </div>

              <div className="bg-gray-50 rounded p-3">
                <p className="text-sm"><strong>Customer:</strong> {selectedRequest.customerName}</p>
                <p className="text-sm"><strong>Order Value:</strong> {formatCurrency(selectedRequest.orderValue)}</p>
                {selectedRequest.specialInstructions && (
                  <p className="text-sm"><strong>Instructions:</strong> {selectedRequest.specialInstructions}</p>
                )}
              </div>

              {selectedRequest.urgentDelivery && (
                <div className="bg-red-50 border border-red-200 rounded p-2">
                  <div className="flex items-center space-x-2">
                    <AlertTriangle className="h-4 w-4 text-red-500" />
                    <span className="text-sm text-red-700">This is an urgent delivery</span>
                  </div>
                </div>
              )}

              <div className="flex space-x-2">
                <Button 
                  onClick={handleAcceptRequest}
                  className="flex-1"
                  disabled={selectedRequest.requiresVerification && driverProfile?.verificationStatus !== 'VERIFIED'}
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Accept Delivery
                </Button>
                <Button 
                  variant="outline" 
                  onClick={handleDeclineRequest}
                  className="flex-1"
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  Decline
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}