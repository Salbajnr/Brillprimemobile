
import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { ArrowLeft, MapPin, Clock, Phone, MessageSquare, Fuel, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useWebSocketLocation, useWebSocketOrders } from "@/hooks/use-websocket";
import LiveMap from "@/components/ui/live-map";

interface OrderTracking {
  id: string;
  status: string;
  customerName: string;
  customerPhone: string;
  driverName: string;
  driverPhone: string;
  fuelType: string;
  quantity: number;
  pickupLocation: string;
  deliveryLocation: string;
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
  const { connected, orderUpdates } = useWebSocketOrders();
  const { orderLocations } = useWebSocketLocation();
  
  const [order, setOrder] = useState<OrderTracking | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Get order ID from URL
  useEffect(() => {
    const urlPath = window.location.pathname;
    const orderId = urlPath.split('/').pop();
    
    if (orderId) {
      // Mock order tracking data
      setTimeout(() => {
        setOrder({
          id: orderId,
          status: 'OUT_FOR_DELIVERY',
          customerName: 'John Doe',
          customerPhone: '+234 801 234 5678',
          driverName: 'Ahmed Hassan',
          driverPhone: '+234 803 123 4567',
          fuelType: 'PMS',
          quantity: 20,
          pickupLocation: 'Total Energies Wuse II',
          deliveryLocation: '123 Main Street, Wuse II, Abuja',
          currentLocation: {
            latitude: 9.0765,
            longitude: 7.3986
          },
          estimatedArrival: '10 mins',
          timeline: [
            {
              status: 'CONFIRMED',
              message: 'Order confirmed and being prepared',
              timestamp: new Date(Date.now() - 20 * 60 * 1000),
              completed: true
            },
            {
              status: 'PREPARING',
              message: 'Fuel is being loaded for delivery',
              timestamp: new Date(Date.now() - 15 * 60 * 1000),
              completed: true
            },
            {
              status: 'OUT_FOR_DELIVERY',
              message: 'Driver is on the way to your location',
              timestamp: new Date(Date.now() - 10 * 60 * 1000),
              completed: true
            },
            {
              status: 'DELIVERED',
              message: 'Order will be delivered soon',
              timestamp: new Date(),
              completed: false
            }
          ]
        });
        setIsLoading(false);
      }, 1000);
    }
  }, []);

  // Update order location from WebSocket
  useEffect(() => {
    if (order && orderLocations[order.id]) {
      const newLocation = orderLocations[order.id];
      setOrder(prev => prev ? {
        ...prev,
        currentLocation: {
          latitude: newLocation.latitude,
          longitude: newLocation.longitude
        }
      } : null);
    }
  }, [orderLocations, order]);

  // Update order status from WebSocket
  useEffect(() => {
    if (orderUpdates.length > 0 && order) {
      const latestUpdate = orderUpdates[orderUpdates.length - 1];
      if (latestUpdate.orderId === order.id) {
        setOrder(prev => prev ? { ...prev, status: latestUpdate.status } : null);
      }
    }
  }, [orderUpdates, order]);

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
          </CardContent>
        </Card>

        {/* Live Map */}
        <Card>
          <CardContent className="p-4">
            <h3 className="font-semibold text-[#131313] mb-3">Live Location</h3>
            <div className="h-48 rounded-lg overflow-hidden">
              <LiveMap
                showUserLocation={true}
                showNearbyUsers={true}
                className="w-full h-full"
                userRole="CONSUMER"
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
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span>Online</span>
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
