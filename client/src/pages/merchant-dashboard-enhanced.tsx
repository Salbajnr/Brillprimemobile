import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { useWebSocketOrders, useWebSocketNotifications, useWebSocketChat } from "@/hooks/use-websocket";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import {
  Bell, ShoppingBag, DollarSign, Eye, MessageCircle, Package,
  TrendingUp, Users, Clock, CheckCircle, AlertCircle, Truck,
  Plus, Edit, Trash2, BarChart3, Settings, Shield, CreditCard,
  Phone, MapPin, Calendar, Star, AlertTriangle, RefreshCw,
  Image, Tag, Percent, Store, FileText, PieChart
} from "lucide-react";

interface BusinessMetrics {
  todayRevenue: number;
  todaySales: number;
  activeOrders: number;
  customerCount: number;
  lowStockAlerts: number;
  pendingOrdersCount: number;
  averageOrderValue: number;
  conversionRate: number;
  inventoryValue: number;
}

interface Order {
  id: string;
  orderNumber: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  items: Array<{
    id: string;
    productName: string;
    quantity: number;
    price: number;
    unit: string;
  }>;
  totalAmount: number;
  status: 'NEW' | 'ACCEPTED' | 'PREPARING' | 'READY' | 'PICKED_UP' | 'DELIVERED' | 'CANCELLED';
  deliveryAddress: string;
  orderDate: string;
  estimatedPreparationTime?: number;
  driverId?: string;
  driverName?: string;
  orderType: 'DELIVERY' | 'PICKUP';
  paymentStatus: 'PENDING' | 'PAID' | 'FAILED';
  urgentOrder: boolean;
  notes?: string;
}

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  unit: string;
  stockLevel: number;
  lowStockThreshold: number;
  category: string;
  images: string[];
  isActive: boolean;
  inStock: boolean;
  totalSold: number;
  totalViews: number;
  rating: number;
  reviewCount: number;
}

interface Revenue {
  totalRevenue: number;
  monthlyRevenue: number;
  weeklyRevenue: number;
  dailyRevenue: number;
  escrowBalance: number;
  pendingWithdrawals: number;
  revenueGrowth: number;
  topSellingProducts: Array<{
    productId: string;
    productName: string;
    revenue: number;
    unitsSold: number;
  }>;
}

export default function EnhancedMerchantDashboard() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // State management
  const [selectedTab, setSelectedTab] = useState("overview");
  const [isBusinessOpen, setIsBusinessOpen] = useState(true);
  const [showNotifications, setShowNotifications] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [showProductModal, setShowProductModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [newOrderTimer, setNewOrderTimer] = useState<number | null>(null);

  // WebSocket integration
  const { connected: orderConnected, orderUpdates } = useWebSocketOrders();
  const { connected: notificationConnected, notifications } = useWebSocketNotifications();
  const { connected: chatConnected } = useWebSocketChat();

  // Business metrics query
  const { data: businessMetrics } = useQuery<BusinessMetrics>({
    queryKey: ["/api/merchant/metrics"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/merchant/metrics");
      return response.json();
    },
    refetchInterval: 30000 // Refresh every 30 seconds
  });

  // Orders query
  const { data: orders = [], isLoading: ordersLoading, refetch: refetchOrders } = useQuery<Order[]>({
    queryKey: ["/api/merchant/orders"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/merchant/orders");
      return response.json();
    },
    refetchInterval: 15000 // Refresh every 15 seconds
  });

  // Products query
  const { data: products = [], refetch: refetchProducts } = useQuery<Product[]>({
    queryKey: ["/api/merchant/products"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/merchant/products");
      return response.json();
    }
  });

  // Revenue analytics query
  const { data: revenueData } = useQuery<Revenue>({
    queryKey: ["/api/merchant/revenue"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/merchant/revenue");
      return response.json();
    },
    refetchInterval: 60000 // Refresh every minute
  });

  // Real-time order updates
  useEffect(() => {
    if (Object.keys(orderUpdates).length > 0) {
      refetchOrders();
      queryClient.invalidateQueries({ queryKey: ["/api/merchant/metrics"] });
    }
  }, [orderUpdates, refetchOrders, queryClient]);

  // Order status update mutation
  const updateOrderStatusMutation = useMutation({
    mutationFn: async ({ orderId, status, estimatedTime }: { orderId: string; status: string; estimatedTime?: number }) => {
      return apiRequest("PUT", `/api/merchant/orders/${orderId}/status`, { status, estimatedTime });
    },
    onSuccess: () => {
      refetchOrders();
      queryClient.invalidateQueries({ queryKey: ["/api/merchant/metrics"] });
      toast({ title: "Order status updated successfully" });
    }
  });

  // Driver assignment mutation
  const assignDriverMutation = useMutation({
    mutationFn: async ({ orderId }: { orderId: string }) => {
      return apiRequest("POST", `/api/merchant/orders/${orderId}/assign-driver`);
    },
    onSuccess: () => {
      refetchOrders();
      toast({ title: "Driver assignment requested" });
    }
  });

  // Product update mutation
  const updateProductMutation = useMutation({
    mutationFn: async (product: Partial<Product>) => {
      return apiRequest("PUT", `/api/merchant/products/${product.id}`, product);
    },
    onSuccess: () => {
      refetchProducts();
      setShowProductModal(false);
      toast({ title: "Product updated successfully" });
    }
  });

  // Business hours toggle
  const toggleBusinessHoursMutation = useMutation({
    mutationFn: async (isOpen: boolean) => {
      return apiRequest("PUT", "/api/merchant/business-hours", { isOpen });
    },
    onSuccess: (data, isOpen) => {
      setIsBusinessOpen(isOpen);
      toast({ 
        title: `Business ${isOpen ? 'opened' : 'closed'}`,
        description: `You are now ${isOpen ? 'accepting' : 'not accepting'} new orders`
      });
    }
  });

  // Handle new order notifications (15-second timer)
  const handleNewOrderNotification = (order: Order) => {
    setSelectedOrder(order);
    setShowOrderModal(true);
    setNewOrderTimer(15);
    
    const countdown = setInterval(() => {
      setNewOrderTimer(prev => {
        if (prev && prev <= 1) {
          clearInterval(countdown);
          handleDeclineOrder(order.id);
          return null;
        }
        return prev ? prev - 1 : null;
      });
    }, 1000);
  };

  const handleAcceptOrder = (orderId: string) => {
    updateOrderStatusMutation.mutate({ orderId, status: 'ACCEPTED' });
    setShowOrderModal(false);
    setNewOrderTimer(null);
  };

  const handleDeclineOrder = (orderId: string) => {
    updateOrderStatusMutation.mutate({ orderId, status: 'CANCELLED' });
    setShowOrderModal(false);
    setNewOrderTimer(null);
  };

  const handleOrderStatusUpdate = (orderId: string, status: string, estimatedTime?: number) => {
    updateOrderStatusMutation.mutate({ orderId, status, estimatedTime });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const getOrderStatusColor = (status: string) => {
    const colors = {
      NEW: 'bg-blue-100 text-blue-800',
      ACCEPTED: 'bg-green-100 text-green-800',
      PREPARING: 'bg-yellow-100 text-yellow-800',
      READY: 'bg-purple-100 text-purple-800',
      PICKED_UP: 'bg-indigo-100 text-indigo-800',
      DELIVERED: 'bg-emerald-100 text-emerald-800',
      CANCELLED: 'bg-red-100 text-red-800'
    };
    return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header with Business Status */}
      <div className="bg-white border-b border-gray-200 p-4 sticky top-0 z-10">
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <h1 className="text-2xl font-bold text-gray-900">Business Dashboard</h1>
            <div className="flex items-center space-x-2">
              <Button
                onClick={() => toggleBusinessHoursMutation.mutate(!isBusinessOpen)}
                className={`text-sm ${isBusinessOpen 
                  ? 'bg-green-100 text-green-800 hover:bg-green-200' 
                  : 'bg-red-100 text-red-800 hover:bg-red-200'}`}
                variant="ghost"
              >
                <div className={`w-2 h-2 ${isBusinessOpen ? 'bg-green-600' : 'bg-red-600'} rounded-full mr-2`}></div>
                {isBusinessOpen ? 'Open' : 'Closed'}
              </Button>
              {orderConnected && (
                <div className="flex items-center space-x-1 text-green-600">
                  <div className="w-2 h-2 bg-green-600 rounded-full animate-pulse"></div>
                  <span className="text-sm">Live</span>
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowNotifications(!showNotifications)}
              className="relative"
            >
              <Bell className="h-5 w-5" />
              {notifications.length > 0 && (
                <Badge className="absolute -top-1 -right-1 h-4 w-4 p-0 text-xs flex items-center justify-center bg-red-500">
                  {notifications.length}
                </Badge>
              )}
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setLocation("/profile")}>
              <Settings className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>

      <div className="p-6">
        <Tabs value={selectedTab} onValueChange={setSelectedTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="orders">Orders</TabsTrigger>
            <TabsTrigger value="products">Products</TabsTrigger>
            <TabsTrigger value="operations">Operations</TabsTrigger>
            <TabsTrigger value="finances">Finances</TabsTrigger>
          </TabsList>

          {/* Business Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            {/* Today's Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Today's Sales</CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{formatCurrency(businessMetrics?.todayRevenue || 0)}</div>
                  <p className="text-xs text-muted-foreground">
                    {businessMetrics?.todaySales || 0} orders today
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Active Orders</CardTitle>
                  <ShoppingBag className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{businessMetrics?.activeOrders || 0}</div>
                  <p className="text-xs text-muted-foreground">
                    Needs attention
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Customer Count</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{businessMetrics?.customerCount || 0}</div>
                  <p className="text-xs text-muted-foreground">
                    Total customers
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Low Stock Alerts</CardTitle>
                  <AlertTriangle className="h-4 w-4 text-orange-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-orange-600">{businessMetrics?.lowStockAlerts || 0}</div>
                  <p className="text-xs text-muted-foreground">
                    Items need restocking
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Button variant="outline" onClick={() => setSelectedTab("products")}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Product
                </Button>
                <Button variant="outline" onClick={() => setSelectedTab("orders")}>
                  <Eye className="h-4 w-4 mr-2" />
                  View Orders
                </Button>
                <Button variant="outline">
                  <BarChart3 className="h-4 w-4 mr-2" />
                  Analytics
                </Button>
                <Button variant="outline">
                  <MessageCircle className="h-4 w-4 mr-2" />
                  Messages
                </Button>
              </CardContent>
            </Card>

            {/* Revenue Analytics Preview */}
            <Card>
              <CardHeader>
                <CardTitle>Revenue Overview</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">
                      {formatCurrency(revenueData?.weeklyRevenue || 0)}
                    </div>
                    <p className="text-sm text-muted-foreground">This Week</p>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">
                      {formatCurrency(revenueData?.monthlyRevenue || 0)}
                    </div>
                    <p className="text-sm text-muted-foreground">This Month</p>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-purple-600">
                      {formatCurrency(businessMetrics?.averageOrderValue || 0)}
                    </div>
                    <p className="text-sm text-muted-foreground">Avg. Order Value</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Order Management Tab */}
          <TabsContent value="orders" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Order Management</span>
                  <Badge variant="secondary">{orders.length} total orders</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {orders.filter(order => ['NEW', 'ACCEPTED', 'PREPARING', 'READY'].includes(order.status)).map((order) => (
                    <div key={order.id} className="border rounded-lg p-4 space-y-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="flex items-center space-x-2">
                            <h3 className="font-semibold">Order #{order.orderNumber}</h3>
                            <Badge className={getOrderStatusColor(order.status)}>
                              {order.status}
                            </Badge>
                            {order.urgentOrder && (
                              <Badge variant="destructive">Urgent</Badge>
                            )}
                          </div>
                          <p className="text-sm text-gray-600">{order.customerName} • {order.customerPhone}</p>
                          <p className="text-sm text-gray-500">{formatCurrency(order.totalAmount)}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-gray-500">{new Date(order.orderDate).toLocaleTimeString()}</p>
                          <p className="text-sm font-medium">{order.orderType}</p>
                        </div>
                      </div>

                      {/* Order Items */}
                      <div className="bg-gray-50 rounded p-3">
                        <p className="text-sm font-medium mb-2">Items:</p>
                        {order.items.map((item, index) => (
                          <p key={index} className="text-sm">
                            {item.productName} x{item.quantity} {item.unit} - {formatCurrency(item.price * item.quantity)}
                          </p>
                        ))}
                      </div>

                      {/* Order Actions */}
                      <div className="flex space-x-2">
                        {order.status === 'NEW' && (
                          <>
                            <Button size="sm" onClick={() => handleAcceptOrder(order.id)}>
                              <CheckCircle className="h-4 w-4 mr-1" />
                              Accept
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => handleDeclineOrder(order.id)}>
                              <AlertCircle className="h-4 w-4 mr-1" />
                              Decline
                            </Button>
                          </>
                        )}
                        {order.status === 'ACCEPTED' && (
                          <Button size="sm" onClick={() => handleOrderStatusUpdate(order.id, 'PREPARING')}>
                            <Clock className="h-4 w-4 mr-1" />
                            Start Preparing
                          </Button>
                        )}
                        {order.status === 'PREPARING' && (
                          <Button size="sm" onClick={() => handleOrderStatusUpdate(order.id, 'READY')}>
                            <CheckCircle className="h-4 w-4 mr-1" />
                            Mark Ready
                          </Button>
                        )}
                        {order.status === 'READY' && !order.driverId && (
                          <Button size="sm" onClick={() => assignDriverMutation.mutate({ orderId: order.id })}>
                            <Truck className="h-4 w-4 mr-1" />
                            Assign Driver
                          </Button>
                        )}
                        <Button size="sm" variant="outline">
                          <MessageCircle className="h-4 w-4 mr-1" />
                          Chat
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Product Catalog Management Tab */}
          <TabsContent value="products" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Product Catalog</span>
                  <Button onClick={() => setShowProductModal(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Product
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {products.map((product) => (
                    <div key={product.id} className="border rounded-lg p-4 space-y-3">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <h3 className="font-semibold">{product.name}</h3>
                          <p className="text-sm text-gray-600">{formatCurrency(product.price)} per {product.unit}</p>
                          <div className="flex items-center space-x-2 mt-2">
                            <Badge variant={product.inStock ? "default" : "secondary"}>
                              {product.inStock ? 'In Stock' : 'Out of Stock'}
                            </Badge>
                            <span className="text-sm text-gray-500">
                              {product.stockLevel} units
                            </span>
                          </div>
                        </div>
                        <div className="flex flex-col items-end space-y-1">
                          <div className="flex items-center space-x-1">
                            <Star className="h-3 w-3 text-yellow-400 fill-current" />
                            <span className="text-sm">{product.rating.toFixed(1)}</span>
                          </div>
                          <p className="text-xs text-gray-500">{product.totalSold} sold</p>
                        </div>
                      </div>
                      
                      {product.stockLevel <= product.lowStockThreshold && (
                        <div className="bg-orange-50 border border-orange-200 rounded p-2">
                          <div className="flex items-center space-x-1">
                            <AlertTriangle className="h-4 w-4 text-orange-500" />
                            <span className="text-sm text-orange-700">Low stock alert</span>
                          </div>
                        </div>
                      )}

                      <div className="flex space-x-2">
                        <Button size="sm" variant="outline" onClick={() => {
                          setEditingProduct(product);
                          setShowProductModal(true);
                        }}>
                          <Edit className="h-4 w-4 mr-1" />
                          Edit
                        </Button>
                        <Button size="sm" variant="outline">
                          <BarChart3 className="h-4 w-4 mr-1" />
                          Analytics
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Business Operations Tab */}
          <TabsContent value="operations" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Customer Insights</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between">
                      <span>Total Customers</span>
                      <span className="font-semibold">{businessMetrics?.customerCount || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Repeat Customers</span>
                      <span className="font-semibold">--</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Average Order Value</span>
                      <span className="font-semibold">{formatCurrency(businessMetrics?.averageOrderValue || 0)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Conversion Rate</span>
                      <span className="font-semibold">{businessMetrics?.conversionRate || 0}%</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Business Settings</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label>Business Hours</Label>
                    <div className="flex items-center space-x-2 mt-1">
                      <Button
                        variant={isBusinessOpen ? "default" : "outline"}
                        size="sm"
                        onClick={() => toggleBusinessHoursMutation.mutate(!isBusinessOpen)}
                      >
                        {isBusinessOpen ? 'Open' : 'Closed'}
                      </Button>
                    </div>
                  </div>
                  <div>
                    <Label>Delivery Settings</Label>
                    <Button variant="outline" className="w-full mt-1">
                      Configure Delivery Zones
                    </Button>
                  </div>
                  <div>
                    <Label>Staff Management</Label>
                    <Button variant="outline" className="w-full mt-1">
                      Manage Staff & Permissions
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Payment & Finances Tab */}
          <TabsContent value="finances" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Escrow Balance</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{formatCurrency(revenueData?.escrowBalance || 0)}</div>
                  <p className="text-xs text-muted-foreground">Available for withdrawal</p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Monthly Revenue</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{formatCurrency(revenueData?.monthlyRevenue || 0)}</div>
                  <p className="text-xs text-green-600">+{revenueData?.revenueGrowth || 0}% from last month</p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Pending Withdrawals</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{formatCurrency(revenueData?.pendingWithdrawals || 0)}</div>
                  <p className="text-xs text-muted-foreground">Processing</p>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Financial Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button className="w-full">
                  <CreditCard className="h-4 w-4 mr-2" />
                  Withdraw to Bank Account
                </Button>
                <Button variant="outline" className="w-full">
                  <FileText className="h-4 w-4 mr-2" />
                  Download Transaction History
                </Button>
                <Button variant="outline" className="w-full">
                  <PieChart className="h-4 w-4 mr-2" />
                  View Tax Reports
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* New Order Modal with Timer */}
      <Dialog open={showOrderModal} onOpenChange={setShowOrderModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>New Order Received!</span>
              {newOrderTimer && (
                <Badge variant="destructive" className="text-lg">
                  {newOrderTimer}s
                </Badge>
              )}
            </DialogTitle>
          </DialogHeader>
          {selectedOrder && (
            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded p-3">
                <h3 className="font-semibold">Order #{selectedOrder.orderNumber}</h3>
                <p className="text-sm">{selectedOrder.customerName} • {selectedOrder.customerPhone}</p>
                <p className="text-sm text-gray-600">{formatCurrency(selectedOrder.totalAmount)}</p>
              </div>
              
              <div>
                <h4 className="font-medium mb-2">Items:</h4>
                {selectedOrder.items.map((item, index) => (
                  <p key={index} className="text-sm">
                    {item.productName} x{item.quantity} {item.unit}
                  </p>
                ))}
              </div>

              <div className="flex space-x-2">
                <Button 
                  onClick={() => handleAcceptOrder(selectedOrder.id)}
                  className="flex-1"
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Accept Order
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => handleDeclineOrder(selectedOrder.id)}
                  className="flex-1"
                >
                  <AlertCircle className="h-4 w-4 mr-2" />
                  Decline
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Product Management Modal */}
      <Dialog open={showProductModal} onOpenChange={setShowProductModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingProduct ? 'Edit Product' : 'Add New Product'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 max-h-96 overflow-y-auto">
            <div>
              <Label>Product Name</Label>
              <Input placeholder="Enter product name" />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea placeholder="Product description" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Price (₦)</Label>
                <Input type="number" placeholder="0" />
              </div>
              <div>
                <Label>Unit</Label>
                <Input placeholder="kg, pieces, liters" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Stock Level</Label>
                <Input type="number" placeholder="0" />
              </div>
              <div>
                <Label>Low Stock Alert</Label>
                <Input type="number" placeholder="10" />
              </div>
            </div>
            <div>
              <Label>Category</Label>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="food">Food & Beverages</SelectItem>
                  <SelectItem value="electronics">Electronics</SelectItem>
                  <SelectItem value="clothing">Clothing</SelectItem>
                  <SelectItem value="health">Health & Beauty</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex space-x-2 pt-4">
              <Button className="flex-1">
                {editingProduct ? 'Update Product' : 'Add Product'}
              </Button>
              <Button variant="outline" onClick={() => {
                setShowProductModal(false);
                setEditingProduct(null);
              }}>
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}