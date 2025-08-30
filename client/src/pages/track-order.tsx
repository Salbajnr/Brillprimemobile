import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { ArrowLeft, MapPin, Clock, Phone, MessageSquare, Fuel, CheckCircle, Truck, Navigation } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useWebSocketDriverTracking, useWebSocketOrders } from "@/hooks/use-websocket";
import LiveMap from "@/components/ui/live-map";

interface OrderTracking {
  id: string;
  status: string;
  customerName: string;
  customerPhone: string;
  driverName: string;
  driverPhone: string;
  driverId: string;
  fuelType: string;
  quantity: number;
  pickupLocation: string;
  deliveryLocation: string;
  deliveryLatitude: number;
  deliveryLongitude: number;
  currentLocation?: {
    latitude: number;
    longitude: number;
  };
  estimatedArrival: string;
  timeline: {
    status: string;
    message: string;
    timestamp: Date;
    completed: boolean;
  }[];
}

export default function TrackOrder() {
  const [, setLocation] = useLocation();
  const { 
    connected: trackingConnected,
    driverLocations,
    etaUpdates,
    subscribeToDriverTracking
  } = useWebSocketDriverTracking();
  const { orderUpdates } = useWebSocketOrders();

  const [order, setOrder] = useState<OrderTracking | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Get order ID from URL
  const orderId = window.location.pathname.split('/').pop();

  // Fetch order tracking data from API
  useEffect(() => {
    const fetchOrderTracking = async () => {
      if (!orderId) return;

      try {
        const response = await fetch(`/api/tracking/order/${orderId}`, {
          credentials: 'include'
        });

        if (response.ok) {
          const data = await response.json();
          setOrder(data.tracking);
        } else {
          console.error('Failed to fetch order tracking data');
        }
      } catch (error) {
        console.error('Error fetching order tracking:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchOrderTracking();
  }, [orderId]);

  // Subscribe to real-time driver tracking
  useEffect(() => {
    if (trackingConnected && orderId) {
      subscribeToDriverTracking(orderId);
    }
  }, [trackingConnected, orderId, subscribeToDriverTracking]);

  // Update order location from WebSocket
  useEffect(() => {
    if (order && driverLocations[order.id]) {
      const locationData = driverLocations[order.id];
      setOrder(prev => prev ? {
        ...prev,
        currentLocation: {
          latitude: locationData.location.lat,
          longitude: locationData.location.lng
        },
        estimatedArrival: locationData.eta || prev.estimatedArrival
      } : null);
    }
  }, [driverLocations, order]);

  // Update order status from WebSocket
  useEffect(() => {
    if (orderUpdates[orderId || ''] && order) {
      const update = orderUpdates[orderId || ''];
      setOrder(prev => prev ? { ...prev, status: update.status } : null);
    }
  }, [orderUpdates, orderId, order]);

  // Update ETA from WebSocket
  useEffect(() => {
    if (etaUpdates[orderId || ''] && order) {
      const etaData = etaUpdates[orderId || ''];
      setOrder(prev => prev ? { 
        ...prev, 
        estimatedArrival: etaData.eta || prev.estimatedArrival 
      } : null);
    }
  }, [etaUpdates, orderId, order]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'CONFIRMED': return 'bg-blue-100 text-blue-800';
      case 'PREPARING': return 'bg-yellow-100 text-yellow-800';
      case 'OUT_FOR_DELIVERY': return 'bg-orange-100 text-orange-800';
      case 'DELIVERED': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading order tracking...</p>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">Order not found</p>
          <Button onClick={() => setLocation("/order-history")} className="mt-4">
            View Order History
          </Button>
        </div>
      </div>
    );
  }

  // Prepare map markers
  const mapMarkers = [
    {
      lat: order.deliveryLatitude,
      lng: order.deliveryLongitude,
      title: 'Delivery Location',
      type: 'delivery' as const
    }
  ];

  if (order.currentLocation) {
    mapMarkers.push({
      lat: order.currentLocation.latitude,
      lng: order.currentLocation.longitude,
      title: `Driver: ${order.driverName}`,
      type: 'delivery' as const
    });
  }

  return (
    <div className="min-h-screen bg-gray-50 w-full max-w-md mx-auto">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="flex items-center justify-between p-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setLocation("/order-history")}
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-lg font-semibold text-[#131313]">Track Order</h1>
          <div className="w-10"></div>
        </div>
      </div>

      <div className="p-4 space-y-6">
        {/* Order Status */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-[#131313]">Order #{order.id.slice(-6)}</h3>
              <Badge className={getStatusColor(order.status)}>
                {order.status.replace('_', ' ')}
              </Badge>
            </div>
            <div className="flex items-center space-x-2 text-sm text-gray-500">
              <Clock className="w-4 h-4" />
              <span>Estimated arrival: {order.estimatedArrival}</span>
            </div>
            {trackingConnected && (
              <div className="flex items-center space-x-2 text-xs text-green-600 mt-2">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span>Live tracking active</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Live Map */}
        <Card>
          <CardContent className="p-4">
            <h3 className="font-semibold text-[#131313] mb-3">Live Location</h3>
            <div className="h-64 rounded-lg overflow-hidden">
              <LiveMap
                showUserLocation={false}
                showNearbyUsers={false}
                className="w-full h-full"
                userRole="CONSUMER"
                center={order.currentLocation ? 
                  { lat: order.currentLocation.latitude, lng: order.currentLocation.longitude } :
                  { lat: order.deliveryLatitude, lng: order.deliveryLongitude }
                }
                markers={mapMarkers}
                showRoute={order.currentLocation ? {
                  start: { lat: order.currentLocation.latitude, lng: order.currentLocation.longitude },
                  end: { lat: order.deliveryLatitude, lng: order.deliveryLongitude }
                } : undefined}
              />
            </div>
          </CardContent>
        </Card>

        {/* Driver Info */}
        <Card>
          <CardContent className="p-4">
            <h3 className="font-semibold text-[#131313] mb-3">Your Driver</h3>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-[#4682b4] rounded-full flex items-center justify-center">
                  <span className="text-white font-medium">
                    {order.driverName.charAt(0)}
                  </span>
                </div>
                <div>
                  <p className="font-medium text-[#131313]">{order.driverName}</p>
                  <p className="text-sm text-gray-600">Fuel Delivery Driver</p>
                  <div className="flex items-center space-x-1 text-xs text-green-600">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    <span>Live tracking</span>
                  </div>
                </div>
              </div>
              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => window.location.href = `tel:${order.driverPhone}`}
                >
                  <Phone className="w-4 h-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setLocation(`/chat/driver/${order.id}`)}
                >
                  <MessageSquare className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Order Timeline */}
        <Card>
          <CardContent className="p-4">
            <h3 className="font-semibold text-[#131313] mb-4">Order Timeline</h3>
            <div className="space-y-4">
              {order.timeline.map((item, index) => (
                <div key={index} className="flex items-start space-x-3">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                    item.completed ? 'bg-green-500' : 'bg-gray-300'
                  }`}>
                    {item.completed ? (
                      <CheckCircle className="w-4 h-4 text-white" />
                    ) : (
                      <div className="w-2 h-2 bg-white rounded-full"></div>
                    )}
                  </div>
                  <div className="flex-1">
                    <p className={`font-medium ${
                      item.completed ? 'text-[#131313]' : 'text-gray-400'
                    }`}>
                      {item.message}
                    </p>
                    <p className="text-xs text-gray-500">
                      {formatTime(item.timestamp)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Order Details */}
        <Card>
          <CardContent className="p-4">
            <h3 className="font-semibold text-[#131313] mb-3">Order Details</h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">Fuel Type</span>
                <span className="font-medium">{order.fuelType}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Quantity</span>
                <span className="font-medium">{order.quantity}L</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Pickup</span>
                <span className="font-medium text-right">{order.pickupLocation}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Delivery</span>
                <span className="font-medium text-right">{order.deliveryLocation}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Delivery Feedback - Show only when delivered */}
        {order.status === 'DELIVERED' && (
          <Card className="border-green-200 bg-green-50">
            <CardContent className="p-4">
              <h3 className="font-semibold text-green-800 mb-2">Rate Your Delivery</h3>
              <p className="text-sm text-green-700 mb-3">
                How was your delivery experience with {order.driverName}?
              </p>
              <div className="flex items-center justify-center space-x-1 mb-3">
                {[1, 2, 3, 4, 5].map((star) => (
                  <span key={star} className="text-2xl text-yellow-400">⭐</span>
                ))}
              </div>
              <Button
                className="w-full bg-green-600 hover:bg-green-700"
                onClick={() => setLocation(`/rate-delivery/${order.id}`)}
              >
                Rate This Delivery
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Emergency Contact */}
        <Card className="border-red-200">
          <CardContent className="p-4">
            <h3 className="font-semibold text-red-600 mb-2">Need Help?</h3>
            <p className="text-sm text-gray-600 mb-3">
              If you have any issues with your delivery, contact our support team.
            </p>
            <Button
              variant="outline"
              className="w-full border-red-200 text-red-600 hover:bg-red-50"
              onClick={() => setLocation("/support")}
            >
              Contact Support
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}