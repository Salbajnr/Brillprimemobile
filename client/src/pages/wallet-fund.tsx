import { useState } from "react";
import { useLocation } from "wouter";
import { ArrowLeft, Plus, CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import masterCardLogo from "../assets/images/master_card_logo.png";
import visaCardLogo from "../assets/images/visa_card_logo.png";

const fundingAmounts = [1000, 2500, 5000, 10000, 25000, 50000];

export default function WalletFund() {
  const [, setLocation] = useLocation();
  const [selectedAmount, setSelectedAmount] = useState<number | null>(null);
  const [customAmount, setCustomAmount] = useState("");
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const paymentMethods = [
    {
      id: "card1",
      type: "Mastercard",
      number: "**** **** **** 4532",
      logo: masterCardLogo
    },
    {
      id: "card2",
      type: "Visa",
      number: "**** **** **** 8901",
      logo: visaCardLogo
    }
  ];

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const getFinalAmount = () => {
    if (customAmount) {
      return parseInt(customAmount);
    }
    return selectedAmount || 0;
  };

  const handleFundWallet = async () => {
    const amount = getFinalAmount();
    if (amount > 0 && selectedPaymentMethod) {
      try {
        setIsLoading(true);
        
        // Initialize payment with real Paystack integration
        const response = await fetch('/api/wallet/fund', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({
            amount,
            paymentMethod: selectedPaymentMethod
          }),
        });

        const result = await response.json();

        if (result.success && result.authorization_url) {
          // Redirect to Paystack payment page
          window.location.href = result.authorization_url;
        } else {
          throw new Error(result.message || 'Payment initialization failed');
        }
      } catch (error: any) {
        console.error('Payment error:', error);
        alert(error.message || 'Payment failed. Please try again.');
      } finally {
        setIsLoading(false);
      }
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 w-full max-w-sm sm:max-w-md md:max-w-lg lg:max-w-xl xl:max-w-2xl mx-auto px-2 sm:px-4">{/*Responsive container*/}
      {/* Header */}
      <div className="bg-white shadow-sm border-b p-4">
        <div className="flex items-center space-x-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setLocation("/consumer-home")}
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-lg font-semibold text-[#131313]">Add Money</h1>
        </div>
      </div>

      <div className="p-4 space-y-6">
        {/* Quick Amount Selection */}
        <Card>
          <CardContent className="p-6">
            <h3 className="font-semibold text-[#131313] mb-4">Select Amount</h3>
            <div className="grid grid-cols-3 gap-3 mb-4">
              {fundingAmounts.map((amount) => (
                <Button
                  key={amount}
                  variant={selectedAmount === amount ? "default" : "outline"}
                  className={`h-12 ${
                    selectedAmount === amount 
                      ? "bg-[#4682b4] text-white" 
                      : "border-[#4682b4] text-[#4682b4] hover:bg-[#4682b4]/10"
                  }`}
                  onClick={() => {
                    setSelectedAmount(amount);
                    setCustomAmount("");
                  }}
                >
                  {formatCurrency(amount)}
                </Button>
              ))}
            </div>

            <div className="space-y-2">
              <Label htmlFor="custom-amount" className="text-sm font-medium">
                Or enter custom amount
              </Label>
              <Input
                id="custom-amount"
                type="number"
                placeholder="Enter amount"
                value={customAmount}
                onChange={(e) => {
                  setCustomAmount(e.target.value);
                  setSelectedAmount(null);
                }}
                className="border-[#4682b4]/30 focus:border-[#4682b4]"
              />
            </div>
          </CardContent>
        </Card>

        {/* Payment Methods */}
        <Card>
          <CardContent className="p-6">
            <h3 className="font-semibold text-[#131313] mb-4">Payment Method</h3>
            <div className="space-y-3">
              {paymentMethods.map((method) => (
                <div
                  key={method.id}
                  className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                    selectedPaymentMethod === method.id
                      ? "border-[#4682b4] bg-[#4682b4]/5"
                      : "border-gray-200 hover:border-[#4682b4]/50"
                  }`}
                  onClick={() => setSelectedPaymentMethod(method.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <img src={method.logo} alt={method.type} className="w-8 h-5" />
                      <div>
                        <p className="font-medium text-[#131313]">{method.type}</p>
                        <p className="text-sm text-gray-600">{method.number}</p>
                      </div>
                    </div>
                    <div className={`w-4 h-4 rounded-full border-2 ${
                      selectedPaymentMethod === method.id
                        ? "border-[#4682b4] bg-[#4682b4]"
                        : "border-gray-300"
                    }`}>
                      {selectedPaymentMethod === method.id && (
                        <div className="w-full h-full rounded-full bg-white transform scale-50"></div>
                      )}
                    </div>
                  </div>
                </div>
              ))}

              <Button
                variant="outline"
                className="w-full h-16 border-dashed border-[#4682b4] text-[#4682b4] hover:bg-[#4682b4]/10"
                onClick={() => setLocation("/payment-methods/add")}
              >
                <Plus className="w-5 h-5 mr-2" />
                Add New Card
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Transaction Summary */}
        {(selectedAmount || customAmount) && (
          <Card>
            <CardContent className="p-6">
              <h3 className="font-semibold text-[#131313] mb-4">Transaction Summary</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Amount</span>
                  <span className="font-medium">{formatCurrency(getFinalAmount())}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Transaction Fee</span>
                  <span className="font-medium">₦0.00</span>
                </div>
                <hr />
                <div className="flex justify-between font-semibold text-lg">
                  <span>Total</span>
                  <span className="text-[#4682b4]">{formatCurrency(getFinalAmount())}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Bottom Button */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t">
        <Button
          className="w-full h-12 bg-[#4682b4] hover:bg-[#0b1a51]"
          onClick={handleFundWallet}
          disabled={!getFinalAmount() || !selectedPaymentMethod}
        >
          <CreditCard className="w-5 h-5 mr-2" />
          Fund Wallet
        </Button>
      </div>
    </div>
  );
}