import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Trash2, ShoppingBag, CreditCard } from "lucide-react";
import plusIcon from "../assets/images/plus_icon.svg";
import minusIcon from "../assets/images/minus_icon.svg";
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
    if (!user?.id) {
      // Prompt non-logged users to sign in
      setLocation("/signin");
      return;
    }
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
    <div className="min-h-screen bg-white w-full max-w-sm sm:max-w-md md:max-w-lg lg:max-w-xl xl:max-w-2xl mx-auto px-2 sm:px-4">{/*Responsive container*/}
      {/* Header */}
      <div className="flex items-center p-4 border-b">
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={() => setLocation("/consumer-home")}
          className="mr-4"
        >
          <ArrowLeft className="h-6 w-6 text-[#131313]" />
        </Button>
        <h1 className="text-xl font-extrabold text-black font-['Montserrat']">
          Cart
        </h1>
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
            className="bg-[#4682b4] hover:bg-[#010e42] text-white px-8 py-3 font-['Montserrat']"
            onClick={() => setLocation("/commodities")}
          >
            Browse Marketplace
          </Button>
        </div>
      ) : (
        // Cart Items
        <div className="flex flex-col min-h-[calc(100vh-80px)]">
          {/* Cart Items Container */}
          <div className="m-4">
            <div className="border-2 border-[#4682b4] rounded-2xl min-h-[360px] p-4">
              {cartItems.map((item: CartItem, index: number) => (
                <div key={item.productId}>
                  <div className="flex items-center py-4">
                    {/* Product Image */}
                    <div className="w-14 h-14 bg-[#D9D9D9] rounded-md flex items-center justify-center flex-shrink-0">
                      {item.productImage ? (
                        <img 
                          src={item.productImage} 
                          alt={item.productName}
                          className="w-full h-full object-cover rounded-md"
                        />
                      ) : (
                        <ShoppingBag className="w-6 h-6 text-gray-500" />
                      )}
                    </div>

                    {/* Product Details */}
                    <div className="flex-1 ml-3">
                      <h3 className="font-bold text-[#010E42] text-sm font-['Montserrat'] mb-1">
                        {item.productName}
                      </h3>
                      
                      {/* Quantity Controls */}
                      <div className="flex items-center space-x-2 mt-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="w-7 h-7 bg-black text-white hover:bg-gray-800 p-0"
                          onClick={() => handleUpdateQuantity(item, item.quantity - 1)}
                          disabled={updateCartMutation.isPending}
                        >
                          <img src={minusIcon} alt="Minus" className="w-3 h-3" />
                        </Button>
                        
                        <div className="w-8 h-7 bg-[#4682b4] rounded-sm flex items-center justify-center">
                          <span className="text-white text-xs font-semibold font-['Montserrat']">
                            {item.quantity}
                          </span>
                        </div>
                        
                        <Button
                          variant="ghost"
                          size="icon"
                          className="w-7 h-7 bg-black text-white hover:bg-gray-800 p-0"
                          onClick={() => handleUpdateQuantity(item, item.quantity + 1)}
                          disabled={updateCartMutation.isPending}
                        >
                          <img src={plusIcon} alt="Plus" className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>

                    {/* Price */}
                    <div className="text-right mr-4">
                      <div className="flex items-center">
                        <span className="text-[#0B1A51] text-sm font-semibold font-['Montserrat']">
                          ₦{(item.price * item.quantity).toLocaleString()}
                        </span>
                      </div>
                    </div>

                    {/* Remove Button */}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="w-6 h-6 text-gray-500 hover:text-red-500 p-0"
                      onClick={() => handleRemoveItem(item)}
                      disabled={removeCartMutation.isPending}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                  
                  {/* Divider */}
                  {index < cartItems.length - 1 && (
                    <div className="border-b border-[#D4D4D4] my-2"></div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Purchase Summary */}
          <div className="mx-4 mb-4">
            <div className="bg-[#4682b4] rounded-2xl p-6 text-white">
              <h3 className="text-lg font-bold font-['Montserrat'] mb-4">Purchase Summary</h3>
              <div className="flex justify-between items-center">
                <span className="text-base font-['Montserrat']">Total</span>
                <div className="flex items-center">
                  <span className="text-base font-semibold font-['Montserrat']">
                    ₦{calculateTotal().toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Payment Method Selection */}
          <div className="mx-4 mb-4">
            <div className="border-2 border-[#4682b4] rounded-2xl p-4 bg-white shadow-lg">
              <span className="text-[#D9D9D9] text-base font-medium font-['Montserrat']">
                Select a Payment Method....
              </span>
            </div>
          </div>

          {/* Make Payment Button */}
          <div className="mx-4 mb-8">
            <Button
              className="w-full bg-[#0B1A51] hover:bg-[#010e42] text-white py-4 rounded-[30px] font-['Montserrat']"
              onClick={handleCheckout}
              disabled={cartItems.length === 0}
            >
              Make Payment
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}