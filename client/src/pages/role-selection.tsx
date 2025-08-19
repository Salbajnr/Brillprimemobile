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
          <h1 className="text-lg sm:text-xl font-extrabold text-[var(--brill-primary)] mb-3">Choose Your Role</h1>
          <p className="text-[var(--brill-text-light)] font-light text-sm">Select how you'll be using Brillprime</p>
        </div>

        <div className="space-y-4 mb-8">
          {/* Consumer Role Card */}
          <div 
            className={`cursor-pointer transition-all duration-200 hover:shadow-lg p-6 border rounded-lg ${
              selectedRole === "CONSUMER" ? "ring-2 ring-blue-600 border-blue-600" : "border-gray-200"
            }`}
            onClick={() => setSelectedRole("CONSUMER")}
          >
            <h3 className="text-xl font-semibold mb-2">Consumer</h3>
            <p className="text-gray-600 mb-4">Order products and services</p>
            <button 
              className={`w-full py-2 px-4 rounded transition-colors ${
                selectedRole === "CONSUMER" 
                  ? "bg-blue-600 text-white" 
                  : "border border-gray-300 text-gray-700 hover:bg-gray-50"
              }`}
            >
              {selectedRole === "CONSUMER" ? "Selected" : "Select Role"}
            </button>
          </div>

          {/* Merchant Role Card */}
          <div 
            className={`cursor-pointer transition-all duration-200 hover:shadow-lg p-6 border rounded-lg ${
              selectedRole === "MERCHANT" ? "ring-2 ring-blue-600 border-blue-600" : "border-gray-200"
            }`}
            onClick={() => setSelectedRole("MERCHANT")}
          >
            <h3 className="text-xl font-semibold mb-2">Merchant</h3>
            <p className="text-gray-600 mb-4">Sell products and manage your business</p>
            <button 
              className={`w-full py-2 px-4 rounded transition-colors ${
                selectedRole === "MERCHANT" 
                  ? "bg-blue-600 text-white" 
                  : "border border-gray-300 text-gray-700 hover:bg-gray-50"
              }`}
            >
              {selectedRole === "MERCHANT" ? "Selected" : "Select Role"}
            </button>
          </div>

          {/* Driver Role Card */}
          <div 
            className={`cursor-pointer transition-all duration-200 hover:shadow-lg p-6 border rounded-lg ${
              selectedRole === "DRIVER" ? "ring-2 ring-blue-600 border-blue-600" : "border-gray-200"
            }`}
            onClick={() => setSelectedRole("DRIVER")}
          >
            <h3 className="text-xl font-semibold mb-2">Driver</h3>
            <p className="text-gray-600 mb-4">Deliver orders and earn money</p>
            <button 
              className={`w-full py-2 px-4 rounded transition-colors ${
                selectedRole === "DRIVER" 
                  ? "bg-blue-600 text-white" 
                  : "border border-gray-300 text-gray-700 hover:bg-gray-50"
              }`}
            >
              {selectedRole === "DRIVER" ? "Selected" : "Select Role"}
            </button>
          </div>
        </div>

        <button
          onClick={handleContinue}
          disabled={!selectedRole}
          className={`w-full h-10 sm:h-12 rounded font-medium shadow-lg transition-all text-sm sm:text-base ${
            selectedRole 
              ? "bg-blue-600 text-white hover:bg-blue-700 cursor-pointer" 
              : "bg-gray-300 text-gray-500 cursor-not-allowed"
          }`}
        >
          Continue
        </button>
      </div>
    </div>
  );
}
