import { useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "../hooks/use-auth";
import logoImage from "../assets/images/logo.png";

export default function SplashPage() {
  const [, setLocation] = useLocation();
  const { user, isLoading, isAuthenticated } = useAuth();

  useEffect(() => {
    const timer = setTimeout(() => {
      if (isLoading) {
        // Still loading auth state, wait a bit more
        return;
      }

      if (isAuthenticated() && user) {
        console.log("Splash: User authenticated, redirecting to role dashboard");
        if (user.role === "CONSUMER") {
          setLocation("/consumer-home");
        } else if (user.role === "MERCHANT") {
          setLocation("/merchant-dashboard");
        } else if (user.role === "DRIVER") {
          setLocation("/driver-dashboard");
        } else if (user.role === "ADMIN") {
          setLocation("/admin-dashboard");
        } else {
          setLocation("/consumer-home");
        }
      } else {
        // Check if user has seen onboarding
        const hasSeenOnboarding = localStorage.getItem("hasSeenOnboarding");
        if (hasSeenOnboarding === "true") {
          console.log("Splash: User not authenticated, redirecting to signin");
          setLocation("/signin");
        } else {
          console.log("Splash: New user, redirecting to onboarding");
          setLocation("/onboarding");
        }
      }
    }, 2000); // Show splash for 2 seconds

    return () => clearTimeout(timer);
  }, [setLocation, isLoading, user, isAuthenticated]);

  return (
    <div className="w-full max-w-md mx-auto min-h-screen bg-white flex flex-col items-center justify-center relative overflow-hidden">
      {/* Logo with effects */}
      <div className="flex flex-col items-center justify-center">
        <div className="w-32 h-32 sm:w-40 sm:h-40 md:w-48 md:h-48 lg:w-56 lg:h-56 flex items-center justify-center">
          <img
            src={logoImage}
            alt="Brill Prime Logo"
            className="w-24 h-24 sm:w-32 sm:h-32 md:w-40 md:h-40 lg:w-48 lg:h-48 object-contain animate-bounce"
            style={{ animationDuration: '2s' }}
            onError={(e) => {
              // If image fails to load, show text fallback
              const target = e.currentTarget;
              target.style.display = 'none';
              const fallback = document.createElement('div');
              fallback.className = 'w-24 h-24 sm:w-32 sm:h-32 md:w-40 md:h-40 lg:w-48 lg:h-48 bg-blue-600 rounded-full flex items-center justify-center text-white text-2xl font-bold animate-bounce';
              fallback.textContent = 'BP';
              fallback.style.animationDuration = '2s';
              target.parentElement!.appendChild(fallback);
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