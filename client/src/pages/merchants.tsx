import { useState, useEffect } from "react";
import { Search, MapPin, Phone, Clock, Star, Filter, ArrowLeft, Navigation, Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useLocation } from "wouter";

interface Merchant {
  id: string;
  name: string;
  category: string;
  description: string;
  address: string;
  phone: string;
  rating: number;
  reviewCount: number;
  distance: string;
  isOpen: boolean;
  openHours: string;
  services: string[];
  image: string;
  coordinates: {
    lat: number;
    lng: number;
  };
  specialOffers?: string[];
}

export default function Merchants() {
  const [, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [sortBy, setSortBy] = useState("distance");
  const [favorites, setFavorites] = useState<string[]>([]);
  const [merchants, setMerchants] = useState<Merchant[]>([
    {
      id: "1",
      name: "Lagos Premium Fuel Station",
      category: "Fuel Station",
      description: "24/7 fuel station with premium services including car wash and convenience store",
      address: "123 Victoria Island, Lagos State",
      phone: "+234 901 234 5678",
      rating: 4.8,
      reviewCount: 245,
      distance: "0.5 km",
      isOpen: true,
      openHours: "24/7",
      services: ["Fuel", "Car Wash", "Convenience Store", "ATM"],
      image: "/placeholder-fuel-station.jpg",
      coordinates: { lat: 6.4281, lng: 3.4219 },
      specialOffers: ["10% off car wash", "Free air pump"]
    },
    {
      id: "2",
      name: "TechHub Electronics",
      category: "Electronics",
      description: "Leading electronics store with latest gadgets and tech accessories",
      address: "45 Computer Village, Ikeja, Lagos",
      phone: "+234 802 345 6789",
      rating: 4.6,
      reviewCount: 189,
      distance: "1.2 km",
      isOpen: true,
      openHours: "9:00 AM - 8:00 PM",
      services: ["Electronics", "Repairs", "Accessories", "Warranty"],
      image: "/placeholder-electronics.jpg",
      coordinates: { lat: 6.5244, lng: 3.3792 },
      specialOffers: ["Student discount 15%"]
    },
    {
      id: "3",
      name: "Fresh Foods Market",
      category: "Supermarket",
      description: "Fresh groceries, organic produce, and daily essentials",
      address: "78 Adeniran Ogunsanya, Surulere, Lagos",
      phone: "+234 703 456 7890",
      rating: 4.4,
      reviewCount: 156,
      distance: "2.1 km",
      isOpen: false,
      openHours: "7:00 AM - 10:00 PM",
      services: ["Groceries", "Fresh Produce", "Delivery", "Bakery"],
      image: "/placeholder-supermarket.jpg",
      coordinates: { lat: 6.5056, lng: 3.3784 }
    },
    {
      id: "4",
      name: "AutoCare Service Center",
      category: "Vehicle Service",
      description: "Professional car maintenance and repair services",
      address: "12 Oba Akran Avenue, Ikeja, Lagos",
      phone: "+234 805 567 8901",
      rating: 4.7,
      reviewCount: 98,
      distance: "3.5 km",
      isOpen: true,
      openHours: "8:00 AM - 6:00 PM",
      services: ["Car Repair", "Oil Change", "Tire Service", "AC Repair"],
      image: "/placeholder-auto-service.jpg",
      coordinates: { lat: 6.5244, lng: 3.3792 },
      specialOffers: ["Free inspection"]
    },
    {
      id: "5",
      name: "Wellness Pharmacy",
      category: "Medical & Health",
      description: "Complete pharmacy with medical consultations available",
      address: "56 Broad Street, Lagos Island",
      phone: "+234 806 678 9012",
      rating: 4.9,
      reviewCount: 312,
      distance: "1.8 km",
      isOpen: true,
      openHours: "24/7",
      services: ["Pharmacy", "Consultation", "Lab Tests", "Emergency"],
      image: "/placeholder-pharmacy.jpg",
      coordinates: { lat: 6.4550, lng: 3.3941 }
    }
  ]);

  const categories = [
    "all",
    "Fuel Station",
    "Supermarket",
    "Electronics",
    "Restaurant",
    "Medical & Health",
    "Vehicle Service",
    "Shopping & Retail"
  ];

  const sortOptions = [
    { value: "distance", label: "Distance" },
    { value: "rating", label: "Rating" },
    { value: "name", label: "Name" },
    { value: "open", label: "Open Now" }
  ];

  const filteredMerchants = merchants
    .filter(merchant => {
      const matchesSearch = merchant.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           merchant.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           merchant.services.some(service => 
                             service.toLowerCase().includes(searchQuery.toLowerCase())
                           );
      const matchesCategory = selectedCategory === "all" || merchant.category === selectedCategory;
      return matchesSearch && matchesCategory;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case "distance":
          return parseFloat(a.distance) - parseFloat(b.distance);
        case "rating":
          return b.rating - a.rating;
        case "name":
          return a.name.localeCompare(b.name);
        case "open":
          return (b.isOpen ? 1 : 0) - (a.isOpen ? 1 : 0);
        default:
          return 0;
      }
    });

  const toggleFavorite = (merchantId: string) => {
    setFavorites(prev => 
      prev.includes(merchantId) 
        ? prev.filter(id => id !== merchantId)
        : [...prev, merchantId]
    );
  };

  const openMaps = (merchant: Merchant) => {
    const { lat, lng } = merchant.coordinates;
    const url = `https://www.google.com/maps?q=${lat},${lng}`;
    window.open(url, '_blank');
  };

  const callMerchant = (phone: string) => {
    window.location.href = `tel:${phone}`;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-blue-100/50 animate-fade-in">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center space-x-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setLocation("/consumer-home")}
              className="transition-all duration-300 hover:scale-110"
            >
              <ArrowLeft className="w-5 h-5 text-[#131313]" />
            </Button>
            <div className="animate-slide-up">
              <h1 className="text-lg font-semibold text-[#131313]">Find Merchants</h1>
              <p className="text-sm text-gray-600">
                {filteredMerchants.length} merchants found
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Search and Filters */}
        <Card className="rounded-3xl border-2 border-blue-100/50 animate-fade-in-up">
          <CardContent className="p-4 space-y-4">
            {/* Search Bar */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <Input
                placeholder="Search merchants, services, or categories..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 rounded-2xl border-2 border-blue-100/50 focus:border-[#4682b4]"
              />
            </div>

            {/* Filters */}
            <div className="flex space-x-3">
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="flex-1 rounded-2xl border-2 border-blue-100/50">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map(category => (
                    <SelectItem key={category} value={category}>
                      {category === "all" ? "All Categories" : category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="flex-1 rounded-2xl border-2 border-blue-100/50">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  {sortOptions.map(option => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Merchants List */}
        <div className="space-y-3">
          {filteredMerchants.map((merchant, index) => (
            <Card
              key={merchant.id}
              className="rounded-3xl border-2 border-blue-100/50 transition-all duration-300 hover:shadow-lg hover:scale-[1.02] animate-slide-up"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <CardContent className="p-4">
                <div className="flex space-x-4">
                  {/* Merchant Image Placeholder */}
                  <div className="w-20 h-20 bg-gradient-to-br from-[#4682b4]/20 to-[#0b1a51]/20 rounded-2xl flex items-center justify-center flex-shrink-0">
                    <MapPin className="w-8 h-8 text-[#4682b4]" />
                  </div>

                  {/* Merchant Details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          <h3 className="font-semibold text-[#131313] text-lg truncate">
                            {merchant.name}
                          </h3>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => toggleFavorite(merchant.id)}
                            className="h-8 w-8 transition-all duration-300 hover:scale-110"
                          >
                            <Heart 
                              className={`w-4 h-4 ${
                                favorites.includes(merchant.id) 
                                  ? "fill-red-500 text-red-500" 
                                  : "text-gray-400"
                              }`} 
                            />
                          </Button>
                        </div>
                        <Badge 
                          variant="secondary" 
                          className="mb-2 rounded-2xl bg-blue-100 text-blue-800"
                        >
                          {merchant.category}
                        </Badge>
                      </div>
                      <div className="text-right">
                        <div className="flex items-center space-x-1 mb-1">
                          <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                          <span className="font-medium text-sm">{merchant.rating}</span>
                          <span className="text-gray-500 text-xs">({merchant.reviewCount})</span>
                        </div>
                        <Badge 
                          className={`text-xs rounded-2xl ${
                            merchant.isOpen 
                              ? "bg-green-100 text-green-800" 
                              : "bg-red-100 text-red-800"
                          }`}
                        >
                          {merchant.isOpen ? "Open" : "Closed"}
                        </Badge>
                      </div>
                    </div>

                    <p className="text-gray-600 text-sm mb-2 line-clamp-2">
                      {merchant.description}
                    </p>

                    <div className="flex items-center space-x-4 text-sm text-gray-500 mb-3">
                      <div className="flex items-center space-x-1">
                        <MapPin className="w-4 h-4" />
                        <span>{merchant.distance}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Clock className="w-4 h-4" />
                        <span>{merchant.openHours}</span>
                      </div>
                    </div>

                    {/* Services */}
                    <div className="flex flex-wrap gap-1 mb-3">
                      {merchant.services.slice(0, 3).map((service, idx) => (
                        <Badge 
                          key={idx} 
                          variant="outline" 
                          className="text-xs rounded-2xl border-blue-200"
                        >
                          {service}
                        </Badge>
                      ))}
                      {merchant.services.length > 3 && (
                        <Badge 
                          variant="outline" 
                          className="text-xs rounded-2xl border-blue-200"
                        >
                          +{merchant.services.length - 3} more
                        </Badge>
                      )}
                    </div>

                    {/* Special Offers */}
                    {merchant.specialOffers && merchant.specialOffers.length > 0 && (
                      <div className="mb-3">
                        {merchant.specialOffers.map((offer, idx) => (
                          <Badge 
                            key={idx} 
                            className="mr-1 mb-1 bg-orange-100 text-orange-800 rounded-2xl"
                          >
                            🎉 {offer}
                          </Badge>
                        ))}
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex space-x-2">
                      <Button
                        size="sm"
                        onClick={() => openMaps(merchant)}
                        className="flex-1 bg-[#4682b4] hover:bg-[#0b1a51] text-white rounded-2xl transition-all duration-300 hover:scale-105"
                      >
                        <Navigation className="w-4 h-4 mr-1" />
                        Directions
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => callMerchant(merchant.phone)}
                        className="flex-1 border-2 border-blue-200 text-[#4682b4] hover:bg-blue-50 rounded-2xl transition-all duration-300 hover:scale-105"
                      >
                        <Phone className="w-4 h-4 mr-1" />
                        Call
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* No Results */}
        {filteredMerchants.length === 0 && (
          <Card className="rounded-3xl border-2 border-blue-100/50 animate-fade-in-up">
            <CardContent className="p-8 text-center">
              <Search className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-[#131313] mb-2">No merchants found</h3>
              <p className="text-gray-600 mb-4">
                Try adjusting your search terms or filters to find more results.
              </p>
              <Button
                onClick={() => {
                  setSearchQuery("");
                  setSelectedCategory("all");
                  setSortBy("distance");
                }}
                className="bg-[#4682b4] hover:bg-[#0b1a51] text-white rounded-2xl transition-all duration-300 hover:scale-105"
              >
                Clear Filters
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Quick Filter Pills */}
        <div className="flex flex-wrap gap-2 mt-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSelectedCategory("Fuel Station")}
            className="rounded-2xl border-2 border-blue-200 text-[#4682b4] hover:bg-blue-50 transition-all duration-300 hover:scale-105"
          >
            ⛽ Fuel Stations
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSelectedCategory("Restaurant")}
            className="rounded-2xl border-2 border-blue-200 text-[#4682b4] hover:bg-blue-50 transition-all duration-300 hover:scale-105"
          >
            🍽️ Restaurants
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSelectedCategory("Supermarket")}
            className="rounded-2xl border-2 border-blue-200 text-[#4682b4] hover:bg-blue-50 transition-all duration-300 hover:scale-105"
          >
            🛒 Supermarkets
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSortBy("open")}
            className="rounded-2xl border-2 border-green-200 text-green-700 hover:bg-green-50 transition-all duration-300 hover:scale-105"
          >
            🟢 Open Now
          </Button>
        </div>
      </div>
    </div>
  );
}