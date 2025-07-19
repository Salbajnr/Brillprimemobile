import { useState } from "react";
import { useLocation } from "wouter";
import { ArrowLeft, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { authAPI } from "@/lib/auth";
import { LoadingButton } from "@/components/ui/loading-button";
import logo from "../assets/images/logo.png";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [isLinkSent, setIsLinkSent] = useState(false);
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const resetPasswordMutation = useMutation({
    mutationFn: (email: string) => authAPI.resetPassword({ email }),
    onSuccess: () => {
      setIsLinkSent(true);
      toast({
        title: "Reset Link Sent!",
        description: "Check your email for password reset instructions.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to send reset link. Please try again.",
        variant: "destructive",
      });
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

  if (isLinkSent) {
    return (
      <div className="w-full max-w-md mx-auto min-h-screen bg-white flex flex-col">
        <div className="px-6 py-8 flex-1 flex flex-col justify-center">
          {/* Logo */}
          <div className="text-center mb-8">
            <img 
              src={logo} 
              alt="Brillprime Logo" 
              className="w-16 h-16 mx-auto mb-6"
            />
            <h1 className="text-2xl font-bold text-[var(--brill-secondary)] mb-2">
              Reset Link Sent!
            </h1>
            <p className="text-[var(--brill-text-light)] text-sm">
              We've sent a password reset link to your email address.
            </p>
          </div>

          {/* Email Confirmation */}
          <div className="bg-blue-50 p-4 rounded-xl mb-8 flex items-center space-x-3">
            <div className="w-10 h-10 bg-[var(--brill-primary)] rounded-full flex items-center justify-center">
              <Mail className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-sm text-[var(--brill-text)] font-medium">Email sent to:</p>
              <p className="text-sm text-[var(--brill-primary)] font-bold">{email}</p>
            </div>
          </div>

          {/* Instructions */}
          <div className="mb-8">
            <p className="text-[var(--brill-text-light)] text-sm mb-4">
              Please check your email and click the reset link to create a new password.
            </p>
            <p className="text-[var(--brill-text-light)] text-xs">
              Didn't receive the email? Check your spam folder or try again.
            </p>
          </div>

          {/* Actions */}
          <div className="space-y-4">
            <Button
              onClick={() => resetPasswordMutation.mutate(email)}
              variant="outline"
              className="w-full py-3 rounded-xl border-[var(--brill-primary)] text-[var(--brill-primary)] hover:bg-blue-50"
              disabled={resetPasswordMutation.isPending}
            >
              Resend Reset Link
            </Button>
            
            <Button
              onClick={handleBackToSignIn}
              className="w-full py-3 rounded-xl bg-[var(--brill-primary)] hover:bg-[var(--brill-secondary)]"
            >
              Back to Sign In
            </Button>
          </div>
        </div>
      </div>
    );
  }

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
    </div>
  );
}