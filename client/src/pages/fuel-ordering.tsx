import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { ArrowLeft, MapPin, Search, Filter, Phone, Star, Navigation, Truck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface FuelStation {
  id: string;
  name: string;
  brand: string;
  address: string;
  distance: number;
  rating: number;
  reviewCount: number;
  pricePerLiter: number;
  fuelTypes: string[];
  isOpen: boolean;
  deliveryTime: string;
  phone: string;
  logo?: string;
}

interface LocationArea {
  id: string;
  name: string;
  stationCount: number;
  averagePrice: number;
}

export default function FuelOrdering() {
  const [, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedArea, setSelectedArea] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"areas" | "stations">("areas");

  // Mock data based on the flow document
  const [locationAreas] = useState<LocationArea[]>([
    {
      id: "wuse-ii",
      name: "Wuse II",
      stationCount: 12,
      averagePrice: 617
    },
    {
      id: "goldcourt-estate", 
      name: "Goldcourt Estate",
      stationCount: 8,
      averagePrice: 615
    },
    {
      id: "garki",
      name: "Garki",
      stationCount: 15,
      averagePrice: 620
    },
    {
      id: "maitama",
      name: "Maitama",
      stationCount: 10,
      averagePrice: 625
    }
  ]);

  // Fetch fuel stations from API
  const [userLocation, setUserLocation] = useState<{lat: number, lng: number} | null>(null);
  const [fuelStations, setFuelStations] = useState<FuelStation[]>([]);
  const [isLoadingStations, setIsLoadingStations] = useState(false);

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

  // Fetch fuel stations when location is available
  useEffect(() => {
    const fetchFuelStations = async () => {
      if (!userLocation) return;
      
      setIsLoadingStations(true);
      try {
        const params = new URLSearchParams({
          lat: userLocation.lat.toString(),
          lng: userLocation.lng.toString(),
          radius: '15'
        });

        const response = await fetch(`/api/fuel-stations?${params}`);
        if (!response.ok) throw new Error('Failed to fetch fuel stations');
        
        const data = await response.json();
        
        // Map API data to FuelStation interface
        const mappedStations: FuelStation[] = data.stations.map((station: any) => ({
          id: station.id,
          name: station.name,
          brand: station.name.split(' ')[0], // Extract brand from name
          address: station.address,
          distance: station.distance,
          rating: station.rating,
          reviewCount: Math.floor(Math.random() * 200) + 50, // Mock review count
          pricePerLiter: station.pricePerLiter.PMS || 617,
          fuelTypes: station.fuelTypes,
          isOpen: station.isOpen,
          deliveryTime: `${Math.floor(station.distance * 5)}-${Math.floor(station.distance * 7)} mins`,
          phone: "+234 803 123 4567" // Mock phone number
        }));
        
        setFuelStations(mappedStations);
      } catch (error) {
        console.error("Error fetching fuel stations:", error);
        // Fallback to mock data if API fails
        setFuelStations([
          {
            id: "station-1",
            name: "Total Energies Lagos",
            brand: "Total Energies",
            address: "Victoria Island, Lagos",
            distance: 2.5,
            rating: 4.2,
            reviewCount: 128,
            pricePerLiter: 617,
            fuelTypes: ["PMS", "AGO", "DPK"],
            isOpen: true,
            deliveryTime: "15-25 mins",
            phone: "+234 803 123 4567"
          }
        ]);
      } finally {
        setIsLoadingStations(false);
      }
    };

    fetchFuelStations();
  }, [userLocation]);

  const filteredAreas = locationAreas.filter(area =>
    area.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredStations = fuelStations.filter(station =>
    station.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    station.address.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const handleAreaSelect = (area: LocationArea) => {
    setSelectedArea(area.id);
    setViewMode("stations");
  };

  const handleStationSelect = (station: FuelStation) => {
    setLocation(`/fuel-order-details/${station.id}`);
  };

  const handleCall = (phone: string) => {
    window.location.href = `tel:${phone}`;
  };

  const handleOrderFuel = (stationId: string, fuelType: string) => {
    // Navigate to fuel delivery tracking after order
    setLocation("/fuel-delivery-tracking");
  };

  return (
    <div className="min-h-screen bg-gray-50 w-full max-w-sm sm:max-w-md md:max-w-lg lg:max-w-xl xl:max-w-2xl mx-auto px-2 sm:px-4">{/*Responsive container*/}
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                if (viewMode === "stations" && selectedArea) {
                  setViewMode("areas");
                  setSelectedArea(null);
                } else {
                  setLocation("/consumer-home");
                }
              }}
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-lg font-semibold text-[#131313]">
                {viewMode === "areas" ? "Order Fuel" : "Fuel Stations"}
              </h1>
              {viewMode === "stations" && selectedArea && (
                <p className="text-sm text-gray-600">
                  {locationAreas.find(a => a.id === selectedArea)?.name}
                </p>
              )}
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setLocation("/fuel-ordering/filter")}
          >
            <Filter className="w-5 h-5 text-[#4682b4]" />
          </Button>
        </div>

        {/* Search Bar */}
        <div className="px-4 pb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder={viewMode === "areas" ? "Search areas..." : "Search fuel stations..."}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 border-[#4682b4]/30 focus:border-[#4682b4]"
            />
          </div>
        </div>
      </div>

      <div className="p-4">
        {viewMode === "areas" ? (
          /* Location Areas View */
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-[#131313]">Select Location</h2>
              <Badge variant="outline" className="text-[#4682b4] border-[#4682b4]">
                {filteredAreas.length} areas
              </Badge>
            </div>

            {filteredAreas.map((area) => (
              <Card
                key={area.id}
                className="cursor-pointer transition-transform hover:scale-[1.02]"
                onClick={() => handleAreaSelect(area)}
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-12 h-12 bg-[#4682b4]/10 rounded-full flex items-center justify-center">
                        <MapPin className="w-6 h-6 text-[#4682b4]" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-[#131313]">{area.name}</h3>
                        <p className="text-sm text-gray-600">
                          {area.stationCount} fuel stations
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-[#4682b4]">
                        {formatCurrency(area.averagePrice)}/L
                      </p>
                      <p className="text-xs text-gray-500">avg. price</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          /* Fuel Stations View */
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-[#131313]">Fuel Stations</h2>
              <Badge variant="outline" className="text-[#4682b4] border-[#4682b4]">
                {filteredStations.filter(s => s.isOpen).length} open now
              </Badge>
            </div>

            {filteredStations.map((station) => (
              <Card
                key={station.id}
                className={`cursor-pointer transition-transform hover:scale-[1.02] ${
                  !station.isOpen ? "opacity-60" : ""
                }`}
                onClick={() => station.isOpen && handleStationSelect(station)}
              >
                <CardContent className="p-4">
                  <div className="space-y-3">
                    {/* Station Header */}
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-3">
                        <Avatar className="w-12 h-12">
                          <AvatarImage src={station.logo} alt={station.brand} />
                          <AvatarFallback className="bg-[#4682b4] text-white">
                            {station.brand.substring(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <h3 className="font-semibold text-[#131313]">{station.name}</h3>
                          <p className="text-sm text-gray-600 mb-1">{station.address}</p>
                          <div className="flex items-center space-x-4 text-sm text-gray-500">
                            <div className="flex items-center space-x-1">
                              <MapPin className="w-3 h-3" />
                              <span>{station.distance} km</span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                              <span>{station.rating} ({station.reviewCount})</span>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge className={station.isOpen ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}>
                          {station.isOpen ? "Open" : "Closed"}
                        </Badge>
                      </div>
                    </div>

                    {/* Station Details */}
                    <div className="flex items-center justify-between pt-2 border-t">
                      <div className="flex items-center space-x-4">
                        <div>
                          <p className="text-lg font-bold text-[#4682b4]">
                            {formatCurrency(station.pricePerLiter)}/L
                          </p>
                          <p className="text-xs text-gray-500">PMS Price</p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-[#131313]">
                            {station.deliveryTime}
                          </p>
                          <p className="text-xs text-gray-500">Delivery time</p>
                        </div>
                      </div>
                      <div className="flex space-x-2">
                        <Button
                          variant="outline"
                          size="icon"
                          className="border-[#4682b4] text-[#4682b4] hover:bg-[#4682b4]/10"
                          onClick={(e) => {
                            e.stopPropagation();
                            window.location.href = `tel:${station.phone}`;
                          }}
                        >
                          <Phone className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="icon"
                          className="border-[#4682b4] text-[#4682b4] hover:bg-[#4682b4]/10"
                          onClick={(e) => {
                            e.stopPropagation();
                            // Open maps application
                            window.open(`https://maps.google.com/?q=${encodeURIComponent(station.address)}`, '_blank');
                          }}
                        >
                          <Navigation className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>

                    {/* Fuel Types */}
                    <div className="flex space-x-2">
                      {station.fuelTypes.map((type) => (
                        <Badge key={type} variant="secondary" className="text-xs">
                          {type}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Empty State */}
        {((viewMode === "areas" && filteredAreas.length === 0) ||
          (viewMode === "stations" && filteredStations.length === 0)) && (
          <div className="text-center py-12">
            <MapPin className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No {viewMode === "areas" ? "areas" : "stations"} found
            </h3>
            <p className="text-gray-500">
              Try adjusting your search or check back later
            </p>
          </div>
        )}
      </div>
    </div>
  );
}