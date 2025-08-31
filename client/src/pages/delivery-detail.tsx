import { useState, useEffect } from "react";
import { useLocation, Link } from "wouter";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { NotificationProvider, useNotifications } from "../components/ui/notification-system";
import { useWebSocketDeliveryStatus } from "../hooks/use-websocket";
import { ClientRole, MessageType } from "../../../server/websocket";
import { 
  ArrowLeft,
  Clock,
  MapPin,
  Ruler,
  MessageCircle,
  Phone,
  Navigation,
  AlertTriangle,
  Wifi,
  WifiOff
} from "lucide-react";
import logoImage from "../assets/images/logo.png";
import accountCircleIcon from "../assets/images/account_circle.svg";
import mapBackgroundImage from "../assets/images/map_background.png";

// Color constants
const COLORS = {
  PRIMARY: '#4682b4',
  SECONDARY: '#0b1a51', 
  ACTIVE: '#010e42',
  TEXT: '#131313',
  WHITE: '#ffffff'
} as const;

interface DeliveryDetails {
  id: string;
  customerName: string;
  customerPhone: string;
  orderType: string;
  orderItems: Array<{
    name: string;
    quantity: string;
    price: number;
  }>;
  pickupAddress: string;
  deliveryAddress: string;
  distance: string;
  estimatedTime: string;
  deliveryFee: number;
  status: 'ASSIGNED' | 'PICKED_UP' | 'IN_TRANSIT' | 'DELIVERED';
  specialInstructions?: string;
}

function DeliveryDetailContent() {
  const [, setLocation] = useLocation();
  const { addNotification } = useNotifications();
  
  // WebSocket integration for real-time delivery tracking
  const { connected, deliveryUpdates, connectionError } = useWebSocketDeliveryStatus();
  
  // Sample delivery data - would come from route params in real app
  const [delivery, setDelivery] = useState<DeliveryDetails>({
    id: "job-1",
    customerName: "Mike Johnson",
    customerPhone: "+234 801 234 5678",
    orderType: "FUEL",
    orderItems: [
      { name: "Petrol", quantity: "1 litre", price: 15000 }
    ],
    pickupAddress: "Shell Gas Station, Rayfield, Jos",
    deliveryAddress: "Rayfield, Jos",
    distance: "10km",
    estimatedTime: "15 minutes",
    deliveryFee: 2500,
    status: 'ASSIGNED',
    specialInstructions: "Customer will meet at the main gate"
  });
  
  // Process WebSocket delivery status updates
  useEffect(() => {
    if (Object.keys(deliveryUpdates).length > 0 && deliveryUpdates[delivery.id]) {
      const update = deliveryUpdates[delivery.id];
      console.log(`Updating delivery ${delivery.id} status to ${update.status}`);
      
      // Update the delivery status in real-time
      setDelivery(prev => ({
        ...prev,
        status: update.status as any
      }));
      
      // Show notification about status change
      addNotification({
        type: 'info',
        title: 'Delivery Update',
        message: `Delivery status updated to ${update.status}`,
        duration: 4000
      });
    }
  }, [deliveryUpdates, delivery.id, addNotification]);

  const handleStartNavigation = () => {
    addNotification({
      type: 'success',
      title: 'Navigation Started',
      message: 'GPS navigation to pickup location has been activated',
      duration: 4000
    });
    // In real app, would integrate with navigation API
  };

  const handleReportIssue = () => {
    addNotification({
      type: 'info',
      title: 'Issue Report',
      message: 'Issue reporting form has been opened',
      duration: 3000
    });
    // In real app, would open issue reporting modal
  };

  const handleContact = (type: 'call' | 'chat') => {
    if (type === 'chat') {
      setLocation('/chat');
    } else {
      addNotification({
        type: 'info',
        title: 'Calling Customer',
        message: `Initiating call to ${delivery.customerName}`,
        duration: 3000
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ASSIGNED': return '#f59e0b';
      case 'PICKED_UP': return COLORS.PRIMARY;
      case 'IN_TRANSIT': return '#8b5cf6';
      case 'DELIVERED': return '#10b981';
      default: return COLORS.TEXT;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'ASSIGNED': return 'Assigned to You';
      case 'PICKED_UP': return 'Picked Up';
      case 'IN_TRANSIT': return 'In Transit';
      case 'DELIVERED': return 'Delivered';
      default: return status;
    }
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: COLORS.WHITE }}>
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b" style={{ borderColor: '#D4D4D4' }}>
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => setLocation('/driver-dashboard')}
          className="p-2"
        >
          <ArrowLeft className="h-6 w-6" style={{ color: COLORS.TEXT }} />
        </Button>
        <h1 className="text-xl font-bold" style={{ color: COLORS.TEXT }}>Delivery Detail</h1>
        
        {/* WebSocket Connection Status */}
        <div className="w-10 flex items-center justify-center">
          {connected ? (
            <Badge className="bg-green-500 hover:bg-green-600">
              <Wifi className="h-3 w-3 mr-1" />
              <span className="text-xs">Live</span>
            </Badge>
          ) : (
            <Badge className="bg-gray-500 hover:bg-gray-600">
              <WifiOff className="h-3 w-3 mr-1" />
              <span className="text-xs">Offline</span>
            </Badge>
          )}
        </div>
      </div>

      {/* Customer Info Section */}
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-4">
            <div className="w-16 h-16 rounded-full overflow-hidden">
              <img 
                src={accountCircleIcon} 
                alt="Customer" 
                className="w-full h-full object-cover"
                style={{ filter: `brightness(0) saturate(100%) invert(27%) sepia(51%) saturate(2878%) hue-rotate(176deg) brightness(102%) contrast(97%)` }}
              />
            </div>
            <div>
              <h2 className="text-xl font-medium" style={{ color: COLORS.TEXT }}>{delivery.customerName}</h2>
              <p className="text-sm" style={{ color: COLORS.TEXT + '80' }}>{delivery.customerPhone}</p>
            </div>
          </div>
          
          <div className="flex space-x-3">
            <Button 
              variant="outline"
              size="sm"
              onClick={() => handleContact('chat')}
              className="w-12 h-12 p-0 rounded-full border-2"
              style={{ 
                borderColor: COLORS.PRIMARY,
                backgroundColor: COLORS.PRIMARY
              }}
            >
              <MessageCircle className="h-6 w-6" style={{ color: COLORS.WHITE }} />
            </Button>
            <Button 
              variant="outline"
              size="sm"
              onClick={() => handleContact('call')}
              className="w-12 h-12 p-0 rounded-full border-2"
              style={{ 
                borderColor: COLORS.PRIMARY,
                backgroundColor: COLORS.PRIMARY
              }}
            >
              <Phone className="h-6 w-6" style={{ color: COLORS.WHITE }} />
            </Button>
          </div>
        </div>

        {/* Divider */}
        <div className="w-full h-px mb-6" style={{ backgroundColor: '#D4D4D4' }}></div>

        {/* Order Items */}
        <div className="mb-6">
          {delivery.orderItems.map((item, index) => (
            <div key={index} className="flex items-center space-x-4 mb-4">
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ backgroundColor: COLORS.PRIMARY }}>
                <div className="w-10 h-10" style={{ 
                  background: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='white'%3E%3Cpath d='M19.77 7.23l.01-.01-3.72-3.72L15 4.56l2.11 2.11c-.94.36-1.61 1.26-1.61 2.33 0 1.38 1.12 2.5 2.5 2.5.36 0 .69-.08 1-.21v7.21c0 .55-.45 1-1 1s-1-.45-1-1V14c0-1.1-.9-2-2-2h-1V5c0-1.1-.9-2-2-2H6c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h6v2h8c1.1 0 2-.9 2-2V9c0-.69-.28-1.32-.73-1.77zM12 10H6V6h6v4z'/%3E%3C/svg%3E")`,
                  backgroundSize: 'cover'
                }}></div>
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-semibold" style={{ color: COLORS.ACTIVE }}>{item.name}</h3>
                <div className="flex items-center space-x-3 mt-1">
                  <div className="px-3 py-1 rounded border" style={{ 
                    borderColor: COLORS.PRIMARY,
                    backgroundColor: COLORS.WHITE
                  }}>
                    <span className="text-xs font-medium" style={{ color: COLORS.PRIMARY }}>{item.quantity}</span>
                  </div>
                  <div className="flex items-center">
                    <span className="text-sm font-semibold" style={{ color: COLORS.SECONDARY }}>₦{item.price.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Route Information */}
        <div className="space-y-4 mb-6">
          {/* Time and progress bar */}
          <div className="flex items-center space-x-3">
            <Clock className="h-5 w-5" style={{ color: COLORS.PRIMARY }} />
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <p className="text-xl font-medium" style={{ color: COLORS.TEXT }}>{delivery.estimatedTime}</p>
                <Badge 
                  className="rounded-full px-3 py-1"
                  style={{ 
                    backgroundColor: `${getStatusColor(delivery.status)}20`, 
                    color: getStatusColor(delivery.status)
                  }}
                >
                  {getStatusText(delivery.status)}
                </Badge>
              </div>
              <div className="w-full h-1 rounded-full mt-2" style={{ backgroundColor: '#D9D9D9' }}>
                <div 
                  className="h-1 rounded-full transition-all duration-500" 
                  style={{ 
                    backgroundColor: getStatusColor(delivery.status),
                    width: delivery.status === 'ASSIGNED' ? '25%' : 
                           delivery.status === 'PICKED_UP' ? '50%' : 
                           delivery.status === 'IN_TRANSIT' ? '75%' : 
                           delivery.status === 'DELIVERED' ? '100%' : '0%'
                  }}
                ></div>
              </div>
            </div>
          </div>

          {/* Dotted line connector */}
          <div className="flex items-center">
            <div className="w-5 h-5 flex-shrink-0"></div>
            <div className="w-px h-8 ml-2.5 border-l-2 border-dashed" style={{ borderColor: COLORS.PRIMARY }}></div>
          </div>

          {/* Distance */}
          <div className="flex items-center space-x-3">
            <Ruler className="h-5 w-5" style={{ color: COLORS.PRIMARY }} />
            <p className="text-base font-medium" style={{ color: COLORS.TEXT }}>{delivery.distance}</p>
          </div>

          {/* Dotted line connector */}
          <div className="flex items-center">
            <div className="w-5 h-5 flex-shrink-0"></div>
            <div className="w-px h-8 ml-2.5 border-l-2 border-dashed" style={{ borderColor: COLORS.PRIMARY }}></div>
          </div>

          {/* Destination */}
          <div className="flex items-center space-x-3">
            <MapPin className="h-5 w-5" style={{ color: COLORS.PRIMARY }} />
            <p className="text-base font-medium" style={{ color: COLORS.TEXT }}>{delivery.deliveryAddress}</p>
          </div>
        </div>

        {/* Map with Background Image */}
        <div className="mb-6">
          <div 
            className="w-full h-64 rounded-2xl border relative overflow-hidden"
            style={{ 
              borderColor: COLORS.ACTIVE,
              backgroundImage: `url(${mapBackgroundImage})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center'
            }}
          >
            {/* Optional overlay for better text visibility */}
            <div className="absolute inset-0 bg-black bg-opacity-10 rounded-2xl"></div>
          </div>
          
          {/* Navigation overlay */}
          <div 
            className="relative -mt-16 mx-4 p-4 rounded-b-2xl flex items-center justify-center cursor-pointer"
            style={{ backgroundColor: 'rgba(255, 255, 255, 0.9)' }}
            onClick={handleStartNavigation}
          >
            <Navigation className="h-5 w-5 mr-2" style={{ color: COLORS.ACTIVE }} />
            <span className="font-medium" style={{ color: COLORS.ACTIVE }}>Start Navigation</span>
          </div>
        </div>

        {/* Special Instructions */}
        {delivery.specialInstructions && (
          <Card className="mb-6 border rounded-2xl" style={{ borderColor: '#FCD34D', backgroundColor: '#FFFBEB' }}>
            <CardContent className="p-4">
              <div className="flex items-start space-x-3">
                <AlertTriangle className="h-5 w-5 mt-0.5 text-yellow-600" />
                <div>
                  <h4 className="font-medium text-yellow-800">Special Instructions</h4>
                  <p className="text-sm text-yellow-700 mt-1">{delivery.specialInstructions}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Action Buttons */}
        <div className="space-y-3">
          <Button 
            onClick={handleReportIssue}
            className="w-full rounded-3xl py-4 font-normal text-base"
            style={{ 
              backgroundColor: COLORS.PRIMARY,
              color: COLORS.WHITE
            }}
          >
            Report Issue
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function DeliveryDetail() {
  return (
    <NotificationProvider>
      <DeliveryDetailContent />
    </NotificationProvider>
  );
}