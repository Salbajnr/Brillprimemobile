import React, { useState, useRef, useEffect } from 'react';
import { Camera, QrCode, Scan, CheckCircle, XCircle, Clock } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface QRReceiptScannerProps {
  onScanResult?: (result: any) => void;
  className?: string;
}

interface ScanResult {
  success: boolean;
  receipt?: {
    receiptNumber: string;
    amount: string;
    currency: string;
    paymentMethod: string;
    serviceType: string;
    consumer: {
      name: string;
      email: string;
    };
    createdAt: string;
  };
  scanner?: {
    name: string;
    role: string;
  };
  error?: string;
}

export function QRReceiptScanner({ onScanResult, className = "" }: QRReceiptScannerProps) {
  const [isScanning, setIsScanning] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [manualInput, setManualInput] = useState('');
  const [showManualInput, setShowManualInput] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const { toast } = useToast();

  // Start camera for QR scanning
  const startCamera = async () => {
    try {
      setIsLoading(true);
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: 'environment',
          width: { ideal: 1280 },
          height: { ideal: 720 }
        } 
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        setIsScanning(true);
      }
    } catch (error) {
      console.error('Camera access error:', error);
      toast({
        title: "Camera Access Failed",
        description: "Unable to access camera. Please check permissions or use manual input.",
        variant: "destructive",
      });
      setShowManualInput(true);
    } finally {
      setIsLoading(false);
    }
  };

  // Stop camera
  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsScanning(false);
  };

  // Scan QR receipt
  const scanQRReceipt = async (qrCode: string) => {
    try {
      setIsLoading(true);
      
      const response = await fetch('/api/qr-receipts/scan', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          qrCode: qrCode.trim(),
          location: window.location.href,
          latitude: undefined, // Could be added with geolocation
          longitude: undefined
        }),
      });

      const data = await response.json();

      if (data.success) {
        setScanResult({
          success: true,
          receipt: data.data.receipt,
          scanner: data.data.scanner
        });
        
        toast({
          title: "QR Receipt Scanned Successfully",
          description: `Receipt ${data.data.receipt.receiptNumber} verified`,
        });

        if (onScanResult) {
          onScanResult(data.data);
        }
      } else {
        setScanResult({
          success: false,
          error: data.message || 'Failed to scan QR receipt'
        });
        
        toast({
          title: "Scan Failed",
          description: data.message || 'Invalid or expired QR receipt',
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('QR scan error:', error);
      setScanResult({
        success: false,
        error: 'Network error - please try again'
      });
      
      toast({
        title: "Scan Error",
        description: "Network error - please try again",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
      stopCamera();
    }
  };

  // Handle manual QR code input
  const handleManualScan = () => {
    if (manualInput.trim()) {
      scanQRReceipt(manualInput);
    }
  };

  // Simulate QR code detection (in a real app, you'd use a QR scanning library)
  const handleVideoClick = () => {
    // For demo purposes, show manual input
    setShowManualInput(true);
    stopCamera();
  };

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  const resetScanner = () => {
    setScanResult(null);
    setManualInput('');
    setShowManualInput(false);
  };

  return (
    <div className={`max-w-md mx-auto bg-white rounded-lg shadow-lg p-6 ${className}`}>
      <div className="text-center mb-6">
        <QrCode className="h-12 w-12 mx-auto text-blue-600 mb-2" />
        <h2 className="text-xl font-semibold text-gray-900">QR Receipt Scanner</h2>
        <p className="text-gray-600">Scan customer payment receipts to verify transactions</p>
      </div>

      {/* Scan Result Display */}
      {scanResult && (
        <div className="mb-6">
          {scanResult.success ? (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center mb-3">
                <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
                <span className="font-medium text-green-900">Receipt Verified</span>
              </div>
              
              <div className="space-y-2 text-sm">
                <div className="grid grid-cols-2 gap-2">
                  <span className="text-gray-600">Receipt:</span>
                  <span className="font-medium">{scanResult.receipt?.receiptNumber}</span>
                  
                  <span className="text-gray-600">Amount:</span>
                  <span className="font-medium">{scanResult.receipt?.currency} {parseFloat(scanResult.receipt?.amount || '0').toLocaleString()}</span>
                  
                  <span className="text-gray-600">Method:</span>
                  <span className="font-medium">{scanResult.receipt?.paymentMethod}</span>
                  
                  <span className="text-gray-600">Service:</span>
                  <span className="font-medium">{scanResult.receipt?.serviceType}</span>
                  
                  <span className="text-gray-600">Customer:</span>
                  <span className="font-medium">{scanResult.receipt?.consumer?.name}</span>
                  
                  <span className="text-gray-600">Date:</span>
                  <span className="font-medium">
                    {scanResult.receipt?.createdAt ? 
                      new Date(scanResult.receipt.createdAt).toLocaleDateString() : 
                      'N/A'
                    }
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center mb-2">
                <XCircle className="h-5 w-5 text-red-600 mr-2" />
                <span className="font-medium text-red-900">Scan Failed</span>
              </div>
              <p className="text-sm text-red-700">{scanResult.error}</p>
            </div>
          )}
          
          <button
            onClick={resetScanner}
            className="w-full mt-4 bg-gray-100 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-200 transition-colors"
          >
            Scan Another Receipt
          </button>
        </div>
      )}

      {/* Scanner Interface */}
      {!scanResult && (
        <div className="space-y-4">
          {/* Camera Scanner */}
          {isScanning ? (
            <div className="relative">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                className="w-full h-64 bg-gray-100 rounded-lg object-cover cursor-pointer"
                onClick={handleVideoClick}
              />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="border-2 border-blue-500 w-48 h-48 rounded-lg">
                  <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-blue-500"></div>
                  <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-blue-500"></div>
                  <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-blue-500"></div>
                  <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-blue-500"></div>
                </div>
              </div>
              <div className="absolute bottom-2 left-2 right-2">
                <p className="text-white text-sm text-center bg-black bg-opacity-50 rounded px-2 py-1">
                  Point camera at QR code or click to enter manually
                </p>
              </div>
            </div>
          ) : (
            <div className="text-center space-y-4">
              <button
                onClick={startCamera}
                disabled={isLoading}
                className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 disabled:bg-blue-400 transition-colors flex items-center justify-center"
              >
                {isLoading ? (
                  <>
                    <Clock className="h-5 w-5 mr-2 animate-spin" />
                    Starting Camera...
                  </>
                ) : (
                  <>
                    <Camera className="h-5 w-5 mr-2" />
                    Scan with Camera
                  </>
                )}
              </button>
              
              <div className="text-gray-500">or</div>
              
              <button
                onClick={() => setShowManualInput(true)}
                className="w-full bg-gray-600 text-white py-3 px-4 rounded-lg hover:bg-gray-700 transition-colors flex items-center justify-center"
              >
                <Scan className="h-5 w-5 mr-2" />
                Enter QR Code Manually
              </button>
            </div>
          )}

          {/* Manual Input */}
          {showManualInput && (
            <div className="space-y-3">
              <label className="block text-sm font-medium text-gray-700">
                Enter QR Code Data
              </label>
              <input
                type="text"
                value={manualInput}
                onChange={(e) => setManualInput(e.target.value)}
                placeholder="RECEIPT_123456_RCP-..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <div className="flex space-x-2">
                <button
                  onClick={handleManualScan}
                  disabled={!manualInput.trim() || isLoading}
                  className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 disabled:bg-blue-400 transition-colors"
                >
                  {isLoading ? 'Scanning...' : 'Scan Receipt'}
                </button>
                <button
                  onClick={() => setShowManualInput(false)}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}