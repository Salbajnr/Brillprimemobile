import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "../components/ui/button";
import { RoleCard } from "../components/ui/role-card";
import { useAuth } from "../hooks/use-auth";
// Using direct path to avoid import issues during development
const signUpLogo = "/src/assets/images/sign_up_option_logo.png";

export default function RoleSelectionPage() {
  const [selectedRole, setSelectedRole] = useState<"CONSUMER" | "MERCHANT" | "DRIVER" | null>(null);
  const [, setLocation] = useLocation();
  const { setSelectedRole: setAuthRole } = useAuth();

  const handleContinue = () => {
    if (selectedRole) {
      setAuthRole(selectedRole);
      // All users go to signup regardless of role
      // Driver tier selection happens after OTP verification
      setLocation("/signup");
    }
  };

  return (
    <div className="w-full max-w-md mx-auto min-h-screen bg-white flex flex-col">
      <div className="flex-1 flex flex-col justify-center px-4 sm:px-6 py-6 sm:py-8">
        <div className="text-center mb-8 sm:mb-12">
          <div className="w-16 h-16 sm:w-20 sm:h-20 bg-white rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-6 shadow-lg">
            <img src={signUpLogo} alt="Sign Up" className="w-12 h-12 sm:w-16 sm:h-16 object-contain" />
          </div>
          <h1 className="text-lg sm:text-xl font-extrabold text-[var(--brill-primary)] mb-3">Choose Your Role</h1>
          <p className="text-[var(--brill-text-light)] font-light text-sm">Select how you'll be using Brillprime</p>
        </div>

        <div className="space-y-4 mb-8">
          <RoleCard
            title="Consumer"
            description="Order products and services"
            isSelected={selectedRole === "CONSUMER"}
            onSelect={() => setSelectedRole("CONSUMER")}
          />
          <RoleCard
            title="Merchant"
            description="Sell products and manage your business"
            isSelected={selectedRole === "MERCHANT"}
            onSelect={() => setSelectedRole("MERCHANT")}
          />
          <RoleCard
            title="Driver"
            description="Deliver orders and earn money"
            isSelected={selectedRole === "DRIVER"}
            onSelect={() => setSelectedRole("DRIVER")}
          />
        </div>

        <Button
          onClick={handleContinue}
          disabled={!selectedRole}
          className="w-full h-10 sm:h-12 rounded-brill font-medium shadow-lg btn-scale disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base bg-[var(--brill-active)] text-[var(--brill-white)] hover:bg-[var(--brill-secondary)]"
        >
          Continue
        </Button>
      </div>
    </div>
  );
}
