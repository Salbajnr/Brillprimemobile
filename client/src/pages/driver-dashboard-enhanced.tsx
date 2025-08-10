
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
  Truck, Route, Timer, Shield, Target, Award, BarChart3,
  Upload, Eye, User, CreditCard, ArrowUp, ArrowDown, Filter,
  Calendar, Trophy, Zap, Gift
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

interface TierProgress {
  currentTier: 'STANDARD' | 'PREMIUM' | 'ELITE';
  nextTier: 'PREMIUM' | 'ELITE' | null;
  progress: number;
  requirementsNeeded: {
    deliveries?: number;
    rating?: number;
    earnings?: number;
    onTimeRate?: number;
  };
  benefits: string[];
  nextTierBenefits?: string[];
}

export default function EnhancedDriverDashboard() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // State management
  const [selectedTab, setSelectedTab] = useState("orders");
  const [isOnline, setIsOnline] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [selectedRequest, setSelectedRequest] = useState<DeliveryRequest | null>(null);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [requestTimer, setRequestTimer] = useState<number | null>(null);
  const [activeDelivery, setActiveDelivery] = useState<ActiveDelivery | null>(null);
  const [showEarningsFilter, setShowEarningsFilter] = useState(false);
  const [earningsFilter, setEarningsFilter] = useState('today');
  const [showWithdrawalModal, setShowWithdrawalModal] = useState(false);
  const [showProofModal, setShowProofModal] = useState(false);
  const [proofType, setProofType] = useState<'pickup' | 'delivery'>('pickup');

  // WebSocket integration
  const { connected: orderConnected, orderUpdates } = useWebSocketOrders();
  const { connected: locationConnected, sendLocationUpdate } = useWebSocketLocation();
  const { connected: notificationConnected, notifications } = useWebSocketNotifications();

  // Driver profile query
  const { data: driverProfile, refetch: refetchProfile } = useQuery<DriverProfile>({
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
    refetchInterval: isOnline ? 5000 : false
  });

  // Driver earnings query
  const { data: earnings } = useQuery<DriverEarnings>({
    queryKey: ["/api/driver/earnings"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/driver/earnings");
      return response.json();
    }
  });

  // Driver tier progress query
  const { data: tierProgress } = useQuery<TierProgress>({
    queryKey: ["/api/driver/tier-progress"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/driver/tier-progress");
      return response.json();
    },
    enabled: !!driverProfile
  });

  // Delivery history query
  const { data: deliveryHistory = [] } = useQuery({
    queryKey: ["/api/driver/deliveries"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/driver/deliveries");
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
          
          if (locationConnected) {
            sendLocationUpdate(coords);
          }
        },
        (error) => console.error("Location error:", error),
        { enableHighAccuracy: true, maximumAge: 10000, timeout: 5000 }
      );

      return () => navigator.geolocation.clearWatch(watchId);
    }
  }, [isOnline, locationConnected, sendLocationUpdate]);

  // Listen for new delivery requests
  useEffect(() => {
    if (deliveryRequests.length > 0 && isOnline) {
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

  // Withdrawal request
  const withdrawalMutation = useMutation({
    mutationFn: async (amount: number) => {
      return apiRequest("POST", "/api/driver/withdraw", { amount });
    },
    onSuccess: () => {
      setShowWithdrawalModal(false);
      toast({ title: "Withdrawal request submitted" });
      queryClient.invalidateQueries({ queryKey: ["/api/driver/earnings"] });
    }
  });

  // Handle new delivery request with timer
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

  const handleProofUpload = (type: 'pickup' | 'delivery') => {
    setProofType(type);
    setShowProofModal(true);
  };

  const submitProof = (proofData: string) => {
    const status = proofType === 'pickup' ? 'PICKED_UP' : 'DELIVERED';
    handleStatusUpdate(status, { type: 'photo', data: proofData });
    setShowProofModal(false);
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

  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'PREMIUM': return 'bg-blue-100 text-blue-800';
      case 'ELITE': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getTierIcon = (tier: string) => {
    switch (tier) {
      case 'PREMIUM': return <Star className="h-4 w-4" />;
      case 'ELITE': return <Trophy className="h-4 w-4" />;
      default: return <User className="h-4 w-4" />;
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
            {driverProfile?.tier && (
              <Badge className={getTierColor(driverProfile.tier)} variant="secondary">
                {getTierIcon(driverProfile.tier)}
                <span className="ml-1">{driverProfile.tier}</span>
              </Badge>
            )}
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
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="orders">Orders</TabsTrigger>
            <TabsTrigger value="tracking">Tracking</TabsTrigger>
            <TabsTrigger value="earnings">Earnings</TabsTrigger>
            <TabsTrigger value="tier">Tier Progress</TabsTrigger>
            <TabsTrigger value="profile">Profile</TabsTrigger>
          </TabsList>

          {/* Orders Management */}
          <TabsContent value="orders" className="space-y-4">
            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Available Orders</CardTitle>
                  <Package className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{deliveryRequests.length}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Today's Deliveries</CardTitle>
                  <CheckCircle className="h-4 w-4 text-green-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{earnings?.completedDeliveries || 0}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Today's Earnings</CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{formatCurrency(earnings?.todayEarnings || 0)}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Rating</CardTitle>
                  <Star className="h-4 w-4 text-yellow-400" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{driverProfile?.rating.toFixed(1) || '0.0'}</div>
                </CardContent>
              </Card>
            </div>

            {activeDelivery ? (
              // Active Delivery Management
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
                  {/* Delivery Progress */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-center text-sm">
                      <span>Progress</span>
                      <span>{Math.round((Object.keys(['ACCEPTED', 'HEADING_TO_PICKUP', 'AT_PICKUP', 'PICKED_UP', 'IN_TRANSIT', 'DELIVERED']).indexOf(activeDelivery.status) + 1) / 6 * 100)}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
                        style={{ width: `${(Object.keys(['ACCEPTED', 'HEADING_TO_PICKUP', 'AT_PICKUP', 'PICKED_UP', 'IN_TRANSIT', 'DELIVERED']).indexOf(activeDelivery.status) + 1) / 6 * 100}%` }}
                      ></div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <h4 className="font-medium">Customer</h4>
                      <p className="text-sm">{activeDelivery.customerName}</p>
                      <p className="text-sm text-gray-600">{activeDelivery.customerPhone}</p>
                    </div>
                    <div>
                      <h4 className="font-medium">Delivery Fee</h4>
                      <p className="text-sm font-semibold text-green-600">{formatCurrency(activeDelivery.deliveryFee)}</p>
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
                      <div className="space-y-1">
                        {activeDelivery.orderItems.map((item, index) => (
                          <p key={index} className="text-sm bg-gray-50 rounded p-2">
                            {item.name} x{item.quantity} {item.unit}
                          </p>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex flex-wrap gap-2 pt-4">
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
                      <Button onClick={() => handleProofUpload('pickup')}>
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
                      <Button onClick={() => handleProofUpload('delivery')}>
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
                    <Button variant="outline">
                      <Navigation className="h-4 w-4 mr-2" />
                      Navigate
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : (
              // Available Orders List
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>Available Orders</span>
                    <Badge variant="secondary">{deliveryRequests.length} available</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {!isOnline ? (
                    <div className="text-center py-8">
                      <PowerOff className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-600 mb-4">You're offline</p>
                      <Button onClick={() => toggleOnlineStatusMutation.mutate(true)}>
                        Go Online to Receive Orders
                      </Button>
                    </div>
                  ) : deliveryRequests.length === 0 ? (
                    <div className="text-center py-8">
                      <Timer className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-600">No orders available</p>
                      <p className="text-sm text-gray-500">Stay online to receive new orders</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {deliveryRequests.map((request) => (
                        <div key={request.id} className="border rounded-lg p-4 space-y-3 hover:shadow-md transition-shadow">
                          <div className="flex justify-between items-start">
                            <div className="flex items-center space-x-2">
                              {getDeliveryTypeIcon(request.deliveryType)}
                              <div className="space-x-2">
                                <Badge className={getDeliveryTypeColor(request.deliveryType)}>
                                  {request.deliveryType}
                                </Badge>
                                {request.urgentDelivery && (
                                  <Badge variant="destructive">Urgent</Badge>
                                )}
                                {request.requiresVerification && (
                                  <Badge variant="outline">
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
                                Order: {formatCurrency(request.orderValue)} • {request.paymentMethod}
                              </p>
                            </div>
                            <Button 
                              size="sm"
                              onClick={() => handleNewDeliveryRequest(request)}
                              disabled={request.requiresVerification && driverProfile?.verificationStatus !== 'VERIFIED'}
                            >
                              Accept Order
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

          {/* Real-time Tracking */}
          <TabsContent value="tracking" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Live Navigation & Tracking</CardTitle>
              </CardHeader>
              <CardContent>
                {activeDelivery ? (
                  <div className="space-y-4">
                    <div className="bg-blue-50 border border-blue-200 rounded p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-semibold">Active Delivery Navigation</h3>
                        <Badge className="bg-blue-100 text-blue-800">
                          {activeDelivery.status.replace('_', ' ')}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600">
                        Navigate to: {activeDelivery.status === 'ACCEPTED' || activeDelivery.status === 'HEADING_TO_PICKUP' 
                          ? activeDelivery.pickupAddress 
                          : activeDelivery.deliveryAddress}
                      </p>
                    </div>

                    {/* Live Map Placeholder */}
                    <div className="w-full h-64 bg-gray-200 rounded-lg flex items-center justify-center">
                      <div className="text-center">
                        <MapPin className="h-12 w-12 mx-auto mb-2 text-gray-400" />
                        <p className="text-sm text-gray-500">Real-time Navigation Map</p>
                        <p className="text-xs text-gray-400">Integrate with Google Maps API</p>
                      </div>
                    </div>

                    {currentLocation && (
                      <div className="bg-green-50 border border-green-200 rounded p-3">
                        <div className="flex items-center space-x-2">
                          <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                          <span className="text-sm font-medium">Live Location Active</span>
                        </div>
                        <p className="text-xs text-gray-600 mt-1">
                          {currentLocation.lat.toFixed(6)}, {currentLocation.lng.toFixed(6)}
                        </p>
                      </div>
                    )}

                    {/* Navigation Controls */}
                    <div className="flex space-x-2">
                      <Button variant="outline" className="flex-1">
                        <Navigation className="h-4 w-4 mr-2" />
                        Open in Maps
                      </Button>
                      <Button variant="outline" className="flex-1">
                        <Phone className="h-4 w-4 mr-2" />
                        Call Customer
                      </Button>
                      <Button variant="outline" className="flex-1">
                        <MessageSquare className="h-4 w-4 mr-2" />
                        Send Update
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Route className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600">No active delivery to track</p>
                    <p className="text-sm text-gray-500">Accept an order to start navigation</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Delivery History */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Deliveries</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {deliveryHistory.slice(0, 5).map((delivery: any, index: number) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                      <div>
                        <p className="text-sm font-medium">Order #{delivery.orderId || `000${index + 1}`}</p>
                        <p className="text-xs text-gray-600">{delivery.deliveryAddress || 'Victoria Island, Lagos'}</p>
                      </div>
                      <div className="text-right">
                        <Badge variant={delivery.status === 'DELIVERED' ? 'default' : 'secondary'}>
                          {delivery.status || 'DELIVERED'}
                        </Badge>
                        <p className="text-xs text-gray-600 mt-1">{formatCurrency(delivery.deliveryFee || 2500)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Earnings Dashboard */}
          <TabsContent value="earnings" className="space-y-4">
            {/* Earnings Overview */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Today</CardTitle>
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{formatCurrency(earnings?.todayEarnings || 0)}</div>
                  <p className="text-xs text-muted-foreground">
                    +{earnings?.completedDeliveries || 0} deliveries
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">This Week</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{formatCurrency(earnings?.weeklyEarnings || 0)}</div>
                  <p className="text-xs text-green-600">
                    <ArrowUp className="h-3 w-3 inline mr-1" />
                    +12% from last week
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">This Month</CardTitle>
                  <BarChart3 className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{formatCurrency(earnings?.monthlyEarnings || 0)}</div>
                  <p className="text-xs text-muted-foreground">
                    Target: ₦200,000
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Available</CardTitle>
                  <CreditCard className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">
                    {formatCurrency((earnings?.todayEarnings || 0) - (earnings?.pendingEarnings || 0))}
                  </div>
                  <Button 
                    size="sm" 
                    className="mt-2 w-full"
                    onClick={() => setShowWithdrawalModal(true)}
                  >
                    Withdraw
                  </Button>
                </CardContent>
              </Card>
            </div>

            {/* Earnings Breakdown */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Earnings Breakdown</span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowEarningsFilter(!showEarningsFilter)}
                  >
                    <Filter className="h-4 w-4 mr-2" />
                    Filter
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {showEarningsFilter && (
                  <div className="flex space-x-2 mb-4">
                    {['today', 'week', 'month'].map((period) => (
                      <Button
                        key={period}
                        variant={earningsFilter === period ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setEarningsFilter(period)}
                      >
                        {period.charAt(0).toUpperCase() + period.slice(1)}
                      </Button>
                    ))}
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-sm">Base Earnings</span>
                      <span className="font-semibold">
                        {formatCurrency((earnings?.todayEarnings || 0) - (earnings?.bonusEarnings || 0))}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Bonus Earnings</span>
                      <span className="font-semibold text-green-600">
                        +{formatCurrency(earnings?.bonusEarnings || 0)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Tips</span>
                      <span className="font-semibold text-blue-600">
                        +{formatCurrency(Math.round((earnings?.todayEarnings || 0) * 0.1))}
                      </span>
                    </div>
                    <div className="flex justify-between border-t pt-2">
                      <span className="font-medium">Total</span>
                      <span className="font-bold text-lg">
                        {formatCurrency(earnings?.todayEarnings || 0)}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-sm">Completed Deliveries</span>
                      <span className="font-semibold">{earnings?.completedDeliveries || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Avg. per Delivery</span>
                      <span className="font-semibold">
                        {formatCurrency(earnings?.completedDeliveries ? (earnings.todayEarnings / earnings.completedDeliveries) : 0)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Pending Clearance</span>
                      <span className="font-semibold text-orange-600">
                        {formatCurrency(earnings?.pendingEarnings || 0)}
                      </span>
                    </div>
                    <div className="flex justify-between border-t pt-2">
                      <span className="font-medium">Available for Withdrawal</span>
                      <span className="font-bold text-green-600">
                        {formatCurrency((earnings?.todayEarnings || 0) - (earnings?.pendingEarnings || 0))}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Performance Metrics */}
                <div className="border-t pt-4">
                  <h4 className="font-medium mb-3">Performance Metrics</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-sm">On-time Rate</span>
                        <span className="text-sm font-medium">{earnings?.onTimeDeliveryRate || 0}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-green-600 h-2 rounded-full" 
                          style={{ width: `${earnings?.onTimeDeliveryRate || 0}%` }}
                        ></div>
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-sm">Customer Rating</span>
                        <span className="text-sm font-medium">{driverProfile?.rating.toFixed(1) || '0.0'}/5.0</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-yellow-500 h-2 rounded-full" 
                          style={{ width: `${((driverProfile?.rating || 0) / 5) * 100}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tier Progress */}
          <TabsContent value="tier" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Trophy className="h-5 w-5 text-yellow-500" />
                  <span>Driver Tier Progress</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Current Tier */}
                <div className="text-center">
                  <div className="inline-flex items-center space-x-2 mb-2">
                    {getTierIcon(tierProgress?.currentTier || 'STANDARD')}
                    <Badge className={getTierColor(tierProgress?.currentTier || 'STANDARD')} variant="secondary">
                      {tierProgress?.currentTier || 'STANDARD'} DRIVER
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-600">Your current tier status</p>
                </div>

                {/* Progress to Next Tier */}
                {tierProgress?.nextTier && (
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium">Progress to {tierProgress.nextTier}</span>
                      <span className="text-sm font-medium">{tierProgress.progress}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3">
                      <div 
                        className="bg-gradient-to-r from-blue-500 to-purple-600 h-3 rounded-full transition-all duration-500" 
                        style={{ width: `${tierProgress.progress}%` }}
                      ></div>
                    </div>
                  </div>
                )}

                {/* Requirements */}
                <div>
                  <h4 className="font-medium mb-3">Requirements to Advance</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {tierProgress?.requirementsNeeded.deliveries && (
                      <div className="bg-blue-50 border border-blue-200 rounded p-3">
                        <div className="flex items-center justify-between">
                          <span className="text-sm">Deliveries Completed</span>
                          <div className="text-right">
                            <span className="text-sm font-medium">
                              {driverProfile?.totalDeliveries || 0}/{tierProgress.requirementsNeeded.deliveries}
                            </span>
                            <div className="w-16 bg-blue-200 rounded-full h-1 mt-1">
                              <div 
                                className="bg-blue-600 h-1 rounded-full" 
                                style={{ width: `${Math.min(((driverProfile?.totalDeliveries || 0) / tierProgress.requirementsNeeded.deliveries) * 100, 100)}%` }}
                              ></div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {tierProgress?.requirementsNeeded.rating && (
                      <div className="bg-yellow-50 border border-yellow-200 rounded p-3">
                        <div className="flex items-center justify-between">
                          <span className="text-sm">Customer Rating</span>
                          <div className="text-right">
                            <span className="text-sm font-medium">
                              {driverProfile?.rating.toFixed(1) || '0.0'}/{tierProgress.requirementsNeeded.rating}
                            </span>
                            <div className="w-16 bg-yellow-200 rounded-full h-1 mt-1">
                              <div 
                                className="bg-yellow-600 h-1 rounded-full" 
                                style={{ width: `${Math.min(((driverProfile?.rating || 0) / tierProgress.requirementsNeeded.rating) * 100, 100)}%` }}
                              ></div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {tierProgress?.requirementsNeeded.earnings && (
                      <div className="bg-green-50 border border-green-200 rounded p-3">
                        <div className="flex items-center justify-between">
                          <span className="text-sm">Monthly Earnings</span>
                          <div className="text-right">
                            <span className="text-sm font-medium">
                              {formatCurrency(earnings?.monthlyEarnings || 0)}/{formatCurrency(tierProgress.requirementsNeeded.earnings)}
                            </span>
                            <div className="w-16 bg-green-200 rounded-full h-1 mt-1">
                              <div 
                                className="bg-green-600 h-1 rounded-full" 
                                style={{ width: `${Math.min(((earnings?.monthlyEarnings || 0) / tierProgress.requirementsNeeded.earnings) * 100, 100)}%` }}
                              ></div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {tierProgress?.requirementsNeeded.onTimeRate && (
                      <div className="bg-purple-50 border border-purple-200 rounded p-3">
                        <div className="flex items-center justify-between">
                          <span className="text-sm">On-time Rate</span>
                          <div className="text-right">
                            <span className="text-sm font-medium">
                              {earnings?.onTimeDeliveryRate || 0}%/{tierProgress.requirementsNeeded.onTimeRate}%
                            </span>
                            <div className="w-16 bg-purple-200 rounded-full h-1 mt-1">
                              <div 
                                className="bg-purple-600 h-1 rounded-full" 
                                style={{ width: `${Math.min(((earnings?.onTimeDeliveryRate || 0) / tierProgress.requirementsNeeded.onTimeRate) * 100, 100)}%` }}
                              ></div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Current Benefits */}
                <div>
                  <h4 className="font-medium mb-3">Current Tier Benefits</h4>
                  <div className="space-y-2">
                    {tierProgress?.benefits.map((benefit, index) => (
                      <div key={index} className="flex items-center space-x-2">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        <span className="text-sm">{benefit}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Next Tier Benefits */}
                {tierProgress?.nextTierBenefits && (
                  <div>
                    <h4 className="font-medium mb-3">Unlock with {tierProgress.nextTier} Tier</h4>
                    <div className="space-y-2">
                      {tierProgress.nextTierBenefits.map((benefit, index) => (
                        <div key={index} className="flex items-center space-x-2">
                          <Gift className="h-4 w-4 text-blue-600" />
                          <span className="text-sm text-gray-600">{benefit}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Driver Profile */}
          <TabsContent value="profile" className="space-y-4">
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
                    <Label className="text-sm font-medium">Vehicle Model</Label>
                    <p className="text-sm">{driverProfile?.vehicleModel || 'Not specified'}</p>
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
                  <div>
                    <Label className="text-sm font-medium">Total Deliveries</Label>
                    <p className="text-sm font-semibold">{driverProfile?.totalDeliveries || 0}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Customer Rating</Label>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-semibold">{driverProfile?.rating.toFixed(1) || '0.0'}</span>
                      <div className="flex">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star 
                            key={star} 
                            className={`h-4 w-4 ${star <= (driverProfile?.rating || 0) ? 'text-yellow-400 fill-current' : 'text-gray-300'}`} 
                          />
                        ))}
                      </div>
                      <span className="text-xs text-gray-500">({driverProfile?.reviewCount || 0} reviews)</span>
                    </div>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Total Earnings</Label>
                    <p className="text-sm font-semibold text-green-600">
                      {formatCurrency(driverProfile?.totalEarnings || 0)}
                    </p>
                  </div>
                </div>

                {driverProfile?.verificationStatus !== 'VERIFIED' && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded p-4">
                    <div className="flex items-center space-x-2 mb-2">
                      <AlertTriangle className="h-5 w-5 text-yellow-600" />
                      <span className="font-medium text-yellow-800">Account Verification Required</span>
                    </div>
                    <p className="text-sm text-yellow-700 mb-3">
                      Complete your KYC verification to access all delivery types and premium features.
                    </p>
                    <Button size="sm" onClick={() => setLocation("/kyc-verification")}>
                      Complete Verification
                    </Button>
                  </div>
                )}

                <div className="flex space-x-2">
                  <Button variant="outline" onClick={() => setLocation("/edit-profile")}>
                    <Settings className="h-4 w-4 mr-2" />
                    Edit Profile
                  </Button>
                  <Button variant="outline" onClick={() => setLocation("/driver-registration")}>
                    <Upload className="h-4 w-4 mr-2" />
                    Update Documents
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Delivery Request Modal */}
      <Dialog open={showRequestModal} onOpenChange={setShowRequestModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>New Delivery Request</span>
              {requestTimer && (
                <Badge variant="destructive" className="text-lg font-bold">
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
                <p className="text-sm"><strong>Phone:</strong> {selectedRequest.customerPhone}</p>
                <p className="text-sm"><strong>Order Value:</strong> {formatCurrency(selectedRequest.orderValue)}</p>
                {selectedRequest.specialInstructions && (
                  <p className="text-sm"><strong>Instructions:</strong> {selectedRequest.specialInstructions}</p>
                )}
              </div>

              {selectedRequest.urgentDelivery && (
                <div className="bg-red-50 border border-red-200 rounded p-2">
                  <div className="flex items-center space-x-2">
                    <Zap className="h-4 w-4 text-red-500" />
                    <span className="text-sm text-red-700 font-medium">Urgent Delivery - Higher Pay!</span>
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
                  Accept ({formatCurrency(selectedRequest.deliveryFee)})
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

      {/* Proof Upload Modal */}
      <Dialog open={showProofModal} onOpenChange={setShowProofModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Upload {proofType === 'pickup' ? 'Pickup' : 'Delivery'} Proof
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="text-center">
              <Camera className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-sm text-gray-600 mb-4">
                Take a photo to confirm {proofType === 'pickup' ? 'item pickup' : 'successful delivery'}
              </p>
              <Button onClick={() => submitProof('photo_proof_data')}>
                <Camera className="h-4 w-4 mr-2" />
                Take Photo
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Withdrawal Modal */}
      <Dialog open={showWithdrawalModal} onOpenChange={setShowWithdrawalModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Withdraw Earnings</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-green-600">
                {formatCurrency((earnings?.todayEarnings || 0) - (earnings?.pendingEarnings || 0))}
              </p>
              <p className="text-sm text-gray-600">Available for withdrawal</p>
            </div>
            <div className="space-y-2">
              <Button 
                className="w-full" 
                onClick={() => withdrawalMutation.mutate((earnings?.todayEarnings || 0) - (earnings?.pendingEarnings || 0))}
              >
                <CreditCard className="h-4 w-4 mr-2" />
                Withdraw to Bank Account
              </Button>
              <p className="text-xs text-gray-500 text-center">
                Funds will be transferred within 24 hours
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
