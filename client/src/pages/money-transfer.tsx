import { useState } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Send, User, CreditCard, Building } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";

const transferTypes = [
  { 
    id: 'brill_prime', 
    name: 'Brill Prime User', 
    icon: User, 
    description: 'Transfer to another Brill Prime wallet',
    fee: 0 
  },
  { 
    id: 'bank_account', 
    name: 'Bank Account', 
    icon: Building, 
    description: 'Transfer to any Nigerian bank account',
    fee: 25 
  },
  { 
    id: 'debit_card', 
    name: 'Debit Card', 
    icon: CreditCard, 
    description: 'Instant transfer to debit card',
    fee: 50 
  }
];

const nigeriaBanks = [
  'Access Bank', 'Fidelity Bank', 'First Bank of Nigeria', 'Guaranty Trust Bank', 
  'United Bank for Africa', 'Zenith Bank', 'Ecobank', 'Union Bank', 'Wema Bank', 
  'Sterling Bank', 'Polaris Bank', 'Keystone Bank', 'Heritage Bank', 'Stanbic IBTC'
];

export default function MoneyTransferPage() {
  const [, setLocation] = useLocation();
  const [transferType, setTransferType] = useState('');
  const [recipientDetails, setRecipientDetails] = useState({
    account: '',
    name: '',
    bank: '',
    email: '',
    phone: ''
  });
  const [amount, setAmount] = useState('');
  const [narration, setNarration] = useState('');
  const [loading, setLoading] = useState(false);

  const handleTransfer = async () => {
    if (!transferType || !amount || parseFloat(amount) <= 0) {
      alert('Please fill in all required fields with a valid amount');
      return;
    }

    const selectedType = transferTypes.find(t => t.id === transferType);
    if (!selectedType) return;

    // Validate based on transfer type
    if (transferType === 'brill_prime' && !recipientDetails.email && !recipientDetails.phone) {
      alert('Please enter recipient email or phone number');
      return;
    }
    
    if (transferType === 'bank_account' && (!recipientDetails.account || !recipientDetails.bank)) {
      alert('Please enter account number and bank');
      return;
    }

    if (transferType === 'debit_card' && !recipientDetails.account) {
      alert('Please enter debit card number');
      return;
    }

    const transferAmount = parseFloat(amount);
    const totalAmount = transferAmount + selectedType.fee;

    const confirmMessage = `
Transfer Details:
Amount: ₦${transferAmount.toLocaleString()}
Fee: ₦${selectedType.fee}
Total: ₦${totalAmount.toLocaleString()}
To: ${transferType === 'brill_prime' ? (recipientDetails.email || recipientDetails.phone) : 
      transferType === 'bank_account' ? `${recipientDetails.account} (${recipientDetails.bank})` : 
      recipientDetails.account}

Proceed with transfer?`;

    if (!confirm(confirmMessage)) return;

    setLoading(true);
    try {
      const response = await fetch('/api/transfer/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transferType,
          recipientAccount: recipientDetails.account || recipientDetails.email || recipientDetails.phone,
          recipientBank: recipientDetails.bank,
          amount: transferAmount,
          fee: selectedType.fee,
          narration: narration || `Transfer via ${selectedType.name}`
        })
      });

      const data = await response.json();

      if (response.ok) {
        alert('Money transfer initiated successfully!');
        setLocation('/dashboard');
      } else {
        alert(`Error: ${data.message}`);
      }
    } catch (error) {
      alert('Failed to process transfer. Please try again.');
      console.error('Transfer error:', error);
    } finally {
      setLoading(false);
    }
  };

  const selectedTransferType = transferTypes.find(t => t.id === transferType);
  const transferFee = selectedTransferType?.fee || 0;
  const totalAmount = amount ? parseFloat(amount) + transferFee : 0;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-md mx-auto bg-white min-h-screen">
        {/* Header */}
        <div className="bg-blue-600 text-white p-4">
          <div className="flex items-center justify-between mb-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setLocation('/dashboard')}
              className="text-white hover:bg-white/20"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-xl font-semibold">Send Money</h1>
            <div />
          </div>
          <div className="text-center">
            <div className="w-16 h-16 bg-white bg-opacity-20 rounded-full flex items-center justify-center mx-auto mb-4">
              <Send className="h-8 w-8" />
            </div>
            <p className="text-blue-100">Transfer money quickly and securely</p>
          </div>
        </div>

        {/* Transfer Options */}
        <div className="p-6">
          <div className="mb-6">
            <Label className="text-sm font-medium text-gray-700 mb-3 block">Transfer To</Label>
            <div className="space-y-3">
              {transferTypes.map((type) => {
                const Icon = type.icon;
                return (
                  <Button
                    key={type.id}
                    variant={transferType === type.id ? "default" : "outline"}
                    onClick={() => {
                      setTransferType(type.id);
                      setRecipientDetails({ account: '', name: '', bank: '', email: '', phone: '' });
                    }}
                    className="w-full p-4 h-auto justify-start text-left"
                  >
                    <div className="flex items-center space-x-3">
                      <Icon className="h-6 w-6" />
                      <div>
                        <p className="font-medium">{type.name}</p>
                        <p className="text-xs text-gray-500">{type.description}</p>
                        <p className="text-xs font-medium text-green-600">
                          Fee: {type.fee === 0 ? 'Free' : `₦${type.fee}`}
                        </p>
                      </div>
                    </div>
                  </Button>
                );
              })}
            </div>
          </div>

          {transferType && (
            <div className="space-y-4">
              {/* Recipient Details */}
              {transferType === 'brill_prime' && (
                <div className="space-y-3">
                  <div>
                    <Label htmlFor="email" className="text-sm font-medium text-gray-700">
                      Recipient Email or Phone
                    </Label>
                    <Input
                      id="email"
                      value={recipientDetails.email}
                      onChange={(e) => setRecipientDetails({...recipientDetails, email: e.target.value})}
                      placeholder="user@example.com or +2348123456789"
                      className="w-full"
                    />
                  </div>
                </div>
              )}

              {transferType === 'bank_account' && (
                <div className="space-y-3">
                  <div>
                    <Label htmlFor="account" className="text-sm font-medium text-gray-700">Account Number</Label>
                    <Input
                      id="account"
                      value={recipientDetails.account}
                      onChange={(e) => setRecipientDetails({...recipientDetails, account: e.target.value})}
                      placeholder="1234567890"
                      className="w-full"
                    />
                  </div>
                  <div>
                    <Label htmlFor="bank" className="text-sm font-medium text-gray-700">Bank</Label>
                    <Select 
                      value={recipientDetails.bank} 
                      onValueChange={(value) => setRecipientDetails({...recipientDetails, bank: value})}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select bank" />
                      </SelectTrigger>
                      <SelectContent>
                        {nigeriaBanks.map(bank => (
                          <SelectItem key={bank} value={bank}>
                            {bank}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}

              {transferType === 'debit_card' && (
                <div>
                  <Label htmlFor="card" className="text-sm font-medium text-gray-700">Debit Card Number</Label>
                  <Input
                    id="card"
                    value={recipientDetails.account}
                    onChange={(e) => setRecipientDetails({...recipientDetails, account: e.target.value})}
                    placeholder="1234 5678 9012 3456"
                    className="w-full"
                  />
                </div>
              )}

              {/* Amount */}
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

              {/* Narration */}
              <div>
                <Label htmlFor="narration" className="text-sm font-medium text-gray-700">
                  Description (Optional)
                </Label>
                <Textarea
                  id="narration"
                  value={narration}
                  onChange={(e) => setNarration(e.target.value)}
                  placeholder="What's this transfer for?"
                  className="w-full"
                  rows={2}
                />
              </div>

              {/* Transfer Summary */}
              {amount && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Transfer Summary</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Amount</span>
                        <span>₦{parseFloat(amount).toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Transfer Fee</span>
                        <span>{transferFee === 0 ? 'Free' : `₦${transferFee}`}</span>
                      </div>
                      <div className="border-t pt-2 font-medium">
                        <div className="flex justify-between">
                          <span>Total Amount</span>
                          <span>₦{totalAmount.toLocaleString()}</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              <Button
                onClick={handleTransfer}
                disabled={loading || !amount}
                className="w-full bg-blue-600 hover:bg-blue-700 py-4"
              >
                {loading ? 'Processing...' : `Send ₦${amount || '0'}`}
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}