import { useState, useRef, useEffect } from "react";
import { Camera, ArrowLeft, Check, X, Flashlight, FlashlightOff, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useLocation } from "wouter";
import { NotificationModal } from "@/components/ui/notification-modal";

// Import QR scanner assets
import qrScannerFrame from "../assets/images/qr_scanner_frame.svg";
import successIcon from "../assets/images/congratulations_icon.png";
import errorIcon from "../assets/images/confirmation_fail_img.png";

export default function QRScanner() {
  const [, setLocation] = useLocation();
  const [isScanning, setIsScanning] = useState(false);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [flashlightOn, setFlashlightOn] = useState(false);
  const [facingMode, setFacingMode] = useState<"user" | "environment">("environment");
  const [scanResult, setScanResult] = useState<{
    type: "delivery" | "payment" | "merchant";
    data: any;
  } | null>(null);
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

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    return () => {
      // Cleanup camera stream when component unmounts
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const startCamera = async () => {
    try {
      const constraints = {
        video: {
          facingMode: facingMode,
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      
      setIsScanning(true);
      setHasPermission(true);
      
      // Enable flashlight if available and requested
      if (flashlightOn) {
        const track = stream.getVideoTracks()[0];
        if (track.getCapabilities && track.getCapabilities().torch) {
          await track.applyConstraints({
            advanced: [{ torch: true } as any]
          });
        }
      }
    } catch (error) {
      console.error("Camera access error:", error);
      setHasPermission(false);
      setModalData({
        isOpen: true,
        type: "error",
        title: "Camera Access Denied",
        message: "Please allow camera access to scan QR codes. Check your browser settings and try again."
      });
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsScanning(false);
  };

  const toggleFlashlight = async () => {
    if (streamRef.current) {
      const track = streamRef.current.getVideoTracks()[0];
      if (track.getCapabilities && track.getCapabilities().torch) {
        try {
          await track.applyConstraints({
            advanced: [{ torch: !flashlightOn } as any]
          });
          setFlashlightOn(!flashlightOn);
        } catch (error) {
          console.error("Flashlight toggle error:", error);
        }
      }
    }
  };

  const switchCamera = () => {
    stopCamera();
    setFacingMode(facingMode === "user" ? "environment" : "user");
    setTimeout(() => startCamera(), 100);
  };

  const simulateQRScan = (type: "delivery" | "payment" | "merchant") => {
    // Simulate different QR code types for demo purposes
    const mockResults = {
      delivery: {
        orderId: "BP12345",
        driverName: "James Adebayo",
        deliveryTime: new Date().toLocaleString(),
        items: ["20L Fuel", "Engine Oil"],
        totalAmount: "₦15,000"
      },
      payment: {
        merchantName: "Lagos Fuel Station",
        merchantId: "MER789",
        amount: "₦8,500",
        reference: "PAY" + Date.now()
      },
      merchant: {
        businessName: "Premium Gas Station",
        address: "123 Victoria Island, Lagos",
        phone: "+234 901 234 5678",
        services: ["Fuel", "Car Wash", "Convenience Store"]
      }
    };

    setScanResult({
      type,
      data: mockResults[type]
    });

    setModalData({
      isOpen: true,
      type: "success",
      title: "QR Code Scanned Successfully",
      message: `${type.charAt(0).toUpperCase() + type.slice(1)} information detected. Please review the details below.`
    });

    stopCamera();
  };

  const confirmDelivery = () => {
    setModalData({
      isOpen: true,
      type: "success",
      title: "Delivery Confirmed",
      message: "Your delivery has been confirmed successfully. Thank you for using Brillprime!"
    });
    setScanResult(null);
  };

  const processPayment = () => {
    setModalData({
      isOpen: true,
      type: "success",
      title: "Payment Processing",
      message: "Redirecting to payment confirmation. Please wait..."
    });
    setTimeout(() => {
      setLocation("/payment-methods");
    }, 2000);
  };

  const saveContact = () => {
    setModalData({
      isOpen: true,
      type: "success",
      title: "Contact Saved",
      message: "Merchant contact information has been saved to your favorites."
    });
    setScanResult(null);
  };

  if (scanResult) {
    return (
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white shadow-sm border-b border-blue-100/50 animate-fade-in">
          <div className="flex items-center justify-between p-4">
            <div className="flex items-center space-x-3">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setScanResult(null)}
                className="transition-all duration-300 hover:scale-110"
              >
                <ArrowLeft className="w-5 h-5 text-[#131313]" />
              </Button>
              <div className="animate-slide-up">
                <h1 className="text-lg font-semibold text-[#131313]">Scan Result</h1>
                <p className="text-sm text-gray-600">Review and confirm details</p>
              </div>
            </div>
          </div>
        </div>

        <div className="p-4 space-y-4">
          {/* Delivery Confirmation */}
          {scanResult.type === "delivery" && (
            <Card className="rounded-3xl border-2 border-blue-100/50 bg-white animate-fade-in-up">
              <CardContent className="p-6">
                <div className="text-center mb-6">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Check className="w-8 h-8 text-green-600" />
                  </div>
                  <h2 className="text-xl font-semibold text-[#131313] mb-2">Delivery Verification</h2>
                  <Badge className="bg-green-100 text-green-800">Order #{scanResult.data.orderId}</Badge>
                </div>

                <div className="space-y-4">
                  <div className="flex justify-between items-center py-2 border-b border-gray-100">
                    <span className="text-gray-600">Driver</span>
                    <span className="font-medium text-[#131313]">{scanResult.data.driverName}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-gray-100">
                    <span className="text-gray-600">Delivery Time</span>
                    <span className="font-medium text-[#131313]">{scanResult.data.deliveryTime}</span>
                  </div>
                  <div className="py-2 border-b border-gray-100">
                    <span className="text-gray-600 block mb-2">Items Delivered</span>
                    {scanResult.data.items.map((item: string, index: number) => (
                      <div key={index} className="flex items-center space-x-2 mb-1">
                        <Check className="w-4 h-4 text-green-600" />
                        <span className="font-medium text-[#131313]">{item}</span>
                      </div>
                    ))}
                  </div>
                  <div className="flex justify-between items-center py-2">
                    <span className="text-gray-600">Total Amount</span>
                    <span className="font-bold text-[#4682b4] text-lg">{scanResult.data.totalAmount}</span>
                  </div>
                </div>

                <Button
                  onClick={confirmDelivery}
                  className="w-full mt-6 bg-[#4682b4] hover:bg-[#0b1a51] text-white rounded-2xl transition-colors duration-300"
                >
                  Confirm Delivery
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Payment Processing */}
          {scanResult.type === "payment" && (
            <Card className="rounded-3xl border-2 border-blue-100/50 bg-white animate-fade-in-up">
              <CardContent className="p-6">
                <div className="text-center mb-6">
                  <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Camera className="w-8 h-8 text-blue-600" />
                  </div>
                  <h2 className="text-xl font-semibold text-[#131313] mb-2">Payment Request</h2>
                  <Badge className="bg-blue-100 text-blue-800">Merchant Payment</Badge>
                </div>

                <div className="space-y-4">
                  <div className="flex justify-between items-center py-2 border-b border-gray-100">
                    <span className="text-gray-600">Merchant</span>
                    <span className="font-medium text-[#131313]">{scanResult.data.merchantName}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-gray-100">
                    <span className="text-gray-600">Merchant ID</span>
                    <span className="font-medium text-[#131313]">{scanResult.data.merchantId}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-gray-100">
                    <span className="text-gray-600">Reference</span>
                    <span className="font-medium text-[#131313]">{scanResult.data.reference}</span>
                  </div>
                  <div className="flex justify-between items-center py-2">
                    <span className="text-gray-600">Amount</span>
                    <span className="font-bold text-[#4682b4] text-xl">{scanResult.data.amount}</span>
                  </div>
                </div>

                <Button
                  onClick={processPayment}
                  className="w-full mt-6 bg-[#4682b4] hover:bg-[#0b1a51] text-white rounded-2xl transition-colors duration-300"
                >
                  Proceed to Payment
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Merchant Information */}
          {scanResult.type === "merchant" && (
            <Card className="rounded-3xl border-2 border-blue-100/50 bg-white animate-fade-in-up">
              <CardContent className="p-6">
                <div className="text-center mb-6">
                  <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Camera className="w-8 h-8 text-purple-600" />
                  </div>
                  <h2 className="text-xl font-semibold text-[#131313] mb-2">Merchant Information</h2>
                  <Badge className="bg-purple-100 text-purple-800">Business Contact</Badge>
                </div>

                <div className="space-y-4">
                  <div className="flex justify-between items-center py-2 border-b border-gray-100">
                    <span className="text-gray-600">Business Name</span>
                    <span className="font-medium text-[#131313]">{scanResult.data.businessName}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-gray-100">
                    <span className="text-gray-600">Address</span>
                    <span className="font-medium text-[#131313] text-right">{scanResult.data.address}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-gray-100">
                    <span className="text-gray-600">Phone</span>
                    <span className="font-medium text-[#131313]">{scanResult.data.phone}</span>
                  </div>
                  <div className="py-2">
                    <span className="text-gray-600 block mb-2">Services</span>
                    <div className="flex flex-wrap gap-2">
                      {scanResult.data.services.map((service: string, index: number) => (
                        <Badge key={index} variant="secondary" className="rounded-2xl">
                          {service}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>

                <Button
                  onClick={saveContact}
                  className="w-full mt-6 bg-[#4682b4] hover:bg-[#0b1a51] text-white rounded-2xl transition-colors duration-300"
                >
                  Save Contact
                </Button>
              </CardContent>
            </Card>
          )}
        </div>

        <NotificationModal
          isOpen={modalData.isOpen}
          onClose={() => setModalData(prev => ({ ...prev, isOpen: false }))}
          type={modalData.type}
          title={modalData.title}
          message={modalData.message}
          imageSrc={modalData.type === "success" ? successIcon : errorIcon}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-blue-100/50 animate-fade-in">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center space-x-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setLocation("/consumer-home")}
              className="transition-all duration-300 hover:scale-110"
            >
              <ArrowLeft className="w-5 h-5 text-[#131313]" />
            </Button>
            <div className="animate-slide-up">
              <h1 className="text-lg font-semibold text-[#131313]">QR Scanner</h1>
              <p className="text-sm text-gray-600">
                {isScanning ? "Point camera at QR code" : "Scan QR codes for payments & deliveries"}
              </p>
            </div>
          </div>
          {isScanning && (
            <div className="flex items-center space-x-2 animate-slide-in-right">
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleFlashlight}
                className="transition-all duration-300 hover:scale-110"
              >
                {flashlightOn ? <FlashlightOff className="w-5 h-5" /> : <Flashlight className="w-5 h-5" />}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={switchCamera}
                className="transition-all duration-300 hover:scale-110"
              >
                <RotateCcw className="w-5 h-5" />
              </Button>
            </div>
          )}
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Camera View */}
        <Card className="rounded-3xl border-2 border-blue-100/50 bg-white overflow-hidden animate-fade-in-up">
          <CardContent className="p-0">
            <div className="relative bg-black aspect-[4/3]">
              {isScanning ? (
                <>
                  <video
                    ref={videoRef}
                    className="w-full h-full object-cover"
                    playsInline
                    muted
                  />
                  {/* QR Scanner Overlay */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="relative">
                      <div className="w-64 h-64 border-4 border-white/30 rounded-3xl"></div>
                      <div className="absolute inset-0 w-64 h-64">
                        {/* Corner indicators */}
                        <div className="absolute top-0 left-0 w-8 h-8 border-l-4 border-t-4 border-[#4682b4] rounded-tl-lg"></div>
                        <div className="absolute top-0 right-0 w-8 h-8 border-r-4 border-t-4 border-[#4682b4] rounded-tr-lg"></div>
                        <div className="absolute bottom-0 left-0 w-8 h-8 border-l-4 border-b-4 border-[#4682b4] rounded-bl-lg"></div>
                        <div className="absolute bottom-0 right-0 w-8 h-8 border-r-4 border-b-4 border-[#4682b4] rounded-br-lg"></div>
                      </div>
                      {/* Scanning line animation */}
                      <div className="absolute inset-0 w-64 h-64 overflow-hidden rounded-3xl">
                        <div className="w-full h-0.5 bg-[#4682b4] animate-pulse absolute top-1/2 transform -translate-y-1/2"></div>
                      </div>
                    </div>
                  </div>
                  <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2">
                    <p className="text-white text-sm bg-black/50 px-3 py-1 rounded-2xl">
                      Align QR code within the frame
                    </p>
                  </div>
                </>
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <div className="text-center text-white">
                    <Camera className="w-16 h-16 mx-auto mb-4 opacity-50" />
                    <h3 className="text-lg font-medium mb-2">Camera Ready</h3>
                    <p className="text-sm opacity-75">Tap start to begin scanning</p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Control Buttons */}
        <div className="grid grid-cols-1 gap-3">
          {!isScanning ? (
            <Button
              onClick={startCamera}
              disabled={hasPermission === false}
              className="h-14 bg-[#4682b4] hover:bg-[#0b1a51] text-white rounded-3xl transition-colors duration-300 animate-fade-in-up"
            >
              <Camera className="w-6 h-6 mr-3" />
              Start Camera
            </Button>
          ) : (
            <Button
              onClick={stopCamera}
              variant="outline"
              className="h-14 border-2 border-red-200 text-red-600 hover:bg-red-50 rounded-3xl transition-all duration-300 hover:scale-105 animate-fade-in-up"
            >
              <X className="w-6 h-6 mr-3" />
              Stop Scanning
            </Button>
          )}
        </div>

        {/* Quick Test Buttons for Demo */}
        <Card className="rounded-3xl border-2 border-blue-100/50 bg-white animate-fade-in-up">
          <CardContent className="p-4">
            <h3 className="font-medium text-[#131313] mb-3">Test QR Code Types</h3>
            <div className="grid grid-cols-1 gap-2">
              <Button
                variant="outline"
                onClick={() => simulateQRScan("delivery")}
                className="justify-start border-2 border-green-200 text-green-700 hover:bg-green-50 rounded-2xl transition-all duration-300 hover:scale-105"
              >
                <Check className="w-4 h-4 mr-2" />
                Delivery Confirmation
              </Button>
              <Button
                variant="outline"
                onClick={() => simulateQRScan("payment")}
                className="justify-start border-2 border-blue-200 text-blue-700 hover:bg-blue-50 rounded-2xl transition-all duration-300 hover:scale-105"
              >
                <Camera className="w-4 h-4 mr-2" />
                Payment QR Code
              </Button>
              <Button
                variant="outline"
                onClick={() => simulateQRScan("merchant")}
                className="justify-start border-2 border-purple-200 text-purple-700 hover:bg-purple-50 rounded-2xl transition-all duration-300 hover:scale-105"
              >
                <Camera className="w-4 h-4 mr-2" />
                Merchant Contact
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <NotificationModal
        isOpen={modalData.isOpen}
        onClose={() => setModalData(prev => ({ ...prev, isOpen: false }))}
        type={modalData.type}
        title={modalData.title}
        message={modalData.message}
        imageSrc={modalData.type === "success" ? successIcon : errorIcon}
      />
    </div>
  );
}