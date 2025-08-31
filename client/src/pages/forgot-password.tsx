import { useState } from "react";
import { useLocation } from "wouter";
import { ArrowLeft, Mail } from "lucide-react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { useToast } from "../hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { authAPI } from "../lib/auth";
import { LoadingButton } from "../components/ui/loading-button";
import { NotificationModal } from "../components/ui/notification-modal";
import logo from "../assets/images/logo.png";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const resetPasswordMutation = useMutation({
    mutationFn: (email: string) => authAPI.resetPassword({ email }),
    onSuccess: () => {
      setShowEmailModal(true);
    },
    onError: (error: any) => {
      setErrorMessage(error.message || "Failed to send reset link. Please try again.");
      setShowErrorModal(true);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email) {
      resetPasswordMutation.mutate(email);
    }
  };

  const handleBackToSignIn = () => {
    setLocation("/signin");
  };

  const handleResendEmail = () => {
    setShowEmailModal(false);
    resetPasswordMutation.mutate(email);
  };

  return (
    <div className="w-full max-w-md mx-auto min-h-screen bg-white flex flex-col">
      <div className="px-6 py-8 flex-1 flex flex-col justify-center">
        {/* Header */}
        <div className="flex items-center mb-8">
          <Button
            onClick={handleBackToSignIn}
            variant="ghost"
            size="icon"
            className="mr-4 w-10 h-10 rounded-full bg-gray-100 hover:bg-gray-200"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-xl font-bold text-[var(--brill-text)]">Forgot Password</h1>
        </div>

        {/* Logo */}
        <div className="text-center mb-8">
          <img 
            src={logo} 
            alt="Brillprime Logo" 
            className="w-16 h-16 mx-auto mb-4"
          />
          <h2 className="text-2xl font-bold text-[var(--brill-secondary)] mb-2">
            Reset Your Password
          </h2>
          <p className="text-[var(--brill-text-light)] text-sm">
            Enter your email address and we'll send you a link to reset your password.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="email" className="text-[var(--brill-text)] font-medium">
              Email Address
            </Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[var(--brill-text-light)] w-5 h-5" />
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email address"
                className="pl-12 py-3 rounded-xl border-gray-300 focus:border-[var(--brill-primary)] focus:ring-[var(--brill-primary)]"
                required
              />
            </div>
          </div>

          <LoadingButton
            type="submit"
            loading={resetPasswordMutation.isPending}
            className="w-full py-3 rounded-xl bg-[var(--brill-primary)] hover:bg-[var(--brill-secondary)] text-white font-medium"
            disabled={!email}
          >
            Send Reset Link
          </LoadingButton>
        </form>

        {/* Footer */}
        <div className="mt-8 text-center">
          <p className="text-[var(--brill-text-light)] text-sm">
            Remember your password?{" "}
            <button
              onClick={handleBackToSignIn}
              className="text-[var(--brill-primary)] font-medium hover:underline"
            >
              Sign In
            </button>
          </p>
        </div>
      </div>

      {/* Email Sent Modal */}
      <NotificationModal
        isOpen={showEmailModal}
        onClose={() => setShowEmailModal(false)}
        type="email"
        title="Email Sent!"
        description={`We've sent a password reset link to ${email}. Please check your email and click the link to reset your password.`}
        actionText="Back to Sign In"
        onAction={handleBackToSignIn}
        showSecondaryAction={true}
        secondaryActionText="Resend Email"
        onSecondaryAction={handleResendEmail}
      />

      {/* Error Modal */}
      <NotificationModal
        isOpen={showErrorModal}
        onClose={() => setShowErrorModal(false)}
        type="error"
        title="Reset Failed"
        description={errorMessage}
        actionText="Try Again"
        onAction={() => setShowErrorModal(false)}
      />
    </div>
  );
}