import React, { useEffect, useState } from 'react';
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { 
  signInWithGoogle, 
  signInWithApple, 
  signInWithFacebook, 
  initializeSocialAuth,
  SOCIAL_PROVIDERS 
} from "@/lib/social-auth";
import { Loader2 } from "lucide-react";

interface SocialLoginButtonsProps {
  onSuccess?: (user: any) => void;
  onError?: (error: string) => void;
  disabled?: boolean;
}

export function SocialLoginButtons({ onSuccess, onError, disabled = false }: SocialLoginButtonsProps) {
  const [loading, setLoading] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    // Initialize social authentication SDKs when component mounts
    initializeSocialAuth();
  }, []);

  const handleSocialLogin = async (provider: string) => {
    if (disabled || loading) return;
    
    setLoading(provider);
    
    try {
      let result;
      
      switch (provider) {
        case 'GOOGLE':
          result = await signInWithGoogle();
          break;
        case 'APPLE':
          result = await signInWithApple();
          break;
        case 'FACEBOOK':
          result = await signInWithFacebook();
          break;
        default:
          throw new Error('Unsupported social provider');
      }

      if (result.success && result.user) {
        toast({
          title: "Login Successful",
          description: `Welcome back, ${result.user.fullName || result.user.email}!`,
        });
        
        if (onSuccess) {
          onSuccess(result.user);
        }
      } else {
        const errorMessage = result.error || 'Social login failed';
        toast({
          title: "Login Failed",
          description: errorMessage,
          variant: "destructive",
        });
        
        if (onError) {
          onError(errorMessage);
        }
      }
    } catch (error) {
      const errorMessage = 'An unexpected error occurred during login';
      toast({
        title: "Login Error",
        description: errorMessage,
        variant: "destructive",
      });
      
      if (onError) {
        onError(errorMessage);
      }
    } finally {
      setLoading(null);
    }
  };

  const getSocialIcon = (providerId: string) => {
    switch (providerId) {
      case 'GOOGLE':
        return (
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path fill="#4285f4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34a853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#fbbc05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#ea4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
        );
      case 'APPLE':
        return (
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
            <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
          </svg>
        );
      case 'FACEBOOK':
        return (
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="#1877f2">
            <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
          </svg>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-3">
      {SOCIAL_PROVIDERS.map((provider) => (
        <Button
          key={provider.id}
          variant="outline"
          className="w-full h-12 text-gray-700 border-gray-300 hover:bg-gray-50 transition-colors"
          onClick={() => handleSocialLogin(provider.id)}
          disabled={disabled || loading !== null}
        >
          {loading === provider.id ? (
            <Loader2 className="w-5 h-5 mr-3 animate-spin" />
          ) : (
            <span className="mr-3">
              {getSocialIcon(provider.id)}
            </span>
          )}
          <span className="font-medium">
            {loading === provider.id ? 'Signing in...' : `Continue with ${provider.name}`}
          </span>
        </Button>
      ))}
    </div>
  );
}

export default SocialLoginButtons;