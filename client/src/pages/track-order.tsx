
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
import { useState, useEffect } from "react";
import { useLocation, useParams } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, MapPin, Clock, Phone, Navigation, CheckCircle } from "lucide-react";

interface TrackingStep {
  id: string;
  title: string;
  description: string;
  completed: boolean;
  timestamp?: string;
}

export default function TrackOrderPage() {
  const { orderId } = useParams();
  const [, setLocation] = useLocation();
  const [currentStep, setCurrentStep] = useState(2);

  const trackingSteps: TrackingStep[] = [
    {
      id: "confirmed",
      title: "Order Confirmed",
      description: "Your order has been confirmed and payment processed",
      completed: true,
      timestamp: "2:30 PM"
    },
    {
      id: "preparing",
      title: "Preparing Order",
      description: "Driver is at the fuel station preparing your order",
      completed: true,
      timestamp: "2:35 PM"
    },
    {
      id: "en_route",
      title: "On the Way",
      description: "Driver is heading to your location",
      completed: currentStep >= 2,
      timestamp: currentStep >= 2 ? "2:45 PM" : undefined
    },
    {
      id: "delivered",
      title: "Delivered",
      description: "Order has been delivered successfully",
      completed: currentStep >= 3,
      timestamp: currentStep >= 3 ? "3:00 PM" : undefined
    }
  ];

  // Mock real-time updates
  useEffect(() => {
    const timer = setTimeout(() => {
      if (currentStep < 3) {
        setCurrentStep(currentStep + 1);
      }
    }, 10000); // Update every 10 seconds for demo

    return () => clearTimeout(timer);
  }, [currentStep]);

  const orderData = {
    id: orderId,
    driverName: "John Adebayo",
    driverPhone: "+234 809 123 4567",
    vehicleNumber: "LAG 123 ABC",
    estimatedArrival: "5 minutes",
    currentLocation: "Victoria Island",
    totalAmount: 1950
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setLocation("/consumer-home")}
            className="p-2"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-lg font-semibold">Track Order</h1>
            <p className="text-sm text-gray-600">Order #{orderData.id}</p>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Current Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Order Status</span>
              <Badge variant={currentStep >= 3 ? "default" : "secondary"}>
                {currentStep >= 3 ? "Delivered" : "In Transit"}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center">
              {currentStep < 3 ? (
                <div>
                  <Clock className="h-12 w-12 text-blue-600 mx-auto mb-2" />
                  <p className="font-medium">Driver is on the way</p>
                  <p className="text-sm text-gray-600">
                    Estimated arrival: <span className="font-semibold">{orderData.estimatedArrival}</span>
                  </p>
                </div>
              ) : (
                <div>
                  <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-2" />
                  <p className="font-medium text-green-600">Order Delivered!</p>
                  <p className="text-sm text-gray-600">Thank you for your order</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Driver Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Navigation className="h-5 w-5 text-blue-600" />
              Driver Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <div>
                  <p className="font-medium">{orderData.driverName}</p>
                  <p className="text-sm text-gray-600">Vehicle: {orderData.vehicleNumber}</p>
                  <p className="text-sm text-gray-600">Current location: {orderData.currentLocation}</p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.open(`tel:${orderData.driverPhone}`)}
                >
                  <Phone className="h-4 w-4 mr-2" />
                  Call
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Live Map Placeholder */}
        <Card>
          <CardHeader>
            <CardTitle>Live Tracking</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-gray-100 h-48 rounded-lg flex items-center justify-center">
              <div className="text-center">
                <MapPin className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                <p className="text-gray-600">Live map tracking</p>
                <p className="text-sm text-gray-500">Real-time driver location</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tracking Timeline */}
        <Card>
          <CardHeader>
            <CardTitle>Order Timeline</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {trackingSteps.map((step, index) => (
                <div key={step.id} className="flex items-start gap-3">
                  <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                    step.completed 
                      ? "bg-blue-600 border-blue-600" 
                      : "border-gray-300"
                  }`}>
                    {step.completed && (
                      <CheckCircle className="h-3 w-3 text-white" />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className={`font-medium ${
                          step.completed ? "text-blue-600" : "text-gray-500"
                        }`}>
                          {step.title}
                        </p>
                        <p className="text-sm text-gray-600">{step.description}</p>
                      </div>
                      {step.timestamp && (
                        <span className="text-xs text-gray-500">{step.timestamp}</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="space-y-3">
          {currentStep < 3 ? (
            <Button
              variant="outline"
              className="w-full"
              onClick={() => setLocation("/support")}
            >
              Need Help?
            </Button>
          ) : (
            <div className="space-y-2">
              <Button
                className="w-full bg-green-600 hover:bg-green-700"
                onClick={() => setLocation("/order-history")}
              >
                View Order History
              </Button>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => setLocation("/consumer-home")}
              >
                Back to Home
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
