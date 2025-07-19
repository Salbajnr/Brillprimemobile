import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Shield } from "lucide-react";
import { useMutation } from "@tanstack/react-query";

import { OtpInput } from "@/components/ui/otp-input";
import { LoadingButton } from "@/components/ui/loading-button";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { authAPI } from "@/lib/auth";

export default function OtpVerificationPage() {
  const [otp, setOtp] = useState("");
  const [resendTimer, setResendTimer] = useState(0);
  const [, setLocation] = useLocation();
  const { toast } = useToast();

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
    onSuccess: () => {
      localStorage.removeItem("verification-email");
      toast({
        title: "Account Verified!",
        description: "Your account has been successfully verified. Welcome to Brillprime!",
      });
      setLocation("/signin");
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Verification Failed",
        description: error.message,
      });
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
    if (otp.length === 6) {
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
    <div className="max-w-md mx-auto min-h-screen bg-white">
      <div className="px-6 py-8 pt-16">
        <div className="text-center mb-8">
          <div className="w-20 h-20 gradient-bg rounded-full flex items-center justify-center mx-auto mb-6">
            <Shield className="text-white h-6 w-6" />
          </div>
          <h1 className="text-xl font-extrabold text-[var(--brill-primary)] mb-2">Verify Your Email</h1>
          <p className="text-[var(--brill-text-light)] font-light text-sm mb-2">
            We've sent a verification code to
          </p>
          <p className="text-[var(--brill-secondary)] font-medium text-sm">{verificationEmail}</p>
        </div>

        <div className="mb-8">
          <OtpInput
            length={6}
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
          disabled={otp.length !== 6}
          className="w-full h-14"
        >
          Verify Code
        </LoadingButton>
      </div>
    </div>
  );
}
