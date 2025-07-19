import { useEffect } from "react";
import { useLocation } from "wouter";
import logo from "../assets/images/logo.png";

export default function SplashPage() {
  const [, setLocation] = useLocation();

  useEffect(() => {
    const timer = setTimeout(() => {
      setLocation("/onboarding");
    }, 4000); // Show splash for 4 seconds

    return () => clearTimeout(timer);
  }, [setLocation]);

  return (
    <div className="w-full max-w-md mx-auto min-h-screen bg-white flex flex-col items-center justify-center relative overflow-hidden">
      {/* Logo with effects */}
      <div className="flex flex-col items-center justify-center">
        <div className="w-32 h-32 sm:w-40 sm:h-40 md:w-48 md:h-48 lg:w-56 lg:h-56 bg-white rounded-full flex items-center justify-center shadow-2xl animate-pulse">
          <img 
            src={logo} 
            alt="Brillprime Logo" 
            className="w-24 h-24 sm:w-32 sm:h-32 md:w-40 md:h-40 lg:w-48 lg:h-48 object-contain animate-bounce"
            style={{ animationDuration: '2s' }}
          />
        </div>
        
        {/* Loading animation */}
        <div className="mt-8 flex space-x-2">
          <div className="w-3 h-3 bg-[var(--brill-secondary)] rounded-full animate-bounce"></div>
          <div className="w-3 h-3 bg-[var(--brill-secondary)] rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
          <div className="w-3 h-3 bg-[var(--brill-secondary)] rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
        </div>
      </div>
    </div>
  );
}