
import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { CheckCircle, MapPin, Clock, Fuel, Phone, MessageSquare, Navigation } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/use-auth";
import { useWebSocketOrders } from "@/hooks/use-websocket";

interface Order {
  id: string;
  stationName: string;
  fuelType: string;
  quantity: number;
  totalAmount: number;
  deliveryAddress: string;
  status: string;
  estimatedDeliveryTime: string;
  driverName?: string;
  driverPhone?: string;
}

export default function OrderConfirmation() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { connected, orderUpdates } = useWebSocketOrders();
  
  const [order, setOrder] = useState<Order | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Get order ID from URL
  useEffect(() => {
    const urlPath = window.location.pathname;
    const orderId = urlPath.split('/').pop();
    
    if (orderId) {
      // Mock order data - in real app would fetch from API
      setTimeout(() => {
        setOrder({
          id: orderId,
          stationName: "Total Energies Wuse II",
          fuelType: "PMS",
          quantity: 20,
          totalAmount: 12840,
          deliveryAddress: "123 Main Street, Wuse II, Abuja",
          status: "CONFIRMED",
          estimatedDeliveryTime: "15-25 mins",
          driverName: "Ahmed Hassan",
          driverPhone: "+234 803 123 4567"
        });
        setIsLoading(false);
      }, 1000);
    }
  }, []);

  // Listen for order updates via WebSocket
  useEffect(() => {
    if (orderUpdates.length > 0 && order) {
      const latestUpdate = orderUpdates[orderUpdates.length - 1];
      if (latestUpdate.orderId === order.id) {
        setOrder(prev => prev ? { ...prev, status: latestUpdate.status } : null);
      }
    }
  }, [orderUpdates, order]);

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

        {/* Delivery Address */}
        <Card>
          <CardContent className="p-4">
            <h3 className="font-semibold text-[#131313] mb-3">Delivery Address</h3>
            <div className="flex items-start space-x-3">
              <MapPin className="w-5 h-5 text-[#4682b4] mt-0.5" />
              <p className="text-gray-600">{order.deliveryAddress}</p>
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
