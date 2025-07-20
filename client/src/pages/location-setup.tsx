import { useState } from "react";
import { useLocation } from "wouter";
import { MapPin, Navigation, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import logo from "../assets/images/logo.png";
import globeIcon from "../assets/images/globe_img.png";
import mapBackground from "../assets/images/map_background.png";

interface LocationData {
  latitude: number;
  longitude: number;
  address: string;
  isAutomatic: boolean;
}

export default function LocationSetup() {
  const [, setLocation] = useLocation();
  const [isLoading, setIsLoading] = useState(false);
  const [manualAddress, setManualAddress] = useState("");
  const [showManualInput, setShowManualInput] = useState(false);

  const handleAutomaticLocation = async () => {
    setIsLoading(true);
    
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const locationData: LocationData = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            address: await reverseGeocode(position.coords.latitude, position.coords.longitude),
            isAutomatic: true
          };
          
          localStorage.setItem("userLocation", JSON.stringify(locationData));
          setIsLoading(false);
          setLocation("/map-home");
        },
        (error) => {
          console.error("Error getting location:", error);
          setIsLoading(false);
          setShowManualInput(true);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 60000
        }
      );
    } else {
      setIsLoading(false);
      setShowManualInput(true);
    }
  };

  const handleManualLocation = () => {
    if (manualAddress.trim()) {
      const locationData: LocationData = {
        latitude: 9.0765, // Default Abuja coordinates
        longitude: 7.3986,
        address: manualAddress,
        isAutomatic: false
      };
      
      localStorage.setItem("userLocation", JSON.stringify(locationData));
      setLocation("/map-home");
    }
  };

  const handleSetLater = () => {
    // Set default location and proceed
    const locationData: LocationData = {
      latitude: 9.0765, // Abuja coordinates
      longitude: 7.3986,
      address: "Abuja, Nigeria",
      isAutomatic: false
    };
    
    localStorage.setItem("userLocation", JSON.stringify(locationData));
    setLocation("/map-home");
  };

  // Mock reverse geocoding - would use real service in production
  const reverseGeocode = async (lat: number, lng: number): Promise<string> => {
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Mock address based on coordinates
    if (lat > 9 && lat < 10 && lng > 7 && lng < 8) {
      return "Wuse II, Abuja, Nigeria";
    } else if (lat > 6 && lat < 7 && lng > 3 && lng < 4) {
      return "Victoria Island, Lagos, Nigeria";
    } else {
      return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-100 to-green-100 relative">
      {/* Map Background Pattern */}
      <div className="absolute inset-0 opacity-20">
        <div className="grid grid-cols-8 grid-rows-12 h-full w-full">
          {Array.from({ length: 96 }).map((_, i) => (
            <div key={i} className="border border-gray-300"></div>
          ))}
        </div>
      </div>

      {/* Header */}
      <div className="relative z-10 bg-white/95 backdrop-blur-sm shadow-sm">
        <div className="flex items-center justify-between p-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setLocation("/onboarding")}
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          
          <div className="flex items-center space-x-2">
            <img src={logo} alt="Brillprime" className="w-8 h-8" />
            <span className="font-semibold text-[#131313]">Location Setup</span>
          </div>
          
          <div className="w-10" /> {/* Spacer */}
        </div>
      </div>

      {/* Content */}
      <div 
        className="relative z-10 flex items-center justify-center min-h-[80vh] p-4"
        style={{
          backgroundImage: `url(${mapBackground})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat'
        }}
      >
        {/* Background overlay for better text readability */}
        <div className="absolute inset-0 bg-white/85 backdrop-blur-sm"></div>
        <div className="relative z-10 w-full max-w-md space-y-6">
          {/* Location Icon */}
          <div className="text-center mb-8">
            <div className="w-24 h-24 bg-[#4682b4] rounded-full flex items-center justify-center mx-auto mb-4 shadow-xl overflow-hidden">
              <img src={globeIcon} alt="Globe" className="w-16 h-16" />
            </div>
            <h1 className="text-2xl font-bold text-[#131313] mb-2">
              Where are you?
            </h1>
            <p className="text-gray-600">
              We need your location to find nearby fuel stations and provide accurate delivery services
            </p>
          </div>

          {/* Action Buttons */}
          <div className="space-y-4">
            <Button
              onClick={handleAutomaticLocation}
              disabled={isLoading}
              className="w-full h-14 bg-[#4682b4] hover:bg-[#0b1a51] text-white rounded-xl shadow-lg"
            >
              <div className="flex items-center space-x-3">
                <Navigation className="w-6 h-6" />
                <div className="text-left">
                  <div className="font-semibold">
                    {isLoading ? "Getting Location..." : "Set Automatically"}
                  </div>
                  <div className="text-sm opacity-90">Use GPS location</div>
                </div>
              </div>
            </Button>

            <Button
              variant="outline"
              onClick={() => setShowManualInput(!showManualInput)}
              className="w-full h-14 border-[#4682b4] text-[#4682b4] hover:bg-[#4682b4]/10 rounded-xl shadow-lg"
            >
              <div className="flex items-center space-x-3">
                <MapPin className="w-6 h-6" />
                <div className="text-left">
                  <div className="font-semibold">Set Manually</div>
                  <div className="text-sm opacity-75">Enter address</div>
                </div>
              </div>
            </Button>

            {/* Manual Location Input */}
            {showManualInput && (
              <Card className="shadow-lg">
                <CardContent className="p-4">
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="address" className="text-sm font-medium text-[#131313]">
                        Enter your address
                      </Label>
                      <Input
                        id="address"
                        placeholder="e.g., Wuse II, Abuja, Nigeria"
                        value={manualAddress}
                        onChange={(e) => setManualAddress(e.target.value)}
                        className="mt-2 border-[#4682b4]/30 focus:border-[#4682b4]"
                      />
                    </div>
                    <Button
                      onClick={handleManualLocation}
                      disabled={!manualAddress.trim()}
                      className="w-full bg-[#4682b4] hover:bg-[#0b1a51]"
                    >
                      Save Location
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            <Button
              variant="ghost"
              onClick={handleSetLater}
              className="w-full text-gray-600 hover:text-[#4682b4]"
            >
              Set Later (Use Default: Abuja)
            </Button>
          </div>

          {/* Benefits */}
          <Card className="bg-white/95 backdrop-blur-sm shadow-lg">
            <CardContent className="p-4">
              <h3 className="font-semibold text-[#131313] mb-3">Why we need location:</h3>
              <ul className="space-y-2 text-sm text-gray-600">
                <li className="flex items-start space-x-2">
                  <span className="text-[#4682b4] mt-1">•</span>
                  <span>Find nearby fuel stations</span>
                </li>
                <li className="flex items-start space-x-2">
                  <span className="text-[#4682b4] mt-1">•</span>
                  <span>Calculate accurate delivery times</span>
                </li>
                <li className="flex items-start space-x-2">
                  <span className="text-[#4682b4] mt-1">•</span>
                  <span>Show relevant merchants and services</span>
                </li>
                <li className="flex items-start space-x-2">
                  <span className="text-[#4682b4] mt-1">•</span>
                  <span>Provide personalized recommendations</span>
                </li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}