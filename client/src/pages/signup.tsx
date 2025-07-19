import { useState } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff, User, Mail, Phone, Lock } from "lucide-react";
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
      toast({
        variant: "destructive",
        title: "Registration Failed",
        description: error.message,
      });
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

    signupMutation.mutate({
      fullName: data.fullName,
      email: data.email,
      phone: data.phone,
      password: data.password,
      role: selectedRole,
    });
  };

  return (
    <div className="max-w-md mx-auto min-h-screen bg-white">
      <div className="px-6 py-8 pt-16">
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
            <img src={logo} alt="Brillprime Logo" className="w-16 h-16 object-contain" />
          </div>
          <h1 className="text-xl font-extrabold text-[var(--brill-primary)] mb-2">Create Account</h1>
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

        <div className="text-center">
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
        </div>
      </div>
    </div>
  );
}
