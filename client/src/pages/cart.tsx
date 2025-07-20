import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Plus, Minus, Trash2, ShoppingBag, CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/use-auth";
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
}

export default function Cart() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [localCart, setLocalCart] = useState<CartItem[]>([]);

  // Load local cart from localStorage for non-logged users
  useEffect(() => {
    if (!user?.id) {
      const savedCart = localStorage.getItem('cart');
      if (savedCart) {
        setLocalCart(JSON.parse(savedCart));
      }
    }
  }, [user?.id]);

  // Fetch cart items from database for logged-in users
  const { data: dbCartItems = [], isLoading } = useQuery({
    queryKey: ["/api/cart", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const response = await fetch(`/api/cart/${user?.id}`);
      const data = await response.json();
      return data.success ? data.cartItems : [];
    }
  });

  // Update cart item quantity mutation
  const updateCartMutation = useMutation({
    mutationFn: async ({ cartItemId, quantity }: { cartItemId: number; quantity: number }) => {
      return apiRequest("PUT", `/api/cart/${cartItemId}`, { quantity });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cart", user?.id] });
    }
  });

  // Remove cart item mutation
  const removeCartMutation = useMutation({
    mutationFn: async (cartItemId: number) => {
      return apiRequest("DELETE", `/api/cart/${cartItemId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cart", user?.id] });
    }
  });

  const cartItems = user?.id ? dbCartItems : localCart;

  const handleUpdateQuantity = (item: CartItem, newQuantity: number) => {
    if (newQuantity <= 0) {
      handleRemoveItem(item);
      return;
    }

    if (user?.id && item.id) {
      updateCartMutation.mutate({ cartItemId: item.id, quantity: newQuantity });
    } else {
      // Update local cart
      const updatedCart = localCart.map(cartItem => 
        cartItem.productId === item.productId 
          ? { ...cartItem, quantity: newQuantity }
          : cartItem
      );
      setLocalCart(updatedCart);
      localStorage.setItem('cart', JSON.stringify(updatedCart));
    }
  };

  const handleRemoveItem = (item: CartItem) => {
    if (user?.id && item.id) {
      removeCartMutation.mutate(item.id);
    } else {
      // Remove from local cart
      const updatedCart = localCart.filter(cartItem => cartItem.productId !== item.productId);
      setLocalCart(updatedCart);
      localStorage.setItem('cart', JSON.stringify(updatedCart));
    }
  };

  const calculateTotal = () => {
    return cartItems.reduce((total: number, item: CartItem) => total + (item.price * item.quantity), 0);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const handleCheckout = () => {
    if (cartItems.length === 0) return;
    // Navigate to checkout page with cart data
    setLocation("/checkout");
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your cart...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center space-x-3">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => setLocation("/consumer-home")}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-xl font-semibold text-[#131313]">
              Shopping Cart ({cartItems.length})
            </h1>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setLocation("/commodities")}
          >
            <ShoppingBag className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {cartItems.length === 0 ? (
        // Empty Cart State
        <div className="flex flex-col items-center justify-center py-20 px-4">
          <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-6">
            <ShoppingBag className="w-12 h-12 text-gray-400" />
          </div>
          <h2 className="text-2xl font-semibold text-[#131313] mb-2">Your cart is empty</h2>
          <p className="text-gray-600 text-center mb-8 max-w-sm">
            Start shopping to add items to your cart and enjoy our amazing marketplace experience.
          </p>
          <Button
            className="bg-[#4682b4] hover:bg-[#010e42] text-white px-8 py-3"
            onClick={() => setLocation("/commodities")}
          >
            Browse Marketplace
          </Button>
        </div>
      ) : (
        // Cart Items
        <div className="flex flex-col min-h-[calc(100vh-80px)]">
          <div className="flex-1 p-4 space-y-4">
            {cartItems.map((item: CartItem) => (
              <Card key={item.productId} className="border-2 border-blue-100 hover:border-blue-200 transition-colors">
                <CardContent className="p-4">
                  <div className="flex items-center space-x-4">
                    {/* Product Image */}
                    <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      {item.productImage ? (
                        <img 
                          src={item.productImage} 
                          alt={item.productName}
                          className="w-full h-full object-cover rounded-lg"
                        />
                      ) : (
                        <ShoppingBag className="w-6 h-6 text-gray-400" />
                      )}
                    </div>

                    {/* Product Details */}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-[#131313] text-sm mb-1 truncate">
                        {item.productName}
                      </h3>
                      {item.sellerName && (
                        <p className="text-xs text-gray-500 mb-1">by {item.sellerName}</p>
                      )}
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-medium text-[#4682b4]">
                          {formatCurrency(item.price)}
                        </span>
                        <span className="text-xs text-gray-500">per {item.productUnit}</span>
                      </div>
                    </div>

                    {/* Quantity Controls */}
                    <div className="flex items-center space-x-2 flex-shrink-0">
                      <Button
                        variant="outline"
                        size="icon"
                        className="w-8 h-8 border-[#4682b4] text-[#4682b4] hover:bg-[#4682b4] hover:text-white"
                        onClick={() => handleUpdateQuantity(item, item.quantity - 1)}
                        disabled={updateCartMutation.isPending}
                      >
                        <Minus className="w-4 h-4" />
                      </Button>
                      
                      <span className="min-w-[2rem] text-center font-medium text-[#131313]">
                        {item.quantity}
                      </span>
                      
                      <Button
                        variant="outline"
                        size="icon"
                        className="w-8 h-8 border-[#4682b4] text-[#4682b4] hover:bg-[#4682b4] hover:text-white"
                        onClick={() => handleUpdateQuantity(item, item.quantity + 1)}
                        disabled={updateCartMutation.isPending}
                      >
                        <Plus className="w-4 h-4" />
                      </Button>
                    </div>

                    {/* Remove Button */}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="w-8 h-8 text-red-500 hover:bg-red-50 hover:text-red-600"
                      onClick={() => handleRemoveItem(item)}
                      disabled={removeCartMutation.isPending}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>

                  {/* Item Total */}
                  <div className="mt-3 pt-3 border-t border-gray-100">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Subtotal:</span>
                      <span className="font-semibold text-[#131313]">
                        {formatCurrency(item.price * item.quantity)}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Cart Summary & Checkout */}
          <div className="bg-white border-t border-gray-200 p-4 space-y-4">
            <Card className="border-2 border-blue-100">
              <CardContent className="p-4">
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Items ({cartItems.length}):</span>
                    <span className="font-medium">{formatCurrency(calculateTotal())}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Delivery:</span>
                    <Badge variant="secondary" className="text-green-600">FREE</Badge>
                  </div>
                  <div className="border-t pt-3">
                    <div className="flex justify-between items-center">
                      <span className="text-lg font-semibold text-[#131313]">Total:</span>
                      <span className="text-lg font-semibold text-[#4682b4]">
                        {formatCurrency(calculateTotal())}
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Button
              className="w-full bg-[#4682b4] hover:bg-[#010e42] text-white py-4 text-base font-medium"
              onClick={handleCheckout}
              disabled={cartItems.length === 0}
            >
              <CreditCard className="w-5 h-5 mr-2" />
              Proceed to Checkout
            </Button>

            <Button
              variant="outline"
              className="w-full border-[#4682b4] text-[#4682b4] hover:bg-[#4682b4]/10 py-3"
              onClick={() => setLocation("/commodities")}
            >
              Continue Shopping
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}