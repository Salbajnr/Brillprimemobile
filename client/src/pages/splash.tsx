import { useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import logo from "../assets/images/logo.png";

export default function SplashPage() {
  const [, setLocation] = useLocation();
  const { user, isAuthenticated } = useAuth();

  useEffect(() => {
    const timer = setTimeout(() => {
      // Check user authentication state after splash screen
      if (isAuthenticated() && user) {
        // Returning user with valid session → Dashboard
        setLocation("/dashboard");
      } else {
        // Check if user has seen onboarding before
        const hasSeenOnboarding = localStorage.getItem("hasSeenOnboarding");
        if (hasSeenOnboarding) {
          // Returning user (invalid session) → Account Type Selection
          setLocation("/role-selection");
        } else {
          // First-time user → Onboarding
          setLocation("/onboarding");
        }
      }
    }, 5000); // Show splash for 5 seconds as requested

    return () => clearTimeout(timer);
  }, [setLocation, user, isAuthenticated]);

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
          <div className="w-3 h-3 bg-[var(--brill-primary)] rounded-full animate-bounce"></div>
          <div className="w-3 h-3 bg-[var(--brill-primary)] rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
          <div className="w-3 h-3 bg-[var(--brill-primary)] rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
        </div>
      </div>
    </div>
  );
}