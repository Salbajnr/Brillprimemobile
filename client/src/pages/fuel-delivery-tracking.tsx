
import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  ArrowLeft, 
  MapPin, 
  Clock, 
  Phone, 
  MessageSquare, 
  Navigation,
  Fuel,
  User,
  CheckCircle,
  AlertCircle,
  Truck
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/use-auth";
import { useWebSocketOrders } from "@/hooks/use-websocket";
import LiveMap from "@/components/ui/live-map";

interface FuelOrder {
  id: string;
  stationId: string;
  fuelType: string;
  quantity: number;
  unitPrice: number;
  totalAmount: number;
  deliveryAddress: string;
  status: string;
  customerName?: string;
  customerPhone?: string;
  driverName?: string;
  driverPhone?: string;
  createdAt: string;
  acceptedAt?: string;
  pickedUpAt?: string;
  deliveredAt?: string;
  estimatedDeliveryTime?: string;
}

export default function FuelDeliveryTracking() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { connected, orderUpdates } = useWebSocketOrders();
  
  // Get order ID from URL params
  const urlParams = new URLSearchParams(window.location.search);
  const orderId = urlParams.get('orderId') || '';

  // Fetch fuel order details
  const { data: order, isLoading } = useQuery({
    queryKey: ["/api/fuel-orders", orderId],
    queryFn: async () => {
      const response = await fetch(`/api/fuel-orders/${orderId}`);
      const data = await response.json();
      return data.success ? data.order : null;
    },
    enabled: !!orderId,
    refetchInterval: 30000
  });

  // Update order status mutation
  const updateStatusMutation = useMutation({
    mutationFn: async ({ status, notes }: { status: string; notes?: string }) => {
      const response = await fetch(`/api/fuel-orders/${orderId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, notes })
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/fuel-orders", orderId] });
    }
  });

  const getStatusConfig = (status: string) => {
    const configs = {
      PENDING: { 
        color: 'bg-yellow-100 text-yellow-800', 
        icon: Clock, 
        message: 'Waiting for driver acceptance' 
      },
      ACCEPTED: { 
        color: 'bg-blue-100 text-blue-800', 
        icon: User, 
        message: 'Driver assigned and heading to pickup' 
      },
      PICKED_UP: { 
        color: 'bg-purple-100 text-purple-800', 
        icon: Truck, 
        message: 'Fuel picked up, heading to delivery location' 
      },
      IN_TRANSIT: { 
        color: 'bg-indigo-100 text-indigo-800', 
        icon: Navigation, 
        message: 'Driver is on the way to your location' 
      },
      DELIVERED: { 
        color: 'bg-green-100 text-green-800', 
        icon: CheckCircle, 
        message: 'Fuel delivered successfully' 
      },
      CANCELLED: { 
        color: 'bg-red-100 text-red-800', 
        icon: AlertCircle, 
        message: 'Order has been cancelled' 
      }
    };
    return configs[status as keyof typeof configs] || configs.PENDING;
  };

  const formatFuelType = (type: string) => {
    const fuelTypes: Record<string, string> = {
      PMS: 'Premium Motor Spirit',
      AGO: 'Automotive Gas Oil', 
      DPK: 'Dual Purpose Kerosene'
    };
    return fuelTypes[type] || type;
  };

  const handleStatusUpdate = (status: string) => {
    updateStatusMutation.mutate({ status });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading fuel order details...</p>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Order Not Found</h3>
          <p className="text-gray-600 mb-4">The fuel order you're looking for doesn't exist.</p>
          <Button onClick={() => setLocation('/dashboard')}>
            Go to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  const statusConfig = getStatusConfig(order.status);
  const StatusIcon = statusConfig.icon;

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center space-x-3">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => setLocation('/dashboard')}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-xl font-semibold text-[#131313]">Fuel Delivery</h1>
              <p className="text-sm text-gray-600">Order #{order.id.slice(-8)}</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <div className={`w-3 h-3 rounded-full ${connected ? 'bg-green-500' : 'bg-red-500'}`}></div>
            <span className="text-xs text-gray-500">
              {connected ? 'Live' : 'Offline'}
            </span>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Status Card */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                <StatusIcon className="h-6 w-6 text-blue-600" />
              </div>
              <div className="flex-1">
                <Badge className={statusConfig.color}>
                  {order.status.replace('_', ' ')}
                </Badge>
                <p className="text-sm text-gray-600 mt-1">
                  {statusConfig.message}
                </p>
              </div>
            </div>

            {order.estimatedDeliveryTime && (
              <div className="flex items-center text-sm text-gray-600">
                <Clock className="h-4 w-4 mr-2" />
                <span>
                  Estimated delivery: {new Date(order.estimatedDeliveryTime).toLocaleTimeString()}
                </span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Order Details */}
        <Card>
          <CardContent className="p-4">
            <h3 className="font-semibold text-[#131313] mb-4 flex items-center">
              <Fuel className="h-5 w-5 mr-2 text-blue-600" />
              Order Details
            </h3>
            
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Fuel Type:</span>
                <span className="font-medium">{formatFuelType(order.fuelType)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Quantity:</span>
                <span className="font-medium">{order.quantity}L</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Unit Price:</span>
                <span className="font-medium">₦{parseFloat(order.unitPrice).toLocaleString()}</span>
              </div>
              <div className="flex justify-between border-t pt-2">
                <span className="text-gray-600">Total Amount:</span>
                <span className="font-bold text-lg">₦{parseFloat(order.totalAmount).toLocaleString()}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Delivery Information */}
        <Card>
          <CardContent className="p-4">
            <h3 className="font-semibold text-[#131313] mb-4 flex items-center">
              <MapPin className="h-5 w-5 mr-2 text-green-600" />
              Delivery Information
            </h3>
            
            <div className="space-y-3">
              <div>
                <span className="text-gray-600 text-sm">Delivery Address:</span>
                <p className="font-medium">{order.deliveryAddress}</p>
              </div>
              
              {order.customerName && user?.role === 'DRIVER' && (
                <div>
                  <span className="text-gray-600 text-sm">Customer:</span>
                  <p className="font-medium">{order.customerName}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Driver Information */}
        {order.driverName && user?.role === 'CONSUMER' && (
          <Card>
            <CardContent className="p-4">
              <h3 className="font-semibold text-[#131313] mb-4 flex items-center">
                <User className="h-5 w-5 mr-2 text-purple-600" />
                Driver Information
              </h3>
              
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">{order.driverName}</p>
                  <p className="text-sm text-gray-600">{order.driverPhone}</p>
                </div>
                
                <div className="flex space-x-2">
                  <Button variant="outline" size="sm">
                    <Phone className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="sm">
                    <MessageSquare className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Live Map */}
        {(order.status === 'ACCEPTED' || order.status === 'PICKED_UP' || order.status === 'IN_TRANSIT') && (
          <Card>
            <CardContent className="p-4">
              <h3 className="font-semibold text-[#131313] mb-4 flex items-center">
                <Navigation className="h-5 w-5 mr-2 text-indigo-600" />
                Live Tracking
              </h3>
              
              <div className="h-64 rounded-lg overflow-hidden">
                <LiveMap
                  showUserLocation={true}
                  showDriverLocation={user?.role === 'CONSUMER'}
                  orderId={order.id}
                  className="h-full w-full"
                />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Driver Actions */}
        {user?.role === 'DRIVER' && order.status !== 'DELIVERED' && order.status !== 'CANCELLED' && (
          <Card>
            <CardContent className="p-4">
              <h3 className="font-semibold text-[#131313] mb-4">Update Status</h3>
              
              <div className="space-y-2">
                {order.status === 'ACCEPTED' && (
                  <Button 
                    onClick={() => handleStatusUpdate('PICKED_UP')}
                    disabled={updateStatusMutation.isPending}
                    className="w-full bg-purple-600 hover:bg-purple-700 text-white"
                  >
                    Confirm Pickup
                  </Button>
                )}
                
                {order.status === 'PICKED_UP' && (
                  <Button 
                    onClick={() => handleStatusUpdate('IN_TRANSIT')}
                    disabled={updateStatusMutation.isPending}
                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white"
                  >
                    Start Delivery
                  </Button>
                )}
                
                {order.status === 'IN_TRANSIT' && (
                  <Button 
                    onClick={() => handleStatusUpdate('DELIVERED')}
                    disabled={updateStatusMutation.isPending}
                    className="w-full bg-green-600 hover:bg-green-700 text-white"
                  >
                    Mark as Delivered
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Order Timeline */}
        <Card>
          <CardContent className="p-4">
            <h3 className="font-semibold text-[#131313] mb-4">Order Timeline</h3>
            
            <div className="space-y-4">
              <div className="flex items-center space-x-3">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <div>
                  <p className="font-medium text-sm">Order Placed</p>
                  <p className="text-xs text-gray-600">
                    {new Date(order.createdAt).toLocaleString()}
                  </p>
                </div>
              </div>
              
              {order.acceptedAt && (
                <div className="flex items-center space-x-3">
                  <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                  <div>
                    <p className="font-medium text-sm">Driver Assigned</p>
                    <p className="text-xs text-gray-600">
                      {new Date(order.acceptedAt).toLocaleString()}
                    </p>
                  </div>
                </div>
              )}
              
              {order.pickedUpAt && (
                <div className="flex items-center space-x-3">
                  <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                  <div>
                    <p className="font-medium text-sm">Fuel Picked Up</p>
                    <p className="text-xs text-gray-600">
                      {new Date(order.pickedUpAt).toLocaleString()}
                    </p>
                  </div>
                </div>
              )}
              
              {order.deliveredAt && (
                <div className="flex items-center space-x-3">
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  <div>
                    <p className="font-medium text-sm">Delivered</p>
                    <p className="text-xs text-gray-600">
                      {new Date(order.deliveredAt).toLocaleString()}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
