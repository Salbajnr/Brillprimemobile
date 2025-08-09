import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useWebSocketOrders, useWebSocketNotifications, useWebSocketChat } from "@/hooks/use-websocket";
import { ClientRole, MessageType } from "../../../server/websocket";
import { MerchantProfile } from "../../../shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Bell, ShoppingBag, DollarSign, Eye, MessageCircle, Package,
  TrendingUp, Users, Clock, CheckCircle, AlertCircle, Truck
} from "lucide-react";

interface MerchantOrder {
  id: string;
  buyerId: number;
  sellerId: number;
  productId: string;
  quantity: number;
  totalPrice: number;
  status: string;
  deliveryAddress: string;
  driverId?: number;
  createdAt: Date;
  updatedAt: Date;
  buyer: {
    fullName: string;
    phone: string;
    email: string;
  };
  product: {
    name: string;
    price: number;
    unit: string;
    image?: string;
  };
}

interface DashboardStats {
  todayRevenue: number;
  ordersCount: number;
  productViews: number;
  unreadMessages: number;
}

interface MerchantAnalytics {
  id: number;
  merchantId: number;
  date: Date;
  dailySales: number;
  dailyOrders: number;
  dailyViews: number;
  dailyClicks: number;
  topProduct?: string;
  peakHour?: number;
}

export default function MerchantDashboard() {
  const [selectedTab, setSelectedTab] = useState("overview");
  const [analyticsFilter, setAnalyticsFilter] = useState("7d");
  const [isBusinessOpen, setIsBusinessOpen] = useState(true);
  const [showNotifications, setShowNotifications] = useState(false);
  const queryClient = useQueryClient();

  // WebSocket integration for real-time features
  const { connected: orderConnected, orderUpdates, sendOrderStatusUpdate, connectionError: orderError } = useWebSocketOrders();
  const { connected: notificationConnected, notifications: wsNotifications, connectionError: notificationError } = useWebSocketNotifications();
  const { connected: paymentConnected, chatMessages: paymentConfirmations, connectionError: paymentError } = useWebSocketChat();

  // Fetch merchant profile
  const { data: merchantProfile } = useQuery<MerchantProfile>({
    queryKey: ["merchant", "profile"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/merchant/profile");
      return response.json();
    },
  });

  // Fetch dashboard stats
  const { data: dashboardStats } = useQuery<DashboardStats>({
    queryKey: ["merchant", "dashboard-stats"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/merchant/dashboard-stats");
      return response.json();
    },
    refetchInterval: 60000, // Refresh every minute
  });

  // Fetch orders
  const { data: orders = [], isLoading: ordersLoading } = useQuery<MerchantOrder[]>({
    queryKey: ["merchant", "orders"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/merchant/orders");
      return response.json();
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Fetch analytics
  const { data: analytics = [] } = useQuery<MerchantAnalytics[]>({
    queryKey: ["merchant", "analytics", analyticsFilter],
    queryFn: async () => {
      const response = await apiRequest("GET", `/api/merchant/analytics?period=${analyticsFilter}`);
      return response.json();
    },
  });

  // Update order status mutation
  const updateOrderStatusMutation = useMutation({
    mutationFn: ({ orderId, status }: { orderId: string; status: string }) =>
      apiRequest("PUT", `/api/merchant/order/${orderId}/status`, { status }),
    onSuccess: async (response: Response) => {
        const data = await response.json();
        queryClient.invalidateQueries({ queryKey: ["merchant", "orders"] });
        queryClient.invalidateQueries({ queryKey: ["merchant", "dashboard-stats"] });

        // Send real-time order status update via WebSocket
        if (data?.order) {
          // Notify customer and driver about order status change
          const recipientIds = [data.order.buyerId.toString()];
          if (data.order.driverId) {
            recipientIds.push(data.order.driverId.toString());
          }
          sendOrderStatusUpdate(data.order.id, status, recipientIds);
        }
      },
  });



  // Request delivery mutation
  const requestDeliveryMutation = useMutation({
    mutationFn: (deliveryData: any) =>
      apiRequest("POST", "/api/merchant/request-delivery", deliveryData),
    onSuccess: async (response: Response) => {
        const data = await response.json();
        queryClient.invalidateQueries({ queryKey: ["merchant", "orders"] });

        // Send real-time notification to nearby drivers about new delivery request
        if (data?.deliveryRequest) {
          // In a real implementation, this would broadcast to all drivers in the area
          console.log(`Broadcasting delivery request ${data.deliveryRequest.id} to nearby drivers`);
        }
      },
  });

  // Process WebSocket order updates
  useEffect(() => {
    if (Object.keys(orderUpdates).length > 0) {
      // Process new order updates from WebSocket
      Object.entries(orderUpdates).forEach(([orderId, update]: [string, any]) => {
        // Refresh the orders data when we receive updates
        queryClient.invalidateQueries({ queryKey: ["merchant", "orders"] });
        queryClient.invalidateQueries({ queryKey: ["merchant", "dashboard-stats"] });
        console.log(`Order ${orderId} status updated to ${update.status}`);
      });
    }
  }, [orderUpdates, queryClient]);

  // Process WebSocket notifications
  useEffect(() => {
    if (wsNotifications.length > 0) {
      // Process new notifications from WebSocket
      wsNotifications.forEach((notification: Record<string, any>) => {
        if (notification.type === MessageType.NOTIFICATION) {
          // In a real app, you would add these to a notification system
          console.log(`New notification: ${notification.payload?.title} - ${notification.payload?.message}`);
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
          // Refresh the orders and stats when we receive payment confirmations
          queryClient.invalidateQueries({ queryKey: ["merchant", "orders"] });
          queryClient.invalidateQueries({ queryKey: ["merchant", "dashboard-stats"] });

          // In a real app, you would show a notification or update the UI
          console.log(`Payment confirmed for order ${payment.payload?.orderId}: ${payment.payload?.amount}`);
        }
      });
    }
  }, [paymentConfirmations, queryClient]);

  const handleUpdateOrderStatus = (orderId: string, status: string) => {
    updateOrderStatusMutation.mutate({ orderId, status });
  };

  const handleRequestDelivery = (orderId: string, orderData: MerchantOrder) => {
    requestDeliveryMutation.mutate({
      orderId,
      customerId: orderData.buyerId,
      deliveryType: "PACKAGE",
      pickupAddress: merchantProfile?.businessAddress || "Store Address",
      deliveryAddress: orderData.deliveryAddress,
      estimatedDistance: 5.0, // Default distance
      deliveryFee: 2000, // Default fee
      notes: `Order ${orderId} - ${orderData.product.name} x${orderData.quantity}`,
    });
  };

  const getOrderStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'confirmed': return 'bg-blue-100 text-blue-800';
      case 'processing': return 'bg-purple-100 text-purple-800';
      case 'shipped': return 'bg-orange-100 text-orange-800';
      case 'delivered': return 'bg-green-100 text-green-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusActions = (status: string) => {
    switch (status) {
      case 'pending': return ['confirmed', 'cancelled'];
      case 'confirmed': return ['processing'];
      case 'processing': return ['shipped'];
      case 'shipped': return ['delivered'];
      default: return [];
    }
  };

  // Group orders by status
  const ordersByStatus = {
    pending: orders.filter(order => order.status === 'pending'),
    confirmed: orders.filter(order => order.status === 'confirmed'),
    processing: orders.filter(order => order.status === 'processing'),
    shipped: orders.filter(order => order.status === 'shipped'),
    delivered: orders.filter(order => order.status === 'delivered'),
  };

  return (
    <div className="min-h-screen bg-gray-50 w-full max-w-sm sm:max-w-md md:max-w-lg lg:max-w-full xl:max-w-full mx-auto px-2 sm:px-4">{/*Responsive container*/}
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-[#0b1a51]">Merchant Dashboard</h1>
            <p className="text-gray-600">
              Welcome back, {merchantProfile?.businessName || "Merchant"}!
            </p>
          </div>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              {/* WebSocket Connection Status */}
              {(orderConnected || notificationConnected || paymentConnected) ? (
                <Badge
                  variant="default"
                  className="rounded-full px-3 py-1"
                  style={{ backgroundColor: '#D1FAE5', color: '#059669' }}
                >
                  Real-time connected
                </Badge>
              ) : (orderError || notificationError || paymentError) ? (
                <Badge
                  variant="default"
                  className="rounded-full px-3 py-1"
                  style={{ backgroundColor: '#FEE2E2', color: '#DC2626' }}
                >
                  Connection error
                </Badge>
              ) : null}

              <Badge
                variant={merchantProfile?.isVerified ? "default" : "secondary"}
                className={merchantProfile?.isVerified ? "bg-green-600" : "bg-gray-400"}
              >
                {merchantProfile?.isVerified ? "Verified" : "Unverified"}
              </Badge>
              <Badge variant="outline" className="capitalize">
                {merchantProfile?.subscriptionTier?.toLowerCase() || "Basic"}
              </Badge>
            </div>
            <Button variant="outline" size="icon">
              <Bell className="h-4 w-4" />
              {(dashboardStats?.unreadMessages ?? 0) > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                  {dashboardStats?.unreadMessages}
                </span>
              )}
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <DollarSign className="h-5 w-5 text-green-600" />
                <div>
                  <p className="text-sm text-gray-600">Today's Revenue</p>
                  <p className="text-lg font-semibold">
                    ₦{dashboardStats?.todayRevenue?.toLocaleString() || '0'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <ShoppingBag className="h-5 w-5 text-blue-600" />
                <div>
                  <p className="text-sm text-gray-600">Pending Orders</p>
                  <p className="text-lg font-semibold">{dashboardStats?.ordersCount || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Eye className="h-5 w-5 text-purple-600" />
                <div>
                  <p className="text-sm text-gray-600">Product Views</p>
                  <p className="text-lg font-semibold">
                    {dashboardStats?.productViews?.toLocaleString() || '0'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <MessageCircle className="h-5 w-5 text-orange-600" />
                <div>
                  <p className="text-sm text-gray-600">Messages</p>
                  <p className="text-lg font-semibold">{dashboardStats?.unreadMessages || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Tabbed Interface */}
      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList className="grid w-full grid-cols-7">
          <TabsTrigger value="orders">Orders</TabsTrigger>
          <TabsTrigger value="products">Products</TabsTrigger>
          <TabsTrigger value="feed">Feed</TabsTrigger>
          <TabsTrigger value="delivery">Delivery</TabsTrigger>
          <TabsTrigger value="chat">Chat</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        {/* Orders Tab */}
        <TabsContent value="orders" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* New Orders */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center justify-between">
                  New Orders ({ordersByStatus.pending.length})
                  <AlertCircle className="h-5 w-5 text-orange-500" />
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 max-h-96 overflow-y-auto">
                {ordersByStatus.pending.map((order) => (
                  <Card key={order.id} className="border border-orange-200">
                    <CardContent className="p-3">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <p className="font-medium text-sm">{order.product.name}</p>
                          <p className="text-xs text-gray-600">
                            {order.buyer.fullName} • Qty: {order.quantity}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-green-600 text-sm">
                            ₦{order.totalPrice.toLocaleString()}
                          </p>
                          <Badge className={getOrderStatusColor(order.status)}>
                            {order.status}
                          </Badge>
                        </div>
                      </div>
                      <div className="flex space-x-2">
                        <Button
                          size="sm"
                          onClick={() => handleUpdateOrderStatus(order.id, 'confirmed')}
                          className="bg-green-600 hover:bg-green-700 text-xs"
                          disabled={updateOrderStatusMutation.isPending}
                        >
                          Accept
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleUpdateOrderStatus(order.id, 'cancelled')}
                          className="text-xs"
                        >
                          Reject
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                {ordersByStatus.pending.length === 0 && (
                  <div className="text-center py-4">
                    <CheckCircle className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-sm text-gray-600">No new orders</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Processing Orders */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center justify-between">
                  Processing ({ordersByStatus.processing.length + ordersByStatus.confirmed.length})
                  <Clock className="h-5 w-5 text-blue-500" />
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 max-h-96 overflow-y-auto">
                {[...ordersByStatus.confirmed, ...ordersByStatus.processing].map((order) => (
                  <Card key={order.id} className="border border-blue-200">
                    <CardContent className="p-3">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <p className="font-medium text-sm">{order.product.name}</p>
                          <p className="text-xs text-gray-600">
                            {order.buyer.fullName} • Qty: {order.quantity}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-green-600 text-sm">
                            ₦{order.totalPrice.toLocaleString()}
                          </p>
                          <Badge className={getOrderStatusColor(order.status)}>
                            {order.status}
                          </Badge>
                        </div>
                      </div>
                      <div className="flex space-x-2">
                        {getStatusActions(order.status).map((action) => (
                          <Button
                            key={action}
                            size="sm"
                            onClick={() => handleUpdateOrderStatus(order.id, action)}
                            className="bg-[#4682b4] hover:bg-[#0b1a51] text-xs capitalize"
                            disabled={updateOrderStatusMutation.isPending}
                          >
                            Mark {action}
                          </Button>
                        ))}
                        {order.status === 'processing' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleRequestDelivery(order.id, order)}
                            className="text-xs"
                          >
                            <Truck className="h-3 w-3 mr-1" />
                            Get Driver
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
                {ordersByStatus.confirmed.length + ordersByStatus.processing.length === 0 && (
                  <div className="text-center py-4">
                    <Package className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-sm text-gray-600">No orders processing</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Shipped & Delivered */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center justify-between">
                  Completed ({ordersByStatus.delivered.length + ordersByStatus.shipped.length})
                  <CheckCircle className="h-5 w-5 text-green-500" />
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 max-h-96 overflow-y-auto">
                {[...ordersByStatus.shipped, ...ordersByStatus.delivered].map((order) => (
                  <Card key={order.id} className="border border-green-200">
                    <CardContent className="p-3">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <p className="font-medium text-sm">{order.product.name}</p>
                          <p className="text-xs text-gray-600">
                            {order.buyer.fullName} • Qty: {order.quantity}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-green-600 text-sm">
                            ₦{order.totalPrice.toLocaleString()}
                          </p>
                          <Badge className={getOrderStatusColor(order.status)}>
                            {order.status}
                          </Badge>
                        </div>
                      </div>
                      {order.status === 'shipped' && (
                        <Button
                          size="sm"
                          onClick={() => handleUpdateOrderStatus(order.id, 'delivered')}
                          className="bg-green-600 hover:bg-green-700 text-xs"
                          disabled={updateOrderStatusMutation.isPending}
                        >
                          Mark Delivered
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                ))}
                {ordersByStatus.delivered.length + ordersByStatus.shipped.length === 0 && (
                  <div className="text-center py-4">
                    <Truck className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-sm text-gray-600">No completed orders</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Products Tab */}
        <TabsContent value="products" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                Product Management
                <Button className="bg-[#4682b4] hover:bg-[#0b1a51]">
                  <Package className="h-4 w-4 mr-2" />
                  Add Product
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">Product management interface</p>
                <p className="text-sm text-gray-500">Add, edit, and manage your product catalog</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Feed Tab */}
        <TabsContent value="feed" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                Marketing Feed
                <Button className="bg-[#4682b4] hover:bg-[#0b1a51]">
                  Create Post
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <TrendingUp className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">Create engaging posts to promote your products</p>
                <p className="text-sm text-gray-500">Share updates, promotions, and announcements</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Delivery Tab */}
        <TabsContent value="delivery" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Delivery Management</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <Truck className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">Coordinate deliveries with drivers</p>
                <p className="text-sm text-gray-500">Track deliveries and manage driver assignments</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Chat Tab */}
        <TabsContent value="chat" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                Customer Messages
                {(dashboardStats?.unreadMessages ?? 0) > 0 && (
                  <Badge variant="destructive">{dashboardStats?.unreadMessages ?? 0} unread</Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <MessageCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">Customer communication hub</p>
                <p className="text-sm text-gray-500">Respond to customer inquiries and support requests</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                Business Analytics
                <Select value={analyticsFilter} onValueChange={setAnalyticsFilter}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="7d">Last 7 days</SelectItem>
                    <SelectItem value="30d">Last 30 days</SelectItem>
                    <SelectItem value="90d">Last 90 days</SelectItem>
                  </SelectContent>
                </Select>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Sales Overview</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span>Total Sales:</span>
                        <span className="font-semibold">₦{merchantProfile?.totalSales?.toLocaleString() || '0'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Total Orders:</span>
                        <span className="font-semibold">{merchantProfile?.totalOrders || 0}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Average Rating:</span>
                        <span className="font-semibold">{merchantProfile?.rating || '0.0'}/5.0</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Performance</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span>Reviews:</span>
                        <span className="font-semibold">{merchantProfile?.reviewCount || 0}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Verification:</span>
                        <span className={`font-semibold ${merchantProfile?.isVerified ? 'text-green-600' : 'text-orange-600'}`}>
                          {merchantProfile?.isVerified ? 'Verified' : 'Pending'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Store Status:</span>
                        <span className={`font-semibold ${merchantProfile?.isActive ? 'text-green-600' : 'text-red-600'}`}>
                          {merchantProfile?.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Store Settings</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">Manage store settings and preferences</p>
                <p className="text-sm text-gray-500">Configure business information, payment methods, and notifications</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}