import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { CheckCircle, MapPin, Clock, Fuel, Phone, MessageSquare, Navigation } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/use-auth";
import { useWebSocketOrders, useWebSocketPayments } from "@/hooks/use-websocket";
import LiveMap from "@/components/ui/live-map";

interface Order {
  id: string;
  stationName: string;
  fuelType: string;
  quantity: number;
  totalAmount: number;
  deliveryAddress: string;
  deliveryLatitude: number;
  deliveryLongitude: number;
  status: string;
  estimatedDeliveryTime: string;
  driverName?: string;
  driverPhone?: string;
  driverId?: string;
  createdAt: string;
  updatedAt: string;
}

export default function OrderConfirmation() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { connected, orderUpdates } = useWebSocketOrders();
  const { paymentUpdates } = useWebSocketPayments();
  const location = useLocation();

  const [order, setOrder] = useState<Order | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [driverLocation, setDriverLocation] = useState<{lat: number, lng: number} | null>(null);

  // Get order ID from URL
  const orderId = window.location.pathname.split('/').pop();

  // Fetch order data from API
  useEffect(() => {
    const fetchOrder = async () => {
      if (!orderId) return;

      try {
        const response = await fetch(`/api/fuel/orders/${orderId}`, {
          credentials: 'include'
        });

        if (response.ok) {
          const data = await response.json();
          setOrder(data.order);
        } else {
          console.error('Failed to fetch order data');
        }
      } catch (error) {
        console.error('Error fetching order:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchOrder();
  }, [orderId]);

  // Listen for real-time order updates
  useEffect(() => {
    if (orderUpdates[orderId || ''] && order) {
      const update = orderUpdates[orderId || ''];
      setOrder(prev => prev ? { ...prev, status: update.status } : null);
    }
  }, [orderUpdates, orderId, order]);

  // Listen for payment updates
  useEffect(() => {
    if (Object.keys(paymentUpdates).length > 0) {
      // Handle payment status updates
      console.log('Payment updates:', paymentUpdates);
    }
  }, [paymentUpdates]);

  // Fetch driver location if assigned
  useEffect(() => {
    const fetchDriverLocation = async () => {
      if (order?.driverId) {
        try {
          const response = await fetch(`/api/tracking/driver/${order.driverId}/location`, {
            credentials: 'include'
          });

          if (response.ok) {
            const data = await response.json();
            if (data.location) {
              setDriverLocation({
                lat: parseFloat(data.location.latitude),
                lng: parseFloat(data.location.longitude)
              });
            }
          }
        } catch (error) {
          console.error('Error fetching driver location:', error);
        }
      }
    };

    if (order?.driverId) {
      fetchDriverLocation();
      // Poll for driver location every 30 seconds
      const interval = setInterval(fetchDriverLocation, 30000);
      return () => clearInterval(interval);
    }
  }, [order?.driverId]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'CONFIRMED': return 'bg-blue-100 text-blue-800';
      case 'PREPARING': return 'bg-yellow-100 text-yellow-800';
      case 'OUT_FOR_DELIVERY': return 'bg-orange-100 text-orange-800';
      case 'DELIVERED': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusMessage = (status: string) => {
    switch (status) {
      case 'CONFIRMED': return 'Your order has been confirmed and is being prepared';
      case 'PREPARING': return 'Your fuel is being prepared for delivery';
      case 'OUT_FOR_DELIVERY': return 'Your order is on the way';
      case 'DELIVERED': return 'Your order has been delivered successfully';
      default: return 'Processing your order';
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading order details...</p>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">Order not found</p>
          <Button onClick={() => setLocation("/consumer-home")} className="mt-4">
            Go Home
          </Button>
        </div>
      </div>
    );
  }

    // Get order details from URL params or state
  const getOrderData = () => {
    // Try to get from location state first
    const state = (location as any)[1]?.state;
    if (state) {
      return {
        id: state.orderId || "ORD-2024-001234",
        type: state.orderType || "COMMODITY",
        amount: state.amount || 86500,
        items: state.orderType === "FUEL" 
          ? `${state.fuelType || 'PMS'} Fuel Delivery (${state.quantity || 20}L)`
          : "Rice (50kg) x2 bags",
        deliveryAddress: "No 15, Ahmadu Bello Way, Jos",
        estimatedDelivery: state.orderType === "FUEL" ? "45-60 minutes" : "30-45 minutes"
      };
    }

    // Fallback to default data
    return {
      id: "ORD-2024-001234",
      type: "COMMODITY",
      amount: 86500,
      items: "Rice (50kg) x2 bags",
      deliveryAddress: "No 15, Ahmadu Bello Way, Jos",
      estimatedDelivery: "30-45 minutes"
    };
  };

  const orderData = getOrderData();

  return (
    <div className="min-h-screen bg-gray-50 w-full max-w-md mx-auto">
      <div className="p-4 space-y-6">
        {/* Success Header */}
        <div className="text-center py-8">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-[#131313] mb-2">Order Confirmed!</h1>
          <p className="text-gray-600">Your fuel order has been placed successfully</p>
        </div>

        {/* Order Status */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-[#131313]">Order Status</h3>
              <Badge className={getStatusColor(order.status)}>
                {order.status.replace('_', ' ')}
              </Badge>
            </div>
            <p className="text-sm text-gray-600 mb-3">{getStatusMessage(order.status)}</p>
            <div className="flex items-center space-x-2 text-sm text-gray-500">
              <Clock className="w-4 h-4" />
              <span>Estimated delivery: {order.estimatedDeliveryTime}</span>
            </div>
            {connected && (
              <div className="flex items-center space-x-2 text-xs text-green-600 mt-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span>Real-time updates active</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Order Details */}
        <Card>
          <CardContent className="p-4">
            <h3 className="font-semibold text-[#131313] mb-3">Order Details</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Order ID</span>
                <span className="font-medium">{order.id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Station</span>
                <span className="font-medium">{order.stationName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Fuel Type</span>
                <span className="font-medium">{order.fuelType}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Quantity</span>
                <span className="font-medium">{order.quantity}L</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Total Amount</span>
                <span className="font-bold text-[#4682b4]">{formatCurrency(order.totalAmount)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Delivery Address & Map */}
        <Card>
          <CardContent className="p-4">
            <h3 className="font-semibold text-[#131313] mb-3">Delivery Location</h3>
            <div className="flex items-start space-x-3 mb-3">
              <MapPin className="w-5 h-5 text-[#4682b4] mt-0.5" />
              <p className="text-gray-600">{order.deliveryAddress}</p>
            </div>

            {/* Live Map */}
            <div className="h-48 rounded-lg overflow-hidden">
              <LiveMap
                showUserLocation={false}
                showNearbyUsers={false}
                className="w-full h-full"
                userRole="CONSUMER"
                center={{ lat: order.deliveryLatitude, lng: order.deliveryLongitude }}
                markers={[
                  {
                    lat: order.deliveryLatitude,
                    lng: order.deliveryLongitude,
                    title: 'Delivery Location',
                    type: 'delivery'
                  },
                  ...(driverLocation ? [{
                    lat: driverLocation.lat,
                    lng: driverLocation.lng,
                    title: 'Driver Location',
                    type: 'driver' as const
                  }] : [])
                ]}
              />
            </div>
          </CardContent>
        </Card>

        {/* Driver Info (if assigned) */}
        {order.driverName && (
          <Card>
            <CardContent className="p-4">
              <h3 className="font-semibold text-[#131313] mb-3">Your Driver</h3>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-[#4682b4] rounded-full flex items-center justify-center">
                    <span className="text-white font-medium">
                      {order.driverName.charAt(0)}
                    </span>
                  </div>
                  <div>
                    <p className="font-medium text-[#131313]">{order.driverName}</p>
                    <p className="text-sm text-gray-600">Fuel Delivery Driver</p>
                    {driverLocation && (
                      <p className="text-xs text-green-600">Live tracking active</p>
                    )}
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
        )}

        {/* Action Buttons */}
        <div className="space-y-3">
          <Button
            onClick={() => setLocation(`/track-order/${order.id}`)}
            className="w-full bg-[#4682b4] hover:bg-[#0b1a51] text-white"
          >
            <Navigation className="w-4 h-4 mr-2" />
            Track Order
          </Button>

          <Button
            variant="outline"
            onClick={() => setLocation("/order-history")}
            className="w-full border-[#4682b4] text-[#4682b4]"
          >
            View Order History
          </Button>

          <Button
            variant="ghost"
            onClick={() => setLocation("/consumer-home")}
            className="w-full text-gray-600"
          >
            Back to Home
          </Button>
        </div>
      </div>
    </div>
  );
}