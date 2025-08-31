import { useState } from "react";
import { useLocation } from "wouter";
import { ArrowLeft, CreditCard, Building2 } from "lucide-react";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Switch } from "../components/ui/switch";

// Import payment method icons
import masterCardLogo from "../assets/images/master_card_logo.png";
import visaCardLogo from "../assets/images/visa_card_logo.png";
import applePayLogo from "../assets/images/apple_pay_logo.png";
import googleIcon from "../assets/images/google_icon.png";

export default function AddPaymentMethod() {
  const [, setLocation] = useLocation();
  const [selectedType, setSelectedType] = useState<string>("");
  const [cardNumber, setCardNumber] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [cvv, setCvv] = useState("");
  const [cardholderName, setCardholderName] = useState("");
  const [isDefault, setIsDefault] = useState(false);

  const paymentTypes = [
    {
      id: "mastercard",
      name: "MasterCard",
      icon: <img src={masterCardLogo} alt="MasterCard" className="w-8 h-5 object-contain" />
    },
    {
      id: "visa",
      name: "Visa",
      icon: (
        <div className="w-8 h-5 bg-[#1A1F71] rounded flex items-center justify-center">
          <span className="text-white font-bold text-xs">VISA</span>
        </div>
      )
    },
    {
      id: "apple_pay",
      name: "Apple Pay",
      icon: <img src={applePayLogo} alt="Apple Pay" className="w-8 h-5 object-contain" />
    },
    {
      id: "google_pay",
      name: "Google Pay",
      icon: (
        <svg width="32" height="20" viewBox="0 0 61 25" className="w-8 h-5">
          <g fill="none" fillRule="evenodd">
            <path d="M25.326 5.495c0 .907-.26 1.62-.778 2.139-.651.651-1.575 1.037-2.678 1.037-1.103 0-2.027-.386-2.678-1.037-.519-.519-.778-1.232-.778-2.139s.26-1.62.778-2.139c.651-.651 1.575-1.037 2.678-1.037 1.103 0 2.027.386 2.678 1.037.519.519.778 1.232.778 2.139z" fill="#EA4335"/>
            <path d="M46.045 5.495c0 .907-.26 1.62-.778 2.139-.651.651-1.575 1.037-2.678 1.037-1.103 0-2.027-.386-2.678-1.037-.519-.519-.778-1.232-.778-2.139s.26-1.62.778-2.139c.651-.651 1.575-1.037 2.678-1.037 1.103 0 2.027.386 2.678 1.037.519.519.778 1.232.778 2.139z" fill="#4285F4"/>
            <path d="M35.686 5.495c0 .907-.26 1.62-.778 2.139-.651.651-1.575 1.037-2.678 1.037-1.103 0-2.027-.386-2.678-1.037-.519-.519-.778-1.232-.778-2.139s.26-1.62.778-2.139c.651-.651 1.575-1.037 2.678-1.037 1.103 0 2.027.386 2.678 1.037.519.519.778 1.232.778 2.139z" fill="#34A853"/>
            <path d="M56.405 5.495c0 .907-.26 1.62-.778 2.139-.651.651-1.575 1.037-2.678 1.037-1.103 0-2.027-.386-2.678-1.037-.519-.519-.778-1.232-.778-2.139s.26-1.62.778-2.139c.651-.651 1.575-1.037 2.678-1.037 1.103 0 2.027.386 2.678 1.037.519.519.778 1.232.778 2.139z" fill="#FBBC04"/>
          </g>
        </svg>
      )
    },
    {
      id: "paypal",
      name: "PayPal",
      icon: (
        <svg width="20" height="24" viewBox="0 0 34 40" className="w-5 h-6">
          <path d="M28.2524 3.65072C26.4394 1.5924 23.1619 0.709961 18.9693 0.709961H6.80085C5.94305 0.709961 5.21413 1.33134 5.07983 2.17387L0.013153 34.1802C-0.087574 34.8113 0.403064 35.3831 1.04533 35.3831H8.55761L10.4443 23.4636L10.3859 23.8369C10.5202 22.9944 11.2437 22.373 12.1004 22.373H15.6702C22.6832 22.373 28.1745 19.5358 29.7785 11.3284C29.8262 11.0857 29.8673 10.8494 29.9031 10.6186C29.7005 10.5118 29.7005 10.5118 29.9031 10.6186C30.3807 7.58504 29.8998 5.52025 28.2524 3.65072Z" fill="#003087"/>
          <path d="M13.3189 9.52577C13.5192 9.43083 13.7423 9.37797 13.9763 9.37797H23.5161C24.6458 9.37797 25.6996 9.45133 26.6625 9.6056C26.9387 9.64983 27.2062 9.70053 27.4661 9.75878C27.7261 9.81596 27.9784 9.88069 28.2232 9.95189C28.3456 9.98749 28.4658 10.0242 28.5839 10.063C29.0572 10.2205 29.498 10.4039 29.9031 10.6186C30.3807 7.58396 29.8998 5.52025 28.2524 3.65072C26.4383 1.5924 23.1619 0.709961 18.9693 0.709961H6.79977C5.94305 0.709961 5.21413 1.33134 5.07983 2.17387L0.013153 34.1802C-0.087574 34.8113 0.403064 35.3831 1.04533 35.3831H8.55761L10.4443 23.4636L10.3859 23.8369C10.5202 22.9944 11.2437 22.373 12.1004 22.373H15.6702C22.6832 22.373 28.1745 19.5358 29.7785 11.3284C29.8262 11.0857 29.8673 10.8494 29.9031 10.6186C29.7005 10.5118 29.7005 10.5118 29.9031 10.6186C30.3807 7.58504 29.8998 5.52025 28.2524 3.65072Z" fill="#0070E0"/>
        </svg>
      )
    },
    {
      id: "bank_transfer",
      name: "Bank Transfer",
      icon: <Building2 className="w-5 h-5 text-[#4682b4]" />
    }
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Here you would typically save the payment method
    console.log("Adding payment method:", {
      type: selectedType,
      cardNumber,
      expiryDate,
      cvv,
      cardholderName,
      isDefault
    });
    // Navigate back to payment methods
    setLocation("/payment-methods");
  };

  const formatCardNumber = (value: string) => {
    // Remove all non-digit characters
    const cleaned = value.replace(/\D/g, '');
    // Add spaces every 4 digits
    const formatted = cleaned.replace(/(\d{4})(?=\d)/g, '$1 ');
    return formatted;
  };

  const formatExpiryDate = (value: string) => {
    // Remove all non-digit characters
    const cleaned = value.replace(/\D/g, '');
    // Add slash after 2 digits
    if (cleaned.length >= 2) {
      return cleaned.substring(0, 2) + '/' + cleaned.substring(2, 4);
    }
    return cleaned;
  };

  return (
    <div className="min-h-screen bg-gray-50 w-full max-w-sm sm:max-w-md md:max-w-lg lg:max-w-xl xl:max-w-2xl mx-auto px-2 sm:px-4">{/*Responsive container*/}
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center space-x-3">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => setLocation("/payment-methods")}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-xl font-semibold text-[#131313]">
              Add Payment Method
            </h1>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="p-4 space-y-6">
        {/* Payment Type Selection */}
        <Card className="border-2 border-blue-100">
          <CardContent className="p-4">
            <Label className="text-base font-medium text-[#131313] mb-4 block">
              Select Payment Type
            </Label>
            <div className="grid grid-cols-2 gap-3">
              {paymentTypes.map((type) => (
                <div
                  key={type.id}
                  className={`p-3 rounded-xl border-2 cursor-pointer transition-all ${
                    selectedType === type.id
                      ? "border-[#4682b4] bg-blue-50"
                      : "border-gray-200 hover:border-blue-200"
                  }`}
                  onClick={() => setSelectedType(type.id)}
                >
                  <div className="flex items-center space-x-2">
                    {type.icon}
                    <span className="text-sm font-medium text-[#131313]">
                      {type.name}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Card Details Form */}
        {selectedType && selectedType !== "bank_transfer" && (
          <Card className="border-2 border-blue-100">
            <CardContent className="p-4 space-y-4">
              <Label className="text-base font-medium text-[#131313] block">
                Payment Details
              </Label>

              {selectedType !== "paypal" && selectedType !== "apple_pay" && selectedType !== "google_pay" && (
                <>
                  <div>
                    <Label htmlFor="cardNumber" className="text-sm text-gray-700">
                      Card Number
                    </Label>
                    <Input
                      id="cardNumber"
                      type="text"
                      placeholder="1234 5678 9012 3456"
                      value={formatCardNumber(cardNumber)}
                      onChange={(e) => setCardNumber(e.target.value.replace(/\s/g, ''))}
                      maxLength={19}
                      className="mt-1"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="expiryDate" className="text-sm text-gray-700">
                        Expiry Date
                      </Label>
                      <Input
                        id="expiryDate"
                        type="text"
                        placeholder="MM/YY"
                        value={formatExpiryDate(expiryDate)}
                        onChange={(e) => setExpiryDate(e.target.value)}
                        maxLength={5}
                        className="mt-1"
                      />
                    </div>

                    <div>
                      <Label htmlFor="cvv" className="text-sm text-gray-700">
                        CVV
                      </Label>
                      <Input
                        id="cvv"
                        type="text"
                        placeholder="123"
                        value={cvv}
                        onChange={(e) => setCvv(e.target.value.replace(/\D/g, ''))}
                        maxLength={4}
                        className="mt-1"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="cardholderName" className="text-sm text-gray-700">
                      Cardholder Name
                    </Label>
                    <Input
                      id="cardholderName"
                      type="text"
                      placeholder="John Doe"
                      value={cardholderName}
                      onChange={(e) => setCardholderName(e.target.value)}
                      className="mt-1"
                    />
                  </div>
                </>
              )}

              {(selectedType === "paypal" || selectedType === "apple_pay" || selectedType === "google_pay") && (
                <div className="text-center py-8">
                  <p className="text-gray-600">
                    You will be redirected to {paymentTypes.find(t => t.id === selectedType)?.name} to complete the setup.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Bank Transfer Form */}
        {selectedType === "bank_transfer" && (
          <Card className="border-2 border-blue-100">
            <CardContent className="p-4 space-y-4">
              <Label className="text-base font-medium text-[#131313] block">
                Bank Details
              </Label>

              <div>
                <Label htmlFor="bankName" className="text-sm text-gray-700">
                  Bank Name
                </Label>
                <Input
                  id="bankName"
                  type="text"
                  placeholder="First Bank of Nigeria"
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="accountNumber" className="text-sm text-gray-700">
                  Account Number
                </Label>
                <Input
                  id="accountNumber"
                  type="text"
                  placeholder="1234567890"
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="accountName" className="text-sm text-gray-700">
                  Account Name
                </Label>
                <Input
                  id="accountName"
                  type="text"
                  placeholder="John Doe"
                  className="mt-1"
                />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Default Payment Method Toggle */}
        {selectedType && (
          <Card className="border-2 border-blue-100">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-base font-medium text-[#131313]">
                    Set as Default
                  </Label>
                  <p className="text-sm text-gray-600 mt-1">
                    Use this as your primary payment method
                  </p>
                </div>
                <Switch
                  checked={isDefault}
                  onCheckedChange={setIsDefault}
                />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Submit Button */}
        <Button
          type="submit"
          disabled={!selectedType}
          className="w-full bg-[#4682b4] hover:bg-[#010e42] text-white rounded-2xl py-4 text-base font-medium transition-colors"
        >
          Add Payment Method
        </Button>
      </form>
    </div>
  );
}