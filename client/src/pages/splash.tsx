import { useEffect } from 'react';
import { useLocation } from 'wouter';

export default function SplashPage() {
  const [, setLocation] = useLocation();

  useEffect(() => {
    const timer = setTimeout(() => {
      setLocation('/onboarding');
    }, 3000);

    return () => clearTimeout(timer);
  }, [setLocation]);

  return (
    <div className="min-h-screen bg-blue-600 flex items-center justify-center">
      <div className="text-center text-white">
        <div className="w-24 h-24 mx-auto mb-6 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
          <span className="text-4xl">₦</span>
        </div>
        <h1 className="text-3xl font-bold mb-2">Brill Prime</h1>
        <p className="text-blue-100">Financial Solutions Platform</p>
        <div className="mt-8">
          <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto"></div>
        </div>
      </div>
    </div>
  );
}