import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ArrowLeft, Search, Star, MapPin, Filter, Verified } from "lucide-react";
import { useLocation } from "wouter";

interface Merchant {
  id: number;
  userId: string;
  fullName: string;
  businessName: string;
  businessType: string;
  businessDescription: string;
  businessAddress: string;
  businessLogo: string;
  rating: number;
  reviewCount: number;
  isVerified: boolean;
  distance?: number;
}

export default function MerchantsPage() {
  const [, setLocation] = useLocation();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [userLocation, setUserLocation] = useState<{lat: number, lng: number} | null>(null);

  // Business categories
  const categories = [
    "RESTAURANT",
    "SUPERMARKET", 
    "APPAREL",
    "BEAUTY_COSMETICS",
    "ELECTRONICS",
    "MEDICAL_HEALTH",
    "VEHICLE_SERVICE",
    "OTHER"
  ];

  // Get user location
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
        },
        (error) => {
          console.log("Location access denied:", error);
          // Use default Lagos coordinates
          setUserLocation({ lat: 6.5244, lng: 3.3792 });
        }
      );
    } else {
      // Use default Lagos coordinates
      setUserLocation({ lat: 6.5244, lng: 3.3792 });
    }
  }, []);

  // Fetch merchants from API
  const { data: merchantsData, isLoading, error } = useQuery({
    queryKey: ['/api/merchants/search', userLocation, selectedCategory, searchTerm],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (userLocation) {
        params.append('lat', userLocation.lat.toString());
        params.append('lng', userLocation.lng.toString());
      }
      if (selectedCategory) params.append('category', selectedCategory);
      if (searchTerm) params.append('searchTerm', searchTerm);
      params.append('radius', '10');

      const response = await fetch(`/api/merchants/search?${params}`);
      if (!response.ok) throw new Error('Failed to fetch merchants');
      return response.json();
    },
    enabled: !!userLocation
  });

  const merchants: Merchant[] = merchantsData?.merchants || [];

  const handleMerchantClick = (merchant: Merchant) => {
    setLocation(`/merchants/${merchant.id}`);
  };

  const handleSearch = () => {
    // Query will automatically refetch due to dependency
  };

  const formatBusinessType = (type: string) => {
    return type.split('_').map(word => 
      word.charAt(0) + word.slice(1).toLowerCase()
    ).join(' ');
  };

  return (
    <div className="w-full max-w-md mx-auto min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 p-4">
        <div className="flex items-center justify-between mb-4">
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => setLocation("/consumer-home")}
            className="p-2"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-semibold">Find Merchants</h1>
          <Button variant="ghost" size="sm" className="p-2">
            <Filter className="h-5 w-5" />
          </Button>
        </div>

        {/* Search Bar */}
        <div className="flex space-x-2 mb-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search merchants..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            />
          </div>
          <Button onClick={handleSearch} className="bg-blue-600 hover:bg-blue-700">
            Search
          </Button>
        </div>

        {/* Category Filter */}
        <div className="flex space-x-2 overflow-x-auto pb-2">
          <Button
            variant={selectedCategory === "" ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedCategory("")}
            className="whitespace-nowrap"
          >
            All
          </Button>
          {categories.map((category) => (
            <Button
              key={category}
              variant={selectedCategory === category ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedCategory(category)}
              className="whitespace-nowrap"
            >
              {formatBusinessType(category)}
            </Button>
          ))}
        </div>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="p-4 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Finding merchants near you...</p>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="p-4 text-center">
          <p className="text-red-600">Failed to load merchants. Please try again.</p>
          <Button onClick={() => window.location.reload()} className="mt-2">
            Retry
          </Button>
        </div>
      )}

      {/* Merchants List */}
      <div className="p-4 space-y-4">
        {merchants.length === 0 && !isLoading && (
          <div className="text-center py-8">
            <p className="text-gray-600">No merchants found in your area.</p>
            <p className="text-sm text-gray-500 mt-1">Try adjusting your search or location.</p>
          </div>
        )}

        {merchants.map((merchant) => (
          <Card 
            key={merchant.id} 
            className="cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => handleMerchantClick(merchant)}
          >
            <CardContent className="p-4">
              <div className="flex items-start space-x-3">
                <Avatar className="h-12 w-12">
                  <AvatarImage src={merchant.businessLogo} />
                  <AvatarFallback>
                    {merchant.businessName.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2 mb-1">
                    <h3 className="font-semibold text-gray-900 truncate">
                      {merchant.businessName}
                    </h3>
                    {merchant.isVerified && (
                      <Verified className="h-4 w-4 text-blue-600" />
                    )}
                  </div>
                  
                  <Badge variant="secondary" className="text-xs mb-2">
                    {formatBusinessType(merchant.businessType)}
                  </Badge>
                  
                  <p className="text-sm text-gray-600 line-clamp-2 mb-2">
                    {merchant.businessDescription}
                  </p>
                  
                  <div className="flex items-center space-x-4 text-sm text-gray-500">
                    <div className="flex items-center space-x-1">
                      <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                      <span>{merchant.rating}</span>
                      <span>({merchant.reviewCount})</span>
                    </div>
                    
                    <div className="flex items-center space-x-1">
                      <MapPin className="h-4 w-4" />
                      <span className="truncate">{merchant.businessAddress}</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}