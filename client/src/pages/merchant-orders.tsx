import { useState } from "react";
import { useLocation } from "wouter";
import { useOrders, useUpdateOrderStatus, useBusinessId } from "@/lib/hooks";
import { useToast } from "@/hooks/use-toast";
import { OrderCard } from "@/components/ui/order-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { 
  ArrowLeft, 
  Search, 
  Filter, 
  Clock, 
  CheckCircle, 
  Truck, 
  AlertCircle,
  Package
} from "lucide-react";
import type { Order } from "@/lib/types";

export default function MerchantOrders() {
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('newest');
  const businessId = useBusinessId();
  const { data: orders = [], isLoading } = useOrders(businessId);
  const updateOrderStatus = useUpdateOrderStatus();
  const { toast } = useToast();

  const handleUpdateStatus = async (orderId: string, newStatus: string) => {
    try {
      await updateOrderStatus.mutateAsync({ orderId, status: newStatus });
      toast({
        title: "Order Updated",
        description: `Order status changed to ${newStatus}`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update order status",
        variant: "destructive",
      });
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <Clock className="w-4 h-4" />;
      case 'confirmed': return <CheckCircle className="w-4 h-4" />;
      case 'processing': return <Package className="w-4 h-4" />;
      case 'shipped': return <Truck className="w-4 h-4" />;
      case 'delivered': return <CheckCircle className="w-4 h-4" />;
      case 'cancelled': return <AlertCircle className="w-4 h-4" />;
      default: return <Clock className="w-4 h-4" />;
    }
  };

  const getStatusColor = (status: string) => {
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

  // Filter orders based on active tab
  const filteredOrders = orders.filter((order: Order) => {
    if (activeTab === 'all') return true;
    return order.status === activeTab;
  });

  // Search and sort orders
  const processedOrders = filteredOrders
    .filter((order: Order) => {
      if (!searchQuery) return true;
      return (
        order.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        order.customer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        order.items.some(item => 
          item.name.toLowerCase().includes(searchQuery.toLowerCase())
        )
      );
    })
    .sort((a: Order, b: Order) => {
      switch (sortBy) {
        case 'newest':
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        case 'oldest':
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        case 'amount-high':
          return b.total - a.total;
        case 'amount-low':
          return a.total - b.total;
        default:
          return 0;
      }
    });

  const getOrderCounts = () => {
    return {
      all: orders.length,
      pending: orders.filter((o: Order) => o.status === 'pending').length,
      confirmed: orders.filter((o: Order) => o.status === 'confirmed').length,
      processing: orders.filter((o: Order) => o.status === 'processing').length,
      shipped: orders.filter((o: Order) => o.status === 'shipped').length,
      delivered: orders.filter((o: Order) => o.status === 'delivered').length,
      cancelled: orders.filter((o: Order) => o.status === 'cancelled').length,
    };
  };

  const counts = getOrderCounts();

  if (isLoading) {
    return (
      <div className="relative w-full max-w-md mx-auto h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-500">Loading orders...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full max-w-md mx-auto h-screen bg-white overflow-hidden">
      {/* Header */}
      <div className="bg-white shadow-sm p-4 flex items-center justify-between">
        <div className="flex items-center">
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => setLocation('/merchant-dashboard')}
          >
            <ArrowLeft className="w-6 h-6" />
          </Button>
          <div className="ml-3">
            <h1 className="text-lg font-bold text-gray-900">Orders</h1>
            <p className="text-xs text-gray-500">{orders.length} total orders</p>
          </div>
        </div>
        <Button variant="ghost" size="icon">
          <Filter className="w-6 h-6 text-gray-500" />
        </Button>
      </div>

      {/* Search and Sort */}
      <div className="p-4 space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Search orders..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <div className="flex items-center justify-between">
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Newest First</SelectItem>
              <SelectItem value="oldest">Oldest First</SelectItem>
              <SelectItem value="amount-high">Amount: High to Low</SelectItem>
              <SelectItem value="amount-low">Amount: Low to High</SelectItem>
            </SelectContent>
          </Select>
          
          <div className="text-sm text-gray-500">
            {processedOrders.length} of {orders.length} orders
          </div>
        </div>
      </div>

      {/* Order Tabs */}
      <div className="px-4">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4 mb-4">
            <TabsTrigger value="all" className="text-xs">
              All ({counts.all})
            </TabsTrigger>
            <TabsTrigger value="pending" className="text-xs">
              {getStatusIcon('pending')} ({counts.pending})
            </TabsTrigger>
            <TabsTrigger value="processing" className="text-xs">
              {getStatusIcon('processing')} ({counts.processing})
            </TabsTrigger>
            <TabsTrigger value="delivered" className="text-xs">
              {getStatusIcon('delivered')} ({counts.delivered})
            </TabsTrigger>
          </TabsList>

          {/* Orders List */}
          <div className="pb-20 overflow-y-auto" style={{ height: 'calc(100vh - 280px)' }}>
            <TabsContent value={activeTab} className="mt-0">
              <div className="space-y-3">
                {processedOrders.map((order: Order) => (
                  <OrderCard
                    key={order.id}
                    order={order}
                    onUpdateStatus={handleUpdateStatus}
                    showActions={true}
                  />
                ))}
                
                {processedOrders.length === 0 && (
                  <Card className="rounded-xl">
                    <CardContent className="p-8 text-center">
                      <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">
                        No orders found
                      </h3>
                      <p className="text-sm text-gray-500">
                        {searchQuery 
                          ? 'Try adjusting your search criteria'
                          : activeTab === 'all' 
                            ? 'You haven\'t received any orders yet'
                            : `No ${activeTab} orders at the moment`
                        }
                      </p>
                    </CardContent>
                  </Card>
                )}
              </div>
            </TabsContent>
          </div>
        </Tabs>
      </div>

      {/* Quick Stats Footer */}
      <div className="absolute bottom-0 left-0 right-0 bg-white border-t p-4">
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-lg font-bold text-gray-900">{counts.pending}</p>
            <p className="text-xs text-gray-500">Pending</p>
          </div>
          <div>
            <p className="text-lg font-bold text-gray-900">{counts.processing}</p>
            <p className="text-xs text-gray-500">Processing</p>
          </div>
          <div>
            <p className="text-lg font-bold text-gray-900">{counts.delivered}</p>
            <p className="text-xs text-gray-500">Delivered</p>
          </div>
        </div>
      </div>
    </div>
  );
}