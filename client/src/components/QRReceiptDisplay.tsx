import React, { useState, useEffect } from 'react';
import { QrCode, Download, Share2, Eye, Calendar, CreditCard, User, MapPin, CheckCircle } from 'lucide-react';
import { useToast } from "../hooks/use-toast";

interface QRReceiptDisplayProps {
  receiptId?: number;
  transactionId?: string;
  className?: string;
}

interface Receipt {
  id: number;
  receiptNumber: string;
  amount: string;
  currency: string;
  paymentMethod: string;
  serviceType: string;
  status: string;
  scannedAt?: string;
  createdAt: string;
  qrCodeImage?: string;
  consumer?: {
    name: string;
    email: string;
  };
  transaction?: {
    id: number;
    metadata?: any;
  };
}

export function QRReceiptDisplay({ receiptId, transactionId, className = "" }: QRReceiptDisplayProps) {
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showQRCode, setShowQRCode] = useState(false);
  const { toast } = useToast();

  // Fetch receipt data
  useEffect(() => {
    const fetchReceipt = async () => {
      if (!receiptId) return;

      try {
        setIsLoading(true);
        const response = await fetch(`/api/qr-receipts/${receiptId}`);
        const data = await response.json();

        if (data.success) {
          setReceipt(data.data);
        } else {
          setError(data.message || 'Failed to load receipt');
        }
      } catch (err) {
        setError('Network error - please try again');
        console.error('Receipt fetch error:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchReceipt();
  }, [receiptId]);

  // Download QR code
  const downloadQRCode = () => {
    if (!receipt?.qrCodeImage) return;

    const link = document.createElement('a');
    link.download = `receipt-${receipt.receiptNumber}.png`;
    link.href = receipt.qrCodeImage;
    link.click();

    toast({
      title: "QR Code Downloaded",
      description: "Receipt QR code saved to downloads",
    });
  };

  // Share receipt
  const shareReceipt = async () => {
    if (!receipt) return;

    const shareData = {
      title: `Payment Receipt ${receipt.receiptNumber}`,
      text: `Payment of ${receipt.currency} ${parseFloat(receipt.amount).toLocaleString()} via ${receipt.paymentMethod}`,
      url: window.location.href
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        // Fallback: copy to clipboard
        await navigator.clipboard.writeText(
          `Payment Receipt: ${receipt.receiptNumber}\n` +
          `Amount: ${receipt.currency} ${parseFloat(receipt.amount).toLocaleString()}\n` +
          `Date: ${new Date(receipt.createdAt).toLocaleDateString()}\n` +
          `Method: ${receipt.paymentMethod}`
        );
        toast({
          title: "Receipt Details Copied",
          description: "Receipt information copied to clipboard",
        });
      }
    } catch (err) {
      console.error('Share error:', err);
      toast({
        title: "Share Failed",
        description: "Unable to share receipt",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <div className={`max-w-md mx-auto bg-white rounded-lg shadow-lg p-6 ${className}`}>
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-3/4 mx-auto"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
          <div className="space-y-2">
            <div className="h-4 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded w-5/6"></div>
            <div className="h-4 bg-gray-200 rounded w-4/6"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`max-w-md mx-auto bg-white rounded-lg shadow-lg p-6 ${className}`}>
        <div className="text-center text-red-600">
          <p className="font-medium">Receipt Not Found</p>
          <p className="text-sm text-gray-600 mt-1">{error}</p>
        </div>
      </div>
    );
  }

  if (!receipt) {
    return null;
  }

  return (
    <div className={`max-w-md mx-auto bg-white rounded-lg shadow-lg overflow-hidden ${className}`}>
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6 text-center">
        <QrCode className="h-8 w-8 mx-auto mb-2" />
        <h2 className="text-xl font-semibold">Payment Receipt</h2>
        <p className="text-blue-100 text-sm">{receipt.receiptNumber}</p>
      </div>

      {/* Receipt Details */}
      <div className="p-6 space-y-4">
        {/* Status */}
        <div className="flex items-center justify-center space-x-2">
          <CheckCircle className={`h-5 w-5 ${receipt.status === 'ACTIVE' ? 'text-green-600' : 'text-gray-400'}`} />
          <span className={`font-medium ${receipt.status === 'ACTIVE' ? 'text-green-600' : 'text-gray-600'}`}>
            {receipt.status === 'ACTIVE' ? 'Valid Receipt' : receipt.status}
          </span>
          {receipt.scannedAt && (
            <span className="text-xs text-gray-500">
              (Scanned: {new Date(receipt.scannedAt).toLocaleDateString()})
            </span>
          )}
        </div>

        {/* Amount */}
        <div className="text-center border-b pb-4">
          <div className="text-3xl font-bold text-gray-900">
            {receipt.currency} {parseFloat(receipt.amount).toLocaleString()}
          </div>
          <div className="text-gray-600 text-sm mt-1">
            via {receipt.paymentMethod}
          </div>
        </div>

        {/* Transaction Details */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center text-gray-600">
              <Calendar className="h-4 w-4 mr-2" />
              <span className="text-sm">Date</span>
            </div>
            <span className="text-sm font-medium">
              {new Date(receipt.createdAt).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center text-gray-600">
              <CreditCard className="h-4 w-4 mr-2" />
              <span className="text-sm">Service</span>
            </div>
            <span className="text-sm font-medium">{receipt.serviceType}</span>
          </div>

          {receipt.consumer && (
            <div className="flex items-center justify-between">
              <div className="flex items-center text-gray-600">
                <User className="h-4 w-4 mr-2" />
                <span className="text-sm">Customer</span>
              </div>
              <span className="text-sm font-medium">{receipt.consumer.name}</span>
            </div>
          )}
        </div>

        {/* QR Code Display */}
        <div className="border-t pt-4">
          <button
            onClick={() => setShowQRCode(!showQRCode)}
            className="w-full flex items-center justify-center space-x-2 text-blue-600 hover:text-blue-700 transition-colors"
          >
            <Eye className="h-4 w-4" />
            <span className="text-sm font-medium">
              {showQRCode ? 'Hide QR Code' : 'Show QR Code'}
            </span>
          </button>

          {showQRCode && receipt.qrCodeImage && (
            <div className="mt-4 text-center">
              <div className="inline-block p-4 bg-white border-2 border-gray-200 rounded-lg">
                <img
                  src={receipt.qrCodeImage}
                  alt={`QR Code for receipt ${receipt.receiptNumber}`}
                  className="w-48 h-48 mx-auto"
                />
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Merchants can scan this QR code to verify your payment
              </p>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="border-t pt-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={downloadQRCode}
              className="flex items-center justify-center space-x-2 bg-gray-100 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-200 transition-colors"
            >
              <Download className="h-4 w-4" />
              <span className="text-sm">Download</span>
            </button>
            
            <button
              onClick={shareReceipt}
              className="flex items-center justify-center space-x-2 bg-blue-100 text-blue-700 py-2 px-4 rounded-lg hover:bg-blue-200 transition-colors"
            >
              <Share2 className="h-4 w-4" />
              <span className="text-sm">Share</span>
            </button>
          </div>

          {/* Warning */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
            <p className="text-xs text-yellow-800">
              <strong>Keep this receipt safe:</strong> This QR code serves as proof of payment. 
              Merchants can scan it to verify your transaction.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}