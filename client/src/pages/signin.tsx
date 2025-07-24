import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff, Mail, Lock, Fingerprint } from "lucide-react";
import googleIcon from "../assets/images/google_icon.png";
import appleIcon from "../assets/images/apple_icon.png";
import facebookLogo from "../assets/images/facebook_logo.png";
import { useMutation } from "@tanstack/react-query";
import logo from "../assets/images/logo.png";

import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { LoadingButton } from "@/components/ui/loading-button";
import { Button } from "@/components/ui/button";
import { BiometricLogin } from "@/components/ui/biometric-login";
import { useToast } from "@/hooks/use-toast";
import { authAPI } from "@/lib/auth";
import { useAuth } from "@/hooks/use-auth";
import { signInSchema } from "@shared/schema";

type SignInFormData = {
  email: string;
  password: string;
};

export default function SignInPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [showBiometricLogin, setShowBiometricLogin] = useState(false);
  const [hasBiometricCredentials, setHasBiometricCredentials] = useState(false);
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { setUser } = useAuth();

  const form = useForm<SignInFormData>({
    resolver: zodResolver(signInSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  // Check for biometric credentials on component mount
  useEffect(() => {
    const credentialId = localStorage.getItem('biometric_credential_id');
    const biometricType = localStorage.getItem('biometric_type');
    setHasBiometricCredentials(!!(credentialId && biometricType));
  }, []);

  // Handle biometric authentication success
  const handleBiometricSuccess = async (type: 'fingerprint' | 'face') => {
    try {
      // Get stored user email for biometric login
      const storedEmail = localStorage.getItem('biometric_user_email');
      
      if (!storedEmail) {
        throw new Error('No user email found for biometric authentication');
      }
      
      // Simulate biometric login by calling the regular signin endpoint
      // In a real implementation, you would have a separate biometric auth endpoint
      const response = await fetch("/api/auth/biometric-signin", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: storedEmail,
          biometricType: type,
          credentialId: localStorage.getItem('biometric_credential_id')
        }),
      });
      
      const data = await response.json();
      
      if (response.ok) {
        toast({
          title: "Success",
          description: "Biometric authentication successful!",
        });
        
        // Navigate based on user role
        if (data.user?.role === "MERCHANT") {
          setLocation("/merchant-dashboard");
        } else if (data.user?.role === "DRIVER") {
          setLocation("/driver-dashboard");
        } else {
          setLocation("/consumer-home");
        }
      } else {
        throw new Error(data.message || "Biometric authentication failed");
      }
    } catch (error) {
      console.error("Biometric authentication error:", error);
      setErrorMessage("Biometric authentication failed. Please try password login.");
      setShowErrorModal(true);
      setShowBiometricLogin(false);
    }
  };

  // Handle biometric authentication error
  const handleBiometricError = (error: string) => {
    setErrorMessage(error);
    setShowErrorModal(true);
    setShowBiometricLogin(false);
  };

  // Handle biometric authentication cancel
  const handleBiometricCancel = () => {
    setShowBiometricLogin(false);
  };

  const signInMutation = useMutation({
    mutationFn: authAPI.signin,
    onSuccess: (data) => {
      console.log("Sign in successful:", data);
      if (data.user) {
        console.log("Setting user data:", data.user, "Role:", data.user.role);
        setUser(data.user);
        
        // Direct role-based navigation instead of going through dashboard
        if (data.user.role === "CONSUMER") {
          console.log("Navigating CONSUMER to /consumer-home");
          setLocation("/consumer-home");
        } else if (data.user.role === "MERCHANT") {
          console.log("Navigating MERCHANT to /merchant-dashboard");
          setLocation("/merchant-dashboard");
        } else if (data.user.role === "DRIVER") {
          console.log("Navigating DRIVER to /driver-dashboard");
          setLocation("/driver-dashboard");
        } else {
          // Fallback to dashboard for unknown roles
          setLocation("/dashboard");
        }
      }
    },
    onError: (error: Error) => {
      console.error("Sign in error:", error);
      toast({
        variant: "destructive",
        title: "Sign In Failed",
        description: error.message,
      });
    },
  });

  const onSubmit = (data: SignInFormData) => {
    signInMutation.mutate(data);
  };

  // Social login handlers
  const handleGoogleLogin = async () => {
    try {
      const { socialAuth } = await import("@/lib/social-auth");
      socialAuth.setCallbacks(
        async (profile) => {
          try {
            console.log("Google login success:", profile);
            // Send profile to backend for authentication
            const response = await fetch("/api/auth/social-login", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                provider: profile.provider,
                socialId: profile.id,
                email: profile.email,
                fullName: profile.name,
                profilePicture: profile.picture,
                role: "CONSUMER" // Default role for social login
              }),
            });
            
            const data = await response.json();
            
            if (response.ok) {
              // Navigate based on user role
              if (data.user?.role === "MERCHANT") {
                setLocation("/merchant-dashboard");
              } else if (data.user?.role === "DRIVER") {
                setLocation("/driver-dashboard");
              } else {
                setLocation("/consumer-home");
              }
            } else {
              throw new Error(data.message || "Social login failed");
            }
          } catch (error) {
            console.error("Backend social auth error:", error);
            setErrorMessage("Authentication failed. Please try again.");
            setShowErrorModal(true);
          }
        },
        (error) => {
          setErrorMessage("Google sign-in failed. Please try again.");
          setShowErrorModal(true);
        }
      );
      await socialAuth.signInWithGoogle();
    } catch (error) {
      setErrorMessage("Google sign-in is not available at the moment.");
      setShowErrorModal(true);
    }
  };

  const handleAppleLogin = async () => {
    try {
      const { socialAuth } = await import("@/lib/social-auth");
      socialAuth.setCallbacks(
        async (profile) => {
          try {
            console.log("Apple login success:", profile);
            // Send profile to backend for authentication
            const response = await fetch("/api/auth/social-login", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                provider: profile.provider,
                socialId: profile.id,
                email: profile.email,
                fullName: profile.name,
                profilePicture: profile.picture,
                role: "CONSUMER" // Default role for social login
              }),
            });
            
            const data = await response.json();
            
            if (response.ok) {
              // Navigate based on user role
              if (data.user?.role === "MERCHANT") {
                setLocation("/merchant-dashboard");
              } else if (data.user?.role === "DRIVER") {
                setLocation("/driver-dashboard");
              } else {
                setLocation("/consumer-home");
              }
            } else {
              throw new Error(data.message || "Social login failed");
            }
          } catch (error) {
            console.error("Backend social auth error:", error);
            setErrorMessage("Authentication failed. Please try again.");
            setShowErrorModal(true);
          }
        },
        (error) => {
          setErrorMessage("Apple sign-in failed. Please try again.");
          setShowErrorModal(true);
        }
      );
      await socialAuth.signInWithApple();
    } catch (error) {
      setErrorMessage("Apple sign-in is not available at the moment.");
      setShowErrorModal(true);
    }
  };

  const handleFacebookLogin = async () => {
    try {
      const { socialAuth } = await import("@/lib/social-auth");
      socialAuth.setCallbacks(
        async (profile) => {
          try {
            console.log("Facebook login success:", profile);
            // Send profile to backend for authentication
            const response = await fetch("/api/auth/social-login", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                provider: profile.provider,
                socialId: profile.id,
                email: profile.email,
                fullName: profile.name,
                profilePicture: profile.picture,
                role: "CONSUMER" // Default role for social login
              }),
            });
            
            const data = await response.json();
            
            if (response.ok) {
              // Navigate based on user role
              if (data.user?.role === "MERCHANT") {
                setLocation("/merchant-dashboard");
              } else if (data.user?.role === "DRIVER") {
                setLocation("/driver-dashboard");
              } else {
                setLocation("/consumer-home");
              }
            } else {
              throw new Error(data.message || "Social login failed");
            }
          } catch (error) {
            console.error("Backend social auth error:", error);
            setErrorMessage("Authentication failed. Please try again.");
            setShowErrorModal(true);
          }
        },
        (error) => {
          setErrorMessage("Facebook sign-in failed. Please try again.");
          setShowErrorModal(true);
        }
      );
      await socialAuth.signInWithFacebook();
    } catch (error) {
      setErrorMessage("Facebook sign-in is not available at the moment.");
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
          <h1 className="text-lg sm:text-xl font-extrabold text-[var(--brill-primary)] mb-2">Welcome Back</h1>
          <p className="text-[var(--brill-text-light)] font-light text-sm">Sign in to your account</p>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 mb-6">
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

            <div className="text-right">
              <Button
                type="button"
                variant="link"
                onClick={() => setLocation("/forgot-password")}
                className="text-[var(--brill-secondary)] text-sm font-medium p-0 h-auto"
              >
                Forgot Password?
              </Button>
            </div>

            <LoadingButton
              type="submit"
              loading={signInMutation.isPending}
              loadingText="Signing In..."
              className="w-full h-14 mt-6"
            >
              Sign In
            </LoadingButton>
          </form>
        </Form>

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
            onClick={handleGoogleLogin}
            className="h-12 w-12 rounded-full border-2 border-[var(--brill-secondary)] hover:bg-gray-50 p-0 flex items-center justify-center"
          >
            <img src={googleIcon} alt="Google" className="w-5 h-5" />
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={handleAppleLogin}
            className="h-12 w-12 rounded-full border-2 border-[var(--brill-secondary)] hover:bg-gray-50 p-0 flex items-center justify-center"
          >
            <img src={appleIcon} alt="Apple" className="w-5 h-5" />
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={handleFacebookLogin}
            className="h-12 w-12 rounded-full border-2 border-[var(--brill-secondary)] hover:bg-gray-50 p-0 flex items-center justify-center"
          >
            <img src={facebookLogo} alt="Facebook" className="w-5 h-5" />
          </Button>
          {hasBiometricCredentials && (
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowBiometricLogin(true)}
              className="h-12 w-12 rounded-full border-2 border-[var(--brill-secondary)] hover:bg-gray-50 p-0 flex items-center justify-center"
            >
              <Fingerprint className="w-5 h-5 text-[var(--brill-secondary)]" />
            </Button>
          )}
        </div>
        </div>

        <div className="text-center">
          <p className="text-[var(--brill-text-light)] text-sm">
            Don't have an account?{" "}
            <Button
              variant="link"
              className="text-[var(--brill-secondary)] font-medium p-0 h-auto"
              onClick={() => setLocation("/role-selection")}
            >
              Sign Up
            </Button>
          </p>
        </div>
      </div>

      {/* Biometric Login Modal */}
      <NotificationModal
        isOpen={showBiometricLogin}
        onClose={() => setShowBiometricLogin(false)}
        title="Biometric Authentication"
        message=""
        type="info"
        customContent={
          <BiometricLogin
            onSuccess={handleBiometricSuccess}
            onError={handleBiometricError}
            onCancel={handleBiometricCancel}
          />
        }
      />

      {/* Error Modal */}
      <NotificationModal
        isOpen={showErrorModal}
        onClose={() => setShowErrorModal(false)}
        title="Authentication Error"
        message={errorMessage}
        type="error"
      />
    </div>
  );
}
