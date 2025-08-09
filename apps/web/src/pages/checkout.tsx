import { useState } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, CreditCard, Building2, Shield, Clock, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface CartItem {
  id?: number;
  productId: string;
  quantity: number;
  price: number;
  productName: string;
  productUnit: string;
  productImage?: string;
  sellerName?: string;
  sellerId?: number;
}

interface MerchantGroup {
  sellerId: number;
  sellerName: string;
  items: CartItem[];
  subtotal: number;
  estimatedDeliveryTime: string;
}

export default function CheckoutPage() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState("card");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [orderNotes, setOrderNotes] = useState("");
  const [promoCode, setPromoCode] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  // Fetch cart items
  const { data: cartItems = [], isLoading } = useQuery({
    queryKey: ["/api/cart", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const response = await fetch(`/api/cart/${user?.id}`);
      const data = await response.json();
      return data.success ? data.cartItems : [];
    }
  });

  // Fetch user's payment methods
  const { data: paymentMethods = [] } = useQuery({
    queryKey: ["/api/payment-methods", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const response = await fetch(`/api/payment-methods/${user?.id}`);
      const data = await response.json();
      return data.success ? data.paymentMethods : [];
    }
  });

  // Group cart items by merchant
  const merchantGroups: MerchantGroup[] = cartItems.reduce((groups: MerchantGroup[], item: CartItem) => {
    const existingGroup = groups.find(group => group.sellerId === item.sellerId);
    if (existingGroup) {
      existingGroup.items.push(item);
      existingGroup.subtotal += item.price * item.quantity;
    } else {
      groups.push({
        sellerId: item.sellerId || 0,
        sellerName: item.sellerName || "Unknown Merchant",
        items: [item],
        subtotal: item.price * item.quantity,
        estimatedDeliveryTime: "30-45 mins"
      });
    }
    return groups;
  }, []);

  const totalAmount = merchantGroups.reduce((total, group) => total + group.subtotal, 0);
  const deliveryFee = merchantGroups.length * 500; // ₦500 per merchant
  const serviceFee = totalAmount * 0.02; // 2% service fee
  const finalTotal = totalAmount + deliveryFee + serviceFee;

  // Place order mutation
  const placeOrderMutation = useMutation({
    mutationFn: async (orderData: any) => {
      return apiRequest("POST", "/api/orders", orderData);
    },
    onSuccess: (data) => {
      // Clear cart after successful order
      queryClient.invalidateQueries({ queryKey: ["/api/cart", user?.id] });
      
      toast({
        title: "Order Placed Successfully!",
        description: "Your order has been confirmed and moved to escrow. You'll receive updates shortly.",
      });
      
      // Navigate to order confirmation page
      setLocation(`/order-confirmation/${data.orderId}`);
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Order Failed",
        description: error.message || "Failed to place order. Please try again.",
      });
    }
  });

  const handlePlaceOrder = async () => {
    if (!deliveryAddress.trim()) {
      toast({
        variant: "destructive",
        title: "Missing Information",
        description: "Please provide a delivery address.",
      });
      return;
    }

    if (cartItems.length === 0) {
      toast({
        variant: "destructive",
        title: "Empty Cart",
        description: "Add items to your cart before checkout.",
      });
      return;
    }

    setIsProcessing(true);

    try {
      // Create orders for each merchant group
      const orders = merchantGroups.map(group => ({
        items: group.items,
        sellerId: group.sellerId,
        deliveryAddress,
        paymentMethod: selectedPaymentMethod,
        orderNotes,
        promoCode: promoCode || null,
        subtotal: group.subtotal,
        deliveryFee: 500,
        serviceFee: group.subtotal * 0.02
      }));

      await placeOrderMutation.mutateAsync({
        orders,
        totalAmount: finalTotal,
        paymentMethod: selectedPaymentMethod
      });

    } catch (error) {
      console.error("Checkout error:", error);
    } finally {
      setIsProcessing(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0
    }).format(amount);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading checkout...</p>
        </div>
      </div>
    );
  }

  if (cartItems.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setLocation("/commodities")}
            className="mr-3 p-2"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-semibold text-gray-900">Checkout</h1>
        </div>
        <div className="flex flex-col items-center justify-center py-12">
          <p className="text-gray-500 mb-4">Your cart is empty</p>
          <Button onClick={() => setLocation("/commodities")}>
            Continue Shopping
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center sticky top-0 z-10">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setLocation("/cart")}
          className="mr-3 p-2"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-lg font-semibold text-gray-900">Checkout</h1>
      </div>

      <div className="max-w-2xl mx-auto p-4 space-y-6">
        {/* Order Summary by Merchant */}
        {merchantGroups.map((group, index) => (
          <Card key={group.sellerId} className="overflow-hidden">
            <CardHeader className="bg-gray-50 py-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Building2 className="h-4 w-4 text-gray-600" />
                  <h3 className="font-medium text-gray-900">{group.sellerName}</h3>
                </div>
                <div className="flex items-center space-x-2 text-sm text-gray-600">
                  <Clock className="h-4 w-4" />
                  <span>{group.estimatedDeliveryTime}</span>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-4">
              <div className="space-y-3">
                {group.items.map((item) => (
                  <div key={item.productId} className="flex justify-between items-center">
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900">{item.productName}</h4>
                      <p className="text-sm text-gray-600">
                        {formatCurrency(item.price)} × {item.quantity} {item.productUnit}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">{formatCurrency(item.price * item.quantity)}</p>
                    </div>
                  </div>
                ))}
                <div className="border-t pt-2 mt-2">
                  <div className="flex justify-between items-center font-medium">
                    <span>Subtotal</span>
                    <span>{formatCurrency(group.subtotal)}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        {/* Delivery Address */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <MapPin className="h-5 w-5" />
              <span>Delivery Address</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Label htmlFor="address">Address</Label>
            <Input
              id="address"
              placeholder="Enter your full delivery address"
              value={deliveryAddress}
              onChange={(e) => setDeliveryAddress(e.target.value)}
              className="mt-1"
            />
          </CardContent>
        </Card>

        {/* Payment Method */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <CreditCard className="h-5 w-5" />
              <span>Payment Method</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <RadioGroup value={selectedPaymentMethod} onValueChange={setSelectedPaymentMethod}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="card" id="card" />
                <Label htmlFor="card">Credit/Debit Card</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="bank" id="bank" />
                <Label htmlFor="bank">Bank Transfer</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="wallet" id="wallet" />
                <Label htmlFor="wallet">Wallet Balance</Label>
              </div>
            </RadioGroup>
          </CardContent>
        </Card>

        {/* Promo Code */}
        <Card>
          <CardContent className="pt-6">
            <Label htmlFor="promo">Promo Code (Optional)</Label>
            <Input
              id="promo"
              placeholder="Enter promo code"
              value={promoCode}
              onChange={(e) => setPromoCode(e.target.value)}
              className="mt-1"
            />
          </CardContent>
        </Card>

        {/* Order Notes */}
        <Card>
          <CardContent className="pt-6">
            <Label htmlFor="notes">Order Notes (Optional)</Label>
            <Input
              id="notes"
              placeholder="Any special instructions..."
              value={orderNotes}
              onChange={(e) => setOrderNotes(e.target.value)}
              className="mt-1"
            />
          </CardContent>
        </Card>

        {/* Order Total */}
        <Card>
          <CardHeader>
            <CardTitle>Order Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between">
              <span>Items Total</span>
              <span>{formatCurrency(totalAmount)}</span>
            </div>
            <div className="flex justify-between">
              <span>Delivery Fee</span>
              <span>{formatCurrency(deliveryFee)}</span>
            </div>
            <div className="flex justify-between">
              <span>Service Fee</span>
              <span>{formatCurrency(serviceFee)}</span>
            </div>
            <div className="border-t pt-2 flex justify-between font-bold text-lg">
              <span>Total</span>
              <span>{formatCurrency(finalTotal)}</span>
            </div>
          </CardContent>
        </Card>

        {/* Escrow Information */}
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="pt-6">
            <div className="flex items-start space-x-3">
              <Shield className="h-5 w-5 text-blue-600 mt-0.5" />
              <div>
                <h4 className="font-medium text-blue-900">Secure Payment</h4>
                <p className="text-sm text-blue-700 mt-1">
                  Your payment will be held in escrow until delivery is confirmed. 
                  Funds are automatically released after 7 days or when you confirm receipt.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Place Order Button */}
        <Button
          onClick={handlePlaceOrder}
          disabled={isProcessing || !deliveryAddress.trim()}
          className="w-full h-12 text-lg font-medium"
        >
          {isProcessing ? "Processing..." : `Place Order - ${formatCurrency(finalTotal)}`}
        </Button>
      </div>
    </div>
  );
}