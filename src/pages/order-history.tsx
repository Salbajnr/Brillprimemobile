import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  ArrowLeft, 
  MapPin, 
  Ruler,
  Clock,
  Package,
  Fuel,
  ShoppingCart,
  Truck,
  Wifi,
  WifiOff
} from "lucide-react";
import { useWebSocketOrders, useWebSocketNotifications } from "@/hooks/use-websocket";
import { ClientRole, MessageType } from "../../../server/websocket";
import { useAuth } from "@/hooks/use-auth";
import accountCircleIcon from "../assets/images/account_circle.svg";

// Color constants
const COLORS = {
  PRIMARY: "#4682b4",
  SECONDARY: "#0b1a51", 
  ACTIVE: "#010e42",
  TEXT: "#131313",
  WHITE: "#ffffff"
};

interface OrderHistoryItem {
  id: string;
  type: 'FUEL' | 'COMMODITY' | 'DELIVERY' | 'FOOD';
  productName: string;
  quantity: string;
  price: number;
  customerName?: string;
  driverName?: string;
  merchantName?: string;
  pickupLocation: string;
  deliveryLocation: string;
  distance: string;
  status: 'COMPLETED' | 'CANCELLED' | 'PENDING' | 'IN_PROGRESS';
  date: string;
  time: string;
  profileImage?: string;
}

// Sample order history data for different user types
const getSampleOrderHistory = (userRole: string): OrderHistoryItem[] => {
  if (userRole === 'CONSUMER') {
    return [
      {
        id: '1',
        type: 'FUEL',
        productName: 'Petrol',
        quantity: '20 litres',
        price: 50000,
        driverName: 'Mike Johnson',
        pickupLocation: 'Shell Station, Bukuru',
        deliveryLocation: 'Rayfield, Jos',
        distance: '12km',
        status: 'COMPLETED',
        date: 'Friday, 13th November 2024',
        time: '05:00pm'
      },
      {
        id: '2',
        type: 'COMMODITY',
        productName: 'Rice (50kg)',
        quantity: '2 bags',
        price: 85000,
        merchantName: 'Fatima Store',
        pickupLocation: 'Market Square, Jos',
        deliveryLocation: 'Angwan Rogo, Jos',
        distance: '8km',
        status: 'CANCELLED',
        date: 'Thursday, 12th November 2024',
        time: '02:30pm'
      },
      {
        id: '3',
        type: 'FOOD',
        productName: 'Jollof Rice & Chicken',
        quantity: '3 portions',
        price: 15000,
        merchantName: 'Mama Adanna Kitchen',
        pickupLocation: 'Terminus Market',
        deliveryLocation: 'University of Jos',
        distance: '5km',
        status: 'COMPLETED',
        date: 'Wednesday, 11th November 2024',
        time: '07:45pm'
      }
    ];
  } else if (userRole === 'MERCHANT') {
    return [
      {
        id: '1',
        type: 'COMMODITY',
        productName: 'Yam Tubers',
        quantity: '10 pieces',
        price: 25000,
        customerName: 'Sarah Ibrahim',
        driverName: 'David Yakubu',
        pickupLocation: 'My Store, Jos Main Market',
        deliveryLocation: 'Angwan Rukuba',
        distance: '15km',
        status: 'COMPLETED',
        statusColor: 'text-green-600 bg-green-50',
        date: 'Friday, 13th November 2024',
        time: '11:30am'
      },
      {
        id: '2',
        type: 'FOOD',
        productName: 'Pepper Soup',
        quantity: '5 bowls',
        price: 12500,
        customerName: 'John Musa',
        pickupLocation: 'My Restaurant',
        deliveryLocation: 'Plateau University',
        distance: '7km',
        status: 'IN_PROGRESS',
        statusColor: 'text-blue-600 bg-blue-50',
        date: 'Friday, 13th November 2024',
        time: '01:15pm'
      },
      {
        id: '3',
        type: 'COMMODITY',
        productName: 'Palm Oil',
        quantity: '5 litres',
        price: 18000,
        customerName: 'Grace Danjuma',
        driverName: 'Ahmed Hassan',
        pickupLocation: 'My Store',
        deliveryLocation: 'Rayfield Estate',
        distance: '9km',
        status: 'CANCELLED',
        statusColor: 'text-red-600 bg-red-50',
        date: 'Thursday, 12th November 2024',
        time: '04:20pm'
      }
    ];
  } else if (userRole === 'DRIVER') {
    return [
      {
        id: '1',
        type: 'FUEL',
        productName: 'Diesel',
        quantity: '50 litres',
        price: 75000,
        customerName: 'Construction Co. Ltd',
        pickupLocation: 'Total Station, Jos',
        deliveryLocation: 'Construction Site, Vom',
        distance: '25km',
        status: 'COMPLETED',
        date: 'Friday, 13th November 2024',
        time: '09:00am'
      },
      {
        id: '2',
        type: 'DELIVERY',
        productName: 'Electronics Package',
        quantity: '1 package',
        price: 5000,
        customerName: 'Tech Solutions Ltd',
        pickupLocation: 'Computer Village, Jos',
        deliveryLocation: 'Government House',
        distance: '18km',
        status: 'COMPLETED',
        date: 'Thursday, 12th November 2024',
        time: '03:45pm'
      },
      {
        id: '3',
        type: 'COMMODITY',
        productName: 'Fresh Vegetables',
        quantity: '10 crates',
        price: 8000,
        customerName: 'Restaurant Chain',
        pickupLocation: 'Vegetable Market',
        deliveryLocation: 'Multiple Restaurants',
        distance: '22km',
        status: 'CANCELLED',
        date: 'Wednesday, 11th November 2024',
        time: '06:30am'
      }
    ];
  }
  return [];
};

const getStatusColor = (status: string) => {
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
      return <Fuel className="h-5 w-5" style={{ color: COLORS.PRIMARY }} />;
    case 'COMMODITY':
    case 'FOOD':
      return <ShoppingCart className="h-5 w-5" style={{ color: COLORS.PRIMARY }} />;
    case 'DELIVERY':
      return <Package className="h-5 w-5" style={{ color: COLORS.PRIMARY }} />;
    default:
      return <Package className="h-5 w-5" style={{ color: COLORS.PRIMARY }} />;
  }
};

const getPageTitle = (userRole: string) => {
  if (userRole === 'DRIVER') return 'Pickup & Delivery History';
  return 'Order History';
};

const getReturnPath = (userRole: string) => {
  switch (userRole) {
    case 'CONSUMER':
      return '/consumer-home';
    case 'MERCHANT':
      return '/merchant-dashboard';
    case 'DRIVER':
      return '/driver-dashboard';
    default:
      return '/dashboard';
  }
};

export default function OrderHistory() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();

  const userRole = user?.role || 'CONSUMER';
  const [orderHistory, setOrderHistory] = useState(getSampleOrderHistory(userRole));
  const pageTitle = getPageTitle(userRole);
  const returnPath = getReturnPath(userRole);

  // Initialize WebSocket hooks
  const { 
    connected: ordersConnected, 
    orderUpdates, 
    connectionError: ordersError 
  } = useWebSocketOrders();

  const { 
    connected: notificationsConnected, 
    notifications, 
    connectionError: notificationsError 
  } = useWebSocketNotifications();

  const handleBackNavigation = () => {
    setLocation(returnPath);
  };

  // Process real-time order updates
  useEffect(() => {
    if (Object.keys(orderUpdates).length > 0) {
      // Update order history with real-time updates
      setOrderHistory(prevOrders => {
        return prevOrders.map(order => {
          // If we have an update for this order
          if (orderUpdates[order.id]) {
            const update = orderUpdates[order.id];
            return {
              ...order,
              status: update.status
            };
          }
          return order;
        });
      });
    }
  }, [orderUpdates]);

  // Process notifications related to orders
  useEffect(() => {
    if (notifications.length > 0) {
      // Filter notifications related to orders
      const orderNotifications = notifications.filter(
        notification => notification.payload.type === 'ORDER_UPDATE'
      );

      if (orderNotifications.length > 0) {
        // Process order notifications if needed
        console.log('Received order notifications:', orderNotifications);
      }
    }
  }, [notifications]);

  // Fetch order history from API
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchOrderHistory = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch('/api/orders', {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
            'Content-Type': 'application/json'
          }
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();

        if (data.success) {
          setOrders(data.data || []);
        } else {
          throw new Error(data.message || 'Failed to fetch orders');
        }
      } catch (error) {
        console.error('Error fetching order history:', error);
        setError(error.message);
        setOrders([]);
      } finally {
        setLoading(false);
      }
    };

    fetchOrderHistory();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 w-full max-w-sm sm:max-w-md md:max-w-lg lg:max-w-xl xl:max-w-2xl mx-auto px-2 sm:px-4">{/*Responsive container*/}
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
            <div className="w-10 flex items-center justify-center">
              {ordersConnected ? (
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
        </div>
      </div>

      {/* Order History List */}
      <div className="max-w-md mx-auto p-5 space-y-4">
        {loading && <p>Loading orders...</p>}
        {error && <p className="text-red-500">Error: {error}</p>}
        {orders.length === 0 && !loading && !error ? (
          <Card className="rounded-3xl border" style={{ borderColor: COLORS.PRIMARY }}>
            <CardContent className="text-center py-16">
              <div className="w-20 h-20 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full mx-auto mb-6 flex items-center justify-center">
                <Clock className="h-10 w-10 text-gray-400" />
              </div>
              <h3 className="text-xl font-semibold text-gray-700 mb-2">No Order History</h3>
              <p className="text-gray-500 mb-6">
                {userRole === 'DRIVER' 
                  ? 'Complete your first delivery to see history here' 
                  : 'Place your first order to see history here'
                }
              </p>
              <Button 
                onClick={handleBackNavigation}
                className="rounded-full"
                style={{ 
                  backgroundColor: COLORS.PRIMARY,
                  color: COLORS.WHITE
                }}
              >
                {userRole === 'DRIVER' ? 'View Available Orders' : 'Start Shopping'}
              </Button>
            </CardContent>
          </Card>
        ) : (
          orders.map((order) => {
            const statusConfig = getStatusColor(order.status);

            return (
              <Card 
                key={order.id}
                className="rounded-3xl border shadow-lg cursor-pointer hover:shadow-xl transition-shadow"
                style={{ borderColor: COLORS.PRIMARY }}
                onClick={() => setLocation(`/order-history-detail?status=${order.status}`)}
              >
                <CardContent className="p-6">
                  {/* Header with profile and price */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 rounded-full overflow-hidden border-2" style={{ borderColor: COLORS.PRIMARY }}>
                        <img 
                          src={order.profileImage || accountCircleIcon} 
                          alt="Profile" 
                          className="w-full h-full object-cover"
                          style={{ filter: `brightness(0) saturate(100%) invert(27%) sepia(51%) saturate(2878%) hue-rotate(176deg) brightness(102%) contrast(97%)` }}
                        />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-600">
                          {userRole === 'CONSUMER' && (order.driverName || order.merchantName)}
                          {userRole === 'MERCHANT' && order.customerName}
                          {userRole === 'DRIVER' && order.customerName}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <span className="text-lg font-semibold" style={{ color: COLORS.SECONDARY }}>
                        ₦{order.price.toLocaleString()}
                      </span>
                    </div>
                  </div>

                  {/* Product Details */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      {getProductIcon(order.type)}
                      <h3 className="text-xl font-semibold" style={{ color: COLORS.ACTIVE }}>
                        {order.productName}
                      </h3>
                    </div>

                    <Badge 
                      variant="outline"
                      className="px-3 py-1 rounded-lg border text-xs font-medium"
                      style={{ 
                        borderColor: COLORS.PRIMARY,
                        color: COLORS.PRIMARY,
                        backgroundColor: 'transparent'
                      }}
                    >
                      {order.quantity}
                    </Badge>
                  </div>

                  {/* Divider */}
                  <div className="w-full h-px mb-6 bg-gray-300"></div>

                  {/* Route Information */}
                  <div className="space-y-4 mb-6">
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
                        {order.pickupLocation}
                      </p>
                    </div>

                    {/* Dotted connector lines */}
                    <div className="flex items-center">
                      <div className="w-5 h-5 flex-shrink-0"></div>
                      <div 
                        className="w-px h-8 ml-2.5 border-l-2 border-dashed" 
                        style={{ borderColor: COLORS.PRIMARY }}
                      ></div>
                    </div>

                    {/* Distance */}
                    <div className="flex items-center space-x-3">
                      <Ruler className="h-5 w-5" style={{ color: COLORS.PRIMARY }} />
                      <p className="text-base font-medium" style={{ color: COLORS.TEXT }}>
                        {order.distance}
                      </p>
                    </div>

                    {/* Dotted connector lines */}
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
                        {order.deliveryLocation}
                      </p>
                    </div>
                  </div>

                  {/* Status and Date */}
                  <div className="flex items-center justify-between">
                    <Badge 
                      className="px-3 py-1 rounded-lg text-xs font-medium border"
                      style={{ 
                        borderColor: statusConfig.bg,
                        color: statusConfig.text,
                        backgroundColor: 'transparent'
                      }}
                    >
                      {statusConfig.label}
                    </Badge>

                    <div className="text-right">
                      <p className="text-xs font-light" style={{ color: COLORS.ACTIVE }}>
                        {order.date}
                      </p>
                      <p className="text-xs font-light" style={{ color: COLORS.ACTIVE }}>
                        {order.time}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}