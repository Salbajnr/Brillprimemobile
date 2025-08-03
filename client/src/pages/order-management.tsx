
import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Search, 
  Filter,
  Eye,
  Check,
  X,
  Clock,
  Package,
  Truck,
  MapPin,
  Phone,
  Mail,
  Calendar,
  DollarSign,
  AlertCircle
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { NotificationModal } from "@/components/ui/notification-modal";
import { LoadingButton } from "@/components/ui/loading-button";
import { pushNotificationService } from "@/lib/push-notifications";

interface Order {
  id: string;
  orderNumber: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  items: OrderItem[];
  totalAmount: number;
  status: 'PENDING' | 'CONFIRMED' | 'PREPARING' | 'READY' | 'PICKED_UP' | 'DELIVERED' | 'CANCELLED';
  paymentStatus: 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED';
  deliveryAddress: string;
  orderDate: string;
  estimatedDelivery?: string;
  driverId?: string;
  driverName?: string;
  notes?: string;
  urgentOrder: boolean;
}

interface OrderItem {
  id: string;
  productName: string;
  quantity: number;
  price: number;
  total: number;
}

const ORDER_STATUSES = [
  { value: 'PENDING', label: 'Pending', color: 'orange' },
  { value: 'CONFIRMED', label: 'Confirmed', color: 'blue' },
  { value: 'PREPARING', label: 'Preparing', color: 'yellow' },
  { value: 'READY', label: 'Ready for Pickup', color: 'green' },
  { value: 'PICKED_UP', label: 'Picked Up', color: 'purple' },
  { value: 'DELIVERED', label: 'Delivered', color: 'green' },
  { value: 'CANCELLED', label: 'Cancelled', color: 'red' }
];

export default function OrderManagement() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedTab, setSelectedTab] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [modalConfig, setModalConfig] = useState<any>({});

  // Fetch orders
  const { data: orders = [], isLoading } = useQuery({
    queryKey: ['merchant-orders', user?.id],
    queryFn: async () => {
      const response = await fetch('/api/merchant/orders', {
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to fetch orders');
      return response.json();
    },
    enabled: !!user?.id && user?.role === 'MERCHANT'
  });

  // Update order status mutation
  const updateStatusMutation = useMutation({
    mutationFn: async ({ orderId, status, notes }: { orderId: string; status: string; notes?: string }) => {
      const response = await fetch(`/api/merchant/order/${orderId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ status, notes })
      });
      if (!response.ok) throw new Error('Failed to update order status');
      return response.json();
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['merchant-orders'] });
      
      // Show success notification
      pushNotificationService.showNotification({
        title: 'Order Updated',
        body: `Order ${variables.orderId} status updated to ${variables.status}`,
        tag: 'order-update'
      });
      
      setModalConfig({
        type: 'success',
        title: 'Order Updated',
        message: `Order status has been successfully updated to ${variables.status}`,
        show: true
      });
    },
    onError: () => {
      setModalConfig({
        type: 'error',
        title: 'Update Failed',
        message: 'Failed to update order status. Please try again.',
        show: true
      });
    }
  });

  // Request delivery mutation
  const requestDeliveryMutation = useMutation({
    mutationFn: async (orderId: string) => {
      const response = await fetch('/api/merchant/request-delivery', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ orderId })
      });
      if (!response.ok) throw new Error('Failed to request delivery');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['merchant-orders'] });
      setModalConfig({
        type: 'success',
        title: 'Delivery Requested',
        message: 'Delivery request has been sent to available drivers.',
        show: true
      });
    }
  });

  // Filter orders
  const filteredOrders = orders.filter((order: Order) => {
    const matchesSearch = 
      order.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.customerPhone.includes(searchTerm);
    
    const matchesStatus = statusFilter === 'ALL' || order.status === statusFilter;
    
    const matchesTab = 
      selectedTab === 'all' ||
      (selectedTab === 'pending' && ['PENDING', 'CONFIRMED'].includes(order.status)) ||
      (selectedTab === 'active' && ['PREPARING', 'READY', 'PICKED_UP'].includes(order.status)) ||
      (selectedTab === 'completed' && ['DELIVERED'].includes(order.status)) ||
      (selectedTab === 'urgent' && order.urgentOrder);
    
    return matchesSearch && matchesStatus && matchesTab;
  });

  const getStatusBadge = (status: string) => {
    const statusInfo = ORDER_STATUSES.find(s => s.value === status);
    return (
      <Badge variant={statusInfo?.color === 'red' ? 'destructive' : 'default'} className="text-xs">
        {statusInfo?.label || status}
      </Badge>
    );
  };

  const handleStatusUpdate = (orderId: string, newStatus: string) => {
    updateStatusMutation.mutate({ orderId, status: newStatus });
  };

  const handleRequestDelivery = (orderId: string) => {
    requestDeliveryMutation.mutate(orderId);
  };

  const OrderCard = ({ order }: { order: Order }) => (
    <Card className="mb-4 hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              {order.orderNumber}
              {order.urgentOrder && (
                <AlertCircle className="h-4 w-4 text-red-500" />
              )}
            </CardTitle>
            <p className="text-sm text-gray-600">{order.customerName}</p>
          </div>
          <div className="text-right">
            {getStatusBadge(order.status)}
            <p className="text-lg font-bold text-green-600 mt-1">
              ₦{order.totalAmount.toLocaleString()}
            </p>
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Phone className="h-4 w-4 text-gray-400" />
              <span>{order.customerPhone}</span>
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-gray-400" />
              <span className="truncate">{order.deliveryAddress}</span>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-gray-400" />
              <span>{new Date(order.orderDate).toLocaleDateString()}</span>
            </div>
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Package className="h-4 w-4 text-gray-400" />
              <span>{order.items.length} item(s)</span>
            </div>
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-gray-400" />
              <Badge variant={order.paymentStatus === 'PAID' ? 'default' : 'secondary'}>
                {order.paymentStatus}
              </Badge>
            </div>
            {order.driverName && (
              <div className="flex items-center gap-2">
                <Truck className="h-4 w-4 text-gray-400" />
                <span>{order.driverName}</span>
              </div>
            )}
          </div>
        </div>

        <div className="flex gap-2 mt-4 flex-wrap">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setSelectedOrder(order)}
          >
            <Eye className="h-4 w-4 mr-1" />
            View Details
          </Button>
          
          {order.status === 'PENDING' && (
            <LoadingButton
              size="sm"
              loading={updateStatusMutation.isPending}
              onClick={() => handleStatusUpdate(order.id, 'CONFIRMED')}
            >
              <Check className="h-4 w-4 mr-1" />
              Confirm
            </LoadingButton>
          )}
          
          {order.status === 'CONFIRMED' && (
            <LoadingButton
              size="sm"
              loading={updateStatusMutation.isPending}
              onClick={() => handleStatusUpdate(order.id, 'PREPARING')}
            >
              <Clock className="h-4 w-4 mr-1" />
              Start Preparing
            </LoadingButton>
          )}
          
          {order.status === 'PREPARING' && (
            <LoadingButton
              size="sm"
              loading={updateStatusMutation.isPending}
              onClick={() => handleStatusUpdate(order.id, 'READY')}
            >
              <Package className="h-4 w-4 mr-1" />
              Mark Ready
            </LoadingButton>
          )}
          
          {order.status === 'READY' && !order.driverId && (
            <LoadingButton
              size="sm"
              variant="outline"
              loading={requestDeliveryMutation.isPending}
              onClick={() => handleRequestDelivery(order.id)}
            >
              <Truck className="h-4 w-4 mr-1" />
              Request Delivery
            </LoadingButton>
          )}
          
          {['PENDING', 'CONFIRMED'].includes(order.status) && (
            <Button
              size="sm"
              variant="destructive"
              onClick={() => handleStatusUpdate(order.id, 'CANCELLED')}
            >
              <X className="h-4 w-4 mr-1" />
              Cancel
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Order Management</h1>
          <p className="text-gray-600">Manage your incoming orders and track deliveries</p>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    placeholder="Search orders by number, customer name, or phone..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full md:w-48">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Statuses</SelectItem>
                  {ORDER_STATUSES.map(status => (
                    <SelectItem key={status.value} value={status.value}>
                      {status.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Order Tabs */}
        <Tabs value={selectedTab} onValueChange={setSelectedTab} className="mb-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="all">All Orders</TabsTrigger>
            <TabsTrigger value="pending">Pending</TabsTrigger>
            <TabsTrigger value="active">Active</TabsTrigger>
            <TabsTrigger value="completed">Completed</TabsTrigger>
            <TabsTrigger value="urgent">Urgent</TabsTrigger>
          </TabsList>

          <TabsContent value={selectedTab}>
            {isLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-2 text-gray-600">Loading orders...</p>
              </div>
            ) : filteredOrders.length === 0 ? (
              <Card>
                <CardContent className="text-center py-8">
                  <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">No orders found</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {filteredOrders.map((order: Order) => (
                  <OrderCard key={order.id} order={order} />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Order Details Modal */}
        {selectedOrder && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <Card className="max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle>Order {selectedOrder.orderNumber}</CardTitle>
                    <p className="text-gray-600">{selectedOrder.customerName}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedOrder(null)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              
              <CardContent>
                <div className="space-y-6">
                  {/* Order Items */}
                  <div>
                    <h3 className="font-semibold mb-3">Order Items</h3>
                    <div className="space-y-2">
                      {selectedOrder.items.map((item) => (
                        <div key={item.id} className="flex justify-between items-center p-3 bg-gray-50 rounded">
                          <div>
                            <p className="font-medium">{item.productName}</p>
                            <p className="text-sm text-gray-600">Qty: {item.quantity} × ₦{item.price}</p>
                          </div>
                          <p className="font-bold">₦{item.total.toLocaleString()}</p>
                        </div>
                      ))}
                    </div>
                    <div className="flex justify-between items-center pt-3 border-t">
                      <span className="font-semibold">Total:</span>
                      <span className="font-bold text-lg">₦{selectedOrder.totalAmount.toLocaleString()}</span>
                    </div>
                  </div>

                  {/* Customer & Delivery Info */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h3 className="font-semibold mb-3">Customer Information</h3>
                      <div className="space-y-2 text-sm">
                        <p><strong>Name:</strong> {selectedOrder.customerName}</p>
                        <p><strong>Phone:</strong> {selectedOrder.customerPhone}</p>
                        <p><strong>Email:</strong> {selectedOrder.customerEmail}</p>
                      </div>
                    </div>
                    
                    <div>
                      <h3 className="font-semibold mb-3">Delivery Information</h3>
                      <div className="space-y-2 text-sm">
                        <p><strong>Address:</strong> {selectedOrder.deliveryAddress}</p>
                        <p><strong>Order Date:</strong> {new Date(selectedOrder.orderDate).toLocaleString()}</p>
                        {selectedOrder.estimatedDelivery && (
                          <p><strong>Est. Delivery:</strong> {new Date(selectedOrder.estimatedDelivery).toLocaleString()}</p>
                        )}
                        {selectedOrder.driverName && (
                          <p><strong>Driver:</strong> {selectedOrder.driverName}</p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Notes */}
                  {selectedOrder.notes && (
                    <div>
                      <h3 className="font-semibold mb-2">Notes</h3>
                      <p className="text-sm bg-gray-50 p-3 rounded">{selectedOrder.notes}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Notification Modal */}
        <NotificationModal
          isOpen={modalConfig.show}
          onClose={() => setModalConfig({ ...modalConfig, show: false })}
          type={modalConfig.type}
          title={modalConfig.title}
          message={modalConfig.message}
        />
      </div>
    </div>
  );
}
import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Clock, CheckCircle, AlertCircle, Package, Phone } from "lucide-react";

interface Order {
  id: string;
  customerName: string;
  customerPhone: string;
  items: string[];
  totalAmount: number;
  status: "pending" | "confirmed" | "preparing" | "ready" | "delivered" | "cancelled";
  orderTime: string;
  estimatedTime?: string;
  deliveryAddress: string;
}

export default function OrderManagementPage() {
  const [, setLocation] = useLocation();
  const [selectedTab, setSelectedTab] = useState("active");

  const mockOrders: Order[] = [
    {
      id: "ORD001",
      customerName: "Sarah Johnson",
      customerPhone: "+234 808 123 4567",
      items: ["10L Petrol", "Engine Oil", "Car Wash"],
      totalAmount: 2500,
      status: "pending",
      orderTime: "2:30 PM",
      deliveryAddress: "123 Victoria Island, Lagos"
    },
    {
      id: "ORD002",
      customerName: "Mike Adebayo",
      customerPhone: "+234 809 987 6543",
      items: ["20L Diesel"],
      totalAmount: 5600,
      status: "preparing",
      orderTime: "2:15 PM",
      estimatedTime: "15 mins",
      deliveryAddress: "456 Ikoyi Road, Lagos"
    },
    {
      id: "ORD003",
      customerName: "Grace Okafor",
      customerPhone: "+234 807 456 7890",
      items: ["5L Kerosene"],
      totalAmount: 750,
      status: "ready",
      orderTime: "1:45 PM",
      deliveryAddress: "789 Surulere Street, Lagos"
    }
  ];

  const getStatusColor = (status: Order["status"]) => {
    switch (status) {
      case "pending": return "bg-yellow-100 text-yellow-800";
      case "confirmed": return "bg-blue-100 text-blue-800";
      case "preparing": return "bg-orange-100 text-orange-800";
      case "ready": return "bg-green-100 text-green-800";
      case "delivered": return "bg-gray-100 text-gray-800";
      case "cancelled": return "bg-red-100 text-red-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusIcon = (status: Order["status"]) => {
    switch (status) {
      case "pending": return <Clock className="h-4 w-4" />;
      case "ready": return <CheckCircle className="h-4 w-4" />;
      case "cancelled": return <AlertCircle className="h-4 w-4" />;
      default: return <Package className="h-4 w-4" />;
    }
  };

  const handleStatusUpdate = (orderId: string, newStatus: Order["status"]) => {
    // In a real app, this would update the backend
    console.log(`Updating order ${orderId} to ${newStatus}`);
  };

  const activeOrders = mockOrders.filter(order => 
    !["delivered", "cancelled"].includes(order.status)
  );
  
  const completedOrders = mockOrders.filter(order => 
    ["delivered", "cancelled"].includes(order.status)
  );

  const OrderCard = ({ order }: { order: Order }) => (
    <Card className="mb-4">
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-lg">Order #{order.id}</CardTitle>
            <p className="text-sm text-gray-600">{order.customerName}</p>
            <p className="text-xs text-gray-500">{order.orderTime}</p>
          </div>
          <Badge className={getStatusColor(order.status)}>
            {getStatusIcon(order.status)}
            <span className="ml-1 capitalize">{order.status}</span>
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {/* Items */}
          <div>
            <p className="text-sm font-medium text-gray-700 mb-1">Items:</p>
            <ul className="text-sm text-gray-600">
              {order.items.map((item, index) => (
                <li key={index}>• {item}</li>
              ))}
            </ul>
          </div>

          {/* Delivery Address */}
          <div>
            <p className="text-sm font-medium text-gray-700 mb-1">Delivery Address:</p>
            <p className="text-sm text-gray-600">{order.deliveryAddress}</p>
          </div>

          {/* Total Amount */}
          <div className="flex justify-between items-center pt-2 border-t">
            <span className="font-medium">Total Amount:</span>
            <span className="font-bold text-lg">₦{order.totalAmount.toLocaleString()}</span>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 mt-4">
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={() => window.open(`tel:${order.customerPhone}`)}
            >
              <Phone className="h-4 w-4 mr-1" />
              Call Customer
            </Button>
            
            {order.status === "pending" && (
              <Button
                size="sm"
                className="flex-1 bg-green-600 hover:bg-green-700"
                onClick={() => handleStatusUpdate(order.id, "confirmed")}
              >
                Accept Order
              </Button>
            )}
            
            {order.status === "confirmed" && (
              <Button
                size="sm"
                className="flex-1 bg-blue-600 hover:bg-blue-700"
                onClick={() => handleStatusUpdate(order.id, "preparing")}
              >
                Start Preparing
              </Button>
            )}
            
            {order.status === "preparing" && (
              <Button
                size="sm"
                className="flex-1 bg-orange-600 hover:bg-orange-700"
                onClick={() => handleStatusUpdate(order.id, "ready")}
              >
                Mark Ready
              </Button>
            )}
            
            {order.status === "ready" && (
              <Button
                size="sm"
                className="flex-1 bg-purple-600 hover:bg-purple-700"
                onClick={() => handleStatusUpdate(order.id, "delivered")}
              >
                Mark Delivered
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setLocation("/merchant-dashboard")}
            className="p-2"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-lg font-semibold">Order Management</h1>
            <p className="text-sm text-gray-600">Manage your incoming orders</p>
          </div>
        </div>
      </div>

      <div className="p-4">
        <Tabs value={selectedTab} onValueChange={setSelectedTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="active">
              Active Orders ({activeOrders.length})
            </TabsTrigger>
            <TabsTrigger value="completed">
              Completed ({completedOrders.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="active" className="mt-4">
            {activeOrders.length > 0 ? (
              <div>
                {activeOrders.map((order) => (
                  <OrderCard key={order.id} order={order} />
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="text-center py-8">
                  <Package className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-600">No active orders at the moment</p>
                  <p className="text-sm text-gray-500">New orders will appear here</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="completed" className="mt-4">
            {completedOrders.length > 0 ? (
              <div>
                {completedOrders.map((order) => (
                  <OrderCard key={order.id} order={order} />
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="text-center py-8">
                  <CheckCircle className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-600">No completed orders yet</p>
                  <p className="text-sm text-gray-500">Completed orders will appear here</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
