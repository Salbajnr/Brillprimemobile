
import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { ArrowLeft, CheckCircle, Download, Share, QrCode } from "lucide-react";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { Badge } from "../components/ui/badge";

export default function TollPaymentSuccess() {
  const [, setLocation] = useLocation();
  const [transactionDetails, setTransactionDetails] = useState<any>(null);
  const [qrCode, setQrCode] = useState<string>("");

  useEffect(() => {
    // Get transaction details from URL params
    const urlParams = new URLSearchParams(window.location.search);
    const transactionId = urlParams.get('transactionId');
    const qrCodeParam = urlParams.get('qrCode');

    if (qrCodeParam) {
      setQrCode(qrCodeParam);
    }

    // Fetch transaction details
    if (transactionId) {
      fetchTransactionDetails(transactionId);
    }
  }, []);

  const fetchTransactionDetails = async (transactionId: string) => {
    try {
      const response = await fetch(`/api/transactions/${transactionId}`, {
        credentials: 'include'
      });
      
      if (response.ok) {
        const result = await response.json();
        setTransactionDetails(result.transaction);
      }
    } catch (error) {
      console.error('Error fetching transaction details:', error);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Toll Payment Receipt',
          text: `Toll payment successful - ${formatCurrency(parseFloat(transactionDetails?.amount || '0'))}`,
          url: window.location.href
        });
      } catch (error) {
        console.log('Error sharing:', error);
      }
    } else {
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(window.location.href);
    }
  };

  const handleDownloadReceipt = () => {
    // Create a simple receipt text
    const receiptText = `
TOLL PAYMENT RECEIPT
===================
Transaction ID: ${transactionDetails?.id}
Date: ${new Date(transactionDetails?.createdAt).toLocaleString()}
Amount: ${formatCurrency(parseFloat(transactionDetails?.amount || '0'))}
Toll Gate: ${transactionDetails?.metadata?.tollGateName}
Vehicle Type: ${transactionDetails?.metadata?.vehicleType}
QR Code: ${qrCode}
===================
Brill Prime Toll Services
    `;

    const element = document.createElement('a');
    const file = new Blob([receiptText], { type: 'text/plain' });
    element.href = URL.createObjectURL(file);
    element.download = `toll-receipt-${transactionDetails?.id}.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  return (
    <div className="min-h-screen bg-gray-50 w-full max-w-md mx-auto">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="flex items-center justify-between p-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setLocation("/toll-payments")}
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-lg font-semibold text-[#131313]">Payment Success</h1>
          <div className="w-10"></div>
        </div>
      </div>

      <div className="p-4 space-y-6">
        {/* Success Icon */}
        <div className="text-center py-8">
          <CheckCircle className="w-20 h-20 text-green-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-[#131313] mb-2">Payment Successful!</h2>
          <p className="text-gray-600">Your toll payment has been processed successfully</p>
        </div>

        {/* Transaction Details */}
        {transactionDetails && (
          <Card>
            <CardContent className="p-6 space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Amount Paid</span>
                <span className="text-2xl font-bold text-[#4682b4]">
                  {formatCurrency(parseFloat(transactionDetails.amount))}
                </span>
              </div>

              <div className="border-t pt-4 space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Transaction ID</span>
                  <span className="font-medium">{transactionDetails.id}</span>
                </div>

                <div className="flex justify-between">
                  <span className="text-gray-600">Date & Time</span>
                  <span className="font-medium">
                    {new Date(transactionDetails.createdAt).toLocaleString()}
                  </span>
                </div>

                <div className="flex justify-between">
                  <span className="text-gray-600">Toll Gate</span>
                  <span className="font-medium">{transactionDetails.metadata?.tollGateName}</span>
                </div>

                <div className="flex justify-between">
                  <span className="text-gray-600">Vehicle Type</span>
                  <Badge variant="secondary" className="capitalize">
                    {transactionDetails.metadata?.vehicleType}
                  </Badge>
                </div>

                <div className="flex justify-between">
                  <span className="text-gray-600">Status</span>
                  <Badge variant="default" className="bg-green-100 text-green-800">
                    Completed
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* QR Code */}
        {qrCode && (
          <Card>
            <CardContent className="p-6 text-center">
              <QrCode className="w-12 h-12 mx-auto mb-4 text-[#4682b4]" />
              <h3 className="font-semibold mb-2">Your Toll Pass QR Code</h3>
              <p className="text-sm text-gray-600 mb-4">
                Show this QR code at the toll gate for entry
              </p>
              <div className="bg-gray-100 p-4 rounded-lg font-mono text-sm break-all">
                {qrCode}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Actions */}
        <div className="space-y-3">
          <Button
            onClick={handleDownloadReceipt}
            variant="outline"
            className="w-full"
          >
            <Download className="w-4 h-4 mr-2" />
            Download Receipt
          </Button>

          <Button
            onClick={handleShare}
            variant="outline"
            className="w-full"
          >
            <Share className="w-4 h-4 mr-2" />
            Share Receipt
          </Button>

          <Button
            onClick={() => setLocation("/dashboard")}
            className="w-full bg-[#4682b4] hover:bg-[#357abd]"
          >
            Back to Dashboard
          </Button>
        </div>

        {/* Important Note */}
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-4">
            <h4 className="font-medium text-blue-900 mb-2">Important Notice</h4>
            <p className="text-sm text-blue-800">
              Keep this QR code ready for toll gate scanning. The QR code is valid for 24 hours 
              from the time of payment.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
