import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Shield, Mail } from "lucide-react";
import logo from "../assets/images/logo.png";
import { useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { localStorage as storage } from "@/lib/storage";

import { OtpInput } from "@/components/ui/otp-input";
import { LoadingButton } from "@/components/ui/loading-button";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { authAPI } from "@/lib/auth";
import { NotificationModal } from "@/components/ui/notification-modal";

export default function OtpVerificationPage() {
  const [otp, setOtp] = useState("");
  const [resendTimer, setResendTimer] = useState(0);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { setUser } = useAuth();

  const verificationEmail = localStorage.getItem("verification-email") || "";

  useEffect(() => {
    if (!verificationEmail) {
      setLocation("/signup");
    }
  }, [verificationEmail, setLocation]);

  useEffect(() => {
    if (resendTimer > 0) {
      const timer = setTimeout(() => setResendTimer(resendTimer - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendTimer]);

  const verifyOtpMutation = useMutation({
    mutationFn: authAPI.verifyOtp,
    onSuccess: (data) => {
      localStorage.removeItem("verification-email");
      if (data.user) {
        // Set user in auth context since registration is now complete
        setUser(data.user);
        setShowSuccessModal(true);
      } else {
        toast({
          title: "Account Verified!",
          description: "Your account has been successfully verified. Please sign in to continue.",
        });
        setLocation("/signin");
      }
    },
    onError: (error: Error) => {
      setErrorMessage(error.message || "Invalid verification code. Please try again.");
      setShowErrorModal(true);
      setOtp("");
    },
  });

  const resendOtpMutation = useMutation({
    mutationFn: () => authAPI.resendOtp(verificationEmail),
    onSuccess: () => {
      setResendTimer(60);
      toast({
        title: "OTP Sent",
        description: "A new verification code has been sent to your email.",
      });
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Failed to Send OTP",
        description: error.message,
      });
    },
  });

  const handleVerify = () => {
    if (otp.length === 5) {
      verifyOtpMutation.mutate({
        email: verificationEmail,
        otp,
      });
    }
  };

  const handleResend = () => {
    if (resendTimer === 0) {
      resendOtpMutation.mutate();
    }
  };

  return (
    <div className="w-full max-w-md mx-auto min-h-screen bg-white">
      <div className="px-4 sm:px-6 py-6 sm:py-8 pt-12 sm:pt-16">
        <div className="text-center mb-8">
          <div className="w-16 h-16 sm:w-20 sm:h-20 bg-white rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-6 shadow-lg">
            <img src={logo} alt="Brillprime Logo" className="w-12 h-12 sm:w-16 sm:h-16 object-contain" />
          </div>
          <h1 className="text-lg sm:text-xl font-extrabold text-[var(--brill-primary)] mb-2">Verify it's you</h1>
          <div className="flex items-center justify-center space-x-2 mb-4">
            <Mail className="h-4 w-4 text-[var(--brill-secondary)]" />
            <p className="text-[var(--brill-text-light)] font-light text-sm">
              A 5-digit verification code has been sent to
            </p>
          </div>
          <p className="text-[var(--brill-secondary)] font-medium text-sm">{verificationEmail}</p>
          <p className="text-[var(--brill-text-light)] text-xs mt-2 text-center">
            Please check your inbox and spam folder
          </p>
        </div>

        <div className="mb-8">
          <OtpInput
            length={5}
            value={otp}
            onChange={setOtp}
            className="mb-6"
          />

          <div className="text-center mb-6">
            <p className="text-[var(--brill-text-light)] text-sm mb-2">
              Didn't receive the code?
            </p>
            <Button
              variant="link"
              onClick={handleResend}
              disabled={resendTimer > 0 || resendOtpMutation.isPending}
              className="text-[var(--brill-secondary)] font-medium p-0 h-auto"
            >
              {resendTimer > 0 ? (
                <span>Resend in {resendTimer}s</span>
              ) : resendOtpMutation.isPending ? (
                <span>Sending...</span>
              ) : (
                <span>Resend Code</span>
              )}
            </Button>
          </div>
        </div>

        <LoadingButton
          onClick={handleVerify}
          loading={verifyOtpMutation.isPending}
          loadingText="Verifying..."
          disabled={otp.length !== 5}
          className="w-full h-14"
        >
          Verify Code
        </LoadingButton>
      </div>

      {/* Success Modal */}
      <NotificationModal
        isOpen={showSuccessModal}
        onClose={() => setShowSuccessModal(false)}
        type="success"
        title="Registration Complete!"
        description="Your account has been successfully verified. Welcome to Brillprime!"
        actionText="Continue to Dashboard"
        onAction={() => {
          const userData = storage.getUser();
          if (userData) {
            if (userData.role === "CONSUMER") {
              setLocation("/consumer-home");
            } else if (userData.role === "MERCHANT") {
              setLocation("/merchant-dashboard");
            } else if (userData.role === "DRIVER") {
              // Check if driver has selected a tier
              const selectedTier = sessionStorage.getItem('selectedDriverTier');
              if (!selectedTier) {
                // No tier selected, go to tier selection
                setLocation("/driver-tier-selection");
              } else {
                // Tier already selected, go to dashboard and prompt KYC
                sessionStorage.setItem('promptKYCVerification', 'true');
                setLocation("/driver-dashboard");
              }
            } else {
              setLocation("/dashboard");
            }
          } else {
            setLocation("/dashboard");
          }
        }}
      />

      {/* Error Modal */}
      <NotificationModal
        isOpen={showErrorModal}
        onClose={() => setShowErrorModal(false)}
        type="error"
        title="Verification Failed"
        description={errorMessage}
        actionText="Try Again"
        onAction={() => setShowErrorModal(false)}
      />
    </div>
  );
}