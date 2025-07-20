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
      id: "apparel",
      name: "Apparel & Clothing",
      icon: "👕",
      productCount: 156
    },
    {
      id: "art-entertainment",
      name: "Art & Entertainment",
      icon: "🎨",
      productCount: 89
    },
    {
      id: "beauty-cosmetics",
      name: "Beauty, Cosmetics & Personal Care",
      icon: "💄",
      productCount: 234
    },
    {
      id: "education",
      name: "Education",
      icon: "📚",
      productCount: 67
    },
    {
      id: "event-planner",
      name: "Event Planner",
      icon: "🎉",
      productCount: 43
    },
    {
      id: "finance",
      name: "Finance",
      icon: "💰",
      productCount: 78
    },
    {
      id: "supermarket",
      name: "Supermarket/Convenience Store",
      icon: "🏪",
      productCount: 345
    },
    {
      id: "hotel",
      name: "Hotel",
      icon: "🏨",
      productCount: 125
    },
    {
      id: "medical-health",
      name: "Medical & Health",
      icon: "⚕️",
      productCount: 198
    },
    {
      id: "non-profit",
      name: "Non-profit Organisation",
      icon: "🤝",
      productCount: 34
    },
    {
      id: "oil-gas",
      name: "Oil & Gas",
      icon: "⛽",
      productCount: 87
    },
    {
      id: "restaurant",
      name: "Restaurant",
      icon: "🍽️",
      productCount: 267
    },
    {
      id: "shopping-retail",
      name: "Shopping & Retail",
      icon: "🛍️",
      productCount: 423
    },
    {
      id: "ticket",
      name: "Ticket",
      icon: "🎫",
      productCount: 76
    },
    {
      id: "toll-gate",
      name: "Toll Gate",
      icon: "🚧",
      productCount: 12
    },
    {
      id: "vehicle-service",
      name: "Vehicle Service",
      icon: "🔧",
      productCount: 145
    },
    {
      id: "other-business",
      name: "Other Business",
      icon: "🏢",
      productCount: 298
    }
  ];

  const [products] = useState<Product[]>([
    // Apparel & Clothing
    {
      id: "clothing-001",
      name: "Premium Ankara Fabric",
      category: "apparel",
      price: 8500,
      unit: "6 yards",
      description: "High-quality Ankara fabric with vibrant African prints",
      rating: 4.8,
      reviewCount: 234,
      seller: {
        id: "seller-001",
        name: "Lagos Fashion House",
        location: "Balogun Market, Lagos",
        rating: 4.7,
        verified: true
      },
      inStock: true,
      minimumOrder: 1
    },
    // Beauty & Cosmetics
    {
      id: "beauty-001",
      name: "Natural Shea Butter",
      category: "beauty-cosmetics",
      price: 2500,
      unit: "500ml jar",
      description: "Pure unrefined shea butter from northern Ghana",
      rating: 4.9,
      reviewCount: 567,
      seller: {
        id: "seller-002",
        name: "Natural Beauty Co.",
        location: "Wuse II, Abuja",
        rating: 4.8,
        verified: true
      },
      inStock: true,
      minimumOrder: 1
    },
    // Supermarket Items
    {
      id: "supermarket-001",
      name: "Rice - 50kg Bag",
      category: "supermarket",
      price: 45000,
      unit: "50kg bag",
      description: "Premium long grain parboiled rice",
      rating: 4.6,
      reviewCount: 342,
      seller: {
        id: "seller-003",
        name: "Abuja Supermarket",
        location: "Garki Area 11, Abuja",
        rating: 4.5,
        verified: true
      },
      inStock: true,
      minimumOrder: 1
    },
    // Restaurant
    {
      id: "restaurant-001",
      name: "Jollof Rice Special",
      category: "restaurant",
      price: 3500,
      unit: "serving",
      description: "Traditional Nigerian jollof rice with chicken and plantain",
      rating: 4.7,
      reviewCount: 128,
      seller: {
        id: "seller-004",
        name: "Mama's Kitchen",
        location: "Victoria Island, Lagos",
        rating: 4.6,
        verified: true
      },
      inStock: true,
      minimumOrder: 1
    },
    // Education
    {
      id: "education-001",
      name: "Computer Programming Course",
      category: "education",
      price: 150000,
      unit: "3-month course",
      description: "Complete web development course with React and Node.js",
      rating: 4.8,
      reviewCount: 89,
      seller: {
        id: "seller-005",
        name: "Tech Academy Nigeria",
        location: "Ikeja, Lagos",
        rating: 4.9,
        verified: true
      },
      inStock: true,
      minimumOrder: 1
    },
    // Medical & Health
    {
      id: "medical-001",
      name: "General Health Checkup",
      category: "medical-health",
      price: 25000,
      unit: "consultation",
      description: "Comprehensive health screening including blood work",
      rating: 4.7,
      reviewCount: 156,
      seller: {
        id: "seller-006",
        name: "City Medical Centre",
        location: "Maitama, Abuja",
        rating: 4.8,
        verified: true
      },
      inStock: true,
      minimumOrder: 1
    },
    // Vehicle Service
    {
      id: "vehicle-001",
      name: "Car Oil Change Service",
      category: "vehicle-service",
      price: 12000,
      unit: "service",
      description: "Complete engine oil change with filter replacement",
      rating: 4.5,
      reviewCount: 203,
      seller: {
        id: "seller-007",
        name: "AutoCare Services",
        location: "Berger, Lagos",
        rating: 4.4,
        verified: true
      },
      inStock: true,
      minimumOrder: 1
    },
    // Hotel
    {
      id: "hotel-001",
      name: "Deluxe Room - One Night",
      category: "hotel",
      price: 35000,
      unit: "night",
      description: "Luxury hotel room with breakfast and free WiFi",
      rating: 4.6,
      reviewCount: 324,
      seller: {
        id: "seller-008",
        name: "Grand Palace Hotel",
        location: "Victoria Island, Lagos",
        rating: 4.7,
        verified: true
      },
      inStock: true,
      minimumOrder: 1
    },
    // Ticket
    {
      id: "ticket-001",
      name: "Lagos-Abuja Flight",
      category: "ticket",
      price: 85000,
      unit: "one-way ticket",
      description: "Economy class flight from Lagos to Abuja",
      rating: 4.3,
      reviewCount: 445,
      seller: {
        id: "seller-009",
        name: "Nigerian Airways",
        location: "Murtala Mohammed Airport",
        rating: 4.2,
        verified: true
      },
      inStock: true,
      minimumOrder: 1
    },
    // Event Planner
    {
      id: "event-001",
      name: "Wedding Planning Package",
      category: "event-planner",
      price: 500000,
      unit: "full service",
      description: "Complete wedding planning including decoration and catering coordination",
      rating: 4.9,
      reviewCount: 67,
      seller: {
        id: "seller-010",
        name: "Elite Events Nigeria",
        location: "Lekki, Lagos",
        rating: 4.8,
        verified: true
      },
      inStock: true,
      minimumOrder: 1
    },
    // Oil & Gas
    {
      id: "oil-001",
      name: "Premium Petrol - 50L",
      category: "oil-gas",
      price: 40000,
      unit: "50 liters",
      description: "High-quality premium motor spirit delivered to your location",
      rating: 4.4,
      reviewCount: 234,
      seller: {
        id: "seller-011",
        name: "Total Energies",
        location: "Fuel delivery service",
        rating: 4.6,
        verified: true
      },
      inStock: true,
      minimumOrder: 1
    },
    // Shopping & Retail
    {
      id: "retail-001",
      name: "Samsung Galaxy Phone",
      category: "shopping-retail",
      price: 450000,
      unit: "device",
      description: "Latest Samsung Galaxy smartphone with 128GB storage",
      rating: 4.7,
      reviewCount: 178,
      seller: {
        id: "seller-012",
        name: "Electronics World",
        location: "Computer Village, Lagos",
        rating: 4.5,
        verified: true
      },
      inStock: true,
      minimumOrder: 1
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
                {viewMode === "categories" ? "Business Marketplace" : "Products & Services"}
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