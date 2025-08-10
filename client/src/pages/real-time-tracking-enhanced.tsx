
import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/use-auth';
import { useWebSocket } from '@/hooks/use-websocket';
import { MapPin, Clock, Truck, User, Phone, MessageCircle, Navigation, AlertTriangle } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface Location {
  latitude: number;
  longitude: number;
  accuracy?: number;
  timestamp: number;
}

interface LiveOrder {
  id: string;
  status: string;
  customerName: string;
  customerPhone: string;
  driverName?: string;
  driverPhone?: string;
  pickupLocation: string;
  deliveryLocation: string;
  estimatedTime: string;
  currentLocation?: Location;
  driverLocation?: Location;
  items: Array<{
    name: string;
    quantity: number;
    price: number;
  }>;
  totalAmount: number;
  createdAt: string;
  updatedAt: string;
}

export default function RealTimeTrackingEnhanced() {
  const { user } = useAuth();
  const [activeOrders, setActiveOrders] = useState<LiveOrder[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<LiveOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [userLocation, setUserLocation] = useState<Location | null>(null);
  const [trackingEnabled, setTrackingEnabled] = useState(false);

  const { socket, isConnected } = useWebSocket({
    onOrderUpdate: (data: any) => {
      setActiveOrders(prev => prev.map(order => 
        order.id === data.orderId ? { ...order, ...data.updates } : order
      ));
      
      if (selectedOrder?.id === data.orderId) {
        setSelectedOrder(prev => prev ? { ...prev, ...data.updates } : null);
      }
      
      toast({
        title: "Order Updated",
        description: `Order #${data.orderId.slice(-6)} status: ${data.status}`,
      });
    },
    onLocationUpdate: (data: any) => {
      setActiveOrders(prev => prev.map(order => 
        order.id === data.orderId ? { 
          ...order, 
          driverLocation: data.location,
          estimatedTime: data.estimatedTime || order.estimatedTime
        } : order
      ));
    }
  });

  const getCurrentLocation = useCallback(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const location: Location = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            timestamp: Date.now()
          };
          setUserLocation(location);
          
          // Send location update if tracking is enabled
          if (trackingEnabled && socket) {
            socket.emit('location_update', {
              location,
              userId: user?.id,
              userRole: user?.role
            });
          }
        },
        (error) => {
          console.error('Location error:', error);
          toast({
            title: "Location Error",
            description: "Could not get your current location",
            variant: "destructive"
          });
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
      );
    }
  }, [socket, user, trackingEnabled]);

  const loadActiveOrders = async () => {
    try {
      const response = await fetch('/api/orders/active', {
        credentials: 'include'
      });

      if (!response.ok) throw new Error('Failed to load orders');

      const data = await response.json();
      setActiveOrders(data.orders || []);
    } catch (error) {
      console.error('Error loading orders:', error);
      toast({
        title: "Error",
        description: "Failed to load active orders",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    try {
      const response = await fetch('/api/orders/update-status', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          orderId,
          status: newStatus,
          location: userLocation
        })
      });

      if (!response.ok) throw new Error('Failed to update status');

      toast({
        title: "Status Updated",
        description: `Order status updated to ${newStatus}`,
      });
    } catch (error) {
      console.error('Error updating status:', error);
      toast({
        title: "Error",
        description: "Failed to update order status",
        variant: "destructive"
      });
    }
  };

  const toggleLocationTracking = () => {
    setTrackingEnabled(!trackingEnabled);
    if (!trackingEnabled) {
      getCurrentLocation();
    }
  };

  const contactCustomer = (phoneNumber: string) => {
    window.location.href = `tel:${phoneNumber}`;
  };

  const openChatWithCustomer = (orderId: string, customerId: string) => {
    window.location.href = `/chat?orderId=${orderId}&participantId=${customerId}`;
  };

  useEffect(() => {
    loadActiveOrders();
  }, []);

  useEffect(() => {
    if (trackingEnabled) {
      const interval = setInterval(getCurrentLocation, 30000); // Update every 30 seconds
      return () => clearInterval(interval);
    }
  }, [trackingEnabled, getCurrentLocation]);

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'confirmed': return 'bg-blue-100 text-blue-800';
      case 'picked_up': return 'bg-purple-100 text-purple-800';
      case 'in_transit': return 'bg-orange-100 text-orange-800';
      case 'delivered': return 'bg-green-100 text-green-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getNextStatusOptions = (currentStatus: string) => {
    switch (currentStatus.toLowerCase()) {
      case 'confirmed': return ['picked_up'];
      case 'picked_up': return ['in_transit'];
      case 'in_transit': return ['delivered'];
      default: return [];
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-4xl mx-auto">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-200 rounded w-1/4"></div>
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-32 bg-gray-200 rounded-xl"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Live Order Tracking</h1>
            <p className="text-gray-600">Monitor and update orders in real-time</p>
          </div>
          
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2">
              <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-400' : 'bg-red-400'}`}></div>
              <span className="text-sm text-gray-600">
                {isConnected ? 'Connected' : 'Disconnected'}
              </span>
            </div>
            
            <Button
              onClick={toggleLocationTracking}
              variant={trackingEnabled ? "default" : "outline"}
              size="sm"
            >
              <Navigation className="h-4 w-4 mr-2" />
              {trackingEnabled ? 'Tracking On' : 'Enable Tracking'}
            </Button>
          </div>
        </div>

        {/* Active Orders Grid */}
        <div className="grid gap-4 md:grid-cols-2">
          {activeOrders.length === 0 ? (
            <div className="col-span-2 text-center py-8">
              <Truck className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900">No active orders</h3>
              <p className="text-gray-600">Active orders will appear here</p>
            </div>
          ) : (
            activeOrders.map(order => (
              <Card key={order.id} className="hover:shadow-lg transition-shadow cursor-pointer">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">Order #{order.id.slice(-6)}</CardTitle>
                    <Badge className={getStatusColor(order.status)}>
                      {order.status.replace('_', ' ')}
                    </Badge>
                  </div>
                </CardHeader>
                
                <CardContent className="space-y-4">
                  {/* Customer Info */}
                  <div className="flex items-center space-x-3">
                    <User className="h-4 w-4 text-gray-400" />
                    <div>
                      <p className="font-medium">{order.customerName}</p>
                      <p className="text-sm text-gray-600">{order.customerPhone}</p>
                    </div>
                  </div>

                  {/* Location Info */}
                  <div className="space-y-2">
                    <div className="flex items-start space-x-3">
                      <MapPin className="h-4 w-4 text-green-600 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium">Pickup</p>
                        <p className="text-sm text-gray-600">{order.pickupLocation}</p>
                      </div>
                    </div>
                    <div className="flex items-start space-x-3">
                      <MapPin className="h-4 w-4 text-red-600 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium">Delivery</p>
                        <p className="text-sm text-gray-600">{order.deliveryLocation}</p>
                      </div>
                    </div>
                  </div>

                  {/* Order Items Summary */}
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <p className="text-sm font-medium mb-1">Items ({order.items.length})</p>
                    <div className="space-y-1">
                      {order.items.slice(0, 2).map((item, index) => (
                        <p key={index} className="text-xs text-gray-600">
                          {item.quantity}x {item.name}
                        </p>
                      ))}
                      {order.items.length > 2 && (
                        <p className="text-xs text-gray-500">+{order.items.length - 2} more items</p>
                      )}
                    </div>
                    <p className="text-sm font-medium mt-2">Total: ₦{order.totalAmount.toLocaleString()}</p>
                  </div>

                  {/* ETA */}
                  <div className="flex items-center space-x-2">
                    <Clock className="h-4 w-4 text-gray-400" />
                    <span className="text-sm text-gray-600">ETA: {order.estimatedTime}</span>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex space-x-2">
                    <Button
                      onClick={() => contactCustomer(order.customerPhone)}
                      variant="outline"
                      size="sm"
                      className="flex-1"
                    >
                      <Phone className="h-4 w-4 mr-1" />
                      Call
                    </Button>
                    
                    <Button
                      onClick={() => openChatWithCustomer(order.id, order.customerName)}
                      variant="outline"
                      size="sm"
                      className="flex-1"
                    >
                      <MessageCircle className="h-4 w-4 mr-1" />
                      Chat
                    </Button>
                  </div>

                  {/* Status Update Buttons */}
                  {getNextStatusOptions(order.status).length > 0 && (
                    <div className="space-y-2">
                      {getNextStatusOptions(order.status).map(status => (
                        <Button
                          key={status}
                          onClick={() => updateOrderStatus(order.id, status)}
                          className="w-full"
                          size="sm"
                        >
                          Mark as {status.replace('_', ' ')}
                        </Button>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Location Status */}
        {userLocation && (
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <MapPin className="h-4 w-4 text-blue-600" />
                <span className="text-sm font-medium text-blue-900">Current Location</span>
              </div>
              <p className="text-sm text-blue-700 mt-1">
                Lat: {userLocation.latitude.toFixed(6)}, Lng: {userLocation.longitude.toFixed(6)}
                {userLocation.accuracy && ` (±${Math.round(userLocation.accuracy)}m)`}
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
