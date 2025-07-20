import { useState } from "react";
import { useLocation } from "wouter";
import { ArrowLeft, CreditCard, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/hooks/use-auth";

// Import payment method icons
import masterCardLogo from "@/assets/images/master_card_logo.png";
import visaCardLogo from "@/assets/images/visa_card_logo.png";
import applePayLogo from "@/assets/images/apple_pay_logo.png";
import googleIcon from "@/assets/images/google_icon.png";
import deleteIconWhite from "@/assets/images/delete_icon_white.png";
import plusIcon from "@/assets/images/plus_icon.svg";

interface PaymentMethod {
  id: string;
  type: "mastercard" | "visa" | "apple_pay" | "google_pay" | "paypal" | "bank_transfer";
  lastFour: string;
  expiryDate?: string;
  isDefault: boolean;
}

export default function PaymentMethods() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();

  // Sample payment methods data
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([
    {
      id: "1",
      type: "mastercard",
      lastFour: "1234",
      expiryDate: "02/16",
      isDefault: true
    },
    {
      id: "2", 
      type: "mastercard",
      lastFour: "5678",
      expiryDate: "12/25",
      isDefault: false
    },
    {
      id: "3",
      type: "apple_pay",
      lastFour: "9012",
      expiryDate: "08/28",
      isDefault: false
    },
    {
      id: "4",
      type: "google_pay",
      lastFour: "3456",
      expiryDate: "11/26",
      isDefault: false
    },
    {
      id: "5",
      type: "paypal",
      lastFour: "7890",
      expiryDate: "05/27",
      isDefault: false
    },
    {
      id: "6",
      type: "bank_transfer",
      lastFour: "2468",
      expiryDate: "",
      isDefault: false
    }
  ]);

  const getPaymentIcon = (type: string) => {
    switch (type) {
      case "mastercard":
        return <img src={masterCardLogo} alt="MasterCard" className="w-12 h-8 object-contain" />;
      case "visa":
        return <img src={visaCardLogo} alt="Visa" className="w-12 h-8 object-contain" />;
      case "apple_pay":
        return <img src={applePayLogo} alt="Apple Pay" className="w-12 h-6 object-contain" />;
      case "google_pay":
        return <img src={googleIcon} alt="Google Pay" className="w-12 h-6 object-contain" />;
      case "paypal":
        return (
          <svg width="34" height="40" viewBox="0 0 34 40" className="w-8 h-10">
            <path d="M28.2524 3.65072C26.4394 1.5924 23.1619 0.709961 18.9693 0.709961H6.80085C5.94305 0.709961 5.21413 1.33134 5.07983 2.17387L0.013153 34.1802C-0.087574 34.8113 0.403064 35.3831 1.04533 35.3831H8.55761L10.4443 23.4636L10.3859 23.8369C10.5202 22.9944 11.2437 22.373 12.1004 22.373H15.6702C22.6832 22.373 28.1745 19.5358 29.7785 11.3284C29.8262 11.0857 29.8673 10.8494 29.9031 10.6186C29.7005 10.5118 29.7005 10.5118 29.9031 10.6186C30.3807 7.58504 29.8998 5.52025 28.2524 3.65072Z" fill="#003087"/>
            <path d="M13.3189 9.52577C13.5192 9.43083 13.7423 9.37797 13.9763 9.37797H23.5161C24.6458 9.37797 25.6996 9.45133 26.6625 9.6056C26.9387 9.64983 27.2062 9.70053 27.4661 9.75878C27.7261 9.81596 27.9784 9.88069 28.2232 9.95189C28.3456 9.98749 28.4658 10.0242 28.5839 10.063C29.0572 10.2205 29.498 10.4039 29.9031 10.6186C30.3807 7.58396 29.8998 5.52025 28.2524 3.65072C26.4383 1.5924 23.1619 0.709961 18.9693 0.709961H6.79977C5.94305 0.709961 5.21413 1.33134 5.07983 2.17387L0.013153 34.1802C-0.087574 34.8113 0.403064 35.3831 1.04533 35.3831H8.55761L10.4443 23.4636L10.3859 23.8369C10.5202 22.9944 11.2437 22.373 12.1004 22.373H15.6702C22.6832 22.373 28.1745 19.5358 29.7785 11.3284C29.8262 11.0857 29.8673 10.8494 29.9031 10.6186C29.7005 10.5118 29.7005 10.5118 29.9031 10.6186C30.3807 7.58504 29.8998 5.52025 28.2524 3.65072Z" fill="#0070E0"/>
            <path d="M29.7785 11.328C28.1744 19.5343 22.6832 22.3726 15.6702 22.3726H12.0993C11.2425 22.3726 10.519 22.9939 10.3858 23.8365L8.03876 38.6568C7.95103 39.2091 8.37994 39.7097 8.94097 39.7097H15.2738C16.0233 39.7097 16.6612 39.166 16.7782 38.4292L16.8399 38.1077L18.0335 30.5735L18.1104 30.1571C18.2274 29.4203 18.8653 28.8765 19.6148 28.8765H20.5625C26.6971 28.8765 31.5006 26.3943 32.9042 19.215C33.4902 16.2149 33.1869 13.71 31.637 11.9505C31.167 11.4175 30.5625 10.9388 29.9031 10.6186C30.3807 7.58504 29.8998 5.52025 28.2524 3.65072Z" fill="#003087"/>
          </svg>
        );
      case "bank_transfer":
        return <Building2 className="w-8 h-8 text-[#4682b4]" />;
      default:
        return <CreditCard className="w-8 h-8 text-[#4682b4]" />;
    }
  };

  const getPaymentLabel = (type: string) => {
    switch (type) {
      case "mastercard":
        return "MasterCard";
      case "visa":
        return "Visa";
      case "apple_pay":
        return "Apple Pay";
      case "google_pay":
        return "Google Pay";
      case "paypal":
        return "PayPal";
      case "bank_transfer":
        return "Bank Transfer";
      default:
        return "Payment Method";
    }
  };

  const handleDeletePaymentMethod = (id: string) => {
    setPaymentMethods(paymentMethods.filter(method => method.id !== id));
  };

  const handleAddPaymentMethod = () => {
    // Navigate to add payment method page
    setLocation("/add-payment-method");
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center space-x-3">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => setLocation("/dashboard")}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-xl font-semibold text-[#131313]">
              Payment Methods
            </h1>
          </div>
        </div>
      </div>

      {/* Payment Methods List */}
      <div className="p-4 space-y-4">
        {paymentMethods.map((method) => (
          <Card 
            key={method.id} 
            className="bg-white rounded-2xl shadow-md border-2 border-blue-100 hover:border-blue-200 transition-colors"
          >
            <CardContent className="p-4 flex items-center justify-between">
              <div className="flex items-center space-x-4">
                {/* Payment Method Icon */}
                <div className="flex items-center justify-center">
                  {getPaymentIcon(method.type)}
                </div>
                
                {/* Payment Method Details */}
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-gray-500">**** **** ****</span>
                    <span className="text-sm font-medium text-[#131313]">
                      {method.lastFour}
                    </span>
                    {method.isDefault && (
                      <span className="text-xs bg-[#4682b4] text-white px-2 py-1 rounded-full">
                        Default
                      </span>
                    )}
                  </div>
                  <div className="flex items-center space-x-2 mt-1">
                    <span className="text-sm text-gray-600">
                      {getPaymentLabel(method.type)}
                    </span>
                    {method.expiryDate && (
                      <>
                        <span className="text-xs text-gray-400">•</span>
                        <span className="text-xs text-gray-500">
                          {method.expiryDate}
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Delete Button */}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleDeletePaymentMethod(method.id)}
                className="w-8 h-8 bg-[#4682b4] hover:bg-[#010e42] rounded-lg flex items-center justify-center transition-colors"
              >
                <img 
                  src={deleteIconWhite} 
                  alt="Delete" 
                  className="w-5 h-5"
                />
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Add Payment Method Button */}
      <div className="p-4">
        <Button
          onClick={handleAddPaymentMethod}
          className="w-full bg-[#4682b4] hover:bg-[#010e42] text-white rounded-2xl py-4 flex items-center justify-center space-x-3 text-base font-medium transition-colors"
        >
          <img src={plusIcon} alt="Add" className="w-5 h-5" />
          <span>Add Payment Method</span>
        </Button>
      </div>
    </div>
  );
}