import React, { useState } from 'react';
import { MapPin, MessageSquare, Package, Truck, ArrowLeft } from 'lucide-react';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import RealTimeOrderTracking from '../components/RealTimeOrderTracking';
import RealTimeLocationTracking from '../components/RealTimeLocationTracking';
import RealTimeChatSystem from '../components/RealTimeChatSystem';
import { useAuth } from '@/hooks/use-auth';

export default function RealTimeTrackingPage() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const [selectedOrderId, setSelectedOrderId] = useState<string>('ORDER-123');
  const [selectedChatRoom, setSelectedChatRoom] = useState<string>('order_123');

  // Mock data for demonstration
  const mockParticipants = [
    { id: 1, name: 'John Customer', role: 'CONSUMER', avatar: '', isOnline: true },
    { id: 2, name: 'Merchant Store', role: 'MERCHANT', avatar: '', isOnline: true },
    { id: 3, name: 'Driver Mike', role: 'DRIVER', avatar: '', isOnline: false }
  ];

  const mockOrderInfo = {
    orderId: selectedOrderId,
    orderNumber: 'ORD-12345',
    status: 'in_transit'
  };

  const handleChatWithDriver = () => {
    setSelectedChatRoom('customer_driver_123');
  };

  const handleChatWithMerchant = () => {
    setSelectedChatRoom('customer_merchant_123');
  };

  const handleCallDriver = () => {
    // Handle call functionality
    console.log('Calling driver...');
  };

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

        {/* Real-Time Tracking Tabs */}
        <Tabs defaultValue="order" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="order" className="text-xs">
              <Package className="h-4 w-4 mr-1" />
              Order
            </TabsTrigger>
            <TabsTrigger value="location" className="text-xs">
              <MapPin className="h-4 w-4 mr-1" />
              Location
            </TabsTrigger>
            <TabsTrigger value="chat" className="text-xs">
              <MessageSquare className="h-4 w-4 mr-1" />
              Chat
            </TabsTrigger>
          </TabsList>

          {/* Order Tracking Tab */}
          <TabsContent value="order" className="space-y-4">
            <RealTimeOrderTracking
              orderId={selectedOrderId}
              onChatWithDriver={handleChatWithDriver}
              onChatWithMerchant={handleChatWithMerchant}
              onCallDriver={handleCallDriver}
            />
          </TabsContent>

          {/* Location Tracking Tab */}
          <TabsContent value="location" className="space-y-4">
            <RealTimeLocationTracking
              orderId={selectedOrderId}
              isDriver={user?.role === 'DRIVER'}
              showMap={true}
              autoUpdateLocation={user?.role === 'DRIVER'}
            />
          </TabsContent>

          {/* Chat Tab */}
          <TabsContent value="chat" className="space-y-4">
            <div className="h-96">
              <RealTimeChatSystem
                roomId={selectedChatRoom}
                roomType="customer-merchant"
                participants={mockParticipants}
                currentUserId={user?.id || 1}
                orderInfo={mockOrderInfo}
              />
            </div>
          </TabsContent>
        </Tabs>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Quick Actions</CardTitle>
          </CardHeader>
          
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedChatRoom('support')}
              >
                <MessageSquare className="h-4 w-4 mr-2" />
                Contact Support
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={handleCallDriver}
              >
                <Truck className="h-4 w-4 mr-2" />
                Call Driver
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => setLocation('/order-history')}
              >
                <Package className="h-4 w-4 mr-2" />
                Order History
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => setLocation('/track-order')}
              >
                <MapPin className="h-4 w-4 mr-2" />
                Track All Orders
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Connection Status */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Real-time Features</span>
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-green-500" />
                <span className="text-green-600">Connected</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}