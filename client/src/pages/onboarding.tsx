import { useState } from "react";
import { useLocation } from "wouter";
import { ArrowRight } from "lucide-react";
import { ProgressIndicator } from "@/components/ui/progress-indicator";
import { Button } from "@/components/ui/button";
import onboardingImg1 from "../assets/images/onboarding_img1.png";
import onboardingImg2 from "../assets/images/onboarding_img2.png";
import onboardingImg3 from "../assets/images/onboarding_img3.png";

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
  const [, setLocation] = useLocation();

  const currentData = onboardingData[currentStep - 1];

  const handleNext = () => {
    if (currentStep < onboardingData.length) {
      setCurrentStep(currentStep + 1);
    } else {
      setLocation("/role-selection");
    }
  };

  return (
    <div className="max-w-md mx-auto min-h-screen bg-white relative overflow-hidden">
      <div className="px-6 py-8 flex flex-col min-h-screen">
        <div className="flex-1 flex flex-col justify-center items-center text-center">
          {currentStep === 1 ? (
            <div className="w-32 h-32 rounded-full gradient-bg flex items-center justify-center mb-8 shadow-lg">
              <span className="text-white text-5xl font-bold">B</span>
            </div>
          ) : (
            <div className="w-64 h-48 mb-8 flex items-center justify-center">
              <img
                src={currentData.image}
                alt="Financial illustration"
                className="w-full h-full object-cover rounded-xl shadow-lg"
              />
            </div>
          )}

          <h1 className="text-2xl font-extrabold text-[var(--brill-primary)] mb-4 leading-tight whitespace-pre-line">
            {currentData.title}
          </h1>
          <p className="text-[var(--brill-text-light)] font-light text-base mb-8 max-w-sm leading-relaxed">
            {currentData.description}
          </p>
        </div>

        <div className="flex justify-between items-center pt-8">
          <ProgressIndicator totalSteps={3} currentStep={currentStep} />
          
          {currentStep < onboardingData.length ? (
            <Button
              onClick={handleNext}
              className="w-16 h-16 gradient-bg rounded-full text-white shadow-lg btn-scale p-0"
            >
              <ArrowRight className="h-5 w-5" />
            </Button>
          ) : (
            <Button
              onClick={handleNext}
              className="w-40 h-12 gradient-bg rounded-brill text-white font-medium shadow-lg btn-scale"
            >
              Get Started
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
