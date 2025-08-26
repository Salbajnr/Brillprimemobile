import { useState, useRef, useEffect, useCallback } from "react";
import { Camera, ArrowLeft, Check, X, Flashlight, FlashlightOff, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useLocation } from "wouter";
import { NotificationModal } from "@/components/ui/notification-modal";
import { toast } from "@/hooks/use-toast"; // Assuming toast is available here

// Import QR scanner assets
import qrScannerFrame from "../assets/images/qr_scanner_frame.svg";
import successIcon from "../assets/images/congratulations_icon.png";
import errorIcon from "../assets/images/confirmation_fail_img.png";

// Define COLORS if they are used elsewhere and not imported
const COLORS = {
  PRIMARY: "#4682b4", // Example primary color, adjust if needed
};

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
  const [isLoading, setIsLoading] = useState(false); // Assuming isLoading is used for API calls

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null); // Added canvasRef
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    // Request camera permission on mount
    const getCameraPermission = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        setHasPermission(true);
        stream.getTracks().forEach(track => track.stop()); // Stop the stream immediately after checking permission
      } catch (err) {
        console.error("Camera permission error:", err);
        setHasPermission(false);
        setModalData({
          isOpen: true,
          type: "error",
          title: "Camera Permission Denied",
          message: "Please grant camera access in your browser settings to use the QR scanner."
        });
      }
    };
    getCameraPermission();

    return () => {
      // Cleanup camera stream when component unmounts
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  // Real QR code scanning with camera
  const startCameraScanning = useCallback(async () => {
    if (hasPermission === false) {
      toast({
        title: "Camera Access Required",
        description: "Please grant camera permissions to scan.",
        variant: "destructive"
      });
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment',
          width: { ideal: 640 },
          height: { ideal: 480 }
        }
      });
      streamRef.current = stream; // Store stream in ref

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setIsScanning(true);

        // Start QR detection
        const interval = setInterval(() => {
          if (videoRef.current && canvasRef.current) {
            const canvas = canvasRef.current;
            const video = videoRef.current;
            const context = canvas.getContext('2d');

            if (context) {
              canvas.width = video.videoWidth;
              canvas.height = video.videoHeight;
              context.drawImage(video, 0, 0, canvas.width, canvas.height);

              // In a real application, you would use a library like jsQR here
              // to decode the QR code from the canvas imageData.
              // For now, we simulate a successful scan after a delay.
              if (video.videoWidth > 0) { // Check if video is playing
                // Simulate detecting a QR code after 3 seconds of scanning
                setTimeout(() => {
                  const mockQRData = generateMockQRData();
                  setScanResult(mockQRData);
                  stopScanning();
                  clearInterval(interval);
                }, 3000);
              }
            }
          }
        }, 100); // Check every 100ms

        // Return cleanup function for the interval
        return () => {
          clearInterval(interval);
        };
      }
    } catch (error) {
      console.error('Camera access error:', error);
      toast({
        title: "Camera Error",
        description: "Unable to access camera. Please check permissions.",
        variant: "destructive"
      });
      stopScanning(); // Ensure scanning is stopped on error
    }
  }, [hasPermission, toast]); // Add dependencies for useCallback

  const stopScanning = useCallback(() => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    setIsScanning(false);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  }, []);

  const generateMockQRData = () => {
    const qrTypes = ["delivery", "payment", "merchant"]; // Match original types
    const randomType = qrTypes[Math.floor(Math.random() * qrTypes.length)];

    switch (randomType) {
      case "delivery":
        return {
          type: "delivery",
          data: {
            orderId: "ORDER_" + Math.random().toString(36).substr(2, 9),
            driverName: "Driver " + Math.random().toString(36).substr(2, 5),
            deliveryTime: new Date().toLocaleTimeString(),
            items: ["Item A", "Item B"],
            totalAmount: `$${(Math.random() * 100).toFixed(2)}`
          }
        };

      case "payment":
        return {
          type: "payment",
          data: {
            merchantName: "Brill Prime Merchant " + Math.floor(Math.random() * 100),
            merchantId: "MERCHANT_" + Math.random().toString(36).substr(2, 9),
            reference: "PAY_" + Date.now(),
            amount: `$${(Math.random() * 5000).toFixed(2)}`
          }
        };

      case "merchant":
        return {
          type: "merchant",
          data: {
            businessName: "Brill Prime Service",
            address: "123 Main St, Lagos",
            phone: "+234 " + Math.floor(Math.random() * 900000000 + 100000000),
            services: ["Delivery", "Payment", "Support"]
          }
        };

      default:
        return { type: "UNKNOWN", data: "Sample QR data" };
    }
  };

  // Simulate QR code scanning for demo purposes (fallback)
  const simulateQRScan = (type: "delivery" | "payment" | "merchant") => {
    setIsScanning(true);

    setTimeout(() => {
      const mockData = generateMockQRData();
      setScanResult(mockData);
      setIsScanning(false);
    }, 2000);
  };


  const startCamera = async () => {
    if (hasPermission === false) {
      toast({
        title: "Camera Access Required",
        description: "Please grant camera permissions to scan.",
        variant: "destructive"
      });
      return;
    }
    try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: "environment",
            width: { ideal: 1280 },
            height: { ideal: 720 }
          }
        });
        streamRef.current = stream; // Store stream in ref

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.onloadedmetadata = () => {
            videoRef.current?.play();
            setIsScanning(true);
          };
        }
      } catch (error) {
        console.error('Error accessing camera:', error);
        toast({
          title: "Camera Error",
          description: "Unable to access camera. Please check permissions.",
          variant: "destructive"
        });
        setHasPermission(false); // Assume permission denied if getUserMedia fails
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
      // Check if the device supports torch mode
      if (track.getCapabilities && track.getCapabilities().torch) {
        try {
          await track.applyConstraints({
            advanced: [{ torch: !flashlightOn } as any] // Use `torch` for flashlight control
          });
          setFlashlightOn(!flashlightOn);
        } catch (error) {
          console.error("Flashlight toggle error:", error);
          toast({
            title: "Flashlight Error",
            description: "Could not toggle flashlight.",
            variant: "destructive"
          });
        }
      } else {
        toast({
          title: "Flashlight Not Supported",
          description: "Your device does not support flashlight control.",
          variant: "info"
        });
      }
    }
  };

  const switchCamera = () => {
    stopCamera(); // Stop the current camera stream
    const newFacingMode = facingMode === "user" ? "environment" : "user";
    setFacingMode(newFacingMode);

    // Re-request camera with the new facing mode after a short delay
    setTimeout(async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: newFacingMode,
            width: { ideal: 1280 },
            height: { ideal: 720 }
          }
        });
        streamRef.current = stream; // Store new stream
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
          setIsScanning(true); // Ensure scanning state is true
        }
      } catch (error) {
        console.error('Error switching camera:', error);
        toast({
          title: "Camera Switch Error",
          description: "Could not switch camera. Please try again.",
          variant: "destructive"
        });
        stopCamera(); // Stop if switching fails
      }
    }, 100); // Small delay to allow previous stream to release
  };


  const simulateQRScanAPI = async (type: "delivery" | "payment" | "merchant") => {
    try {
      setIsLoading(true);

      // Generate a realistic QR code for testing
      const qrCode = `${type.toUpperCase()}_${Date.now()}`;

      const response = await fetch('/api/qr/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ qrCode, type })
      });

      if (!response.ok) {
        throw new Error('Failed to process QR code');
      }

      const result = await response.json();

      setScanResult({
        type,
        data: result.data
      });

      setModalData({
        isOpen: true,
        type: "success",
        title: "QR Code Scanned Successfully",
        message: `${type.charAt(0).toUpperCase() + type.slice(1)} information detected. Please review the details below.`
      });

      stopCamera();
    } catch (error) {
      setModalData({
        isOpen: true,
        type: "error",
        title: "QR Code Scan Failed",
        message: "Unable to process the QR code. Please try again."
      });
    } finally {
      setIsLoading(false);
    }
  };

  const confirmDelivery = async () => {
    if (!scanResult || scanResult.type !== 'delivery') return;

    try {
      // Call API to verify and confirm delivery
      const response = await fetch('/api/qr/verify-delivery', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // Assuming cookies are needed for auth
        body: JSON.stringify({
          orderId: scanResult.data.orderId,
          qrCode: `DELIVERY_${scanResult.data.orderId}_${Date.now()}`,
          driverConfirmed: true
        })
      });

      const result = await response.json();

      if (result.success) {
        setModalData({
          isOpen: true,
          type: "success",
          title: "Delivery Confirmed ✅",
          message: "Your delivery has been verified and confirmed successfully. Payment has been processed. Thank you for using Brill Prime!"
        });

        // Navigate to order history after a delay
        setTimeout(() => {
          setLocation("/order-history");
        }, 3000);
      } else {
        setModalData({
          isOpen: true,
          type: "error",
          title: "Verification Failed",
          message: result.message || "Unable to verify delivery. Please try again or contact support."
        });
      }
    } catch (error) {
      console.error('Delivery verification error:', error);
      setModalData({
        isOpen: true,
        type: "error",
        title: "Connection Error",
        message: "Unable to connect to verification service. Please check your internet connection."
      });
    }

    setScanResult(null); // Clear scan result after confirmation attempt
  };

  const processPayment = () => {
    setModalData({
      isOpen: true,
      type: "success",
      title: "Payment Processing",
      message: "Redirecting to payment confirmation. Please wait..."
    });
    // Simulate navigation to payment processing
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
    setScanResult(null); // Clear scan result after action
  };

  // Handler for the main start/stop scanning button
  const handleScanButtonClick = () => {
    if (isScanning) {
      stopScanning();
    } else {
      startCameraScanning();
    }
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

  // Main scanner UI when no scan result is active
  return (
    <div className="min-h-screen bg-gray-50 w-full max-w-sm sm:max-w-md md:max-w-lg lg:max-w-xl xl:max-w-2xl mx-auto px-2 sm:px-4">{/*Responsive container*/}
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
            {/* Updated camera view to use the video element and canvas */}
            <div className="relative w-full bg-black aspect-video">
              {isScanning ? (
                <>
                  <video
                    ref={videoRef}
                    className="w-full h-full object-cover"
                    playsInline
                    muted
                    autoPlay
                  />
                  <canvas
                    ref={canvasRef}
                    className="absolute inset-0 w-full h-full pointer-events-none" // Canvas overlay
                  />
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="relative">
                      {/* Corner indicators */}
                      <div className="absolute top-0 left-0 w-8 h-8 border-l-4 border-t-4 border-[#4682b4] rounded-tl-lg"></div>
                      <div className="absolute top-0 right-0 w-8 h-8 border-r-4 border-t-4 border-[#4682b4] rounded-tr-lg"></div>
                      <div className="absolute bottom-0 left-0 w-8 h-8 border-l-4 border-b-4 border-[#4682b4] rounded-bl-lg"></div>
                      <div className="absolute bottom-0 right-0 w-8 h-8 border-r-4 border-b-4 border-[#4682b4] rounded-br-lg"></div>
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
          <Button
            onClick={handleScanButtonClick} // Use the combined handler
            disabled={hasPermission === false && !isScanning} // Disable if permission denied and not already scanning
            className="w-full py-4 rounded-3xl text-lg font-semibold transition-all duration-300 hover:scale-105"
            style={{ backgroundColor: COLORS.PRIMARY }}
          >
            {isScanning ? (
              <>
                <X className="w-5 h-5 mr-2" />
                Stop Scanning
              </>
            ) : (
              <>
                <Camera className="w-5 h-5 mr-2" />
                Start QR Scanner
              </>
            )}
          </Button>
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