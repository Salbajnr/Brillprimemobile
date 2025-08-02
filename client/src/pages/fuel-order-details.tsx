
import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { ArrowLeft, MapPin, Clock, Fuel, Plus, Minus, Calendar, MessageSquare, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/use-auth";
import { useWebSocketOrders } from "@/hooks/use-websocket";

interface FuelStation {
  id: string;
  name: string;
  brand: string;
  address: string;
  distance: number;
  rating: number;
  reviewCount: number;
  prices: {
    PMS: number;
    AGO: number;
    DPK: number;
  };
  fuelTypes: string[];
  isOpen: boolean;
  deliveryTime: string;
  phone: string;
}

export default function FuelOrderDetails() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { connected, sendMessage } = useWebSocketOrders();
  
  const [station, setStation] = useState<FuelStation | null>(null);
  const [selectedFuelType, setSelectedFuelType] = useState<"PMS" | "AGO" | "DPK">("PMS");
  const [quantity, setQuantity] = useState(20); // Default 20 liters
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [scheduledTime, setScheduledTime] = useState("");
  const [notes, setNotes] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Get station ID from URL
  useEffect(() => {
    const urlPath = window.location.pathname;
    const stationId = urlPath.split('/').pop();
    
    if (stationId) {
      // Mock station data - in real app would fetch from API
      setStation({
        id: stationId,
        name: "Total Energies Wuse II",
        brand: "Total Energies",
        address: "Plot 123, Ademola Adetokunbo Crescent, Wuse II",
        distance: 2.3,
        rating: 4.5,
        reviewCount: 128,
        prices: {
          PMS: 617,
          AGO: 620,
          DPK: 615
        },
        fuelTypes: ["PMS", "AGO", "DPK"],
        isOpen: true,
        deliveryTime: "15-25 mins",
        phone: "+234 803 123 4567"
      });
    }
  }, []);

  const calculateTotal = () => {
    if (!station) return 0;
    const unitPrice = station.prices[selectedFuelType];
    const deliveryFee = 500; // Fixed delivery fee
    return (quantity * unitPrice) + deliveryFee;
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const handleQuantityChange = (delta: number) => {
    const newQuantity = quantity + delta;
    if (newQuantity >= 5 && newQuantity <= 200) {
      setQuantity(newQuantity);
    }
  };

  const handlePlaceOrder = async () => {
    if (!station || !user || !deliveryAddress.trim()) return;

    setIsLoading(true);
    try {
      const orderData = {
        stationId: station.id,
        fuelType: selectedFuelType,
        quantity,
        unitPrice: station.prices[selectedFuelType],
        totalAmount: calculateTotal(),
        deliveryAddress,
        deliveryLatitude: 9.0765, // Mock coordinates
        deliveryLongitude: 7.3986,
        scheduledDeliveryTime: scheduledTime || undefined,
        notes: notes || undefined
      };

      const response = await fetch('/api/fuel/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(orderData),
      });

      const result = await response.json();

      if (result.success) {
        // Send WebSocket notification about new order
        if (connected) {
          sendMessage({
            type: 'ORDER_CREATED',
            payload: {
              orderId: result.order.id,
              customerName: user.fullName,
              fuelType: selectedFuelType,
              quantity,
              deliveryAddress
            }
          });
        }

        setLocation(`/order-confirmation/${result.order.id}`);
      } else {
        alert('Failed to place order: ' + result.message);
      }
    } catch (error) {
      console.error('Order placement error:', error);
      alert('Failed to place order. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!station) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading station details...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 w-full max-w-md mx-auto">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="flex items-center justify-between p-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setLocation("/fuel-ordering")}
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-lg font-semibold text-[#131313]">Order Fuel</h1>
          <div className="w-10"></div>
        </div>
      </div>

      <div className="p-4 space-y-6">
        {/* Station Info */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1">
                <h3 className="font-semibold text-[#131313]">{station.name}</h3>
                <p className="text-sm text-gray-600 mb-2">{station.address}</p>
                <div className="flex items-center space-x-4 text-sm text-gray-500">
                  <div className="flex items-center space-x-1">
                    <MapPin className="w-3 h-3" />
                    <span>{station.distance} km away</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Clock className="w-3 h-3" />
                    <span>{station.deliveryTime}</span>
                  </div>
                </div>
              </div>
              <Badge className="bg-green-100 text-green-800">Open</Badge>
            </div>
            <div className="flex space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.location.href = `tel:${station.phone}`}
              >
                <Phone className="w-4 h-4 mr-1" />
                Call
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setLocation(`/chat/station/${station.id}`)}
              >
                <MessageSquare className="w-4 h-4 mr-1" />
                Chat
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Fuel Type Selection */}
        <Card>
          <CardContent className="p-4">
            <h4 className="font-medium text-[#131313] mb-3">Select Fuel Type</h4>
            <div className="grid grid-cols-3 gap-2">
              {station.fuelTypes.map((type) => (
                <button
                  key={type}
                  onClick={() => setSelectedFuelType(type as "PMS" | "AGO" | "DPK")}
                  className={`p-3 rounded-lg border text-center transition-colors ${
                    selectedFuelType === type
                      ? "border-[#4682b4] bg-[#4682b4]/10 text-[#4682b4]"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <div className="font-medium">{type}</div>
                  <div className="text-sm text-gray-600">
                    {formatCurrency(station.prices[type as keyof typeof station.prices])}/L
                  </div>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Quantity Selection */}
        <Card>
          <CardContent className="p-4">
            <h4 className="font-medium text-[#131313] mb-3">Quantity (Liters)</h4>
            <div className="flex items-center justify-center space-x-4">
              <Button
                variant="outline"
                size="icon"
                onClick={() => handleQuantityChange(-5)}
                disabled={quantity <= 5}
              >
                <Minus className="w-4 h-4" />
              </Button>
              <div className="text-center">
                <div className="text-2xl font-bold text-[#4682b4]">{quantity}L</div>
                <div className="text-sm text-gray-600">
                  {formatCurrency(quantity * station.prices[selectedFuelType])}
                </div>
              </div>
              <Button
                variant="outline"
                size="icon"
                onClick={() => handleQuantityChange(5)}
                disabled={quantity >= 200}
              >
                <Plus className="w-4 h-4" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Delivery Details */}
        <Card>
          <CardContent className="p-4 space-y-4">
            <h4 className="font-medium text-[#131313]">Delivery Details</h4>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Delivery Address *
              </label>
              <Textarea
                placeholder="Enter your delivery address"
                value={deliveryAddress}
                onChange={(e) => setDeliveryAddress(e.target.value)}
                className="resize-none"
                rows={3}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Preferred Delivery Time (Optional)
              </label>
              <Input
                type="datetime-local"
                value={scheduledTime}
                onChange={(e) => setScheduledTime(e.target.value)}
                min={new Date().toISOString().slice(0, 16)}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Special Notes (Optional)
              </label>
              <Textarea
                placeholder="Any special instructions for delivery"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="resize-none"
                rows={2}
              />
            </div>
          </CardContent>
        </Card>

        {/* Order Summary */}
        <Card>
          <CardContent className="p-4">
            <h4 className="font-medium text-[#131313] mb-3">Order Summary</h4>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>Fuel ({quantity}L {selectedFuelType})</span>
                <span>{formatCurrency(quantity * station.prices[selectedFuelType])}</span>
              </div>
              <div className="flex justify-between">
                <span>Delivery Fee</span>
                <span>{formatCurrency(500)}</span>
              </div>
              <div className="border-t pt-2 flex justify-between font-semibold text-lg">
                <span>Total</span>
                <span className="text-[#4682b4]">{formatCurrency(calculateTotal())}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Place Order Button */}
        <Button
          onClick={handlePlaceOrder}
          disabled={!deliveryAddress.trim() || isLoading}
          className="w-full h-12 bg-[#4682b4] hover:bg-[#0b1a51] text-white rounded-xl"
        >
          {isLoading ? (
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              <span>Placing Order...</span>
            </div>
          ) : (
            `Place Order - ${formatCurrency(calculateTotal())}`
          )}
        </Button>
      </div>
    </div>
  );
}
