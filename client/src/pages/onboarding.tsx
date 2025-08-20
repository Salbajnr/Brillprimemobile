import { useState, useEffect } from "react";
import { useLocation } from "wouter";
// Using direct paths to avoid import issues during development
const onboardingImg1 = "/src/assets/images/onboarding_img1.png";
const onboardingImg2 = "/src/assets/images/onboarding_img2.png";
const onboardingImg3 = "/src/assets/images/onboarding_img3.png";

const onboardingData = [
  {
    title: "Welcome to\nBrillprime",
    description: "Your trusted financial partner for secure transactions and seamless money management",
    image: onboardingImg1,
  },
  {
    title: "Smart Financial\nManagement",
    description: "Track your expenses, manage multiple accounts, and make informed financial decisions with our advanced analytics",
    image: onboardingImg2,
  },
  {
    title: "Bank-Level\nSecurity",
    description: "Your data is protected with end-to-end encryption, biometric authentication, and advanced fraud detection",
    image: onboardingImg3,
  },
];

export default function OnboardingPage() {
  const [currentStep, setCurrentStep] = useState(1);
  const [imagesLoaded, setImagesLoaded] = useState(false);
  const [, setLocation] = useLocation();

  const currentData = onboardingData[currentStep - 1];

  // Preload all images
  useEffect(() => {
    const imagePromises = onboardingData.map((data) => {
      return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = resolve;
        img.onerror = reject;
        img.src = data.image;
      });
    });

    Promise.all(imagePromises)
      .then(() => setImagesLoaded(true))
      .catch(() => setImagesLoaded(true)); // Still show content even if images fail
  }, []);

  const handleNext = () => {
    if (currentStep < onboardingData.length) {
      setCurrentStep(currentStep + 1);
    } else {
      // Mark that user has seen onboarding
      localStorage.setItem("hasSeenOnboarding", "true");
      setLocation("/role-selection");
    }
  };

  // Show loading screen until images are preloaded
  if (!imagesLoaded) {
    return (
      <div className="w-full max-w-md mx-auto min-h-screen bg-white flex items-center justify-center">
        <div className="flex space-x-2">
          <div className="w-3 h-3 bg-[var(--brill-primary)] rounded-full animate-bounce"></div>
          <div className="w-3 h-3 bg-[var(--brill-primary)] rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
          <div className="w-3 h-3 bg-[var(--brill-primary)] rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md mx-auto min-h-screen bg-white relative overflow-hidden">
      <div className="px-4 sm:px-6 py-6 sm:py-8 flex flex-col min-h-screen">
        <div className="flex-1 flex flex-col justify-center items-center text-center">
          <div className="w-48 sm:w-56 md:w-64 h-56 sm:h-64 md:h-72 lg:h-80 mb-6 sm:mb-8 flex items-center justify-center mx-auto">
            <img
              src={currentData.image}
              alt="Financial illustration"
              className="w-full h-full object-cover rounded-xl shadow-lg"
            />
          </div>

          <h1 className="text-xl sm:text-2xl md:text-3xl font-extrabold text-[#2d3748] mb-3 sm:mb-4 leading-tight whitespace-pre-line px-2">
            {currentData.title}
          </h1>
          <p className="text-[#718096] font-light text-sm sm:text-base mb-6 sm:mb-8 max-w-xs sm:max-w-sm leading-relaxed px-2">
            {currentData.description}
          </p>
        </div>

        <div className="flex justify-between items-center pt-6 sm:pt-8 px-2">
          {/* Simple dot pagination */}
          <div className="flex space-x-2">
            {[1, 2, 3].map((step) => (
              <div
                key={step}
                className={`w-2 h-2 rounded-full transition-colors duration-300 ${
                  step === currentStep 
                    ? 'bg-[#4682B4]' 
                    : 'bg-gray-300'
                }`}
              />
            ))}
          </div>
          
          {currentStep < onboardingData.length ? (
            <button
              onClick={handleNext}
              className="w-12 h-12 sm:w-16 sm:h-16 bg-[#4682B4] rounded-full text-white shadow-lg hover:bg-[#3a70a0] transition-all duration-200 flex items-center justify-center"
            >
              <svg className="h-4 w-4 sm:h-5 sm:w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          ) : (
            <button
              onClick={handleNext}
              className="w-32 sm:w-40 h-10 sm:h-12 bg-[#4682B4] text-white font-medium shadow-lg hover:bg-[#3a70a0] transition-all duration-200 text-sm sm:text-base"
              style={{ borderRadius: '25px' }}
            >
              Get Started
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
