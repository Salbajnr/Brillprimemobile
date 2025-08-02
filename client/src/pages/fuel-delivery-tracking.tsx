
import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { ArrowLeft, MapPin, Phone, Clock, Truck, CheckCircle, Star, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface DeliveryStatus {
  status: 'confirmed' | 'preparing' | 'on_way' | 'delivered';
  timestamp: string;
  description: string;
}

interface Driver {
  id: string;
  name: string;
  phone: string;
  rating: number;
  vehicle: string;
  plateNumber: string;
  photo?: string;
}

interface DeliveryTracking {
  orderId: string;
  fuelStation: string;
  fuelType: string;
  quantity: number;
  totalAmount: number;
  deliveryAddress: string;
  estimatedTime: string;
  driver: Driver;
  currentLocation: {
    lat: number;
    lng: number;
  };
  statuses: DeliveryStatus[];
  currentStatus: 'confirmed' | 'preparing' | 'on_way' | 'delivered';
}

export default function FuelDeliveryTracking() {
  const [, setLocation] = useLocation();
  const mapRef = useRef<HTMLDivElement>(null);
  const [tracking, setTracking] = useState<DeliveryTracking>({
    orderId: "FD-2024-0001",
    fuelStation: "Total Filling Station",
    fuelType: "Premium Motor Spirit (PMS)",
    quantity: 50,
    totalAmount: 37500,
    deliveryAddress: "15 Admiralty Way, Lekki Phase 1, Lagos",
    estimatedTime: "25 mins",
    driver: {
      id: "D001",
      name: "Adebayo Johnson",
      phone: "+234 801 234 5678",
      rating: 4.8,
      vehicle: "Honda CRV",
      plateNumber: "ABC-123-DE"
    },
    currentLocation: {
      lat: 6.4281,
      lng: 3.4219
    },
    statuses: [
      {
        status: 'confirmed',
        timestamp: '2:15 PM',
        description: 'Order confirmed and fuel station notified'
      },
      {
        status: 'preparing',
        timestamp: '2:18 PM',
        description: 'Fuel being prepared for delivery'
      },
      {
        status: 'on_way',
        timestamp: '2:25 PM',
        description: 'Driver on the way to your location'
      }
    ],
    currentStatus: 'on_way'
  });

  const [map, setMap] = useState<any>(null);

  useEffect(() => {
    // Initialize map (using placeholder for Google Maps)
    if (mapRef.current && !map) {
      const mockMap = {
        center: tracking.currentLocation,
        zoom: 15
      };
      setMap(mockMap);
    }

    // Simulate real-time location updates
    const locationInterval = setInterval(() => {
      setTracking(prev => ({
        ...prev,
        currentLocation: {
          lat: prev.currentLocation.lat + (Math.random() - 0.5) * 0.001,
          lng: prev.currentLocation.lng + (Math.random() - 0.5) * 0.001
        }
      }));
    }, 5000);

    return () => clearInterval(locationInterval);
  }, [map]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'confirmed':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'preparing':
        return <Clock className="w-4 h-4 text-yellow-500" />;
      case 'on_way':
        return <Truck className="w-4 h-4 text-blue-500" />;
      case 'delivered':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      default:
        return null;
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0
    }).format(amount);
  };

  return (
    <div className="min-h-screen bg-gray-50 w-full max-w-sm sm:max-w-md md:max-w-lg lg:max-w-xl xl:max-w-2xl mx-auto">
      {/* Header */}
      <div className="bg-white shadow-sm border-b sticky top-0 z-10">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setLocation("/fuel-ordering")}
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-lg font-semibold text-[#131313]">Track Delivery</h1>
              <p className="text-sm text-gray-600">Order #{tracking.orderId}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Map Container */}
        <Card>
          <CardContent className="p-0">
            <div 
              ref={mapRef}
              className="h-64 bg-gray-200 rounded-t-lg relative flex items-center justify-center"
            >
              <div className="text-center">
                <Truck className="w-8 h-8 text-[#4682b4] mx-auto mb-2" />
                <p className="text-sm text-gray-600">Real-time tracking map</p>
                <p className="text-xs text-gray-500">Driver location updating...</p>
              </div>
            </div>
            <div className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-[#131313]">Estimated Arrival</p>
                  <p className="text-sm text-gray-600">{tracking.estimatedTime}</p>
                </div>
                <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                  On the way
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Driver Information */}
        <Card>
          <CardContent className="p-4">
            <h3 className="font-semibold text-[#131313] mb-3">Your Driver</h3>
            <div className="flex items-center space-x-4">
              <Avatar className="w-12 h-12">
                <AvatarImage src={tracking.driver.photo} />
                <AvatarFallback>{tracking.driver.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <p className="font-medium text-[#131313]">{tracking.driver.name}</p>
                <div className="flex items-center space-x-2 text-sm text-gray-600">
                  <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                  <span>{tracking.driver.rating}</span>
                  <span>•</span>
                  <span>{tracking.driver.vehicle}</span>
                  <span>•</span>
                  <span>{tracking.driver.plateNumber}</span>
                </div>
              </div>
              <div className="flex space-x-2">
                <Button size="sm" variant="outline">
                  <Phone className="w-4 h-4" />
                </Button>
                <Button size="sm" variant="outline">
                  <MessageCircle className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Order Details */}
        <Card>
          <CardContent className="p-4">
            <h3 className="font-semibold text-[#131313] mb-3">Order Details</h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">Fuel Station:</span>
                <span className="font-medium">{tracking.fuelStation}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Fuel Type:</span>
                <span className="font-medium">{tracking.fuelType}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Quantity:</span>
                <span className="font-medium">{tracking.quantity} Liters</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Delivery Address:</span>
                <span className="font-medium text-right flex-1 ml-4">{tracking.deliveryAddress}</span>
              </div>
              <hr className="my-2" />
              <div className="flex justify-between font-semibold text-lg">
                <span>Total Amount:</span>
                <span className="text-[#4682b4]">{formatCurrency(tracking.totalAmount)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Delivery Status Timeline */}
        <Card>
          <CardContent className="p-4">
            <h3 className="font-semibold text-[#131313] mb-3">Delivery Status</h3>
            <div className="space-y-4">
              {tracking.statuses.map((status, index) => (
                <div key={index} className="flex items-center space-x-3">
                  {getStatusIcon(status.status)}
                  <div className="flex-1">
                    <p className="font-medium text-[#131313] capitalize">
                      {status.status.replace('_', ' ')}
                    </p>
                    <p className="text-sm text-gray-600">{status.description}</p>
                  </div>
                  <span className="text-sm text-gray-500">{status.timestamp}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
