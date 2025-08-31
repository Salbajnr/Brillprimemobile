import { useState } from "react";
import { useLocation } from "wouter";
import { ArrowLeft, MapPin, Car, Clock, CreditCard, Navigation, Ticket, CheckCircle, AlertCircle } from "lucide-react";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "../components/ui/dialog";

interface VehicleType {
  id: string;
  name: string;
  icon: string;
  description: string;
}

interface TollGate {
  id: string;
  name: string;
  location: string;
  highway: string;
  distance: number;
  pricePerVehicle: {
    car: number;
    suv: number;
    truck: number;
    motorcycle: number;
  };
  operatingHours: string;
  isOpen: boolean;
  estimatedTime: string;
  paymentMethods: string[];
  trafficStatus: 'light' | 'moderate' | 'heavy';
  queueTime: string;
}

interface TollTransaction {
  id: string;
  tollGateId: string;
  vehicleType: string;
  amount: number;
  timestamp: string;
  status: 'pending' | 'completed' | 'failed';
  qrCode: string;
  paymentMethod?: string;
  reference?: string;
}

export default function TollPayments() {
  const [, setLocation] = useLocation();
  const [selectedVehicle, setSelectedVehicle] = useState<string>("car");
  const [selectedTollGate, setSelectedTollGate] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTransactions, setActiveTransactions] = useState<TollTransaction[]>([
    {
      id: "TP-2024-0001",
      tollGateId: "lagos-ibadan-1",
      vehicleType: "car",
      amount: 600,
      timestamp: "2024-01-15 14:30",
      status: "completed",
      qrCode: "QR123456789"
    }
  ]);

  const vehicleTypes: VehicleType[] = [
    {
      id: "motorcycle",
      name: "Motorcycle", 
      icon: "🏍️",
      description: "2-wheeled vehicles"
    },
    {
      id: "car",
      name: "Car",
      icon: "🚗", 
      description: "Private cars & sedans"
    },
    {
      id: "suv",
      name: "SUV/Bus",
      icon: "🚙",
      description: "SUVs, vans & small buses"
    },
    {
      id: "truck",
      name: "Truck",
      icon: "🚛",
      description: "Heavy vehicles & trailers"
    }
  ];

  const [tollGatesData, setTollGatesData] = useState<TollGate[]>([
    {
      id: "lagos-ibadan-1",
      name: "Lagos-Ibadan Toll Plaza",
      location: "Km 20, Lagos-Ibadan Expressway",
      highway: "Lagos-Ibadan Expressway",
      distance: 18.5,
      pricePerVehicle: {
        motorcycle: 300,
        car: 600,
        suv: 1000,
        truck: 1500
      },
      operatingHours: "24 hours",
      isOpen: true,
      estimatedTime: "22 mins",
      paymentMethods: ["Cash", "Card", "Mobile"],
      trafficStatus: "moderate",
      queueTime: "5-10 mins"
    },
    {
      id: "abuja-kaduna-1",
      name: "Abuja-Kaduna Toll Gate",
      location: "Km 15, Abuja-Kaduna Highway",
      highway: "Abuja-Kaduna Highway", 
      distance: 28.2,
      pricePerVehicle: {
        motorcycle: 200,
        car: 400,
        suv: 700,
        truck: 1200
      },
      operatingHours: "24 hours",
      isOpen: true,
      estimatedTime: "35 mins",
      paymentMethods: ["Cash", "Card", "Mobile"],
      trafficStatus: "light",
      queueTime: "2-5 mins"
    },
    {
      id: "lekki-toll",
      name: "Lekki Toll Gate",
      location: "Lekki-Epe Expressway, Lagos",
      highway: "Lekki-Epe Expressway",
      distance: 12.1,
      pricePerVehicle: {
        motorcycle: 150,
        car: 300,
        suv: 500,
        truck: 800
      },
      operatingHours: "5:00 AM - 11:00 PM",
      isOpen: true,
      estimatedTime: "18 mins",
      paymentMethods: ["Card", "Mobile"],
      trafficStatus: "heavy",
      queueTime: "15-20 mins"
    },
    {
      id: "kara-bridge",
      name: "Kara Bridge Toll",
      location: "Kara, Lagos-Ibadan Expressway",
      highway: "Lagos-Ibadan Expressway",
      distance: 25.8,
      pricePerVehicle: {
        motorcycle: 250,
        car: 500,
        suv: 800,
        truck: 1300
      },
      operatingHours: "24 hours",
      isOpen: false,
      estimatedTime: "32 mins",
      paymentMethods: ["Cash", "Card"],
      trafficStatus: "light",
      queueTime: "N/A"
    }
  ]);

  const filteredTollGates = tollGatesData.filter(gate =>
    gate.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    gate.highway.toLowerCase().includes(searchQuery.toLowerCase()) ||
    gate.location.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const handleTollSelection = (tollGate: TollGate) => {
    setSelectedTollGate(tollGate);
  };

  const handlePurchase = async () => {
    if (selectedTollGate) {
      const amount = selectedTollGate?.pricePerVehicle[selectedVehicle as keyof TollGate['pricePerVehicle']];

      try {
        const response = await fetch('/api/toll/payment', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            tollGateId: selectedTollGate.id,
            vehicleType: selectedVehicle,
            amount: amount,
            paymentMethod: 'wallet'
          }),
          credentials: 'include'
        });

        if (response.ok) {
          const result = await response.json();
          if (result.success) {
            const newTransaction: TollTransaction = {
              id: result.transaction.id,
              tollGateId: selectedTollGate.id,
              vehicleType: selectedVehicle,
              amount: amount || 0,
              timestamp: new Date().toISOString(),
              status: 'completed',
              qrCode: result.qrCode,
              paymentMethod: 'wallet',
              reference: result.transaction.reference
            };

            setActiveTransactions(prev => [...prev, newTransaction]);
            setLocation(`/toll-payment-success?transactionId=${result.transaction.id}&qrCode=${result.qrCode}`);
          } else {
             setModalData({
              isOpen: true,
              type: "error",
              title: "Payment Failed",
              message: result.message || "An error occurred during payment processing."
            });
          }
        } else {
          console.error('Failed to process toll payment');
          setModalData({
            isOpen: true,
            type: "error",
            title: "Payment Error",
            message: "Server error. Please try again later."
          });
        }
      } catch (error) {
        console.error('Error processing toll payment:', error);
        setModalData({
          isOpen: true,
          type: "error",
          title: "Network Error",
          message: "Failed to connect. Check your internet connection."
        });
      }
    }
  };

  const getTrafficStatusColor = (status: string) => {
    switch (status) {
      case 'light': return 'text-green-600';
      case 'moderate': return 'text-yellow-600';
      case 'heavy': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getTrafficStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'light': return 'bg-green-100 text-green-800';
      case 'moderate': return 'bg-yellow-100 text-yellow-800';
      case 'heavy': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getTransactionStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'pending': return <Clock className="w-4 h-4 text-yellow-500" />;
      case 'failed': return <AlertCircle className="w-4 h-4 text-red-500" />;
      default: return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 w-full max-w-sm sm:max-w-md md:max-w-lg lg:max-w-xl xl:max-w-2xl mx-auto px-2 sm:px-4">
      <div className="bg-white shadow-sm border-b">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setLocation("/consumer-home")}
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-lg font-semibold text-[#131313]">Electronic Toll Payments</h1>
              <p className="text-sm text-gray-600">Pay toll fees in advance</p>
            </div>
          </div>
        </div>

        <div className="px-4 pb-4">
          <Input
            placeholder="Search toll gates or highways..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="border-[#4682b4]/30 focus:border-[#4682b4]"
          />
        </div>
      </div>

      <div className="p-4 space-y-6">
        {activeTransactions.length > 0 && (
          <Card>
            <CardContent className="p-4">
              <h3 className="font-semibold text-[#131313] mb-3">Recent Transactions</h3>
              <div className="space-y-3">
                {activeTransactions.slice(0, 3).map((transaction) => {
                  const gate = tollGatesData.find(g => g.id === transaction.tollGateId);
                  return (
                    <div key={transaction.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center space-x-3">
                        {getTransactionStatusIcon(transaction.status)}
                        <div>
                          <p className="font-medium text-sm">{gate?.name}</p>
                          <p className="text-xs text-gray-600">{transaction.timestamp}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-medium text-sm">{formatCurrency(transaction.amount)}</p>
                        <Badge variant="secondary" className={`text-xs ${
                          transaction.status === 'completed' ? 'bg-green-100 text-green-800' :
                          transaction.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {transaction.status}
                        </Badge>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardContent className="p-4">
            <Label className="text-sm font-medium text-[#131313] mb-3 block">Select Vehicle Type</Label>
            <div className="grid grid-cols-2 gap-3">
              {vehicleTypes.map((vehicle) => (
                <button
                  key={vehicle.id}
                  onClick={() => setSelectedVehicle(vehicle.id)}
                  className={`p-3 rounded-lg border text-left transition-colors ${
                    selectedVehicle === vehicle.id
                      ? "border-[#4682b4] bg-[#4682b4]/5"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <div className="flex items-center space-x-2 mb-1">
                    <span className="text-lg">{vehicle.icon}</span>
                    <span className="font-medium text-sm">{vehicle.name}</span>
                  </div>
                  <p className="text-xs text-gray-600">{vehicle.description}</p>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <h2 className="font-semibold text-[#131313]">Available Toll Gates</h2>

          {filteredTollGates.map((gate) => (
            <Card
              key={gate.id}
              className={`cursor-pointer transition-all hover:shadow-md ${
                selectedTollGate?.id === gate.id ? "ring-2 ring-[#4682b4] ring-opacity-50" : ""
              } ${!gate.isOpen ? "opacity-60" : ""}`}
              onClick={() => gate.isOpen && handleTollSelection(gate)}
            >
              <CardContent className="p-4">
                <div className="space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-semibold text-[#131313] mb-1">{gate.name}</h3>
                      <p className="text-sm text-gray-600 mb-2">{gate.location}</p>
                      <div className="flex items-center space-x-4 text-sm text-gray-500">
                        <div className="flex items-center space-x-1">
                          <MapPin className="w-3 h-3" />
                          <span>{gate.distance} km away</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Clock className="w-3 h-3" />
                          <span>{gate.estimatedTime}</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge variant={gate.isOpen ? "default" : "secondary"}>
                        {gate.isOpen ? "Open" : "Closed"}
                      </Badge>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Badge className={getTrafficStatusBadgeClass(gate.trafficStatus)}>
                        {gate.trafficStatus} traffic
                      </Badge>
                      <span className="text-sm text-gray-600">Queue: {gate.queueTime}</span>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-[#4682b4]">
                        {formatCurrency(gate.pricePerVehicle[selectedVehicle as keyof TollGate['pricePerVehicle']])}
                      </p>
                      <p className="text-sm text-gray-600">{gate.operatingHours}</p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-gray-600">Payment:</span>
                    {gate.paymentMethods.map((method) => (
                      <Badge key={method} variant="outline" className="text-xs">
                        {method}
                      </Badge>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {selectedTollGate && (
          <Card className="border-[#4682b4]">
            <CardContent className="p-6">
              <h3 className="font-semibold text-[#131313] mb-4">Purchase Summary</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Toll Gate:</span>
                  <span className="font-medium">{selectedTollGate?.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Vehicle Type:</span>
                  <span className="font-medium">
                    {vehicleTypes.find(v => v.id === selectedVehicle)?.name}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Distance:</span>
                  <span className="font-medium">{selectedTollGate?.distance} km</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Current Traffic:</span>
                  <Badge className={getTrafficStatusBadgeClass(selectedTollGate?.trafficStatus || 'light')}>
                    {selectedTollGate?.trafficStatus} traffic
                  </Badge>
                </div>
                <hr />
                <div className="flex justify-between font-semibold text-lg">
                  <span>Total Amount:</span>
                  <span className="text-[#4682b4]">
                    {selectedTollGate && formatCurrency(
                      selectedTollGate!.pricePerVehicle[selectedVehicle as keyof TollGate['pricePerVehicle']]
                    )}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {filteredTollGates.length === 0 && (
          <div className="text-center py-12">
            <Car className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No toll gates found</h3>
            <p className="text-gray-500">Try adjusting your search or check back later</p>
          </div>
        )}
      </div>

      {selectedTollGate && (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t">
          <Button
            className="w-full h-12 bg-[#4682b4] hover:bg-[#0b1a51]"
            onClick={handlePurchase}
          >
            <Ticket className="w-5 h-5 mr-2" />
            Purchase Toll Pass
          </Button>
        </div>
      )}

      <Dialog open={modalData.isOpen} onOpenChange={(open) => setModalData({ ...modalData, isOpen: open })}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {modalData.type === "success" ? (
                <div className="flex items-center text-green-600">
                  <CheckCircle className="w-6 h-6 mr-2" /> {modalData.title}
                </div>
              ) : (
                <div className="flex items-center text-red-600">
                  <AlertCircle className="w-6 h-6 mr-2" /> {modalData.title}
                </div>
              )}
            </DialogTitle>
          </DialogHeader>
          <DialogDescription>{modalData.message}</DialogDescription>
        </DialogContent>
      </Dialog>
    </div>
  );
}