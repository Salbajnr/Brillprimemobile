import { useState } from "react";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Switch } from "../components/ui/switch";
import { 
  ArrowLeft, 
  CreditCard, 
  Building2, 
  DollarSign,
  Check,
  Plus
} from "lucide-react";
import { NotificationModal } from "../components/ui/notification-modal";

// Color constants
const COLORS = {
  PRIMARY: "#4682b4",
  SECONDARY: "#0b1a51", 
  ACTIVE: "#010e42",
  TEXT: "#131313",
  WHITE: "#ffffff"
};

// Import payment provider icons
import masterCardLogo from "../assets/images/master_card_logo.png";
import visaCardLogo from "../assets/images/visa_card_logo.png";
import applePayLogo from "../assets/images/apple_pay_logo.png";
import googleIcon from "../assets/images/google_icon.png";
import deleteIconWhite from "../assets/images/delete_icon_white.png";
import plusIcon from "../assets/images/plus_icon.svg";

interface PaymentMethod {
  id: string;
  type: 'card' | 'bank' | 'apple_pay' | 'google_pay' | 'paypal';
  title: string;
  subtitle: string;
  icon: string;
  isDefault: boolean;
}

// Sample saved payment methods for withdrawal
const sampleWithdrawalMethods: PaymentMethod[] = [
  {
    id: '1',
    type: 'bank',
    title: 'First Bank Nigeria',
    subtitle: '****6789',
    icon: 'bank',
    isDefault: true
  },
  {
    id: '2', 
    type: 'card',
    title: 'Visa Card',
    subtitle: '****1234',
    icon: visaCardLogo,
    isDefault: false
  }
];

type PaymentType = 'card' | 'bank' | 'apple_pay' | 'google_pay' | 'paypal';

export default function DriverWithdrawal() {
  const [withdrawalMethods, setWithdrawalMethods] = useState<PaymentMethod[]>(sampleWithdrawalMethods);
  const [showAddPayment, setShowAddPayment] = useState(false);
  const [selectedPaymentType, setSelectedPaymentType] = useState<PaymentType | ''>('');
  const [isDefaultPayment, setIsDefaultPayment] = useState(false);
  const [notificationModal, setNotificationModal] = useState<{
    isOpen: boolean;
    type: 'success' | 'error' | 'email';
    title: string;
    message: string;
  }>({
    isOpen: false,
    type: 'success',
    title: '',
    message: ''
  });

  // Sample earnings data
  const availableBalance = 125750; // ₦125,750

  const handleDeletePaymentMethod = (id: string) => {
    setWithdrawalMethods(prev => prev.filter(method => method.id !== id));
    setNotificationModal({
      isOpen: true,
      type: 'success',
      title: 'Payment Method Removed',
      message: 'Your withdrawal method has been successfully removed.'
    });
  };

  const handleSetDefault = (id: string) => {
    setWithdrawalMethods(prev => 
      prev.map(method => ({
        ...method,
        isDefault: method.id === id
      }))
    );
    setNotificationModal({
      isOpen: true,
      type: 'success', 
      title: 'Default Method Updated',
      message: 'Your default withdrawal method has been updated successfully.'
    });
  };

  const handleAddPaymentMethod = () => {
    if (!selectedPaymentType) return;

    const newMethod: PaymentMethod = {
      id: Date.now().toString(),
      type: selectedPaymentType,
      title: selectedPaymentType === 'bank' ? 'New Bank Account' : 'New Card',
      subtitle: '****0000',
      icon: selectedPaymentType === 'card' ? visaCardLogo : 'bank',
      isDefault: isDefaultPayment
    };

    if (isDefaultPayment) {
      setWithdrawalMethods(prev => 
        [...prev.map(method => ({ ...method, isDefault: false })), newMethod]
      );
    } else {
      setWithdrawalMethods(prev => [...prev, newMethod]);
    }

    setNotificationModal({
      isOpen: true,
      type: 'success',
      title: 'Payment Method Added',
      message: 'Your new withdrawal method has been added successfully.'
    });

    // Reset form
    setShowAddPayment(false);
    setSelectedPaymentType('');
    setIsDefaultPayment(false);
  };

  const renderPaymentMethodIcon = (method: PaymentMethod) => {
    switch (method.type) {
      case 'card':
        return (
          <img 
            src={method.icon as string} 
            alt="Card" 
            className="w-8 h-8 object-contain"
          />
        );
      case 'apple_pay':
        return (
          <img 
            src={applePayLogo} 
            alt="Apple Pay" 
            className="w-8 h-8 object-contain"
          />
        );
      case 'google_pay':
        return (
          <img 
            src={googleIcon} 
            alt="Google Pay" 
            className="w-8 h-8 object-contain"
          />
        );
      case 'bank':
        return <Building2 className="h-8 w-8" style={{ color: COLORS.PRIMARY }} />;
      default:
        return <CreditCard className="h-8 w-8" style={{ color: COLORS.PRIMARY }} />;
    }
  };

  const paymentTypeOptions = [
    { value: 'card', label: 'Credit/Debit Card', icon: <CreditCard className="h-5 w-5" /> },
    { value: 'bank', label: 'Bank Transfer', icon: <Building2 className="h-5 w-5" /> },
    { value: 'apple_pay', label: 'Apple Pay', icon: <img src={applePayLogo} alt="Apple Pay" className="w-5 h-5" /> },
    { value: 'google_pay', label: 'Google Pay', icon: <img src={googleIcon} alt="Google Pay" className="w-5 h-5" /> }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-md mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link href="/driver-dashboard">
              <Button 
                variant="ghost" 
                size="sm"
                className="p-2 rounded-full hover:bg-gray-100"
              >
                <ArrowLeft className="h-6 w-6" style={{ color: COLORS.TEXT }} />
              </Button>
            </Link>
            <h1 className="text-xl font-semibold" style={{ color: COLORS.TEXT }}>
              Withdraw Earnings
            </h1>
            <div className="w-10"></div>
          </div>
        </div>
      </div>

      <div className="max-w-md mx-auto p-4 space-y-6">
        {/* Available Balance Card */}
        <Card className="rounded-3xl border" style={{ borderColor: COLORS.PRIMARY }}>
          <CardContent className="p-6">
            <div className="text-center">
              <div className="flex justify-center mb-4">
                <div 
                  className="p-4 rounded-full"
                  style={{ backgroundColor: `${COLORS.PRIMARY}20` }}
                >
                  <DollarSign className="h-8 w-8" style={{ color: COLORS.PRIMARY }} />
                </div>
              </div>
              <h2 className="text-lg font-medium mb-2" style={{ color: COLORS.TEXT }}>
                Available Balance
              </h2>
              <p className="text-4xl font-bold mb-4" style={{ color: COLORS.PRIMARY }}>
                ₦{availableBalance.toLocaleString()}
              </p>
              <p className="text-sm text-gray-500">
                Your earnings ready for withdrawal
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Withdrawal Methods */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold" style={{ color: COLORS.TEXT }}>
              Withdrawal Methods
            </h2>
            <Button
              onClick={() => setShowAddPayment(true)}
              variant="outline"
              size="sm"
              className="rounded-full border-2"
              style={{ 
                borderColor: COLORS.PRIMARY,
                color: COLORS.PRIMARY
              }}
            >
              <img src={plusIcon} alt="Add" className="w-4 h-4 mr-2" />
              Add Method
            </Button>
          </div>

          {/* Payment Methods List */}
          <div className="space-y-3">
            {withdrawalMethods.map((method) => (
              <Card 
                key={method.id}
                className="rounded-3xl border transition-all duration-200"
                style={{ borderColor: '#E5E7EB' }}
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="flex-shrink-0">
                        {renderPaymentMethodIcon(method)}
                      </div>
                      <div>
                        <h3 className="font-medium" style={{ color: COLORS.TEXT }}>
                          {method.title}
                        </h3>
                        <p className="text-sm text-gray-500">{method.subtitle}</p>
                        {method.isDefault && (
                          <div className="flex items-center mt-1">
                            <Check className="h-3 w-3 mr-1" style={{ color: COLORS.PRIMARY }} />
                            <span className="text-xs" style={{ color: COLORS.PRIMARY }}>
                              Default
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      {!method.isDefault && (
                        <Button
                          onClick={() => handleSetDefault(method.id)}
                          variant="ghost"
                          size="sm"
                          className="text-xs px-3 py-1 rounded-full"
                          style={{ 
                            backgroundColor: `${COLORS.PRIMARY}20`,
                            color: COLORS.PRIMARY
                          }}
                        >
                          Set Default
                        </Button>
                      )}
                      <Button
                        onClick={() => handleDeletePaymentMethod(method.id)}
                        variant="ghost"
                        size="sm"
                        className="p-2 rounded-full hover:bg-red-50"
                      >
                        <img 
                          src={deleteIconWhite} 
                          alt="Remove" 
                          className="w-4 h-4"
                          style={{ filter: 'brightness(0) saturate(100%) invert(27%) sepia(51%) saturate(2878%) hue-rotate(176deg) brightness(102%) contrast(97%)' }}
                        />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Add Payment Method Form */}
        {showAddPayment && (
          <Card className="rounded-3xl border" style={{ borderColor: COLORS.PRIMARY }}>
            <CardHeader>
              <CardTitle className="text-lg" style={{ color: COLORS.TEXT }}>
                Add Withdrawal Method
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Payment Type Selection */}
              <div className="space-y-2">
                <Label htmlFor="payment-type">Payment Type</Label>
                <Select value={selectedPaymentType} onValueChange={(value: PaymentType) => setSelectedPaymentType(value)}>
                  <SelectTrigger className="rounded-2xl border" style={{ borderColor: COLORS.PRIMARY }}>
                    <SelectValue placeholder="Select payment type" />
                  </SelectTrigger>
                  <SelectContent>
                    {paymentTypeOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        <div className="flex items-center space-x-2">
                          {option.icon}
                          <span>{option.label}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Dynamic Form Fields */}
              {selectedPaymentType === 'card' && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="card-number">Card Number</Label>
                    <Input
                      id="card-number"
                      placeholder="1234 5678 9012 3456"
                      className="rounded-2xl border"
                      style={{ borderColor: COLORS.PRIMARY }}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="expiry">Expiry Date</Label>
                      <Input
                        id="expiry"
                        placeholder="MM/YY"
                        className="rounded-2xl border"
                        style={{ borderColor: COLORS.PRIMARY }}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="cvv">CVV</Label>
                      <Input
                        id="cvv"
                        placeholder="123"
                        className="rounded-2xl border"
                        style={{ borderColor: COLORS.PRIMARY }}
                      />
                    </div>
                  </div>
                </div>
              )}

              {selectedPaymentType === 'bank' && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="bank-name">Bank Name</Label>
                    <Select>
                      <SelectTrigger className="rounded-2xl border" style={{ borderColor: COLORS.PRIMARY }}>
                        <SelectValue placeholder="Select your bank" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="first-bank">First Bank Nigeria</SelectItem>
                        <SelectItem value="gtbank">GTBank</SelectItem>
                        <SelectItem value="uba">United Bank for Africa</SelectItem>
                        <SelectItem value="zenith">Zenith Bank</SelectItem>
                        <SelectItem value="access">Access Bank</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="account-number">Account Number</Label>
                    <Input
                      id="account-number"
                      placeholder="0123456789"
                      className="rounded-2xl border"
                      style={{ borderColor: COLORS.PRIMARY }}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="account-name">Account Name</Label>
                    <Input
                      id="account-name"
                      placeholder="John Doe"
                      className="rounded-2xl border"
                      style={{ borderColor: COLORS.PRIMARY }}
                    />
                  </div>
                </div>
              )}

              {/* Set as Default Toggle */}
              <div className="flex items-center justify-between py-2">
                <Label htmlFor="default-payment">Set as default withdrawal method</Label>
                <Switch
                  id="default-payment"
                  checked={isDefaultPayment}
                  onCheckedChange={setIsDefaultPayment}
                />
              </div>

              {/* Action Buttons */}
              <div className="flex space-x-3 pt-4">
                <Button
                  onClick={() => setShowAddPayment(false)}
                  variant="outline"
                  className="flex-1 rounded-2xl border"
                  style={{ borderColor: COLORS.PRIMARY, color: COLORS.PRIMARY }}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleAddPaymentMethod}
                  disabled={!selectedPaymentType}
                  className="flex-1 rounded-2xl"
                  style={{ 
                    backgroundColor: COLORS.PRIMARY,
                    color: COLORS.WHITE
                  }}
                >
                  Add Method
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Withdraw Button */}
        {withdrawalMethods.length > 0 && !showAddPayment && (
          <Button 
            className="w-full rounded-2xl py-4 text-lg font-medium"
            style={{ 
              backgroundColor: COLORS.ACTIVE,
              color: COLORS.WHITE
            }}
          >
            Withdraw ₦{availableBalance.toLocaleString()}
          </Button>
        )}
      </div>

      {/* Notification Modal */}
      <NotificationModal
        isOpen={notificationModal.isOpen}
        onClose={() => setNotificationModal(prev => ({ ...prev, isOpen: false }))}
        type={notificationModal.type}
        title={notificationModal.title}
        description={notificationModal.message}
      />
    </div>
  );
}