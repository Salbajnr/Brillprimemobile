import { useState } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff, Mail, Lock } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import logo from "../assets/images/logo.png";

import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { LoadingButton } from "@/components/ui/loading-button";
import { Button } from "@/components/ui/button";
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

  const signInMutation = useMutation({
    mutationFn: authAPI.signin,
    onSuccess: (data) => {
      if (data.user) {
        setUser(data.user);
        setLocation("/dashboard");
      }
    },
    onError: (error: Error) => {
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

  return (
    <div className="max-w-md mx-auto min-h-screen bg-white">
      <div className="px-6 py-8 pt-16">
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
            <img src={logo} alt="Brillprime Logo" className="w-16 h-16 object-contain" />
          </div>
          <h1 className="text-xl font-extrabold text-[var(--brill-primary)] mb-2">Welcome Back</h1>
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
    </div>
  );
}
