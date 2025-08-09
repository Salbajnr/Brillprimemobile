import { useState } from "react";
import { Shield, Users, ChevronRight, Star, Lock, Unlock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";

export default function DriverTierSelectionPage() {
  const [selectedTier, setSelectedTier] = useState<"RESTRICTED" | "OPEN" | null>(null);
  const [, setLocation] = useLocation();
  const { user } = useAuth();

  const handleContinue = () => {
    if (selectedTier) {
      // Store selected tier in session storage
      sessionStorage.setItem('selectedDriverTier', selectedTier);
      // Set flag to prompt KYC verification on dashboard
      sessionStorage.setItem('promptKYCVerification', 'true');
      // Navigate directly to driver dashboard
      setLocation('/driver-dashboard');
    }
  };

  const tierData = {
    RESTRICTED: {
      title: "Premium Driver - Restricted Access",
      subtitle: "High-Security Transport Services",
      icon: <Shield className="w-12 h-12 text-blue-600" />,
      earnings: "₦500,000 - ₦2,000,000/month",
      color: "border-blue-500",
      bgColor: "bg-blue-50",
      features: [
        "Transport high-value items (Jewelry, Electronics, Documents)",
        "Enhanced background verification required",
        "Bond insurance coverage included",
        "Premium earnings up to ₦2M monthly",
        "Exclusive access to sensitive deliveries",
        "Advanced security clearance levels",
        "Professional indemnity coverage"
      ],
      requirements: [
        "Comprehensive background check",
        "Security clearance verification",
        "Bond insurance enrollment",
        "Professional driving certification",
        "Reference verification",
        "Criminal record clearance"
      ],
      restrictions: [
        "Limited to approved drivers only",
        "Strict vetting process",
        "Insurance requirements",
        "Regular performance reviews",
        "Security protocol compliance"
      ]
    },
    OPEN: {
      title: "Standard Driver - Open Access",
      subtitle: "General Delivery Services",
      icon: <Users className="w-12 h-12 text-green-600" />,
      earnings: "₦50,000 - ₦300,000/month",
      color: "border-green-500",
      bgColor: "bg-green-50",
      features: [
        "General package delivery services",
        "Food and grocery deliveries",
        "Standard fuel delivery services",
        "Flexible working hours",
        "Quick registration process",
        "Immediate start after approval",
        "Basic earnings structure"
      ],
      requirements: [
        "Valid driver's license",
        "Vehicle registration",
        "Basic identity verification",
        "Phone number verification",
        "Vehicle insurance proof"
      ],
      restrictions: [
        "Cannot handle high-value items",
        "No access to sensitive deliveries",
        "Standard earning rates only",
        "Basic support level"
      ]
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8 pt-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Choose Your Driver Tier</h1>
          <p className="text-gray-600 text-lg">
            Select the driver access level that best fits your goals and qualifications
          </p>
        </div>

        {/* Tier Cards */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          {Object.entries(tierData).map(([tier, data]) => (
            <Card
              key={tier}
              className={`cursor-pointer transition-all duration-300 hover:shadow-lg rounded-3xl card-3d ${
                selectedTier === tier 
                  ? `${data.color} ring-2 ring-offset-2 ring-blue-500 shadow-lg` 
                  : 'border-blue-100'
              }`}
              onClick={() => setSelectedTier(tier as "RESTRICTED" | "OPEN")}
            >
              <CardHeader className={`text-center ${data.bgColor} rounded-t-3xl`}>
                <div className="flex justify-center mb-4">
                  {data.icon}
                </div>
                <CardTitle className="text-xl font-bold text-gray-900">
                  {data.title}
                </CardTitle>
                <CardDescription className="text-gray-600 font-medium">
                  {data.subtitle}
                </CardDescription>
                <Badge variant="outline" className="mx-auto mt-2 bg-white">
                  <Star className="w-4 h-4 mr-1" />
                  {data.earnings}
                </Badge>
              </CardHeader>

              <CardContent className="p-6">
                {/* Features */}
                <div className="mb-6">
                  <h4 className="font-semibold text-gray-900 mb-3 flex items-center">
                    <ChevronRight className="w-4 h-4 mr-1 text-green-600" />
                    Key Features
                  </h4>
                  <ul className="space-y-2">
                    {data.features.slice(0, 4).map((feature, idx) => (
                      <li key={idx} className="text-sm text-gray-600 flex items-start">
                        <div className="w-2 h-2 rounded-full bg-green-500 mt-2 mr-3 flex-shrink-0"></div>
                        {feature}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Requirements Preview */}
                <div className="mb-4">
                  <h4 className="font-semibold text-gray-900 mb-2 flex items-center">
                    <Lock className="w-4 h-4 mr-1 text-orange-600" />
                    Requirements
                  </h4>
                  <p className="text-sm text-gray-600">
                    {data.requirements.length} verification steps required
                  </p>
                </div>

                {/* Access Level */}
                <div className="flex items-center justify-between pt-4 border-t">
                  <span className="text-sm font-medium text-gray-700">
                    Access Level:
                  </span>
                  <Badge variant={tier === 'RESTRICTED' ? 'destructive' : 'secondary'}>
                    {tier === 'RESTRICTED' ? (
                      <>
                        <Lock className="w-3 h-3 mr-1" />
                        Restricted
                      </>
                    ) : (
                      <>
                        <Unlock className="w-3 h-3 mr-1" />
                        Open Access
                      </>
                    )}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Selection Summary */}
        {selectedTier && (
          <Card className="mb-6 bg-blue-50 border-blue-200 rounded-3xl card-3d">
            <CardContent className="p-6">
              <h3 className="font-bold text-gray-900 mb-2">
                You've selected: {tierData[selectedTier].title}
              </h3>
              <p className="text-gray-700 mb-4">
                {selectedTier === 'RESTRICTED' 
                  ? "You'll have access to high-value deliveries after completing our comprehensive verification process."
                  : "You can start with general deliveries immediately after basic verification."
                }
              </p>
              <div className="grid md:grid-cols-2 gap-4 text-sm">
                <div>
                  <h4 className="font-semibold mb-2">Next Steps:</h4>
                  <ul className="space-y-1 text-gray-600">
                    {tierData[selectedTier].requirements.slice(0, 3).map((req, idx) => (
                      <li key={idx}>• {req}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">Expected Timeline:</h4>
                  <p className="text-gray-600">
                    {selectedTier === 'RESTRICTED' 
                      ? "7-14 days for full verification"
                      : "1-3 days for basic approval"
                    }
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Continue Button */}
        <div className="text-center">
          <Button
            onClick={handleContinue}
            disabled={!selectedTier}
            size="lg"
            className="bg-[var(--brill-secondary)] hover:bg-[var(--brill-active)] text-white px-12 py-3 text-lg font-medium rounded-3xl btn-3d"
          >
            Continue with {selectedTier ? tierData[selectedTier].title.split(' - ')[0] : 'Selection'}
            <ChevronRight className="w-5 h-5 ml-2" />
          </Button>

          <p className="text-sm text-gray-500 mt-4">
            You can always upgrade your tier later through your driver dashboard
          </p>
        </div>
      </div>
    </div>
  );
}