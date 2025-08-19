import { useEffect } from "react";
import { useLocation } from "wouter";
import logoImage from "../assets/images/logo.png";

export default function SplashPage() {
  const [, setLocation] = useLocation();

  useEffect(() => {
    const timer = setTimeout(() => {
      // Always go to onboarding for now, bypassing auth checks
      console.log("Splash: Redirecting to onboarding");
      setLocation("/onboarding");
    }, 2000); // Show splash for 2 seconds

    return () => clearTimeout(timer);
  }, [setLocation]);

  return (
    <div className="w-full max-w-md mx-auto min-h-screen bg-white flex flex-col items-center justify-center relative overflow-hidden">
      {/* Logo with effects */}
      <div className="flex flex-col items-center justify-center">
        <div className="w-32 h-32 sm:w-40 sm:h-40 md:w-48 md:h-48 lg:w-56 lg:h-56 bg-blue-600 rounded-full flex items-center justify-center shadow-2xl animate-pulse">
          <img 
            src={logoImage} 
            alt="Brillprime Logo" 
            className="w-24 h-24 sm:w-32 sm:h-32 md:w-40 md:h-40 lg:w-48 lg:h-48 object-contain animate-bounce"
            style={{ animationDuration: '2s' }}
            onError={(e) => {
              // If image fails to load, show text fallback
              e.currentTarget.style.display = 'none';
              e.currentTarget.parentElement!.innerHTML = '<div class="text-white text-2xl font-bold">BP</div>';
            }}
          />
        </div>
        
        {/* Loading animation */}
        <div className="mt-8 flex space-x-2">
          <div className="w-3 h-3 bg-blue-600 rounded-full animate-bounce"></div>
          <div className="w-3 h-3 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
          <div className="w-3 h-3 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
        </div>
      </div>
    </div>
  );
}