import { useState } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff, User, Mail, Phone, Lock } from "lucide-react";
import googleIcon from "../assets/images/google_icon.png";
import appleIcon from "../assets/images/apple_icon.png";
import facebookLogo from "../assets/images/facebook_logo.png";
import { useMutation } from "@tanstack/react-query";
import { z } from "zod";
import logo from "../assets/images/logo.png";

import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { LoadingButton } from "@/components/ui/loading-button";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { authAPI } from "@/lib/auth";
import { useAuth } from "@/hooks/use-auth";
import { NotificationModal } from "@/components/ui/notification-modal";
import confirmationFailImg from "../assets/images/confirmation_fail_img.png";

const signupSchema = z.object({
  fullName: z.string().min(1, "Full name is required"),
  email: z.string().email("Please enter a valid email address"),
  phone: z.string().min(10, "Phone number must be at least 10 digits"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  confirmPassword: z.string().min(1, "Please confirm your password"),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

type SignupFormData = z.infer<typeof signupSchema>;

export default function SignupPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { selectedRole } = useAuth();

  const form = useForm<SignupFormData>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      fullName: "",
      email: "",
      phone: "",
      password: "",
      confirmPassword: "",
    },
  });

  const signupMutation = useMutation({
    mutationFn: authAPI.signup,
    onSuccess: (data) => {
      localStorage.setItem("verification-email", form.getValues("email"));
      setLocation("/otp-verification");
    },
    onError: (error: Error) => {
      // If registration fails, show error and allow user to try again or go back to role selection
      toast({
        variant: "destructive",
        title: "Registration Failed",
        description: error.message + " Please try again or select a different role.",
      });

      // For critical errors, redirect back to role selection after delay
      if (error.message.includes("role") || error.message.includes("invalid")) {
        setTimeout(() => {
          setLocation("/role-selection");
        }, 3000);
      }
    },
  });

  const onSubmit = (data: SignupFormData) => {
    if (!selectedRole) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please select a role first",
      });
      setLocation("/role-selection");
      return;
    }

    // Get driver tier information if available
    const driverTier = selectedRole === "DRIVER" ? sessionStorage.getItem('selectedDriverTier') : null;

    const signupData = {
      fullName: data.fullName,
      email: data.email,
      phone: data.phone,
      password: data.password,
      role: selectedRole,
      ...(driverTier && { driverTier, accessLevel: driverTier })
    };

    signupMutation.mutate(signupData);
  };

  // Social login handlers
  const handleGoogleSignup = async () => {
    if (!selectedRole) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please select a role first",
      });
      setLocation("/role-selection");
      return;
    }

    try {
      const { socialAuth } = await import("@/lib/social-auth");

      const profile = await socialAuth.signInWithGoogle();
      const result = await socialAuth.authenticateWithBackend(profile);

      // Update auth state
      setUser(result.user);
      localStorage.setItem("auth", JSON.stringify(result.user));

      setLocation("/dashboard");
    } catch (error: any) {
      setErrorMessage(error.message || "Google sign-up failed. Please try again.");
      setShowErrorModal(true);
    }
  };

  const handleAppleSignup = async () => {
    if (!selectedRole) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please select a role first",
      });
      setLocation("/role-selection");
      return;
    }

    try {
      const { socialAuth } = await import("@/lib/social-auth");
      socialAuth.setCallbacks(
        async (profile) => {
          console.log("Apple signup success:", profile);
          // Send profile to backend for registration
          try {
            const response = await fetch('/api/auth/social-login', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                provider: 'apple',
                socialId: profile.id,
                email: profile.email,
                fullName: profile.name,
                role: selectedRole
              }),
            });

            if (response.ok) {
              const result = await response.json();
              setUser(result.user);
              localStorage.setItem("auth", JSON.stringify(result.user));
              setLocation("/dashboard");
            } else {
              throw new Error('Backend registration failed');
            }
          } catch (error) {
            console.error('Apple signup backend error:', error);
            setLocation("/otp-verification");
          }
        },
        (error) => {
          setErrorMessage("Apple sign-up failed. Please try again.");
          setShowErrorModal(true);
        }
      );
      await socialAuth.signInWithApple();
    } catch (error) {
      setErrorMessage("Apple sign-up is not available at the moment.");
      setShowErrorModal(true);
    }
  };

  const handleFacebookSignup = async () => {
    if (!selectedRole) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please select a role first",
      });
      setLocation("/role-selection");
      return;
    }

    try {
      const { socialAuth } = await import("@/lib/social-auth");
      socialAuth.setCallbacks(
        async (profile) => {
          console.log("Facebook signup success:", profile);
          // Send profile to backend for registration
          try {
            const response = await fetch('/api/auth/social-login', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                provider: 'facebook',
                socialId: profile.id,
                email: profile.email,
                fullName: profile.name,
                role: selectedRole
              }),
            });

            if (response.ok) {
              const result = await response.json();
              setUser(result.user);
              localStorage.setItem("auth", JSON.stringify(result.user));
              setLocation("/dashboard");
            } else {
              throw new Error('Backend registration failed');
            }
          } catch (error) {
            console.error('Facebook signup backend error:', error);
            setLocation("/otp-verification");
          }
        },
        (error) => {
          setErrorMessage("Facebook sign-up failed. Please try again.");
          setShowErrorModal(true);
        }
      );
      await socialAuth.signInWithFacebook();
    } catch (error) {
      setErrorMessage("Facebook sign-up is not available at the moment.");
      setShowErrorModal(true);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto min-h-screen bg-white">
      <div className="px-4 sm:px-6 py-6 sm:py-8 pt-12 sm:pt-16">
        <div className="text-center mb-6 sm:mb-8">
          <div className="w-16 h-16 sm:w-20 sm:h-20 bg-white rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-6 shadow-lg">
            <img src={logo} alt="Brillprime Logo" className="w-12 h-12 sm:w-16 sm:h-16 object-contain" />
          </div>
          <h1 className="text-lg sm:text-xl font-extrabold text-[var(--brill-primary)] mb-2">Create Account</h1>
          <p className="text-[var(--brill-text-light)] font-light text-sm">Join thousands of satisfied users</p>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 mb-6">
            <FormField
              control={form.control}
              name="fullName"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <div className="relative">
                      <Input
                        placeholder="Full Name"
                        className="h-14 pl-12 border-[var(--brill-secondary)] rounded-brill font-medium placeholder:text-[var(--brill-text-light)] focus-visible:ring-[var(--brill-secondary)]"
                        {...field}
                      />
                      <User className="absolute left-4 top-1/2 transform -translate-y-1/2 text-[var(--brill-text-light)] h-5 w-5" />
                    </div>
                  </FormControl>
                  <FormMessage className="text-xs" />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <div className="relative">
                      <Input
                        type="email"
                        placeholder="Email Address"
                        className="h-14 pl-12 border-[var(--brill-secondary)] rounded-brill font-medium placeholder:text-[var(--brill-text-light)] focus-visible:ring-[var(--brill-secondary)]"
                        {...field}
                      />
                      <Mail className="absolute left-4 top-1/2 transform -translate-y-1/2 text-[var(--brill-text-light)] h-5 w-5" />
                    </div>
                  </FormControl>
                  <FormMessage className="text-xs" />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <div className="relative">
                      <Input
                        type="tel"
                        placeholder="Phone Number"
                        className="h-14 pl-12 border-[var(--brill-secondary)] rounded-brill font-medium placeholder:text-[var(--brill-text-light)] focus-visible:ring-[var(--brill-secondary)]"
                        {...field}
                      />
                      <Phone className="absolute left-4 top-1/2 transform -translate-y-1/2 text-[var(--brill-text-light)] h-5 w-5" />
                    </div>
                  </FormControl>
                  <FormMessage className="text-xs" />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <div className="relative">
                      <Input
                        type={showPassword ? "text" : "password"}
                        placeholder="Password"
                        className="h-14 pl-12 pr-12 border-[var(--brill-secondary)] rounded-brill font-medium placeholder:text-[var(--brill-text-light)] focus-visible:ring-[var(--brill-secondary)]"
                        {...field}
                      />
                      <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 text-[var(--brill-text-light)] h-5 w-5" />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-2 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4 text-[var(--brill-text-light)]" />
                        ) : (
                          <Eye className="h-4 w-4 text-[var(--brill-text-light)]" />
                        )}
                      </Button>
                    </div>
                  </FormControl>
                  <FormMessage className="text-xs" />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="confirmPassword"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <div className="relative">
                      <Input
                        type={showConfirmPassword ? "text" : "password"}
                        placeholder="Confirm Password"
                        className="h-14 pl-12 pr-12 border-[var(--brill-secondary)] rounded-brill font-medium placeholder:text-[var(--brill-text-light)] focus-visible:ring-[var(--brill-secondary)]"
                        {...field}
                      />
                      <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 text-[var(--brill-text-light)] h-5 w-5" />
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
                  </FormControl>
                  <FormMessage className="text-xs" />
                </FormItem>
              )}
            />

            <LoadingButton
              type="submit"
              loading={signupMutation.isPending}
              loadingText="Creating Account..."
              className="w-full h-14 mt-8"
            >
              Create Account
            </LoadingButton>
          </form>
        </Form>

        {/* Terms & Privacy */}
        <div className="text-center mb-6">
          <p className="text-xs text-[var(--brill-text-light)]">
            By creating an account, you agree to our{" "}
            <Button variant="link" className="text-[var(--brill-secondary)] p-0 h-auto text-xs">
              Terms of Service
            </Button>{" "}
            and{" "}
            <Button variant="link" className="text-[var(--brill-secondary)] p-0 h-auto text-xs">
              Privacy Policy
            </Button>
          </p>
        </div>

        {/* Social Login Options */}
        <div className="space-y-4 mb-6">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-gray-300" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-2 text-[var(--brill-text-light)]">Or continue with</span>
            </div>
          </div>

          <div className="flex justify-center gap-4">
            <Button
              type="button"
              variant="outline"
              onClick={handleGoogleSignup}
              className="h-12 w-12 rounded-full border-2 border-[var(--brill-secondary)] hover:bg-gray-50 p-0 flex items-center justify-center"
            >
              <img src={googleIcon} alt="Google" className="w-5 h-5" />
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={handleAppleSignup}
              className="h-12 w-12 rounded-full border-2 border-[var(--brill-secondary)] hover:bg-gray-50 p-0 flex items-center justify-center"
            >
              <img src={appleIcon} alt="Apple" className="w-5 h-5" />
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={handleFacebookSignup}
              className="h-12 w-12 rounded-full border-2 border-[var(--brill-secondary)] hover:bg-gray-50 p-0 flex items-center justify-center"
            >
              <img src={facebookLogo} alt="Facebook" className="w-5 h-5" />
            </Button>
          </div>
        </div>

        <div className="text-center space-y-2">
          <p className="text-[var(--brill-text-light)] text-sm">
            Already have an account?{" "}
            <Button
              variant="link"
              className="text-[var(--brill-secondary)] font-medium p-0 h-auto"
              onClick={() => setLocation("/signin")}
            >
              Sign In
            </Button>
          </p>
          <p className="text-[var(--brill-text-light)] text-xs">
            Want to change your role?{" "}
            <Button
              variant="link"
              className="text-[var(--brill-secondary)] font-medium p-0 h-auto text-xs"
              onClick={() => setLocation("/role-selection")}
            >
              Go Back to Role Selection
            </Button>
          </p>
        </div>

        {/* Error Modal */}
        <NotificationModal
          isOpen={showErrorModal}
          onClose={() => setShowErrorModal(false)}
          type="error"
          title="Sign Up Failed"
          message={errorMessage}
          imageSrc={confirmationFailImg}
          buttonText="Try Again"
        />
      </div>
    </div>
  );
}