import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Menu, MapPin, Search, Navigation, Fuel } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/hooks/use-auth";
import logo from "../assets/images/logo.png";

interface LocationData {
  latitude: number;
  longitude: number;
  address: string;
  isAutomatic: boolean;
}

export default function MapHome() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const [currentLocation, setCurrentLocation] = useState<LocationData | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  useEffect(() => {
    // Check if location was set during onboarding
    const savedLocation = localStorage.getItem("userLocation");
    if (savedLocation) {
      setCurrentLocation(JSON.parse(savedLocation));
    } else {
      // If no location set, redirect to location setup
      setLocation("/location-setup");
    }
  }, [setLocation]);

  const handleLocationUpdate = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const locationData: LocationData = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            address: "Current Location", // Would be reverse geocoded in real app
            isAutomatic: true
          };
          setCurrentLocation(locationData);
          localStorage.setItem("userLocation", JSON.stringify(locationData));
        },
        (error) => {
          console.error("Error getting location:", error);
        }
      );
    }
  };

  const handleSearch = () => {
    if (searchQuery.trim()) {
      setLocation(`/search-results?q=${encodeURIComponent(searchQuery)}`);
    }
  };

  const handleOrderFuel = () => {
    setLocation("/fuel-ordering");
  };

  const openSideMenu = () => {
    setIsMenuOpen(true);
    setLocation("/side-menu");
  };

  return (
    <div className="min-h-screen bg-gray-50 relative">
      {/* Map Background Simulation */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-100 to-green-100">
        {/* Simulated map with grid pattern */}
        <div className="absolute inset-0 opacity-20">
          <div className="grid grid-cols-8 grid-rows-12 h-full w-full">
            {Array.from({ length: 96 }).map((_, i) => (
              <div key={i} className="border border-gray-300"></div>
            ))}
          </div>
        </div>
        
        {/* Map pins simulation */}
        <div className="absolute top-1/4 left-1/3 w-4 h-4 bg-red-500 rounded-full animate-pulse"></div>
        <div className="absolute top-1/2 right-1/4 w-4 h-4 bg-red-500 rounded-full animate-pulse"></div>
        <div className="absolute bottom-1/3 left-1/4 w-4 h-4 bg-red-500 rounded-full animate-pulse"></div>
        
        {/* User location pin */}
        {currentLocation && (
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
            <div className="w-6 h-6 bg-[#4682b4] rounded-full border-4 border-white shadow-lg animate-pulse"></div>
          </div>
        )}
      </div>

      {/* Top Navigation Bar */}
      <div className="relative z-10 bg-white/95 backdrop-blur-sm shadow-sm">
        <div className="flex items-center justify-between p-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={openSideMenu}
            className="text-[#131313]"
          >
            <Menu className="w-6 h-6" />
          </Button>
          
          <div className="flex items-center space-x-2">
            <img src={logo} alt="Brillprime" className="w-8 h-8" />
            <span className="font-semibold text-[#131313]">Brillprime</span>
          </div>
          
          <Button
            variant="ghost"
            size="icon"
            onClick={handleLocationUpdate}
            className="text-[#4682b4]"
          >
            <Navigation className="w-5 h-5" />
          </Button>
        </div>

        {/* Current Location Display */}
        {currentLocation && (
          <div className="px-4 pb-3">
            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <MapPin className="w-4 h-4 text-[#4682b4]" />
              <span className="truncate">{currentLocation.address}</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setLocation("/location-setup")}
                className="text-[#4682b4] hover:text-[#0b1a51] text-xs"
              >
                Change
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Search Bar */}
      <div className="relative z-10 p-4">
        <Card className="shadow-lg">
          <CardContent className="p-3">
            <div className="flex space-x-2">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Search for fuel stations, locations..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                  className="pl-10 border-[#4682b4]/30 focus:border-[#4682b4]"
                />
              </div>
              <Button
                onClick={handleSearch}
                className="bg-[#4682b4] hover:bg-[#0b1a51]"
              >
                <Search className="w-4 h-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="relative z-10 px-4 mb-4">
        <div className="grid grid-cols-2 gap-3">
          <Button
            onClick={handleOrderFuel}
            className="h-16 bg-[#4682b4] hover:bg-[#0b1a51] text-white rounded-xl shadow-lg"
          >
            <div className="flex items-center space-x-3">
              <Fuel className="w-6 h-6" />
              <div className="text-left">
                <div className="font-semibold">Order Fuel</div>
                <div className="text-xs opacity-90">Fast delivery</div>
              </div>
            </div>
          </Button>
          
          <Button
            variant="outline"
            onClick={() => setLocation("/qr-scanner")}
            className="h-16 border-[#4682b4] text-[#4682b4] hover:bg-[#4682b4]/10 rounded-xl shadow-lg"
          >
            <div className="flex items-center space-x-3">
              <div className="w-6 h-6 border-2 border-current rounded"></div>
              <div className="text-left">
                <div className="font-semibold">Scan QR</div>
                <div className="text-xs opacity-75">Quick pay</div>
              </div>
            </div>
          </Button>
        </div>
      </div>

      {/* User Info Card */}
      <div className="relative z-10 px-4">
        <Card className="bg-white/95 backdrop-blur-sm shadow-lg">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-[#131313]">
                  Welcome, {user?.fullName?.split(' ')[0] || 'User'}
                </h3>
                <p className="text-sm text-gray-600">
                  {currentLocation?.isAutomatic ? "Location set automatically" : "Location set manually"}
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setLocation("/consumer-home")}
                className="border-[#4682b4] text-[#4682b4] hover:bg-[#4682b4]/10"
              >
                Dashboard
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Floating Action Button for Emergency */}
      <div className="fixed bottom-6 right-6 z-20">
        <Button
          onClick={() => setLocation("/emergency-fuel")}
          className="w-14 h-14 rounded-full bg-red-500 hover:bg-red-600 shadow-xl"
        >
          <Fuel className="w-6 h-6 text-white" />
        </Button>
      </div>

      {/* Location Permission Prompt */}
      {!currentLocation && (
        <div className="fixed bottom-0 left-0 right-0 z-30 bg-white p-4 border-t shadow-lg">
          <div className="text-center">
            <h4 className="font-semibold text-[#131313] mb-2">Enable Location Access</h4>
            <p className="text-sm text-gray-600 mb-4">
              We need your location to find nearby fuel stations
            </p>
            <div className="flex space-x-3">
              <Button
                onClick={handleLocationUpdate}
                className="flex-1 bg-[#4682b4] hover:bg-[#0b1a51]"
              >
                Enable Location
              </Button>
              <Button
                variant="outline"
                onClick={() => setLocation("/location-setup")}
                className="flex-1 border-[#4682b4] text-[#4682b4]"
              >
                Set Manually
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}