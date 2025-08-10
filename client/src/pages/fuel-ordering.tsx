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

  const handleCreateFuelOrder = async (orderData: any) => {
    setIsLoading(true);
    
    try {
      // Create fuel order with enhanced data
      const response = await fetch('/api/fuel/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          stationId: selectedStation?.id || 'station_1',
          fuelType: orderData.fuelType,
          quantity: parseFloat(orderData.quantity),
          unitPrice: parseFloat(orderData.unitPrice),
          totalAmount: parseFloat(orderData.totalAmount),
          deliveryAddress: orderData.deliveryAddress,
          deliveryLatitude: orderData.coordinates?.latitude || 6.5244,
          deliveryLongitude: orderData.coordinates?.longitude || 3.3792,
          scheduledDeliveryTime: orderData.scheduledTime,
          notes: orderData.notes || `Fuel delivery order - ${orderData.fuelType}`,
          paymentMethod: orderData.paymentMethod || 'wallet'
        }),
        credentials: 'include'
      });

      const result = await response.json();
      
      if (response.ok && result.success) {
        // Show success message
        setModalData({
          isOpen: true,
          type: "success",
          title: "Order Placed Successfully! 🚚",
          message: `Your ${orderData.fuelType} order has been placed. A driver will be assigned shortly. Track your order in real-time.`
        });

        // Navigate to tracking page after delay
        setTimeout(() => {
          setLocation(`/fuel-delivery-tracking?orderId=${result.order.id}`);
        }, 2000);
      } else {
        throw new Error(result.error || 'Failed to place order');
      }
    } catch (error) {
      console.error('Error creating fuel order:', error);
      setModalData({
        isOpen: true,
        type: "error",
        title: "Order Failed",
        message: error.message || "Unable to place your order. Please try again or contact support."
      });
    } finally {
      setIsLoading(false);
    }
  };
}