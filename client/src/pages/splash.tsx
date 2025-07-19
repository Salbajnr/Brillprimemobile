import { useEffect } from "react";
import { useLocation } from "wouter";
import logo from "../assets/images/logo.png";

export default function SplashPage() {
  const [, setLocation] = useLocation();

  useEffect(() => {
    const timer = setTimeout(() => {
      setLocation("/onboarding");
    }, 2500); // Show splash for 2.5 seconds

    return () => clearTimeout(timer);
  }, [setLocation]);

  return (
    <div className="w-full max-w-md mx-auto min-h-screen bg-white flex flex-col items-center justify-center relative overflow-hidden px-4">
      {/* Background gradient */}
      <div className="absolute inset-0 gradient-bg opacity-10"></div>
      
      {/* Logo */}
      <div className="relative z-10 flex flex-col items-center justify-center w-full">
        <div className="w-28 h-28 sm:w-32 sm:h-32 md:w-40 md:h-40 lg:w-48 lg:h-48 bg-white rounded-full flex items-center justify-center shadow-2xl mb-6 sm:mb-8 animate-pulse">
          <img 
            src={logo} 
            alt="Brillprime Logo" 
            className="w-20 h-20 sm:w-24 sm:h-24 md:w-32 md:h-32 lg:w-40 lg:h-40 object-contain"
          />
        </div>
        
        <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-extrabold text-[var(--brill-primary)] mb-3 sm:mb-4 text-center">
          Brillprime
        </h1>
        
        <p className="text-[var(--brill-text-light)] text-sm sm:text-base md:text-lg text-center max-w-xs sm:max-w-sm px-2">
          Your trusted financial partner
        </p>
        
        {/* Loading animation */}
        <div className="mt-6 sm:mt-8 flex space-x-2">
          <div className="w-2 h-2 bg-[var(--brill-secondary)] rounded-full animate-bounce"></div>
          <div className="w-2 h-2 bg-[var(--brill-secondary)] rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
          <div className="w-2 h-2 bg-[var(--brill-secondary)] rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
        </div>
      </div>
    </div>
  );
}