
import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ArrowLeft, QrCode, MapPin, Clock, Car, CreditCard } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { NotificationModal } from "@/components/ui/notification-modal";

interface TollGate {
  id: string;
  name: string;
  location: string;
  operatingHours: string;
  vehicleClasses: {
    class: string;
    description: string;
    price: number;
  }[];
  isActive: boolean;
  distance?: string;
}

interface TollPayment {
  tollGateId: string;
  vehicleClass: string;
  plateNumber: string;
  amount: number;
  paymentMethod: string;
}

const mockTollGates: TollGate[] = [
  {
    id: "TG_VI_001",
    name: "Third Mainland Bridge Toll",
    location: "Victoria Island, Lagos",
    operatingHours: "24/7",
    isActive: true,
    distance: "2.5 km",
    vehicleClasses: [
      { class: "Class 1", description: "Cars, SUVs, Pick-ups", price: 200 },
      { class: "Class 2", description: "Mini Bus, Small Truck", price: 300 },
      { class: "Class 3", description: "Large Bus, Truck", price: 500 }
    ]
  },
  {
    id: "TG_LK_002", 
    name: "Lekki-Ikoyi Link Bridge",
    location: "Lekki, Lagos",
    operatingHours: "24/7",
    isActive: true,
    distance: "5.2 km",
    vehicleClasses: [
      { class: "Class 1", description: "Cars, SUVs, Pick-ups", price: 250 },
      { class: "Class 2", description: "Mini Bus, Small Truck", price: 400 },
      { class: "Class 3", description: "Large Bus, Truck", price: 600 }
    ]
  }
];

export default function EnhancedTollPayments() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const [selectedTollGate, setSelectedTollGate] = useState<TollGate | null>(null);
  const [selectedVehicleClass, setSelectedVehicleClass] = useState<string>("");
  const [plateNumber, setPlateNumber] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("wallet");
  const [isLoading, setIsLoading] = useState(false);
  const [modalData, setModalData] = useState<{
    isOpen: boolean;
    type: "success" | "error";
    title: string;
    message: string;
  }>({
    isOpen: false,
    type: "success", 
    title: "",
    message: ""
  });

  const handleTollPayment = async () => {
    if (!selectedTollGate || !selectedVehicleClass || !plateNumber) {
      setModalData({
        isOpen: true,
        type: "error",
        title: "Missing Information",
        message: "Please select a toll gate, vehicle class, and enter your plate number."
      });
      return;
    }

    setIsLoading(true);
    
    try {
      const vehicleClass = selectedTollGate.vehicleClasses.find(vc => vc.class === selectedVehicleClass);
      
      const paymentData: TollPayment = {
        tollGateId: selectedTollGate.id,
        vehicleClass: selectedVehicleClass,
        plateNumber: plateNumber.toUpperCase(),
        amount: vehicleClass?.price || 0,
        paymentMethod
      };

      const response = await fetch('/api/toll/pay', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(paymentData)
      });

      const result = await response.json();

      if (response.ok && result.success) {
        setModalData({
          isOpen: true,
          type: "success",
          title: "Payment Successful! 🎫",
          message: `Toll payment of ₦${vehicleClass?.price.toLocaleString()} has been processed. Your QR code is ready for scanning at the toll gate.`
        });

        // Navigate to success page with payment details
        setTimeout(() => {
          setLocation(`/toll-payment-success?ref=${result.reference}&tollGate=${selectedTollGate.id}`);
        }, 2000);
      } else {
        throw new Error(result.message || 'Payment failed');
      }
    } catch (error) {
      console.error('Toll payment error:', error);
      setModalData({
        isOpen: true,
        type: "error",
        title: "Payment Failed",
        message: error.message || "Unable to process toll payment. Please try again."
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getSelectedVehiclePrice = () => {
    if (!selectedTollGate || !selectedVehicleClass) return 0;
    const vehicleClass = selectedTollGate.vehicleClasses.find(vc => vc.class === selectedVehicleClass);
    return vehicleClass?.price || 0;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-md mx-auto bg-white min-h-screen">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#4682b4] to-[#0b1a51] text-white p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setLocation('/consumer-home')}
                className="text-white hover:bg-white/20 mr-2"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <h1 className="text-xl font-semibold">Toll Payments</h1>
                <p className="text-sm text-blue-100">Pay tolls with QR codes</p>
              </div>
            </div>
            <QrCode className="h-6 w-6" />
          </div>
        </div>

        <div className="p-4 space-y-6">
          {/* Available Toll Gates */}
          <div>
            <h2 className="text-lg font-semibold mb-4">Select Toll Gate</h2>
            <div className="space-y-3">
              {mockTollGates.map((tollGate) => (
                <Card 
                  key={tollGate.id}
                  className={`cursor-pointer transition-all ${
                    selectedTollGate?.id === tollGate.id 
                      ? 'ring-2 ring-blue-500 bg-blue-50' 
                      : 'hover:shadow-md'
                  }`}
                  onClick={() => setSelectedTollGate(tollGate)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <h3 className="font-medium">{tollGate.name}</h3>
                        <div className="flex items-center text-sm text-gray-600 mt-1">
                          <MapPin className="h-4 w-4 mr-1" />
                          {tollGate.location}
                        </div>
                        <div className="flex items-center text-sm text-gray-600 mt-1">
                          <Clock className="h-4 w-4 mr-1" />
                          {tollGate.operatingHours}
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge variant={tollGate.isActive ? "default" : "secondary"}>
                          {tollGate.isActive ? "Active" : "Inactive"}
                        </Badge>
                        {tollGate.distance && (
                          <p className="text-sm text-gray-500 mt-1">{tollGate.distance}</p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Vehicle Class Selection */}
          {selectedTollGate && (
            <div>
              <h2 className="text-lg font-semibold mb-4">Select Vehicle Class</h2>
              <div className="space-y-2">
                {selectedTollGate.vehicleClasses.map((vehicleClass) => (
                  <Card
                    key={vehicleClass.class}
                    className={`cursor-pointer transition-all ${
                      selectedVehicleClass === vehicleClass.class
                        ? 'ring-2 ring-blue-500 bg-blue-50'
                        : 'hover:shadow-md'
                    }`}
                    onClick={() => setSelectedVehicleClass(vehicleClass.class)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium">{vehicleClass.class}</h4>
                          <p className="text-sm text-gray-600">{vehicleClass.description}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-lg">₦{vehicleClass.price.toLocaleString()}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Vehicle Details */}
          {selectedVehicleClass && (
            <div>
              <h2 className="text-lg font-semibold mb-4">Vehicle Details</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Plate Number</label>
                  <Input
                    type="text"
                    placeholder="e.g. ABC 123 XY"
                    value={plateNumber}
                    onChange={(e) => setPlateNumber(e.target.value)}
                    className="uppercase"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Payment Method</label>
                  <select 
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="w-full p-3 border rounded-lg"
                  >
                    <option value="wallet">Wallet Balance</option>
                    <option value="card">Credit/Debit Card</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Payment Summary */}
          {selectedTollGate && selectedVehicleClass && plateNumber && (
            <Card className="bg-blue-50 border-blue-200">
              <CardHeader>
                <CardTitle className="text-lg">Payment Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Toll Gate:</span>
                    <span className="font-medium">{selectedTollGate.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Vehicle Class:</span>
                    <span className="font-medium">{selectedVehicleClass}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Plate Number:</span>
                    <span className="font-medium">{plateNumber.toUpperCase()}</span>
                  </div>
                  <div className="flex justify-between text-lg font-bold border-t pt-2">
                    <span>Total Amount:</span>
                    <span>₦{getSelectedVehiclePrice().toLocaleString()}</span>
                  </div>
                </div>

                <Button
                  onClick={handleTollPayment}
                  disabled={isLoading}
                  className="w-full mt-4 bg-[#4682b4] hover:bg-[#0b1a51]"
                >
                  {isLoading ? (
                    <div className="flex items-center">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Processing...
                    </div>
                  ) : (
                    <div className="flex items-center">
                      <CreditCard className="h-4 w-4 mr-2" />
                      Pay ₦{getSelectedVehiclePrice().toLocaleString()}
                    </div>
                  )}
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Quick Actions */}
          <div className="space-y-3">
            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={() => setLocation('/qr-scanner?type=toll')}
            >
              <QrCode className="h-4 w-4 mr-2" />
              Scan Toll Gate QR
            </Button>
            
            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={() => setLocation('/wallet/transactions')}
            >
              <Clock className="h-4 w-4 mr-2" />
              View Payment History
            </Button>
          </div>
        </div>

        <NotificationModal
          isOpen={modalData.isOpen}
          onClose={() => setModalData(prev => ({ ...prev, isOpen: false }))}
          type={modalData.type}
          title={modalData.title}
          message={modalData.message}
        />
      </div>
    </div>
  );
}
