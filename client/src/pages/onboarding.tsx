import { useLocation } from 'wouter';

export default function OnboardingPage() {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen bg-white flex flex-col justify-center items-center p-6">
      <div className="max-w-md w-full text-center">
        <div className="w-32 h-32 mx-auto mb-8 bg-blue-100 rounded-full flex items-center justify-center">
          <span className="text-6xl">🚀</span>
        </div>
        
        <h1 className="text-3xl font-bold text-gray-900 mb-4">
          Welcome to Brill Prime
        </h1>
        
        <p className="text-gray-600 mb-8 leading-relaxed">
          Your all-in-one financial solutions platform. Send money, pay bills, 
          manage your business, and drive for earnings - all in one secure app.
        </p>
        
        <div className="space-y-3 mb-8">
          <div className="flex items-center text-sm text-gray-700">
            <span className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center mr-3">
              <span className="text-white text-xs">✓</span>
            </span>
            Secure transactions with bank-level encryption
          </div>
          <div className="flex items-center text-sm text-gray-700">
            <span className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center mr-3">
              <span className="text-white text-xs">✓</span>
            </span>
            Real-time notifications and tracking
          </div>
          <div className="flex items-center text-sm text-gray-700">
            <span className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center mr-3">
              <span className="text-white text-xs">✓</span>
            </span>
            24/7 customer support
          </div>
        </div>
        
        <button
          onClick={() => setLocation('/role-selection')}
          className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg font-medium hover:bg-blue-700 transition-colors"
        >
          Get Started
        </button>
      </div>
    </div>
  );
}