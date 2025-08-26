import { useState, useEffect } from "react";
import { useLocation, useRoute } from "wouter";
import { ArrowLeft, Lock, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useMutation } from "@tanstack/react-query";
import { LoadingButton } from "@/components/ui/loading-button";
import { NotificationModal } from "@/components/ui/notification-modal";
import { authAPI } from "@/lib/auth";
import logo from "../assets/images/logo.png";

export default function ResetPasswordPage() {
  const [, params] = useRoute("/reset-password/:token");
  const [, setLocation] = useLocation();
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  const token = params?.token;

  useEffect(() => {
    if (!token) {
      setLocation("/forgot-password");
    }
  }, [token, setLocation]);

  const validatePassword = (password: string): string[] => {
    const errors: string[] = [];
    if (password.length < 8) {
      errors.push("Password must be at least 8 characters long");
    }
    if (!/(?=.*[a-z])/.test(password)) {
      errors.push("Password must contain at least one lowercase letter");
    }
    if (!/(?=.*[A-Z])/.test(password)) {
      errors.push("Password must contain at least one uppercase letter");
    }
    if (!/(?=.*\d)/.test(password)) {
      errors.push("Password must contain at least one number");
    }
    return errors;
  };

  const resetPasswordMutation = useMutation({
    mutationFn: (data: { token: string; password: string }) => authAPI.confirmResetPassword(data),
    onSuccess: () => {
      setShowSuccessModal(true);
    },
    onError: (error: any) => {
      setErrorMessage(error.message || "Failed to reset password. The link may have expired.");
      setShowErrorModal(true);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Clear previous validation errors
    setValidationErrors([]);

    // Validate new password
    const passwordErrors = validatePassword(newPassword);
    if (passwordErrors.length > 0) {
      setValidationErrors(passwordErrors);
      return;
    }

    // Check if passwords match
    if (newPassword !== confirmPassword) {
      setValidationErrors(["Passwords do not match"]);
      return;
    }

    // Submit the password reset
    if (token) {
      resetPasswordMutation.mutate({
        token,
        password: newPassword,
      });
    }
  };

  const handleBackToForgotPassword = () => {
    setLocation("/forgot-password");
  };

  const handleGoToSignIn = () => {
    setLocation("/signin");
  };

  if (!token) {
    return null;
  }

  return (
    <div className="w-full max-w-md mx-auto min-h-screen bg-white flex flex-col">
      <div className="px-6 py-8 flex-1 flex flex-col justify-center">
        {/* Header */}
        <div className="flex items-center mb-8">
          <Button
            onClick={handleBackToForgotPassword}
            variant="ghost"
            size="icon"
            className="mr-4 w-10 h-10 rounded-full bg-gray-100 hover:bg-gray-200"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-xl font-bold text-[var(--brill-text)]">Reset Password</h1>
        </div>

        {/* Logo */}
        <div className="text-center mb-8">
          <img 
            src={logo} 
            alt="Brill Prime Logo" 
            className="w-16 h-16 mx-auto mb-4"
          />
          <h2 className="text-2xl font-bold text-[var(--brill-secondary)] mb-2">
            Set New Password
          </h2>
          <p className="text-[var(--brill-text-light)] text-sm">
            Create a strong password to secure your account.
          </p>
        </div>

        {/* Validation Errors */}
        {validationErrors.length > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
            <ul className="text-red-600 text-sm space-y-1">
              {validationErrors.map((error, index) => (
                <li key={index}>• {error}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="newPassword" className="text-[var(--brill-text)] font-medium">
              New Password
            </Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[var(--brill-text-light)] w-5 h-5" />
              <Input
                id="newPassword"
                type={showNewPassword ? "text" : "password"}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new password"
                className="pl-12 pr-12 py-3 rounded-xl border-gray-300 focus:border-[var(--brill-primary)] focus:ring-[var(--brill-primary)]"
                required
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-2 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0"
                onClick={() => setShowNewPassword(!showNewPassword)}
              >
                {showNewPassword ? (
                  <EyeOff className="h-4 w-4 text-[var(--brill-text-light)]" />
                ) : (
                  <Eye className="h-4 w-4 text-[var(--brill-text-light)]" />
                )}
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword" className="text-[var(--brill-text)] font-medium">
              Confirm Password
            </Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[var(--brill-text-light)] w-5 h-5" />
              <Input
                id="confirmPassword"
                type={showConfirmPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password"
                className="pl-12 pr-12 py-3 rounded-xl border-gray-300 focus:border-[var(--brill-primary)] focus:ring-[var(--brill-primary)]"
                required
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-2 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              >
                {showConfirmPassword ? (
                  <EyeOff className="h-4 w-4 text-[var(--brill-text-light)]" />
                ) : (
                  <Eye className="h-4 w-4 text-[var(--brill-text-light)]" />
                )}
              </Button>
            </div>
          </div>

          <LoadingButton
            type="submit"
            loading={resetPasswordMutation.isPending}
            className="w-full py-3 rounded-xl bg-[var(--brill-primary)] hover:bg-[var(--brill-secondary)] text-white font-medium"
            disabled={!newPassword || !confirmPassword}
          >
            Reset Password
          </LoadingButton>
        </form>

        {/* Password Requirements */}
        <div className="mt-6 p-4 bg-blue-50 rounded-xl">
          <h4 className="text-sm font-medium text-[var(--brill-text)] mb-2">Password Requirements:</h4>
          <ul className="text-xs text-[var(--brill-text-light)] space-y-1">
            <li>• At least 8 characters long</li>
            <li>• Contains uppercase and lowercase letters</li>
            <li>• Contains at least one number</li>
            <li>• Strong passwords help keep your account secure</li>
          </ul>
        </div>
      </div>

      {/* Success Modal */}
      <NotificationModal
        isOpen={showSuccessModal}
        onClose={() => setShowSuccessModal(false)}
        type="success"
        title="Password Successfully Changed!"
        description="Your password has been reset successfully. You can now sign in with your new password."
        actionText="Go to Sign In"
        onAction={handleGoToSignIn}
      />

      {/* Error Modal */}
      <NotificationModal
        isOpen={showErrorModal}
        onClose={() => setShowErrorModal(false)}
        type="error"
        title="Password Reset Failed"
        description={errorMessage}
        actionText="Try Again"
        onAction={() => setShowErrorModal(false)}
        showSecondaryAction={true}
        secondaryActionText="Back to Forgot Password"
        onSecondaryAction={handleBackToForgotPassword}
      />
    </div>
  );
}