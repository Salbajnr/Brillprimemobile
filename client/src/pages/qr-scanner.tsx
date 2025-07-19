import { useState, useRef, useEffect } from "react";
import { useLocation } from "wouter";
import { ArrowLeft, Camera, Flashlight, RotateCcw, Scan } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface ScannedData {
  type: "payment" | "merchant" | "user" | "unknown";
  data: any;
  timestamp: Date;
}

export default function QRScanner() {
  const [, setLocation] = useLocation();
  const [isScanning, setIsScanning] = useState(false);
  const [scannedResult, setScannedResult] = useState<ScannedData | null>(null);
  const [flashEnabled, setFlashEnabled] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const startCamera = async () => {
    try {
      setError(null);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "environment", // Use back camera
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        setIsScanning(true);
      }
    } catch (err) {
      setError("Camera access denied. Please enable camera permissions.");
      console.error("Camera error:", err);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsScanning(false);
  };

  const toggleFlash = async () => {
    if (streamRef.current) {
      const track = streamRef.current.getVideoTracks()[0];
      const capabilities = track.getCapabilities();
      
      if (capabilities.torch) {
        try {
          await track.applyConstraints({
            advanced: [{ torch: !flashEnabled }]
          });
          setFlashEnabled(!flashEnabled);
        } catch (err) {
          console.error("Flash toggle failed:", err);
        }
      }
    }
  };

  // Mock QR code processing - would integrate with real QR scanner library
  const processQRCode = (qrData: string) => {
    let result: ScannedData;
    
    try {
      // Try to parse as JSON for structured data
      const parsed = JSON.parse(qrData);
      
      if (parsed.type === "brillprime_payment") {
        result = {
          type: "payment",
          data: {
            merchantId: parsed.merchantId,
            merchantName: parsed.merchantName,
            amount: parsed.amount,
            currency: "NGN"
          },
          timestamp: new Date()
        };
      } else if (parsed.type === "brillprime_merchant") {
        result = {
          type: "merchant",
          data: {
            merchantId: parsed.merchantId,
            name: parsed.name,
            category: parsed.category,
            location: parsed.location
          },
          timestamp: new Date()
        };
      } else if (parsed.type === "brillprime_user") {
        result = {
          type: "user",
          data: {
            userId: parsed.userId,
            name: parsed.name,
            phone: parsed.phone
          },
          timestamp: new Date()
        };
      } else {
        result = {
          type: "unknown",
          data: { rawData: qrData },
          timestamp: new Date()
        };
      }
    } catch {
      // Not JSON, treat as plain text
      result = {
        type: "unknown",
        data: { rawData: qrData },
        timestamp: new Date()
      };
    }
    
    setScannedResult(result);
    stopCamera();
  };

  // Simulate QR code detection - would use real library like jsQR
  const simulateQRDetection = () => {
    // Mock QR code data for testing
    const mockQRData = JSON.stringify({
      type: "brillprime_payment",
      merchantId: "merchant_123",
      merchantName: "Total Energies Wuse II",
      amount: 25000,
      currency: "NGN"
    });
    
    processQRCode(mockQRData);
  };

  const handleAction = () => {
    if (!scannedResult) return;
    
    switch (scannedResult.type) {
      case "payment":
        setLocation(`/payment/confirm?merchant=${scannedResult.data.merchantId}&amount=${scannedResult.data.amount}`);
        break;
      case "merchant":
        setLocation(`/merchants/${scannedResult.data.merchantId}`);
        break;
      case "user":
        setLocation(`/transfer?user=${scannedResult.data.userId}`);
        break;
      default:
        // Handle unknown QR codes
        console.log("Unknown QR code:", scannedResult.data.rawData);
    }
  };

  const resetScanner = () => {
    setScannedResult(null);
    setError(null);
    startCamera();
  };

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0
    }).format(amount);
  };

  return (
    <div className="min-h-screen bg-black relative">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-10 bg-black/50 backdrop-blur-sm">
        <div className="flex items-center justify-between p-4 text-white">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setLocation("/consumer-home")}
            className="text-white hover:bg-white/20"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-lg font-semibold">Scan QR Code</h1>
          <div className="w-10" /> {/* Spacer */}
        </div>
      </div>

      {/* Camera View */}
      <div className="relative w-full h-screen">
        {isScanning ? (
          <>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              className="w-full h-full object-cover"
            />
            
            {/* Scanning Overlay */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="relative">
                {/* Scanning Frame */}
                <div className="w-64 h-64 border-2 border-white/50 relative">
                  <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-[#4682b4]"></div>
                  <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-[#4682b4]"></div>
                  <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-[#4682b4]"></div>
                  <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-[#4682b4]"></div>
                  
                  {/* Scanning Line Animation */}
                  <div className="absolute inset-0 overflow-hidden">
                    <div className="w-full h-0.5 bg-[#4682b4] animate-pulse absolute top-1/2 transform -translate-y-1/2"></div>
                  </div>
                </div>
                
                <p className="text-white text-center mt-4">
                  Position QR code within the frame
                </p>
              </div>
            </div>
          </>
        ) : (
          /* Camera Not Active */
          <div className="flex items-center justify-center h-full bg-gray-900">
            <div className="text-center text-white">
              <Camera className="w-16 h-16 mx-auto mb-4 text-gray-400" />
              <h2 className="text-xl font-semibold mb-2">Camera Not Active</h2>
              <p className="text-gray-300 mb-6">
                {error || "Tap the button below to start scanning"}
              </p>
              <Button
                onClick={startCamera}
                className="bg-[#4682b4] hover:bg-[#0b1a51]"
              >
                <Camera className="w-5 h-5 mr-2" />
                Start Camera
              </Button>
            </div>
          </div>
        )}

        {/* Controls */}
        {isScanning && (
          <div className="absolute bottom-20 left-0 right-0 flex justify-center space-x-6">
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleFlash}
              className={`w-14 h-14 rounded-full ${
                flashEnabled ? "bg-yellow-500 text-black" : "bg-white/20 text-white"
              }`}
            >
              <Flashlight className="w-6 h-6" />
            </Button>
            
            {/* Test Scan Button - Remove in production */}
            <Button
              onClick={simulateQRDetection}
              className="bg-[#4682b4] hover:bg-[#0b1a51] px-6"
            >
              <Scan className="w-5 h-5 mr-2" />
              Test Scan
            </Button>
          </div>
        )}

        {/* Scanned Result Modal */}
        {scannedResult && (
          <div className="absolute inset-0 bg-black/80 flex items-center justify-center p-4">
            <Card className="w-full max-w-md">
              <CardContent className="p-6">
                <div className="text-center mb-6">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Scan className="w-8 h-8 text-green-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-[#131313] mb-2">
                    QR Code Detected
                  </h3>
                  <Badge className={`${
                    scannedResult.type === "payment" ? "bg-blue-100 text-blue-800" :
                    scannedResult.type === "merchant" ? "bg-purple-100 text-purple-800" :
                    scannedResult.type === "user" ? "bg-green-100 text-green-800" :
                    "bg-gray-100 text-gray-800"
                  }`}>
                    {scannedResult.type.charAt(0).toUpperCase() + scannedResult.type.slice(1)}
                  </Badge>
                </div>

                {/* Display scanned data */}
                <div className="space-y-3 mb-6">
                  {scannedResult.type === "payment" && (
                    <>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Merchant:</span>
                        <span className="font-medium">{scannedResult.data.merchantName}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Amount:</span>
                        <span className="font-bold text-[#4682b4]">
                          {formatCurrency(scannedResult.data.amount)}
                        </span>
                      </div>
                    </>
                  )}
                  
                  {scannedResult.type === "merchant" && (
                    <>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Name:</span>
                        <span className="font-medium">{scannedResult.data.name}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Category:</span>
                        <span className="font-medium">{scannedResult.data.category}</span>
                      </div>
                    </>
                  )}
                  
                  {scannedResult.type === "user" && (
                    <>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Name:</span>
                        <span className="font-medium">{scannedResult.data.name}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Phone:</span>
                        <span className="font-medium">{scannedResult.data.phone}</span>
                      </div>
                    </>
                  )}
                  
                  {scannedResult.type === "unknown" && (
                    <div className="bg-gray-50 rounded-lg p-3">
                      <p className="text-sm text-gray-600 break-all">
                        {scannedResult.data.rawData}
                      </p>
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="flex space-x-3">
                  <Button
                    variant="outline"
                    onClick={resetScanner}
                    className="flex-1"
                  >
                    <RotateCcw className="w-4 h-4 mr-2" />
                    Scan Again
                  </Button>
                  
                  {scannedResult.type !== "unknown" && (
                    <Button
                      onClick={handleAction}
                      className="flex-1 bg-[#4682b4] hover:bg-[#0b1a51]"
                    >
                      {scannedResult.type === "payment" ? "Pay Now" :
                       scannedResult.type === "merchant" ? "View Shop" :
                       scannedResult.type === "user" ? "Send Money" : "Continue"}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}