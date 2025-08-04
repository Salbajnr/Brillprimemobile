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
  const { user } = useAuth();
  const [selectedStation, setSelectedStation] = useState<Station | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Get user's current location for distance calculation
  const [userLocation, setUserLocation] = useState<Location | null>(null);

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          });
        },
        (error) => {
          console.error('Error getting location:', error);
        }
      );
    }
  }, []);

  const filteredStations = mockStations.filter(station =>
    station.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    station.address.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleStationSelect = (station: Station) => {
    setSelectedStation(station);
  };

  const handlePlaceOrder = (fuelType: string, quantity: number, unitPrice: number) => {
    if (!selectedStation || !user) return;

    setIsLoading(true);

    // Navigate to fuel order details with pre-filled data
    const orderData = {
      stationId: selectedStation.id,
      stationName: selectedStation.name,
      fuelType,
      quantity,
      unitPrice,
      totalAmount: quantity * unitPrice
    };

    setTimeout(() => {
      setIsLoading(false);
      setLocation('/fuel-order-details', { state: orderData });
    }, 500);
  };
}