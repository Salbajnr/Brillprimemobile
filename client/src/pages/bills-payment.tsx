import { useState } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Zap, Droplets, Wifi, Smartphone } from "lucide-react";

const billCategories = [
  { id: 'electricity', name: 'Electricity', icon: Zap, providers: ['PHCN', 'AEDC', 'IKEDC', 'EKEDC'] },
  { id: 'water', name: 'Water', icon: Droplets, providers: ['Lagos Water', 'Ogun State Water', 'FCT Water'] },
  { id: 'internet', name: 'Internet', icon: Wifi, providers: ['MTN', 'Airtel', 'GLO', '9mobile'] },
  { id: 'cable', name: 'Cable TV', icon: Smartphone, providers: ['DSTV', 'GOtv', 'Startimes'] }
];

export default function BillsPaymentPage() {
  const [, setLocation] = useLocation();
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedProvider, setSelectedProvider] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);

  const handlePayBill = async () => {
    if (!selectedCategory || !selectedProvider || !accountNumber || !amount) {
      alert('Please fill in all required fields');
      return;
    }

    if (parseFloat(amount) <= 0) {
      alert('Please enter a valid amount');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/bills/pay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          billType: selectedCategory,
          provider: selectedProvider,
          accountNumber,
          amount: parseFloat(amount)
        })
      });

      const data = await response.json();

      if (response.ok) {
        alert('Bill payment initiated successfully!');
        setLocation('/dashboard');
      } else {
        alert(`Error: ${data.message}`);
      }
    } catch (error) {
      alert('Failed to process bill payment. Please try again.');
      console.error('Bill payment error:', error);
    } finally {
      setLoading(false);
    }
  };

  const currentCategory = billCategories.find(cat => cat.id === selectedCategory);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-md mx-auto bg-white min-h-screen">
        {/* Header */}
        <div className="bg-orange-600 text-white p-4">
          <div className="flex items-center justify-between mb-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setLocation('/dashboard')}
              className="text-white hover:bg-white/20"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-xl font-semibold">Pay Bills</h1>
            <div />
          </div>
          <div className="text-center">
            <div className="w-16 h-16 bg-white bg-opacity-20 rounded-full flex items-center justify-center mx-auto mb-4">
              <Zap className="h-8 w-8" />
            </div>
            <p className="text-orange-100">Pay your utility bills securely</p>
          </div>
        </div>

        {/* Bill Categories */}
        <div className="p-6">
          <div className="mb-6">
            <Label className="text-sm font-medium text-gray-700 mb-3 block">Select Bill Type</Label>
            <div className="grid grid-cols-2 gap-3">
              {billCategories.map((category) => {
                const Icon = category.icon;
                return (
                  <Button
                    key={category.id}
                    variant={selectedCategory === category.id ? "default" : "outline"}
                    onClick={() => {
                      setSelectedCategory(category.id);
                      setSelectedProvider('');
                    }}
                    className="p-4 h-auto flex flex-col items-center space-y-2"
                  >
                    <Icon className="h-6 w-6" />
                    <span className="text-sm font-medium">{category.name}</span>
                  </Button>
                );
              })}
            </div>
          </div>

          {selectedCategory && currentCategory && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="provider" className="text-sm font-medium text-gray-700">Provider</Label>
                <Select value={selectedProvider} onValueChange={setSelectedProvider}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select provider" />
                  </SelectTrigger>
                  <SelectContent>
                    {currentCategory.providers.map(provider => (
                      <SelectItem key={provider} value={provider}>
                        {provider}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="account" className="text-sm font-medium text-gray-700">
                  Account/Meter Number
                </Label>
                <Input
                  id="account"
                  value={accountNumber}
                  onChange={(e) => setAccountNumber(e.target.value)}
                  placeholder="Enter account or meter number"
                  className="w-full"
                />
              </div>

              <div>
                <Label htmlFor="amount" className="text-sm font-medium text-gray-700">Amount (₦)</Label>
                <Input
                  id="amount"
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full"
                />
              </div>

              <Button
                onClick={handlePayBill}
                disabled={loading || !selectedProvider || !accountNumber || !amount}
                className="w-full bg-orange-600 hover:bg-orange-700 py-4"
              >
                {loading ? 'Processing...' : `Pay ₦${amount || '0'} Bill`}
              </Button>
            </div>
          )}

          {!selectedCategory && (
            <Card className="mt-6">
              <CardHeader>
                <CardTitle className="text-lg">Quick Bill Payment</CardTitle>
                <CardDescription>
                  Pay your utility bills instantly and securely
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li>• Instant payment processing</li>
                  <li>• Support for major providers</li>
                  <li>• Secure transaction handling</li>
                  <li>• Transaction receipts via email</li>
                </ul>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}