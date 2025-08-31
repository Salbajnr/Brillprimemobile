import { useState, useEffect } from "react";
import { useAuth } from "../hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Badge } from "../components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { 
  Search, 
  Eye,
  Check,
  X,
  Clock,
  Package,
  Truck,
  MapPin,
  Mail,
  Calendar,
  DollarSign,
  AlertCircle,
  Navigation,
  Phone
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { NotificationModal } from "../components/ui/notification-modal";
import { LoadingButton } from "../components/ui/loading-button";
import { pushNotificationService } from "../lib/push-notifications";
import { useWebSocketOrders, useWebSocketDriverTracking } from "../hooks/use-websocket";
import LiveMap from "../components/ui/live-map";

interface Order {
  id: string;
  orderNumber: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  fuelType: string;
  quantity: number;
  totalAmount: number;
  status: 'PENDING' | 'CONFIRMED' | 'PREPARING' | 'READY' | 'PICKED_UP' | 'OUT_FOR_DELIVERY' | 'DELIVERED' | 'CANCELLED';
  paymentStatus: 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED';
  deliveryAddress: string;
  deliveryLatitude: number;
  deliveryLongitude: number;
  orderDate: string;
  estimatedDelivery?: string;
  driverId?: string;
  driverName?: string;
  notes?: string;
  urgentOrder: boolean;
}

const ORDER_STATUSES = [
  { value: 'PENDING', label: 'Pending', color: 'orange' },
  { value: 'CONFIRMED', label: 'Confirmed', color: 'blue' },
  { value: 'PREPARING', label: 'Preparing', color: 'yellow' },
  { value: 'READY', label: 'Ready for Pickup', color: 'green' },
  { value: 'PICKED_UP', label: 'Picked Up', color: 'purple' },
  { value: 'OUT_FOR_DELIVERY', label: 'Out for Delivery', color: 'indigo' },
  { value: 'DELIVERED', label: 'Delivered', color: 'green' },
  { value: 'CANCELLED', label: 'Cancelled', color: 'red' }
];

export default function OrderManagement() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { connected, orderUpdates } = useWebSocketOrders();
  const { driverLocations } = useWebSocketDriverTracking();

  const [selectedTab, setSelectedTab] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [modalConfig, setModalConfig] = useState<any>({});

  // Fetch orders from API
  const { data: orders = [], isLoading, refetch } = useQuery({
    queryKey: ['merchant-orders', user?.id],
    queryFn: async () => {
      const response = await fetch('/api/fuel/orders/merchant', {
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to fetch orders');
      const data = await response.json();
      return data.orders || [];
    },
    enabled: !!user?.id && user?.role === 'MERCHANT',
    refetchInterval: 30000 // Refetch every 30 seconds
  });

  // Listen for real-time order updates
  useEffect(() => {
    if (Object.keys(orderUpdates).length > 0) {
      // Refetch orders when updates come in
      refetch();
    }
  }, [orderUpdates, refetch]);

  // Update order status mutation
  const updateStatusMutation = useMutation({
    mutationFn: async ({ orderId, status, notes }: { orderId: string; status: string; notes?: string }) => {
      const response = await fetch(`/api/fuel/orders/${orderId}/status`, {
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
      const response = await fetch('/api/delivery/request', {
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
      (selectedTab === 'active' && ['PREPARING', 'READY', 'PICKED_UP', 'OUT_FOR_DELIVERY'].includes(order.status)) ||
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
              <span>{order.quantity}L {order.fuelType}</span>
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
                {driverLocations[order.id] && (
                  <span className="text-xs text-green-600">Live</span>
                )}
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
              loading={updateStatusMutation.isPending}
              onClick={() => handleStatusUpdate(order.id, 'CONFIRMED')}
              className="h-8 px-3 text-sm"
            >
              <Check className="h-4 w-4 mr-1" />
              Confirm
            </LoadingButton>
          )}

          {order.status === 'CONFIRMED' && (
            <LoadingButton
              loading={updateStatusMutation.isPending}
              onClick={() => handleStatusUpdate(order.id, 'PREPARING')}
              className="h-8 px-3 text-sm"
            >
              <Clock className="h-4 w-4 mr-1" />
              Start Preparing
            </LoadingButton>
          )}

          {order.status === 'PREPARING' && (
            <LoadingButton
              loading={updateStatusMutation.isPending}
              onClick={() => handleStatusUpdate(order.id, 'READY')}
              className="h-8 px-3 text-sm"
            >
              <Package className="h-4 w-4 mr-1" />
              Mark Ready
            </LoadingButton>
          )}

          {order.status === 'READY' && !order.driverId && (
            <LoadingButton
              variant="outline"
              loading={requestDeliveryMutation.isPending}
              onClick={() => handleRequestDelivery(order.id)}
              className="h-8 px-3 text-sm"
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
          {connected && (
            <div className="flex items-center space-x-2 text-sm text-green-600 mt-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span>Real-time updates active</span>
            </div>
          )}
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
            <Card className="max-w-4xl w-full max-h-[90vh] overflow-y-auto">
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
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Order Details */}
                  <div className="space-y-6">
                    <div>
                      <h3 className="font-semibold mb-3">Order Information</h3>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Fuel Type:</span>
                          <span className="font-medium">{selectedOrder.fuelType}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Quantity:</span>
                          <span className="font-medium">{selectedOrder.quantity}L</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Total Amount:</span>
                          <span className="font-bold">₦{selectedOrder.totalAmount.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Status:</span>
                          {getStatusBadge(selectedOrder.status)}
                        </div>
                      </div>
                    </div>

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

                    {selectedOrder.notes && (
                      <div>
                        <h3 className="font-semibold mb-2">Notes</h3>
                        <p className="text-sm bg-gray-50 p-3 rounded">{selectedOrder.notes}</p>
                      </div>
                    )}
                  </div>

                  {/* Live Map */}
                  <div>
                    <h3 className="font-semibold mb-3">Delivery Location</h3>
                    <div className="h-96 rounded-lg overflow-hidden">
                      <LiveMap
                        showUserLocation={false}
                        showNearbyUsers={false}
                        className="w-full h-full"
                        userRole="MERCHANT"
                        center={{ lat: selectedOrder.deliveryLatitude, lng: selectedOrder.deliveryLongitude }}
                        markers={[
                          {
                            lat: selectedOrder.deliveryLatitude,
                            lng: selectedOrder.deliveryLongitude,
                            title: 'Delivery Location',
                            type: 'delivery'
                          },
                          ...(driverLocations[selectedOrder.id] ? [{
                            lat: driverLocations[selectedOrder.id].location.lat,
                            lng: driverLocations[selectedOrder.id].location.lng,
                            title: `Driver: ${selectedOrder.driverName}`,
                            type: 'driver' as const
                          }] : [])
                        ]}
                      />
                    </div>
                  </div>
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