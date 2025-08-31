import React, { useState, useEffect } from 'react';
import { MapPin, MessageSquare, Package, Truck, ArrowLeft, Phone, Navigation, Clock } from 'lucide-react';
import { useLocation } from 'wouter';
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { Badge } from "../components/ui/badge";
import RealTimeOrderTracking from '../components/RealTimeOrderTracking';
import RealTimeLocationTracking from '../components/RealTimeLocationTracking';
import RealTimeChatSystem from '../components/RealTimeChatSystem';
import LiveMap from '../components/ui/live-map';
import { NotificationModal } from '../components/ui/notification-modal';
import { useAuth } from "../hooks/use-auth";
import { useWebSocket, useOrderUpdates, useDriverTracking, useNotifications } from "../hooks/use-websocket";

export default function RealTimeTrackingPage() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const [selectedOrderId, setSelectedOrderId] = useState<string>('ORDER-123');
  const [selectedChatRoom, setSelectedChatRoom] = useState<string>('order_123');
  const [loading, setLoading] = useState(true);
  const [orderInfo, setOrderInfo] = useState<any>(null);
  const [participants, setParticipants] = useState<any[]>([]);
  const [activeOrders, setActiveOrders] = useState<any[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [userLocation, setUserLocation] = useState<any>(null);
  const [trackingEnabled, setTrackingEnabled] = useState(false);

  // WebSocket hooks
  const { socket, connected, emit } = useWebSocket();
  const { orders } = useOrderUpdates();
  const { driverLocation, eta, updateDriverLocation } = useDriverTracking(selectedOrderId);
  const { notifications, markAsRead } = useNotifications();

  // Local state for notifications
  const [currentNotification, setCurrentNotification] = useState<any>(null);

  useEffect(() => {
    // Simulate loading order data
    const mockOrderInfo = {
      id: selectedOrderId,
      status: 'IN_TRANSIT',
      customer: {
        id: 1,
        name: 'John Doe',
        phone: '+234 801 234 5678',
        address: '15 Victoria Island, Lagos'
      },
      merchant: {
        id: 2,
        name: 'TotalEnergies Station',
        phone: '+234 803 456 7890',
        address: '10 Lekki Phase 1, Lagos'
      },
      driver: {
        id: 3,
        name: 'Ahmed Musa',
        phone: '+234 805 678 9012',
        vehicle: 'Toyota Hilux - ABC 123 XY'
      },
      items: [
        { name: 'Premium Petrol', quantity: '20L', price: '₦8,000' }
      ],
      totalAmount: '₦8,500',
      estimatedArrival: new Date(Date.now() + 1800000).toISOString(),
      createdAt: new Date(Date.now() - 1800000).toISOString()
    };

    setOrderInfo(mockOrderInfo);
    setParticipants([mockOrderInfo.customer, mockOrderInfo.merchant, mockOrderInfo.driver]);
    setLoading(false);

    // Subscribe to order updates when component mounts
    if (connected && selectedOrderId) {
      emit('subscribe_order_tracking', selectedOrderId);
    }
  }, [connected, selectedOrderId, emit]);

  useEffect(() => {
    // Show latest notification
    if (notifications.length > 0 && !notifications[0].read) {
      setCurrentNotification({
        id: notifications[0].id,
        title: notifications[0].title,
        message: notifications[0].message,
        type: notifications[0].type,
        timestamp: notifications[0].timestamp.getTime(),
        actions: [
          {
            label: 'View Order',
            action: () => setLocation('/track-order'),
            variant: 'default'
          }
        ]
      });
    }
  }, [notifications, setLocation]);

  const handleChatWithDriver = () => {
    setSelectedChatRoom('customer_driver_123');
  };

  const handleChatWithMerchant = () => {
    setSelectedChatRoom('customer_merchant_123');
  };

  const handleCallDriver = () => {
    if (orderInfo?.driver?.phone) {
      window.location.href = `tel:${orderInfo.driver.phone}`;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING':
        return 'bg-yellow-100 text-yellow-800';
      case 'CONFIRMED':
        return 'bg-blue-100 text-blue-800';
      case 'IN_TRANSIT':
        return 'bg-green-100 text-green-800';
      case 'DELIVERED':
        return 'bg-emerald-100 text-emerald-800';
      case 'CANCELLED':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading real-time tracking...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pt-16 pb-20">
      <div className="max-w-md mx-auto p-4 space-y-4">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setLocation('/consumer-home')}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-xl font-bold">Real-Time Tracking</h1>
            <p className="text-sm text-gray-600">Live order and delivery updates</p>
          </div>
        </div>

        {/* Connection Status */}
        <Card className="mb-4">
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className={`h-3 w-3 rounded-full ${connected ? 'bg-green-500' : 'bg-red-500'} animate-pulse`} />
                <span className="text-sm font-medium">
                  {connected ? 'Connected' : 'Disconnected'}
                </span>
              </div>
              <Badge variant="outline" className="text-xs">
                Real-time
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Order Summary */}
        {orderInfo && (
          <Card className="mb-4">
            <CardHeader className="pb-2">
              <CardTitle className="flex justify-between items-center text-base">
                <span>Order {orderInfo.id}</span>
                <Badge className={getStatusColor(orderInfo.status)}>
                  {orderInfo.status}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Driver:</span>
                  <span className="font-medium">{orderInfo.driver.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Vehicle:</span>
                  <span className="font-medium">{orderInfo.driver.vehicle}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">ETA:</span>
                  <span className="font-medium text-green-600">
                    {eta || 'Calculating...'}
                  </span>
                </div>
                <div className="flex gap-2 mt-3">
                  <Button size="sm" variant="outline" onClick={handleCallDriver} className="flex-1">
                    <Phone className="h-4 w-4 mr-1" />
                    Call
                  </Button>
                  <Button size="sm" onClick={handleChatWithDriver} className="flex-1">
                    <MessageSquare className="h-4 w-4 mr-1" />
                    Chat
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Real-Time Tracking Tabs */}
        <Tabs defaultValue="location" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="location" className="text-xs">
              <MapPin className="h-4 w-4 mr-1" />
              Location
            </TabsTrigger>
            <TabsTrigger value="order" className="text-xs">
              <Package className="h-4 w-4 mr-1" />
              Order
            </TabsTrigger>
            <TabsTrigger value="chat" className="text-xs">
              <MessageSquare className="h-4 w-4 mr-1" />
              Chat
            </TabsTrigger>
          </TabsList>

          <TabsContent value="location" className="mt-4 space-y-4">
            <LiveMap
              driverLocation={driverLocation ? {
                latitude: driverLocation.latitude,
                longitude: driverLocation.longitude
              } : undefined}
              customerLocation={orderInfo ? {
                latitude: 6.4281,
                longitude: 3.4219 // Lagos coordinates
              } : undefined}
              orderId={selectedOrderId}
            />

            <RealTimeLocationTracking />

            {/* ETA Card */}
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <Clock className="h-5 w-5 text-blue-500" />
                  <div>
                    <h3 className="font-medium">Estimated Arrival</h3>
                    <p className="text-sm text-gray-600">
                      {eta || 'Calculating route...'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="order" className="mt-4">
            <RealTimeOrderTracking />

            {/* Order Timeline */}
            <Card className="mt-4">
              <CardHeader>
                <CardTitle className="text-base">Order Timeline</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="h-2 w-2 rounded-full bg-green-500 mt-2 flex-shrink-0" />
                    <div className="text-sm">
                      <p className="font-medium">Order Confirmed</p>
                      <p className="text-gray-500 text-xs">
                        {new Date(orderInfo?.createdAt).toLocaleString()}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="h-2 w-2 rounded-full bg-blue-500 mt-2 flex-shrink-0" />
                    <div className="text-sm">
                      <p className="font-medium">Driver Assigned</p>
                      <p className="text-gray-500 text-xs">
                        {orderInfo?.driver.name} • {orderInfo?.driver.vehicle}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="h-2 w-2 rounded-full bg-yellow-500 mt-2 flex-shrink-0 animate-pulse" />
                    <div className="text-sm">
                      <p className="font-medium">In Transit</p>
                      <p className="text-gray-500 text-xs">Currently delivering your order</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="chat" className="mt-4">
            <RealTimeChatSystem />

            {/* Quick Actions */}
            <Card className="mt-4">
              <CardHeader>
                <CardTitle className="text-base">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Button
                    variant="outline"
                    className="w-full justify-start"
                    onClick={handleChatWithMerchant}
                  >
                    <MessageSquare className="h-4 w-4 mr-2" />
                    Chat with Merchant
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full justify-start"
                    onClick={() => setLocation('/support')}
                  >
                    <MessageSquare className="h-4 w-4 mr-2" />
                    Contact Support
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Notification Modal */}
      <NotificationModal
        notification={currentNotification}
        onClose={() => {
          setCurrentNotification(null);
          if (currentNotification) {
            markAsRead(currentNotification.id);
          }
        }}
      />
    </div>
  );
}