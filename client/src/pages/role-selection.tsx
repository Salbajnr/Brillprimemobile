import { useState } from "react";

// Using direct path to avoid import issues during development
const signUpLogo = "/src/assets/images/sign_up_option_logo.png";

export default function RoleSelectionPage() {
  const [selectedRole, setSelectedRole] = useState<"CONSUMER" | "MERCHANT" | "DRIVER" | null>(null);

  const handleContinue = () => {
    if (selectedRole) {
      // Store selected role in localStorage for now
      localStorage.setItem("selectedRole", selectedRole);
      // For now, just show an alert - in production this would go to signup
      alert(`Role selected: ${selectedRole}. This would normally go to signup.`);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto min-h-screen bg-white flex flex-col">
      <div className="flex-1 flex flex-col justify-center px-4 sm:px-6 py-6 sm:py-8">
        <div className="text-center mb-8 sm:mb-12">
          <div className="w-16 h-16 sm:w-20 sm:h-20 bg-white rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-6 shadow-lg">
            <img src={signUpLogo} alt="Sign Up" className="w-12 h-12 sm:w-16 sm:h-16 object-contain" />
          </div>
          <h1 className="text-lg sm:text-xl font-extrabold text-[#2d3748] mb-3">Choose Your Role</h1>
          <p className="text-[#718096] font-light text-sm">Select how you'll be using Brillprime</p>
        </div>

        <div className="space-y-4 mb-8">
          {/* Consumer Button */}
          <button 
            className={`w-full py-4 px-6 text-center border transition-all duration-200 hover:shadow-lg ${
              selectedRole === "CONSUMER" 
                ? "bg-[#f8f9fa] text-[#2d3748] border-gray-300" 
                : "bg-[#2d3748] text-white border-[#2d3748] hover:bg-[#f8f9fa] hover:text-[#2d3748]"
            }`}
            style={{ borderRadius: '25px' }}
            onClick={() => setSelectedRole("CONSUMER")}
          >
            <div className="font-semibold text-lg">Consumer</div>
          </button>

          {/* Merchant Button */}
          <button 
            className={`w-full py-4 px-6 text-center border transition-all duration-200 hover:shadow-lg ${
              selectedRole === "MERCHANT" 
                ? "bg-[#f8f9fa] text-[#2d3748] border-gray-300" 
                : "bg-[#2d3748] text-white border-[#2d3748] hover:bg-[#f8f9fa] hover:text-[#2d3748]"
            }`}
            style={{ borderRadius: '25px' }}
            onClick={() => setSelectedRole("MERCHANT")}
          >
            <div className="font-semibold text-lg">Merchant</div>
          </button>

          {/* Driver Button */}
          <button 
            className={`w-full py-4 px-6 text-center border transition-all duration-200 hover:shadow-lg ${
              selectedRole === "DRIVER" 
                ? "bg-[#f8f9fa] text-[#2d3748] border-gray-300" 
                : "bg-[#2d3748] text-white border-[#2d3748] hover:bg-[#f8f9fa] hover:text-[#2d3748]"
            }`}
            style={{ borderRadius: '25px' }}
            onClick={() => setSelectedRole("DRIVER")}
          >
            <div className="font-semibold text-lg">Driver</div>
          </button>
        </div>

        <button
          onClick={handleContinue}
          disabled={!selectedRole}
          className={`w-full py-4 px-6 font-medium shadow-lg transition-all text-base ${
            selectedRole 
              ? "bg-[#4682B4] text-white hover:bg-[#3a70a0] cursor-pointer" 
              : "bg-gray-300 text-gray-500 cursor-not-allowed"
          }`}
          style={{ borderRadius: '25px' }}
        >
          Continue
        </button>
      </div>
    </div>
  );
}
