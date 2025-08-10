
import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { CheckCircle, XCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function WalletFundCallback() {
  const [, setLocation] = useLocation();
  const [status, setStatus] = useState<'loading' | 'success' | 'failed'>('loading');
  const [amount, setAmount] = useState<number>(0);
  const [message, setMessage] = useState<string>('');

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const reference = urlParams.get('reference');
    
    if (reference) {
      verifyPayment(reference);
    } else {
      setStatus('failed');
      setMessage('No payment reference found');
    }
  }, []);

  const verifyPayment = async (reference: string) => {
    try {
      const response = await fetch('/api/wallet/fund/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ reference }),
      });

      const result = await response.json();

      if (result.success) {
        setStatus('success');
        setAmount(result.data.amount);
        setMessage(result.data.message);
      } else {
        setStatus('failed');
        setMessage(result.error || 'Payment verification failed');
      }
    } catch (error) {
      console.error('Payment verification error:', error);
      setStatus('failed');
      setMessage('Failed to verify payment');
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
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardContent className="p-6 text-center">
          {status === 'loading' && (
            <>
              <Loader2 className="w-16 h-16 animate-spin text-[#4682b4] mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2">Verifying Payment</h2>
              <p className="text-gray-600">Please wait while we confirm your payment...</p>
            </>
          )}

          {status === 'success' && (
            <>
              <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-green-700 mb-2">Payment Successful!</h2>
              <p className="text-gray-600 mb-4">{message}</p>
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
                <p className="text-green-800 font-semibold">
                  {formatCurrency(amount)} has been added to your wallet
                </p>
              </div>
            </>
          )}

          {status === 'failed' && (
            <>
              <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-red-700 mb-2">Payment Failed</h2>
              <p className="text-gray-600 mb-6">{message}</p>
            </>
          )}

          <div className="space-y-3">
            <Button
              className="w-full bg-[#4682b4] hover:bg-[#0b1a51]"
              onClick={() => setLocation("/consumer-home")}
            >
              {status === 'success' ? 'Continue to Home' : 'Back to Home'}
            </Button>
            
            {status === 'failed' && (
              <Button
                variant="outline"
                className="w-full border-[#4682b4] text-[#4682b4]"
                onClick={() => setLocation("/wallet-fund")}
              >
                Try Again
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
