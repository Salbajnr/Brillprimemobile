import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { ArrowLeft, CreditCard, Send, History, Eye, EyeOff } from "lucide-react";

interface WalletData {
  balance: number;
  currency: string;
  formattedBalance: string;
  lastUpdated: string;
  accountNumber: string;
  bankName: string;
}

export default function WalletBalancePage() {
  const [, setLocation] = useLocation();
  const [walletData, setWalletData] = useState<WalletData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showBalance, setShowBalance] = useState(true);

  useEffect(() => {
    const fetchWalletBalance = async () => {
      setLoading(true);
      try {
        const response = await fetch('/api/wallet/balance');
        const data: WalletData = await response.json();
        
        if (response.ok) {
          setWalletData(data);
        } else {
          console.error('Failed to fetch wallet balance');
        }
      } catch (error) {
        console.error('Error fetching wallet balance:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchWalletBalance();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading wallet...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-md mx-auto bg-white min-h-screen">
        {/* Header */}
        <div className="bg-blue-600 text-white p-4">
          <div className="flex items-center justify-between mb-6">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setLocation('/dashboard')}
              className="text-white hover:bg-white/20"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-xl font-semibold">My Wallet</h1>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setLocation('/wallet/transactions')}
              className="text-white hover:bg-white/20"
            >
              <History className="h-5 w-5" />
            </Button>
          </div>

          {/* Balance Card */}
          {walletData && (
            <div className="text-center">
              <p className="text-blue-100 text-sm mb-2">Available Balance</p>
              <div className="flex items-center justify-center mb-2">
                {showBalance ? (
                  <h2 className="text-4xl font-bold mr-2">{walletData.formattedBalance}</h2>
                ) : (
                  <h2 className="text-4xl font-bold mr-2">****</h2>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowBalance(!showBalance)}
                  className="text-white hover:bg-white/20"
                >
                  {showBalance ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
              <div className="bg-white bg-opacity-10 rounded-lg p-3 text-sm">
                <p>Account: {walletData.accountNumber}</p>
                <p>{walletData.bankName}</p>
              </div>
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="p-6">
          <div className="grid grid-cols-2 gap-4 mb-8">
            <Button
              onClick={() => setLocation('/wallet-fund')}
              className="bg-green-600 hover:bg-green-700 text-white p-6 rounded-lg flex flex-col items-center space-y-2"
            >
              <CreditCard className="h-8 w-8" />
              <span className="font-semibold">Fund Wallet</span>
            </Button>
            <Button
              onClick={() => setLocation('/transfer')}
              className="bg-blue-600 hover:bg-blue-700 text-white p-6 rounded-lg flex flex-col items-center space-y-2"
            >
              <Send className="h-8 w-8" />
              <span className="font-semibold">Send Money</span>
            </Button>
          </div>

          {/* Additional Services */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Quick Services</CardTitle>
              <CardDescription>Access financial services</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button
                variant="ghost"
                onClick={() => setLocation('/bills')}
                className="w-full justify-between p-4 h-auto"
              >
                <div className="flex items-center">
                  <span className="text-2xl mr-3">⚡</span>
                  <span className="font-medium">Pay Bills</span>
                </div>
                <span className="text-gray-400">→</span>
              </Button>
              
              <Button
                variant="ghost"
                onClick={() => setLocation('/wallet/transactions')}
                className="w-full justify-between p-4 h-auto"
              >
                <div className="flex items-center">
                  <span className="text-2xl mr-3">📊</span>
                  <span className="font-medium">Transaction History</span>
                </div>
                <span className="text-gray-400">→</span>
              </Button>
              
              <Button
                variant="ghost"
                onClick={() => setLocation('/profile')}
                className="w-full justify-between p-4 h-auto"
              >
                <div className="flex items-center">
                  <span className="text-2xl mr-3">⚙️</span>
                  <span className="font-medium">Account Settings</span>
                </div>
                <span className="text-gray-400">→</span>
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Security Notice */}
        <div className="p-6">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start">
              <span className="text-blue-600 mr-2">🔒</span>
              <div className="text-sm text-blue-800">
                <p className="font-medium mb-1">Your wallet is secure</p>
                <p>All transactions are encrypted and protected with bank-level security.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}