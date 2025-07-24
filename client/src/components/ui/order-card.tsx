import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Clock, 
  MapPin, 
  User, 
  Phone, 
  MessageCircle, 
  Truck,
  CheckCircle,
  XCircle,
  AlertCircle
} from 'lucide-react';
import type { Order } from '@/lib/types';

interface OrderCardProps {
  order: Order;
  onUpdateStatus?: (orderId: string, status: Order['status']) => void;
  onChat?: (customerId: string) => void;
  onCall?: (phone: string) => void;
  className?: string;
}

export function OrderCard({ 
  order, 
  onUpdateStatus, 
  onChat, 
  onCall, 
  className = '' 
}: OrderCardProps) {
  const getStatusColor = (status: Order['status']) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'confirmed': return 'bg-blue-100 text-blue-800';
      case 'preparing': return 'bg-orange-100 text-orange-800';
      case 'ready': return 'bg-purple-100 text-purple-800';
      case 'out_for_delivery': return 'bg-indigo-100 text-indigo-800';
      case 'delivered': return 'bg-green-100 text-green-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: Order['status']) => {
    switch (status) {
      case 'pending': return <AlertCircle className="w-4 h-4" />;
      case 'confirmed': return <CheckCircle className="w-4 h-4" />;
      case 'preparing': return <Clock className="w-4 h-4" />;
      case 'ready': return <CheckCircle className="w-4 h-4" />;
      case 'out_for_delivery': return <Truck className="w-4 h-4" />;
      case 'delivered': return <CheckCircle className="w-4 h-4" />;
      case 'cancelled': return <XCircle className="w-4 h-4" />;
      default: return <Clock className="w-4 h-4" />;
    }
  };

  const getNextStatus = (currentStatus: Order['status']): Order['status'] | null => {
    switch (currentStatus) {
      case 'pending': return 'confirmed';
      case 'confirmed': return 'preparing';
      case 'preparing': return 'ready';
      case 'ready': return 'out_for_delivery';
      case 'out_for_delivery': return 'delivered';
      default: return null;
    }
  };

  const nextStatus = getNextStatus(order.status);
  const canAdvanceStatus = nextStatus && order.status !== 'delivered' && order.status !== 'cancelled';

  return (
    <Card className={`rounded-xl shadow-sm ${className}`}>
      <CardContent className="p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2">
            <Badge className={`${getStatusColor(order.status)} flex items-center space-x-1`}>
              {getStatusIcon(order.status)}
              <span className="capitalize">{order.status.replace('_', ' ')}</span>
            </Badge>
            <span className="text-sm text-gray-500">#{order.id.slice(-6)}</span>
          </div>
          <div className="text-right">
            <p className="text-lg font-bold text-gray-900">₦{order.total.toLocaleString()}</p>
            <p className="text-xs text-gray-500">{order.items.length} items</p>
          </div>
        </div>

        {/* Customer Info */}
        <div className="flex items-center space-x-3 mb-3">
          <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
            <User className="w-5 h-5 text-gray-600" />
          </div>
          <div className="flex-1">
            <p className="font-medium text-gray-900">{order.customer.name}</p>
            <p className="text-sm text-gray-500">{order.customer.phone}</p>
          </div>
        </div>

        {/* Delivery Address */}
        <div className="flex items-start space-x-3 mb-3">
          <MapPin className="w-4 h-4 text-gray-400 mt-1" />
          <div className="flex-1">
            <p className="text-sm text-gray-700">{order.deliveryAddress.street}</p>
            <p className="text-xs text-gray-500">{order.deliveryAddress.city}, {order.deliveryAddress.state}</p>
          </div>
        </div>

        {/* Driver Info (if assigned) */}
        {order.driver && (
          <div className="flex items-center space-x-3 mb-3 p-2 bg-blue-50 rounded-lg">
            <Truck className="w-4 h-4 text-blue-600" />
            <div className="flex-1">
              <p className="text-sm font-medium text-blue-900">{order.driver.name}</p>
              <p className="text-xs text-blue-600">Driver assigned</p>
            </div>
          </div>
        )}

        {/* Order Items Preview */}
        <div className="mb-4">
          <p className="text-sm font-medium text-gray-700 mb-2">Items:</p>
          <div className="space-y-1">
            {order.items.slice(0, 2).map((item) => (
              <div key={item.id} className="flex justify-between text-sm">
                <span className="text-gray-600">
                  {item.quantity}x {item.product.name}
                </span>
                <span className="text-gray-900">₦{item.totalPrice.toLocaleString()}</span>
              </div>
            ))}
            {order.items.length > 2 && (
              <p className="text-xs text-gray-500">+{order.items.length - 2} more items</p>
            )}
          </div>
        </div>

        {/* Time Info */}
        <div className="flex items-center space-x-4 mb-4 text-xs text-gray-500">
          <div className="flex items-center space-x-1">
            <Clock className="w-3 h-3" />
            <span>Ordered {new Date(order.createdAt).toLocaleTimeString()}</span>
          </div>
          {order.estimatedDeliveryTime && (
            <div className="flex items-center space-x-1">
              <Truck className="w-3 h-3" />
              <span>ETA {new Date(order.estimatedDeliveryTime).toLocaleTimeString()}</span>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex space-x-2">
          {canAdvanceStatus && onUpdateStatus && (
            <Button 
              size="sm" 
              onClick={() => onUpdateStatus(order.id, nextStatus!)}
              className="flex-1"
            >
              Mark as {nextStatus!.replace('_', ' ')}
            </Button>
          )}
          
          {order.status !== 'delivered' && order.status !== 'cancelled' && (
            <>
              {onChat && (
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => onChat(order.customer.id)}
                >
                  <MessageCircle className="w-4 h-4" />
                </Button>
              )}
              
              {onCall && (
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => onCall(order.customer.phone)}
                >
                  <Phone className="w-4 h-4" />
                </Button>
              )}
            </>
          )}
          
          {order.status === 'pending' && onUpdateStatus && (
            <Button 
              variant="destructive" 
              size="sm"
              onClick={() => onUpdateStatus(order.id, 'cancelled')}
            >
              <XCircle className="w-4 h-4" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}