import { useState } from "react";
import { useLocation } from "wouter";
import { Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { RoleCard } from "@/components/ui/role-card";
import { useAuth } from "@/hooks/use-auth";

export default function RoleSelectionPage() {
  const [selectedRole, setSelectedRole] = useState<"DRIVER" | "VENDOR" | null>(null);
  const [, setLocation] = useLocation();
  const { setSelectedRole: setAuthRole } = useAuth();

  const handleContinue = () => {
    if (selectedRole) {
      setAuthRole(selectedRole);
      setLocation("/signup");
    }
  };

  return (
    <div className="max-w-md mx-auto min-h-screen bg-white">
      <div className="px-6 py-8 pt-16">
        <div className="text-center mb-12">
          <div className="w-20 h-20 gradient-bg rounded-full flex items-center justify-center mx-auto mb-6">
            <Users className="text-white h-6 w-6" />
          </div>
          <h1 className="text-xl font-extrabold text-[var(--brill-primary)] mb-3">Choose Your Role</h1>
          <p className="text-[var(--brill-text-light)] font-light text-sm">Select how you'll be using Brillprime</p>
        </div>

        <div className="space-y-4 mb-8">
          <RoleCard
            role="DRIVER"
            isSelected={selectedRole === "DRIVER"}
            onSelect={() => setSelectedRole("DRIVER")}
          />
          <RoleCard
            role="VENDOR"
            isSelected={selectedRole === "VENDOR"}
            onSelect={() => setSelectedRole("VENDOR")}
          />
        </div>

        <Button
          onClick={handleContinue}
          disabled={!selectedRole}
          className="w-full h-14 gradient-bg rounded-brill text-white font-medium shadow-lg btn-scale disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Continue
        </Button>
      </div>
    </div>
  );
}
