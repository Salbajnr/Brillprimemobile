import React, { useState, useEffect } from 'react';
import { MapPin, Clock, Package, Truck, CheckCircle, AlertCircle, Phone, MessageSquare } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useRealTimeUpdates } from '../hooks/useRealTimeUpdates';
import { formatDistanceToNow } from 'date-fns';

interface OrderTrackingProps {
  orderId: string;
  onChatWithDriver?: () => void;
  onChatWithMerchant?: () => void;
  onCallDriver?: () => void;
}

export const RealTimeOrderTracking: React.FC<OrderTrackingProps> = ({
  orderId,
  onChatWithDriver,
  onChatWithMerchant,
  onCallDriver
}) => {
  const [orderData, setOrderData] = useState<any>(null);
  const [driverLocation, setDriverLocation] = useState<any>(null);
  const [estimatedTime, setEstimatedTime] = useState<string>('');

  const {
    connected,
    orderUpdates,
    deliveryUpdates,
    joinChatRoom,
    updateLocation
  } = useRealTimeUpdates();

  // Find the relevant order update
  const currentOrderUpdate = orderUpdates.find(update => update.orderId === orderId);
  const currentDeliveryUpdate = deliveryUpdates.find(update => 
    update.orderId === orderId || update.orderReference === orderId
  );

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'pending':
        return <Clock className="h-5 w-5 text-yellow-500" />;
      case 'confirmed':
      case 'preparing':
        return <Package className="h-5 w-5 text-blue-500" />;
      case 'ready':
      case 'picked_up':
        return <Truck className="h-5 w-5 text-orange-500" />;
      case 'in_transit':
        return <MapPin className="h-5 w-5 text-purple-500" />;
      case 'delivered':
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'cancelled':
      case 'failed':
        return <AlertCircle className="h-5 w-5 text-red-500" />;
      default:
        return <Clock className="h-5 w-5 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'confirmed':
      case 'preparing':
        return 'bg-blue-100 text-blue-800';
      case 'ready':
      case 'picked_up':
        return 'bg-orange-100 text-orange-800';
      case 'in_transit':
        return 'bg-purple-100 text-purple-800';
      case 'delivered':
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'cancelled':
      case 'failed':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getProgressPercentage = (status: string) => {
    switch (status.toLowerCase()) {
      case 'pending':
        return 10;
      case 'confirmed':
        return 25;
      case 'preparing':
        return 40;
      case 'ready':
        return 60;
      case 'picked_up':
        return 75;
      case 'in_transit':
        return 85;
      case 'delivered':
      case 'completed':
        return 100;
      default:
        return 0;
    }
  };

  // Timeline steps
  const getTimelineSteps = () => {
    const steps = [
      { key: 'pending', label: 'Order Placed', icon: Clock },
      { key: 'confirmed', label: 'Confirmed', icon: CheckCircle },
      { key: 'preparing', label: 'Preparing', icon: Package },
      { key: 'ready', label: 'Ready for Pickup', icon: Package },
      { key: 'picked_up', label: 'Picked Up', icon: Truck },
      { key: 'in_transit', label: 'On the Way', icon: MapPin },
      { key: 'delivered', label: 'Delivered', icon: CheckCircle }
    ];

    const currentStatus = currentOrderUpdate?.status?.toLowerCase() || 'pending';
    const currentStep = steps.findIndex(step => step.key === currentStatus);

    return steps.map((step, index) => ({
      ...step,
      isActive: index <= currentStep,
      isCurrent: index === currentStep
    }));
  };

  return (
    <div className="space-y-4">
      {/* Connection Status */}
      <div className="flex items-center gap-2 text-sm">
        <div className={`h-2 w-2 rounded-full ${connected ? 'bg-green-500' : 'bg-red-500'}`} />
        <span className="text-gray-600">
          {connected ? 'Real-time tracking active' : 'Connecting to tracking...'}
        </span>
      </div>

      {/* Order Status Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              {getStatusIcon(currentOrderUpdate?.status || 'pending')}
              Order #{orderId}
            </CardTitle>
            <Badge className={getStatusColor(currentOrderUpdate?.status || 'pending')}>
              {currentOrderUpdate?.status || 'Pending'}
            </Badge>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Order Progress</span>
              <span>{getProgressPercentage(currentOrderUpdate?.status || 'pending')}%</span>
            </div>
            <Progress value={getProgressPercentage(currentOrderUpdate?.status || 'pending')} />
          </div>

          {/* Estimated Time */}
          {estimatedTime && (
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Clock className="h-4 w-4" />
              <span>Estimated delivery: {estimatedTime}</span>
            </div>
          )}

          {/* Last Update */}
          {currentOrderUpdate && (
            <div className="text-sm text-gray-600">
              Last updated: {formatDistanceToNow(new Date(currentOrderUpdate.timestamp), { addSuffix: true })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Timeline */}
      <Card>
        <CardHeader>
          <CardTitle>Order Timeline</CardTitle>
        </CardHeader>
        
        <CardContent>
          <div className="space-y-4">
            {getTimelineSteps().map((step, index) => {
              const IconComponent = step.icon;
              return (
                <div key={step.key} className="flex items-center gap-3">
                  <div className={`p-2 rounded-full ${
                    step.isActive ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-400'
                  }`}>
                    <IconComponent className="h-4 w-4" />
                  </div>
                  
                  <div className="flex-1">
                    <p className={`font-medium ${
                      step.isActive ? 'text-gray-900' : 'text-gray-400'
                    }`}>
                      {step.label}
                    </p>
                    {step.isCurrent && currentOrderUpdate && (
                      <p className="text-sm text-gray-600">
                        {formatDistanceToNow(new Date(currentOrderUpdate.timestamp), { addSuffix: true })}
                      </p>
                    )}
                  </div>
                  
                  {step.isCurrent && (
                    <Badge variant="secondary" className="text-xs">
                      Current
                    </Badge>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Delivery Info */}
      {currentDeliveryUpdate && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Truck className="h-5 w-5" />
              Delivery Information
            </CardTitle>
          </CardHeader>
          
          <CardContent className="space-y-4">
            {/* Driver Info */}
            {currentDeliveryUpdate.driverId && (
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Driver Assigned</p>
                  <p className="text-sm text-gray-600">
                    Driver ID: {currentDeliveryUpdate.driverId}
                  </p>
                </div>
                
                <div className="flex gap-2">
                  {onCallDriver && (
                    <Button variant="outline" size="sm" onClick={onCallDriver}>
                      <Phone className="h-4 w-4" />
                    </Button>
                  )}
                  {onChatWithDriver && (
                    <Button variant="outline" size="sm" onClick={onChatWithDriver}>
                      <MessageSquare className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            )}

            {/* Location */}
            {currentDeliveryUpdate.location && (
              <div>
                <p className="font-medium mb-2">Current Location</p>
                <div className="bg-gray-50 p-3 rounded-lg">
                  <div className="flex items-center gap-2 text-sm">
                    <MapPin className="h-4 w-4 text-blue-500" />
                    <span>
                      Lat: {currentDeliveryUpdate.location.latitude?.toFixed(6)}, 
                      Lng: {currentDeliveryUpdate.location.longitude?.toFixed(6)}
                    </span>
                  </div>
                  <p className="text-xs text-gray-600 mt-1">
                    Updated: {formatDistanceToNow(new Date(currentDeliveryUpdate.timestamp), { addSuffix: true })}
                  </p>
                </div>
              </div>
            )}

            {/* Estimated Time */}
            {currentDeliveryUpdate.estimatedTime && (
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-orange-500" />
                <span className="text-sm">
                  ETA: {currentDeliveryUpdate.estimatedTime}
                </span>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Communication */}
      <Card>
        <CardHeader>
          <CardTitle>Need Help?</CardTitle>
        </CardHeader>
        
        <CardContent>
          <div className="grid grid-cols-2 gap-3">
            {onChatWithMerchant && (
              <Button variant="outline" onClick={onChatWithMerchant}>
                <MessageSquare className="h-4 w-4 mr-2" />
                Chat with Merchant
              </Button>
            )}
            
            <Button variant="outline" onClick={() => joinChatRoom('support', 'support')}>
              <MessageSquare className="h-4 w-4 mr-2" />
              Contact Support
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default RealTimeOrderTracking;