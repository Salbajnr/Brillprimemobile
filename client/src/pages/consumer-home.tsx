import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Bell, Scan, Send, Plus, CreditCard, MapPin, Fuel, Receipt, ShoppingCart, Eye, EyeOff, Clock, Wifi, WifiOff } from "lucide-react";
import { useWebSocketOrders, useWebSocketNotifications, useWebSocketChat } from "../hooks/use-websocket";
import { ClientRole, MessageType } from "../../../server/websocket";
import { Card, CardContent } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { useAuth } from "../hooks/use-auth";
import { useNotifications } from "../hooks/use-notifications";
import { NotificationDropdown } from "../components/ui/notification-dropdown";
import logo from "@assets/images/logo.png";
import scanIcon from "@assets/images/scan_qr_code_white.png";
import orderFuelIcon from "@assets/images/order_fuel_icon.png";
import purchaseTollIcon from "@assets/images/purchase_toll_gate_white.png";
import viewCartIcon from "@assets/images/view_cart.png";
import masterCardLogo from "@assets/images/master_card_logo.png";
import visaCardLogo from "@assets/images/visa_card_logo.png";

interface QuickAction {
  id: string;
  title: string;
  icon: string;
  route: string;
  bgColor: string;
}

interface Transaction {
  id: string;
  type: "credit" | "debit";
  description: string;
  amount: number;
  date: string;
  status: "completed" | "pending" | "failed";
}

interface LocationData {
  latitude: number;
  longitude: number;
  city: string;
  country: string;
  loading: boolean;
  error: string | null;
}

// Color constants
const COLORS = {
  PRIMARY: '#4682b4',
  SECONDARY: '#0b1a51',
  ACTIVE: '#010e42',
  TEXT: '#131313',
  WHITE: '#ffffff'
} as const;

export default function ConsumerHome() {
  const [, setLocation] = useLocation();
  const [location] = useLocation();
  const { user } = useAuth();
  const { notifications, markAsRead, markAllAsRead } = useNotifications();
  const [showBalance, setShowBalance] = useState(true);

  // Fetch wallet balance from API
  const { data: walletData } = useQuery({
    queryKey: ['/api/wallet/balance'],
    queryFn: async () => {
      const response = await fetch('/api/wallet/balance');
      if (!response.ok) throw new Error('Failed to fetch wallet balance');
      return response.json();
    }
  });

  const walletBalance = walletData?.balance || 0;

  // WebSocket integration for real-time features
  const { connected: orderConnected, orderUpdates, connectionError: orderError } = useWebSocketOrders();
  const { connected: notificationConnected, notifications: wsNotifications, connectionError: notificationError } = useWebSocketNotifications();
  const { connected: paymentConnected, chatMessages: paymentConfirmations, connectionError: paymentError } = useWebSocketChat();
  const [locationData, setLocationData] = useState<LocationData>({
    latitude: 0,
    longitude: 0,
    city: "Unknown",
    country: "Unknown",
    loading: true,
    error: null
  });

  // Fetch recent transactions from API
  const { data: transactionsData } = useQuery({
    queryKey: ['/api/transactions'],
    queryFn: async () => {
      const response = await fetch(`/api/transactions?limit=5`);
      if (!response.ok) throw new Error('Failed to fetch transactions');
      return response.json();
    }
  });

  const recentTransactions: Transaction[] = transactionsData?.transactions || [];

  // Get user's current location
  useEffect(() => {
    const getCurrentLocation = () => {
      if (!navigator.geolocation) {
        setLocationData(prev => ({
          ...prev,
          loading: false,
          error: "Geolocation not supported"
        }));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;

          try {
            // Use reverse geocoding to get city/country
            const response = await fetch(
              `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`
            );
            const data = await response.json();

            setLocationData({
              latitude,
              longitude,
              city: data.city || data.locality || "Unknown City",
              country: data.countryName || "Unknown Country",
              loading: false,
              error: null
            });
          } catch (error) {
            setLocationData({
              latitude,
              longitude,
              city: "Unknown City",
              country: "Unknown Country",
              loading: false,
              error: null
            });
          }
        },
        (error) => {
          setLocationData(prev => ({
            ...prev,
            loading: false,
            error: error.message
          }));
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 300000 // 5 minutes
        }
      );
    };

    getCurrentLocation();
  }, []);

  // Generate map URL based on user location
  const getMapUrl = () => {
    if (locationData.loading || locationData.error) {
      return "/attached_assets/image_1752989901533.png"; // Fallback to provided image
    }

    // Using Google Maps Static API
    const zoom = 15;
    const center = `${locationData.latitude},${locationData.longitude}`;
    const size = "400x160";
    const mapType = "roadmap";
    const marker = `color:red%7Clabel:📍%7C${center}`;

    // Check for Google Maps API key
    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
    if (apiKey) {
      return `https://maps.googleapis.com/maps/api/staticmap?center=${center}&zoom=${zoom}&size=${size}&maptype=${mapType}&markers=${marker}&key=${apiKey}`;
    }

    // Fallback to OpenStreetMap-based service if no Google API key
    return `https://api.mapbox.com/styles/v1/mapbox/streets-v11/static/pin-s-l+ff0000(${locationData.longitude},${locationData.latitude})/${locationData.longitude},${locationData.latitude},${zoom}/400x160@2x?access_token=pk.eyJ1IjoibWFwYm94IiwiYSI6ImNpejY4NXVycTA2emYycXBndHRqcmZ3N3gifQ.rJcFIG214AriISLbB6B5aw`;
  };

  const quickActions: QuickAction[] = [
    {
      id: "scan",
      title: "Scan QR",
      icon: scanIcon,
      route: "/qr-scanner",
      bgColor: "bg-[#4682b4]"
    },
    {
      id: "fuel",
      title: "Order Fuel",
      icon: orderFuelIcon,
      route: "/fuel-ordering",
      bgColor: "bg-[#0b1a51]"
    },
    {
      id: "toll",
      title: "Toll Gates",
      icon: purchaseTollIcon,
      route: "/toll-payments",
      bgColor: "bg-[#010e42]"
    },
    {
      id: "cart",
      title: "Cart",
      icon: viewCartIcon,
      route: "/cart",
      bgColor: "bg-[#4682b4]"
    }
  ];

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getTransactionIcon = (type: string) => {
    return type === "credit" ? "↗" : "↙";
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed": return "bg-green-100 text-green-800";
      case "pending": return "bg-yellow-100 text-yellow-800";
      case "failed": return "bg-red-100 text-red-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  // Notification handlers
  const handleNotificationClick = (notification: any) => {
    if (notification.actionUrl) {
      setLocation(notification.actionUrl);
    }
  };

  // Process WebSocket order updates
  useEffect(() => {
    if (orderUpdates.length > 0) {
      // Process new order updates from WebSocket
      orderUpdates.forEach((update: Record<string, any>) => {
        if (update.type === MessageType.ORDER_STATUS_UPDATE) {
          console.log(`Order status update: ${update.status} for order ${update.orderId}`);
          // In a real app, you would show a notification or update the UI
          // You could also refresh the order history data
        }
      });
    }
  }, [orderUpdates]);

  // Process WebSocket notifications
  useEffect(() => {
    if (wsNotifications.length > 0) {
      // Process new notifications from WebSocket
      wsNotifications.forEach((notification: Record<string, any>) => {
        if (notification.type === MessageType.NOTIFICATION) {
          // In a real app, you would add these to a notification system
          console.log(`New notification: ${notification.payload?.title || 'New notification'} - ${notification.payload?.message || 'No message'}`);
        }
      });
    }
  }, [wsNotifications]);

  // Process WebSocket payment confirmations
  useEffect(() => {
    if (paymentConfirmations.length > 0) {
      // Process new payment confirmations from WebSocket
      paymentConfirmations.forEach((payment: Record<string, any>) => {
        if (payment.type === MessageType.PAYMENT_CONFIRMATION) {
          console.log(`Payment confirmed for order ${payment.payload?.orderId || 'unknown'}: ${payment.payload?.amount || 0}`);
          // In a real app, you would update the wallet balance and transaction history
        }
      });
    }
  }, [paymentConfirmations]);

  return (
    <div className="min-h-screen bg-gray-50 w-full max-w-sm sm:max-w-md md:max-w-lg lg:max-w-xl xl:max-w-2xl mx-auto px-2 sm:px-4">{/*Responsive container*/}
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-blue-100/50 animate-fade-in">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center space-x-3">
            <img src={logo} alt="Brillprime" className="w-8 h-8 animate-pulse" />
            <div className="animate-slide-up">
              <h1 className="text-lg font-semibold text-[#131313]">
                Good morning, {user?.fullName?.split(' ')[0] || 'User'}
              </h1>
              <p className="text-sm text-gray-600">Welcome back to Brillprime</p>
            </div>
          </div>
          <div className="flex items-center space-x-3 animate-slide-in-right">
            {/* WebSocket Connection Status */}
            {(orderConnected || notificationConnected || paymentConnected) ? (
              <Badge
                variant="default"
                className="rounded-full px-3 py-1"
                style={{ backgroundColor: '#D1FAE5', color: '#059669' }}
              >
                <Wifi className="w-3 h-3 mr-1" />
                Live
              </Badge>
            ) : (orderError || notificationError || paymentError) ? (
              <Badge
                variant="default"
                className="rounded-full px-3 py-1"
                style={{ backgroundColor: '#FEE2E2', color: '#DC2626' }}
              >
                <WifiOff className="w-3 h-3 mr-1" />
                Offline
              </Badge>
            ) : null}

            <NotificationDropdown
              notifications={[...notifications, ...wsNotifications.map((n: Record<string, any>) => ({
                id: n.payload?.id || Math.random().toString(),
                title: n.payload?.title || 'Notification',
                message: n.payload?.message || '',
                timestamp: new Date(n.timestamp || new Date()),
                type: n.payload?.type || 'system' as const,
                isRead: false,
                priority: n.payload?.priority || 'low' as const,
                actionUrl: n.payload?.actionUrl
              }))].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())}
              onMarkAsRead={markAsRead}
              onMarkAllAsRead={markAllAsRead}
              onNotificationClick={handleNotificationClick}
            />
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setLocation("/profile")}
              className="transition-all duration-300 hover:scale-110"
            >
              <div className="w-8 h-8 bg-[#4682b4] rounded-full flex items-center justify-center border-2 border-blue-200/50">
                <span className="text-white text-sm font-medium">
                  {user?.fullName?.charAt(0) || 'U'}
                </span>
              </div>
            </Button>
          </div>
        </div>
      </div>
      <div className="p-4 space-y-6">
        {/* Live Location Map Card */}
        <Card className="bg-gradient-to-r from-[#4682b4] to-[#0b1a51] text-white rounded-3xl border-2 border-blue-200/30 animate-fade-in-up">
          <CardContent className="p-6">
            <div className="flex items-center justify-end mb-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setLocation("/location-setup")}
                className="text-white hover:bg-white/20 transition-all duration-300 hover:scale-110"
              >
                <MapPin className="w-5 h-5" />
              </Button>
            </div>
            <div className="mb-4">
              <div className="h-40 bg-white/10 rounded-3xl overflow-hidden relative mx-2 border border-blue-200/20">
                {locationData.loading ? (
                  <div className="w-full h-full bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center">
                    <div className="text-center">
                      <div className="w-8 h-8 border-3 border-[#4682b4] border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                      <p className="text-sm text-[#4682b4] font-medium">Getting your location...</p>
                    </div>
                  </div>
                ) : locationData.error ? (
                  <div className="w-full h-full bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
                    <div className="text-center">
                      <MapPin className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                      <p className="text-sm text-gray-600">Location unavailable</p>
                      <p className="text-xs text-gray-500">Using default map</p>
                    </div>
                  </div>
                ) : (
                  <img
                    src={getMapUrl()}
                    alt="Live Location Map"
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      // Fallback to static image if map service fails
                      (e.target as HTMLImageElement).src = "/attached_assets/image_1752989901533.png";
                    }}
                  />
                )}

                {/* Floating location info */}
                <div className="absolute bottom-3 left-3 bg-white/95 backdrop-blur-sm rounded-2xl px-3 py-2 shadow-sm border border-blue-200/50 animate-slide-in-left">
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    <p className="text-xs text-[#4682b4] font-semibold">
                      Live • {locationData.loading ? "Loading..." : `${locationData.city}, ${locationData.country}`}
                    </p>
                  </div>
                </div>

                {/* Zoom controls */}
                <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm rounded-2xl p-1 shadow-sm border border-blue-200/50 animate-slide-in-right">
                  <div className="flex flex-col space-y-1">
                    <button className="w-6 h-6 flex items-center justify-center text-[#4682b4] hover:bg-blue-50 rounded text-sm font-bold">+</button>
                    <button className="w-6 h-6 flex items-center justify-center text-[#4682b4] hover:bg-blue-50 rounded text-sm font-bold">−</button>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex space-x-3">
              <Button
                className="flex-1 bg-white text-[#4682b4] hover:bg-gray-100 rounded-2xl border border-blue-200/50 transition-all duration-300 hover:scale-105"
                onClick={() => setLocation("/location-setup")}
              >
                <MapPin className="w-4 h-4 mr-2" />
                Where are you?
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <div className="animate-fade-in-up">
          <h3 className="text-lg font-semibold text-[#131313] mb-4">Quick Actions</h3>
          <div className="grid grid-cols-2 gap-3">
            {quickActions.map((action, index) => (
              <Card
                key={action.id}
                className="card-3d cursor-pointer rounded-3xl border-2 border-blue-100/50 animate-slide-up interactive-element"
                onClick={() => setLocation(action.route)}
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <CardContent className="p-3 flex flex-col items-center text-center">
                  <div className={`w-10 h-10 ${action.bgColor} rounded-full flex items-center justify-center mb-2 transition-all duration-300 hover:scale-110`}>
                    <img src={action.icon} alt={action.title} className="w-5 h-5" />
                  </div>
                  <h4 className="font-medium text-[#131313] text-sm">{action.title}</h4>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Services Grid */}
        <div className="animate-fade-in-up">
          <h3 className="text-lg font-semibold text-[#131313] mb-4">Services</h3>
          <div className="grid grid-cols-2 gap-4">
            <Button
              variant="outline"
              className="service-item-3d h-20 flex-col space-y-2 border-2 border-blue-200/50 text-[#4682b4] hover:bg-[#4682b4]/10 rounded-3xl animate-slide-up"
              onClick={() => setLocation("/commodities")}
              style={{ animationDelay: '0.2s' }}
            >
              <ShoppingCart className="w-6 h-6" />
              <span className="text-sm">Marketplace</span>
            </Button>
            <Button
              variant="outline"
              className="service-item-3d h-20 flex-col space-y-2 border-2 border-blue-200/50 text-[#4682b4] hover:bg-[#4682b4]/10 rounded-3xl animate-slide-up"
              onClick={() => setLocation("/order-history")}
              style={{ animationDelay: '0.3s' }}
            >
              <Clock className="w-6 h-6" />
              <span className="text-sm">Order History</span>
            </Button>
            <Button
              variant="outline"
              className="service-item-3d h-20 flex-col space-y-2 border-2 border-blue-200/50 text-[#4682b4] hover:bg-[#4682b4]/10 rounded-3xl animate-slide-up"
              onClick={() => setLocation("/merchants")}
              style={{ animationDelay: '0.4s' }}
            >
              <MapPin className="w-6 h-6" />
              <span className="text-sm">Find Merchants</span>
            </Button>
            <Button
              variant="outline"
              className="service-item-3d h-20 flex-col space-y-2 border-2 border-blue-200/50 text-[#4682b4] hover:bg-[#4682b4]/10 rounded-3xl animate-slide-up"
              onClick={() => setLocation("/payment-methods")}
              style={{ animationDelay: '0.5s' }}
            >
              <CreditCard className="w-6 h-6" />
              <span className="text-sm">Payment Cards</span>
            </Button>
          </div>
        </div>

        {/* Recent Transactions */}
        <div className="animate-fade-in-up">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-[#131313]">Recent Transactions</h3>
            <Button
              variant="ghost"
              className="text-[#4682b4] hover:text-[#0b1a51] transition-all duration-300 hover:scale-105"
              onClick={() => setLocation("/transactions")}
            >
              View All
            </Button>
          </div>
          <div className="space-y-3">
            {recentTransactions.slice(0, 4).map((transaction, index) => (
              <Card
                key={transaction.id}
                className="card-3d rounded-3xl border-2 border-blue-100/50 animate-slide-up interactive-element"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${transaction.type === "credit" ? "bg-green-100" : "bg-red-100"
                        }`}>
                        <span className={`text-lg ${transaction.type === "credit" ? "text-green-600" : "text-red-600"
                          }`}>
                          {getTransactionIcon(transaction.type)}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium text-[#131313] text-sm">
                          {transaction.description}
                        </p>
                        <p className="text-xs text-gray-600">
                          {formatDate(transaction.date)}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`font-semibold ${transaction.type === "credit" ? "text-green-600" : "text-red-600"
                        }`}>
                        {transaction.type === "credit" ? "+" : "-"}
                        {formatCurrency(transaction.amount)}
                      </p>
                      <Badge className={`text-xs ${getStatusColor(transaction.status)}`}>
                        {transaction.status}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Payment Methods Preview */}
        <Card className="rounded-3xl border-2 border-blue-100/50 animate-fade-in-up transition-all duration-300 hover:shadow-lg">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-medium text-[#131313]">Payment Methods</h4>
              <Button
                variant="ghost"
                size="sm"
                className="text-[#4682b4] transition-all duration-300 hover:scale-105"
                onClick={() => setLocation("/payment-methods")}
              >
                Manage
              </Button>
            </div>
            <div className="flex space-x-3">
              <div className="flex items-center space-x-2 bg-gray-50 rounded-2xl p-3 flex-1 border border-blue-100/50 transition-all duration-300 hover:scale-105">
                <img src={masterCardLogo} alt="Mastercard" className="w-8 h-5" />
                <span className="text-sm font-medium">•••• 4532</span>
              </div>
              <div className="flex items-center space-x-2 bg-gray-50 rounded-2xl p-3 flex-1 border border-blue-100/50 transition-all duration-300 hover:scale-105">
                <div className="w-8 h-5 bg-[#1A1F71] rounded flex items-center justify-center">
                  <span className="text-white font-bold text-xs">VISA</span>
                </div>
                <span className="text-sm font-medium">•••• 8901</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bottom Navigation Bar */}
      <div className="fixed bottom-0 left-1/2 transform -translate-x-1/2 w-full max-w-md bg-white border-t-2 border-blue-100 shadow-lg z-50">
        <div className="flex justify-around items-center py-2 px-4">
          <button
            onClick={() => setLocation("/consumer-home")}
            className="flex flex-col items-center p-2 rounded-lg transition-all duration-300 hover:bg-blue-50"
            style={{ color: location === "/consumer-home" ? COLORS.PRIMARY : COLORS.TEXT }}
          >
            <div className="w-8 h-8 flex items-center justify-center">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" />
              </svg>
            </div>
            <span className="text-xs font-medium mt-1">Home</span>
          </button>

          <button
            onClick={() => setLocation("/search-results")}
            className="flex flex-col items-center p-2 rounded-lg transition-all duration-300 hover:bg-blue-50"
            style={{ color: location === "/search-results" ? COLORS.PRIMARY : COLORS.TEXT }}
          >
            <div className="w-8 h-8 flex items-center justify-center">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" />
              </svg>
            </div>
            <span className="text-xs font-medium mt-1">Search</span>
          </button>

          <button
            onClick={() => setLocation("/messages")}
            className="flex flex-col items-center p-2 rounded-lg transition-all duration-300 hover:bg-blue-50 relative"
            style={{ color: location === "/messages" ? COLORS.PRIMARY : COLORS.TEXT }}
          >
            <div className="w-8 h-8 flex items-center justify-center relative">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M20 2H4c-1.1 0-1.99.9-1.99 2L2 22l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-2 12H6v-2h12v2zm0-3H6V9h12v2zm0-3H6V6h12v2z" />
              </svg>
              {/* Notification badge for unread messages */}
              <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center">
                <span className="text-xs text-white font-bold">3</span>
              </div>
            </div>
            <span className="text-xs font-medium mt-1">Messages</span>
          </button>

          <button
            onClick={() => setLocation("/profile")}
            className="flex flex-col items-center p-2 rounded-lg transition-all duration-300 hover:bg-blue-50"
            style={{ color: location === "/profile" ? COLORS.PRIMARY : COLORS.TEXT }}
          >
            <div className="w-8 h-8 flex items-center justify-center">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
              </svg>
            </div>
            <span className="text-xs font-medium mt-1">Profile</span>
          </button>
        </div>
      </div>
    </div>
  );
}