import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  ArrowLeft, 
  MapPin, 
  Clock,
  Package,
  Fuel,
  ShoppingCart,
  Truck,
  Phone,
  MessageSquare,
  Navigation
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import accountCircleIcon from "../assets/images/account_circle.svg";
import fuelIcon from "../assets/images/order_fuel_icon.png";

// Color constants
const COLORS = {
  PRIMARY: "#4682b4",
  SECONDARY: "#0b1a51", 
  ACTIVE: "#010e42",
  TEXT: "#131313",
  WHITE: "#ffffff"
};

interface OrderDetail {
  id: string;
  type: 'FUEL' | 'COMMODITY' | 'DELIVERY' | 'FOOD';
  productName: string;
  quantity: string;
  unitPrice: number;
  subtotal: number;
  deliveryFee: number;
  total: number;
  customerName: string;
  customerPhone: string;
  driverName?: string;
  pickupLocation: string;
  deliveryLocation: string;
  distance: string;
  timeTaken: string;
  status: 'COMPLETED' | 'CANCELLED' | 'PENDING' | 'IN_PROGRESS';
  date: string;
  deliveryTime: string;
  profileImage?: string;
  productIcon?: string;
}

// Get sample data including failed orders
const getSampleOrderDetail = (userRole: string): OrderDetail => {
  // Check URL params to determine if showing a failed/cancelled order
  const urlParams = new URLSearchParams(window.location.search);
  const orderStatus = urlParams.get('status') || 'COMPLETED';
  
  if (userRole === 'DRIVER') {
    if (orderStatus === 'CANCELLED') {
      return {
        id: 'ord-004',
        type: 'FUEL',
        productName: 'Petrol',
        quantity: '1 litre',
        unitPrice: 30000,
        subtotal: 30000,
        deliveryFee: 500,
        total: 30500,
        customerName: 'Mike Johnson',
        customerPhone: '+234 801 234 5678',
        pickupLocation: 'Bukuru, Jos',
        deliveryLocation: 'Rayfield, Jos',
        distance: '10Km',
        timeTaken: '15 mins',
        status: 'CANCELLED',
        date: 'Friday, 13th November 2024',
        deliveryTime: '05:00pm',
        productIcon: fuelIcon
      };
    }
    return {
      id: 'ord-001',
      type: 'FUEL',
      productName: 'Petrol',
      quantity: '1 litre',
      unitPrice: 30000,
      subtotal: 30000,
      deliveryFee: 500,
      total: 30500,
      customerName: 'Mike Johnson',
      customerPhone: '+234 801 234 5678',
      pickupLocation: 'Bukuru, Jos',
      deliveryLocation: 'Rayfield, Jos',
      distance: '10Km',
      timeTaken: '15 mins',
      status: 'COMPLETED',
      date: 'Friday, 13th November 2024',
      deliveryTime: '05:00pm',
      productIcon: fuelIcon
    };
  } else if (userRole === 'CONSUMER') {
    if (orderStatus === 'CANCELLED') {
      return {
        id: 'ord-005',
        type: 'COMMODITY',
        productName: 'Rice (50kg)',
        quantity: '2 bags',
        unitPrice: 42500,
        subtotal: 85000,
        deliveryFee: 1500,
        total: 86500,
        customerName: 'Sarah Ibrahim',
        customerPhone: '+234 803 567 8901',
        driverName: 'Ahmed Hassan',
        pickupLocation: 'Market Square, Jos',
        deliveryLocation: 'Angwan Rogo, Jos',
        distance: '8Km',
        timeTaken: '0 mins',
        status: 'CANCELLED',
        date: 'Thursday, 12th November 2024',
        deliveryTime: 'Not delivered',
        productIcon: fuelIcon
      };
    }
    return {
      id: 'ord-002',
      type: 'COMMODITY',
      productName: 'Rice (50kg)',
      quantity: '2 bags',
      unitPrice: 42500,
      subtotal: 85000,
      deliveryFee: 1500,
      total: 86500,
      customerName: 'Sarah Ibrahim',
      customerPhone: '+234 803 567 8901',
      driverName: 'Ahmed Hassan',
      pickupLocation: 'Market Square, Jos',
      deliveryLocation: 'Angwan Rogo, Jos',
      distance: '8Km',
      timeTaken: '22 mins',
      status: 'COMPLETED',
      date: 'Thursday, 12th November 2024',
      deliveryTime: '02:30pm'
    };
  } else {
    if (orderStatus === 'CANCELLED') {
      return {
        id: 'ord-006',
        type: 'FOOD',
        productName: 'Jollof Rice Combo',
        quantity: '3 portions',
        unitPrice: 5000,
        subtotal: 15000,
        deliveryFee: 800,
        total: 15800,
        customerName: 'Grace Danjuma',
        customerPhone: '+234 805 432 1098',
        driverName: 'David Yakubu',
        pickupLocation: 'Mama Adanna Kitchen',
        deliveryLocation: 'University of Jos',
        distance: '5Km',
        timeTaken: '0 mins',
        status: 'CANCELLED',
        date: 'Wednesday, 11th November 2024',
        deliveryTime: 'Not delivered',
        productIcon: fuelIcon
      };
    }
    return {
      id: 'ord-003',
      type: 'FOOD',
      productName: 'Jollof Rice Combo',
      quantity: '3 portions',
      unitPrice: 5000,
      subtotal: 15000,
      deliveryFee: 800,
      total: 15800,
      customerName: 'Grace Danjuma',
      customerPhone: '+234 805 432 1098',
      driverName: 'David Yakubu',
      pickupLocation: 'Mama Adanna Kitchen',
      deliveryLocation: 'University of Jos',
      distance: '5Km',
      timeTaken: '18 mins',
      status: 'COMPLETED',
      date: 'Wednesday, 11th November 2024',
      deliveryTime: '07:45pm'
    };
  }
};

const getStatusConfig = (status: string) => {
  switch (status) {
    case 'COMPLETED':
      return {
        bg: '#31D45D',
        text: '#31D45D',
        label: 'Completed'
      };
    case 'CANCELLED':
      return {
        bg: '#FF4141',
        text: '#FF4141',
        label: 'Cancelled'
      };
    case 'IN_PROGRESS':
      return {
        bg: '#FF8C00',
        text: '#FF8C00',
        label: 'In Progress'
      };
    case 'PENDING':
      return {
        bg: '#FFC107',
        text: '#FFC107',
        label: 'Pending'
      };
    default:
      return {
        bg: COLORS.PRIMARY,
        text: COLORS.PRIMARY,
        label: status
      };
  }
};

const getProductIcon = (type: string) => {
  switch (type) {
    case 'FUEL':
      return <Fuel className="h-10 w-10 text-white" />;
    case 'COMMODITY':
    case 'FOOD':
      return <ShoppingCart className="h-10 w-10 text-white" />;
    case 'DELIVERY':
      return <Package className="h-10 w-10 text-white" />;
    default:
      return <Package className="h-10 w-10 text-white" />;
  }
};

const getPageTitle = (userRole: string) => {
  if (userRole === 'DRIVER') return 'Delivery Detail';
  return 'Order History Detail';
};

const getReturnPath = (userRole: string) => {
  return '/order-history';
};

export default function OrderHistoryDetail() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  
  const userRole = user?.role || 'CONSUMER';
  const orderDetail = getSampleOrderDetail(userRole);
  const statusConfig = getStatusConfig(orderDetail.status);
  const pageTitle = getPageTitle(userRole);
  const returnPath = getReturnPath(userRole);

  const handleBackNavigation = () => {
    setLocation(returnPath);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 2
    }).format(amount / 100); // Convert from kobo to naira
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-md mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Button 
              onClick={handleBackNavigation}
              variant="ghost" 
              size="sm"
              className="p-2 rounded-full hover:bg-gray-100"
            >
              <ArrowLeft className="h-6 w-6" style={{ color: COLORS.TEXT }} />
            </Button>
            <h1 className="text-xl font-bold" style={{ color: COLORS.TEXT }}>
              {pageTitle}
            </h1>
            <div className="w-10"></div>
          </div>
        </div>
      </div>

      {/* Order Detail Content */}
      <div className="max-w-md mx-auto p-5 space-y-6">
        {/* Customer Profile Section */}
        <Card className="rounded-3xl border" style={{ borderColor: COLORS.PRIMARY }}>
          <CardContent className="text-center py-8">
            <div className="w-20 h-20 rounded-full mx-auto mb-4 overflow-hidden border-4" style={{ borderColor: COLORS.PRIMARY }}>
              <img 
                src={orderDetail.profileImage || accountCircleIcon} 
                alt="Customer Profile" 
                className="w-full h-full object-cover"
                style={{ filter: `brightness(0) saturate(100%) invert(27%) sepia(51%) saturate(2878%) hue-rotate(176deg) brightness(102%) contrast(97%)` }}
              />
            </div>
            <h2 className="text-xl font-semibold mb-2" style={{ color: COLORS.TEXT }}>
              {orderDetail.customerName}
            </h2>
          </CardContent>
        </Card>

        {/* Divider */}
        <div className="w-full h-px bg-gray-300"></div>

        {/* Product Information */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-4">
            <div 
              className="w-15 h-15 rounded-2xl flex items-center justify-center"
              style={{ backgroundColor: COLORS.PRIMARY }}
            >
              {orderDetail.productIcon ? (
                <img src={orderDetail.productIcon} alt={orderDetail.productName} className="w-10 h-10" />
              ) : (
                getProductIcon(orderDetail.type)
              )}
            </div>
            <div>
              <h3 className="text-xl font-semibold" style={{ color: COLORS.ACTIVE }}>
                {orderDetail.productName}
              </h3>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <Badge 
              variant="outline"
              className="px-3 py-1 rounded-lg border text-xs font-medium"
              style={{ 
                borderColor: COLORS.PRIMARY,
                color: COLORS.PRIMARY,
                backgroundColor: 'transparent'
              }}
            >
              {orderDetail.quantity}
            </Badge>
            <div className="text-right">
              <span className="text-lg font-semibold" style={{ color: COLORS.SECONDARY }}>
                ₦{(orderDetail.unitPrice / 100).toFixed(2)}
              </span>
            </div>
          </div>
        </div>

        {/* Route Information */}
        <Card className="rounded-3xl border" style={{ borderColor: COLORS.PRIMARY }}>
          <CardContent className="p-6">
            <div className="space-y-4">
              {/* Pickup Location */}
              <div className="flex items-center space-x-3">
                <div className="flex items-center justify-center">
                  <div 
                    className="w-5 h-5 rounded-full border-2 flex items-center justify-center"
                    style={{ borderColor: COLORS.PRIMARY }}
                  >
                    <div 
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: COLORS.ACTIVE }}
                    ></div>
                  </div>
                </div>
                <p className="text-base font-medium" style={{ color: COLORS.ACTIVE }}>
                  {orderDetail.pickupLocation}
                </p>
              </div>

              {/* Dotted connector line */}
              <div className="flex items-center">
                <div className="w-5 h-5 flex-shrink-0"></div>
                <div 
                  className="w-px h-8 ml-2.5 border-l-2 border-dashed" 
                  style={{ borderColor: COLORS.PRIMARY }}
                ></div>
              </div>

              {/* Delivery Location */}
              <div className="flex items-center space-x-3">
                <MapPin className="h-5 w-5" style={{ color: COLORS.PRIMARY }} />
                <p className="text-base font-medium" style={{ color: COLORS.ACTIVE }}>
                  {orderDetail.deliveryLocation}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Delivery Statistics */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-light" style={{ color: COLORS.ACTIVE }}>Distance</p>
            <p className="text-sm font-medium" style={{ color: COLORS.ACTIVE }}>{orderDetail.distance}</p>
          </div>
          
          <div className="flex items-center justify-between">
            <p className="text-sm font-light" style={{ color: COLORS.ACTIVE }}>Time taken</p>
            <p className="text-sm font-medium" style={{ color: COLORS.ACTIVE }}>{orderDetail.timeTaken}</p>
          </div>
          
          <div className="flex items-center justify-between">
            <p className="text-sm font-light" style={{ color: COLORS.ACTIVE }}>Date</p>
            <p className="text-sm font-medium" style={{ color: COLORS.ACTIVE }}>{orderDetail.date}</p>
          </div>
          
          <div className="flex items-center justify-between">
            <p className="text-sm font-light" style={{ color: COLORS.ACTIVE }}>Time of Delivery</p>
            <p className="text-sm font-medium" style={{ color: COLORS.ACTIVE }}>{orderDetail.deliveryTime}</p>
          </div>
        </div>

        {/* Purchase Summary - Only show for completed orders */}
        {orderDetail.status === 'COMPLETED' && (
          <Card 
            className="rounded-2xl text-white"
            style={{ backgroundColor: COLORS.PRIMARY }}
          >
            <CardContent className="p-6">
              <h4 className="text-lg font-bold text-center mb-6 text-white">Purchase Summary</h4>
              
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-base">Subtotal</span>
                  <span className="text-base font-semibold">₦{(orderDetail.subtotal / 100).toFixed(2)}</span>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-base">Delivery fee</span>
                  <span className="text-base font-semibold">₦{(orderDetail.deliveryFee / 100).toFixed(2)}</span>
                </div>
                
                <div className="border-t border-white/20 pt-3">
                  <div className="flex items-center justify-between">
                    <span className="text-base font-medium">Total</span>
                    <span className="text-base font-bold">₦{(orderDetail.total / 100).toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Cancelled Order Summary */}
        {orderDetail.status === 'CANCELLED' && (
          <Card 
            className="rounded-2xl text-white"
            style={{ backgroundColor: COLORS.PRIMARY }}
          >
            <CardContent className="p-6">
              <h4 className="text-lg font-bold text-center mb-6 text-white">Purchase Summary</h4>
              
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-base">Subtotal</span>
                  <span className="text-base font-semibold">₦{(orderDetail.subtotal / 100).toFixed(2)}</span>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-base">Delivery fee</span>
                  <span className="text-base font-semibold">₦{(orderDetail.deliveryFee / 100).toFixed(2)}</span>
                </div>
                
                <div className="border-t border-white/20 pt-3">
                  <div className="flex items-center justify-between">
                    <span className="text-base font-medium">Total</span>
                    <span className="text-base font-bold">₦{(orderDetail.total / 100).toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Status Badge */}
        <div className="flex justify-center">
          <Badge 
            className="px-8 py-3 text-lg font-medium border-2 rounded-3xl"
            style={{ 
              borderColor: statusConfig.bg,
              color: statusConfig.text,
              backgroundColor: 'transparent'
            }}
          >
            {statusConfig.label}
          </Badge>
        </div>

        {/* Action Buttons (only for drivers with active orders) */}
        {userRole === 'DRIVER' && orderDetail.status !== 'COMPLETED' && orderDetail.status !== 'CANCELLED' && (
          <div className="flex space-x-3">
            <Button 
              className="flex-1 rounded-2xl border-2 border-gray-300 bg-white hover:bg-gray-50"
              style={{ color: COLORS.PRIMARY }}
            >
              <Phone className="h-4 w-4 mr-2" />
              Call Customer
            </Button>
            
            <Button 
              className="flex-1 rounded-2xl"
              style={{ 
                backgroundColor: COLORS.PRIMARY,
                color: COLORS.WHITE
              }}
              onClick={() => setLocation('/chat')}
            >
              <MessageSquare className="h-4 w-4 mr-2" />
              Chat
            </Button>
          </div>
        )}

        {/* Cancelled Order Actions */}
        {orderDetail.status === 'CANCELLED' && (
          <div className="text-center space-y-4">
            <div className="bg-red-50 rounded-2xl p-4 border border-red-200">
              <div className="flex items-center justify-center space-x-2 text-red-600">
                <div className="w-6 h-6 rounded-full border-2 border-red-600 flex items-center justify-center">
                  <span className="text-sm font-bold">!</span>
                </div>
                <p className="text-sm font-medium">This order was cancelled</p>
              </div>
              <p className="text-xs text-red-500 mt-2">
                {userRole === 'DRIVER' 
                  ? 'The customer cancelled this delivery request'
                  : userRole === 'CONSUMER'
                  ? 'You cancelled this order'
                  : 'This order was cancelled by the customer'
                }
              </p>
            </div>
            
            {userRole === 'CONSUMER' && (
              <Button 
                className="rounded-2xl"
                style={{ 
                  backgroundColor: COLORS.PRIMARY,
                  color: COLORS.WHITE
                }}
                onClick={() => setLocation('/commodities')}
              >
                Order Again
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}