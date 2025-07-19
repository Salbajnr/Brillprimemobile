import { useState } from "react";
import { useLocation } from "wouter";
import { ArrowLeft, Search, Filter, ShoppingCart, Plus, Minus, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface Product {
  id: string;
  name: string;
  category: string;
  price: number;
  unit: string;
  description: string;
  image?: string;
  rating: number;
  reviewCount: number;
  seller: {
    id: string;
    name: string;
    location: string;
    rating: number;
    verified: boolean;
  };
  inStock: boolean;
  minimumOrder: number;
}

interface Category {
  id: string;
  name: string;
  icon: string;
  productCount: number;
}

interface CartItem {
  productId: string;
  quantity: number;
  price: number;
}

export default function Commodities() {
  const [, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [viewMode, setViewMode] = useState<"categories" | "products">("categories");

  const categories: Category[] = [
    {
      id: "grains",
      name: "Grains & Cereals",
      icon: "🌾",
      productCount: 45
    },
    {
      id: "vegetables",
      name: "Fresh Vegetables",
      icon: "🥬",
      productCount: 38
    },
    {
      id: "fruits",
      name: "Fresh Fruits",
      icon: "🍎",
      productCount: 32
    },
    {
      id: "livestock",
      name: "Livestock & Poultry",
      icon: "🐄",
      productCount: 28
    },
    {
      id: "dairy",
      name: "Dairy Products",
      icon: "🥛",
      productCount: 22
    },
    {
      id: "spices",
      name: "Spices & Herbs",
      icon: "🌶️",
      productCount: 56
    }
  ];

  const [products] = useState<Product[]>([
    {
      id: "rice-001",
      name: "Premium Basmati Rice",
      category: "grains",
      price: 45000,
      unit: "50kg bag",
      description: "High-quality long grain basmati rice, perfect for Nigerian households",
      rating: 4.8,
      reviewCount: 124,
      seller: {
        id: "seller-001",
        name: "Abuja Grains Depot",
        location: "Wuse Market, Abuja",
        rating: 4.6,
        verified: true
      },
      inStock: true,
      minimumOrder: 1
    },
    {
      id: "tomatoes-001",
      name: "Fresh Roma Tomatoes",
      category: "vegetables",
      price: 8500,
      unit: "basket (25kg)",
      description: "Fresh, ripe Roma tomatoes directly from Jos farms",
      rating: 4.5,
      reviewCount: 89,
      seller: {
        id: "seller-002",
        name: "Jos Fresh Farms",
        location: "Jos Plateau State",
        rating: 4.7,
        verified: true
      },
      inStock: true,
      minimumOrder: 2
    },
    {
      id: "yam-001",
      name: "Quality Yam Tubers",
      category: "vegetables",
      price: 12000,
      unit: "tuber (5-7kg)",
      description: "Fresh yam tubers from Benue State farms",
      rating: 4.3,
      reviewCount: 67,
      seller: {
        id: "seller-003",
        name: "Benue Farms Collective",
        location: "Makurdi, Benue State",
        rating: 4.4,
        verified: true
      },
      inStock: true,
      minimumOrder: 5
    },
    {
      id: "plantain-001",
      name: "Unripe Plantain",
      category: "fruits",
      price: 3500,
      unit: "bunch (8-12 fingers)",
      description: "Fresh unripe plantain from Ogun State",
      rating: 4.6,
      reviewCount: 112,
      seller: {
        id: "seller-004",
        name: "Ogun Fresh Produce",
        location: "Abeokuta, Ogun State",
        rating: 4.5,
        verified: true
      },
      inStock: true,
      minimumOrder: 3
    },
    {
      id: "pepper-001",
      name: "Scotch Bonnet Pepper",
      category: "spices",
      price: 15000,
      unit: "10kg bag",
      description: "Hot scotch bonnet peppers, freshly harvested",
      rating: 4.7,
      reviewCount: 78,
      seller: {
        id: "seller-005",
        name: "Kaduna Spice Market",
        location: "Kaduna Central Market",
        rating: 4.8,
        verified: true
      },
      inStock: false,
      minimumOrder: 1
    },
    {
      id: "beans-001",
      name: "Brown Beans",
      category: "grains",
      price: 18000,
      unit: "25kg bag",
      description: "Premium brown beans from Kano State",
      rating: 4.4,
      reviewCount: 95,
      seller: {
        id: "seller-006",
        name: "Kano Grain Merchants",
        location: "Kano City, Kano State",
        rating: 4.3,
        verified: true
      },
      inStock: true,
      minimumOrder: 2
    }
  ]);

  const filteredCategories = categories.filter(cat =>
    cat.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         product.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = !selectedCategory || product.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const getCartQuantity = (productId: string) => {
    const item = cart.find(item => item.productId === productId);
    return item ? item.quantity : 0;
  };

  const getTotalCartItems = () => {
    return cart.reduce((total, item) => total + item.quantity, 0);
  };

  const getTotalCartValue = () => {
    return cart.reduce((total, item) => {
      const product = products.find(p => p.id === item.productId);
      return total + (product ? product.price * item.quantity : 0);
    }, 0);
  };

  const addToCart = (product: Product) => {
    setCart(prev => {
      const existingItem = prev.find(item => item.productId === product.id);
      if (existingItem) {
        return prev.map(item =>
          item.productId === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      } else {
        return [...prev, { productId: product.id, quantity: 1, price: product.price }];
      }
    });
  };

  const removeFromCart = (productId: string) => {
    setCart(prev => {
      const existingItem = prev.find(item => item.productId === productId);
      if (existingItem && existingItem.quantity > 1) {
        return prev.map(item =>
          item.productId === productId
            ? { ...item, quantity: item.quantity - 1 }
            : item
        );
      } else {
        return prev.filter(item => item.productId !== productId);
      }
    });
  };

  const handleCategorySelect = (category: Category) => {
    setSelectedCategory(category.id);
    setViewMode("products");
  };

  const handleViewCart = () => {
    setLocation("/commodities/cart");
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                if (viewMode === "products" && selectedCategory) {
                  setViewMode("categories");
                  setSelectedCategory(null);
                } else {
                  setLocation("/consumer-home");
                }
              }}
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-lg font-semibold text-[#131313]">
                {viewMode === "categories" ? "Commodities" : "Products"}
              </h1>
              {viewMode === "products" && selectedCategory && (
                <p className="text-sm text-gray-600">
                  {categories.find(c => c.id === selectedCategory)?.name}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setLocation("/commodities/filter")}
            >
              <Filter className="w-5 h-5 text-[#4682b4]" />
            </Button>
            {getTotalCartItems() > 0 && (
              <Button
                variant="ghost"
                size="icon"
                onClick={handleViewCart}
                className="relative"
              >
                <ShoppingCart className="w-5 h-5 text-[#4682b4]" />
                <Badge className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center">
                  {getTotalCartItems()}
                </Badge>
              </Button>
            )}
          </div>
        </div>

        {/* Search Bar */}
        <div className="px-4 pb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder={viewMode === "categories" ? "Search categories..." : "Search products..."}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 border-[#4682b4]/30 focus:border-[#4682b4]"
            />
          </div>
        </div>
      </div>

      <div className="p-4">
        {viewMode === "categories" ? (
          /* Categories View */
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-[#131313]">Shop by Category</h2>
              <Badge variant="outline" className="text-[#4682b4] border-[#4682b4]">
                {filteredCategories.length} categories
              </Badge>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {filteredCategories.map((category) => (
                <Card
                  key={category.id}
                  className="cursor-pointer transition-transform hover:scale-105"
                  onClick={() => handleCategorySelect(category)}
                >
                  <CardContent className="p-4 text-center">
                    <div className="text-4xl mb-3">{category.icon}</div>
                    <h3 className="font-semibold text-[#131313] mb-1">{category.name}</h3>
                    <p className="text-sm text-gray-600">{category.productCount} products</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        ) : (
          /* Products View */
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-[#131313]">Available Products</h2>
              <Badge variant="outline" className="text-[#4682b4] border-[#4682b4]">
                {filteredProducts.filter(p => p.inStock).length} in stock
              </Badge>
            </div>

            {filteredProducts.map((product) => (
              <Card
                key={product.id}
                className={`transition-all ${!product.inStock ? "opacity-60" : ""}`}
              >
                <CardContent className="p-4">
                  <div className="space-y-3">
                    {/* Product Header */}
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="font-semibold text-[#131313] mb-1">{product.name}</h3>
                        <p className="text-sm text-gray-600 mb-2">{product.description}</p>
                        <div className="flex items-center space-x-4 text-sm text-gray-500">
                          <div className="flex items-center space-x-1">
                            <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                            <span>{product.rating} ({product.reviewCount})</span>
                          </div>
                          <span>Min. order: {product.minimumOrder} {product.unit}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge className={product.inStock ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}>
                          {product.inStock ? "In Stock" : "Out of Stock"}
                        </Badge>
                      </div>
                    </div>

                    {/* Seller Info */}
                    <div className="flex items-center space-x-3 py-2 border-t border-gray-100">
                      <Avatar className="w-8 h-8">
                        <AvatarFallback className="bg-[#4682b4] text-white text-xs">
                          {product.seller.name.substring(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <p className="text-sm font-medium text-[#131313]">{product.seller.name}</p>
                          {product.seller.verified && (
                            <Badge className="bg-blue-100 text-blue-800 text-xs">Verified</Badge>
                          )}
                        </div>
                        <p className="text-xs text-gray-500">{product.seller.location}</p>
                      </div>
                      <div className="text-right">
                        <div className="flex items-center space-x-1">
                          <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                          <span className="text-xs text-gray-600">{product.seller.rating}</span>
                        </div>
                      </div>
                    </div>

                    {/* Price and Actions */}
                    <div className="flex items-center justify-between pt-2 border-t">
                      <div>
                        <p className="text-xl font-bold text-[#4682b4]">
                          {formatCurrency(product.price)}
                        </p>
                        <p className="text-sm text-gray-500">per {product.unit}</p>
                      </div>
                      
                      {product.inStock && (
                        <div className="flex items-center space-x-2">
                          {getCartQuantity(product.id) > 0 ? (
                            <div className="flex items-center space-x-2">
                              <Button
                                variant="outline"
                                size="icon"
                                className="w-8 h-8 border-[#4682b4] text-[#4682b4]"
                                onClick={() => removeFromCart(product.id)}
                              >
                                <Minus className="w-4 h-4" />
                              </Button>
                              <span className="w-8 text-center font-medium">
                                {getCartQuantity(product.id)}
                              </span>
                              <Button
                                variant="outline"
                                size="icon"
                                className="w-8 h-8 border-[#4682b4] text-[#4682b4]"
                                onClick={() => addToCart(product)}
                              >
                                <Plus className="w-4 h-4" />
                              </Button>
                            </div>
                          ) : (
                            <Button
                              onClick={() => addToCart(product)}
                              className="bg-[#4682b4] hover:bg-[#0b1a51]"
                            >
                              <Plus className="w-4 h-4 mr-2" />
                              Add to Cart
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}

            {/* Empty State */}
            {filteredProducts.length === 0 && (
              <div className="text-center py-12">
                <ShoppingCart className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No products found</h3>
                <p className="text-gray-500">Try adjusting your search or browse other categories</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Floating Cart Button */}
      {getTotalCartItems() > 0 && (
        <div className="fixed bottom-4 right-4">
          <Button
            onClick={handleViewCart}
            className="h-14 px-6 bg-[#4682b4] hover:bg-[#0b1a51] rounded-full shadow-lg"
          >
            <ShoppingCart className="w-5 h-5 mr-2" />
            <div className="text-left">
              <div className="text-sm font-medium">{getTotalCartItems()} items</div>
              <div className="text-xs">{formatCurrency(getTotalCartValue())}</div>
            </div>
          </Button>
        </div>
      )}
    </div>
  );
}