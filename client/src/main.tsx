import React from 'react'
import ReactDOM from 'react-dom/client'
import './index.css'

// Simple working component first
function BrillPrimeApp() {
  const [currentScreen, setCurrentScreen] = React.useState('splash');

  React.useEffect(() => {
    // Auto-progress from splash after 2 seconds
    if (currentScreen === 'splash') {
      const timer = setTimeout(() => {
        setCurrentScreen('onboarding');
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [currentScreen]);

  const screens = {
    splash: (
      <div className="w-full max-w-md mx-auto min-h-screen bg-white flex flex-col items-center justify-center">
        <img 
          src="/src/assets/images/logo.png" 
          alt="BrillPrime Logo" 
          className="w-24 h-24 animate-bounce"
          onError={(e) => {
            e.currentTarget.outerHTML = '<div class="w-24 h-24 bg-blue-600 rounded-full flex items-center justify-center text-white text-2xl font-bold animate-bounce">BP</div>';
          }}
        />
        <div className="mt-8 flex space-x-2">
          <div className="w-3 h-3 bg-blue-600 rounded-full animate-bounce"></div>
          <div className="w-3 h-3 bg-blue-600 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
          <div className="w-3 h-3 bg-blue-600 rounded-full animate-bounce" style={{animationDelay: '0.4s'}}></div>
        </div>
      </div>
    ),
    onboarding: (
      <div className="w-full max-w-md mx-auto min-h-screen bg-white flex flex-col items-center justify-center p-6">
        <h1 className="text-3xl font-bold text-gray-800 mb-4">Welcome to BrillPrime</h1>
        <p className="text-gray-600 mb-8 text-center">Your all-in-one delivery platform for commodities, fuel, and more.</p>
        <button 
          onClick={() => setCurrentScreen('roleSelection')}
          className="bg-blue-600 text-white px-8 py-3 rounded-full text-lg font-semibold hover:bg-blue-700"
        >
          Get Started
        </button>
        <button 
          onClick={() => setCurrentScreen('signin')}
          className="text-blue-600 mt-4 underline"
        >
          Already have an account? Sign In
        </button>
      </div>
    ),
    roleSelection: (
      <div className="w-full max-w-md mx-auto min-h-screen bg-white flex flex-col items-center justify-center p-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-8">Choose Your Role</h2>
        <div className="space-y-4 w-full">
          {['Consumer', 'Merchant', 'Driver', 'Admin'].map(role => (
            <button 
              key={role}
              onClick={() => setCurrentScreen('signup')}
              className="w-full bg-gray-100 hover:bg-blue-100 p-4 rounded-lg text-left font-semibold"
            >
              {role}
            </button>
          ))}
        </div>
      </div>
    ),
    signup: (
      <div className="w-full max-w-md mx-auto min-h-screen bg-white flex flex-col items-center justify-center p-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-8">Create Account</h2>
        <form className="w-full space-y-4">
          <input type="text" placeholder="Full Name" className="w-full p-3 border rounded-lg" />
          <input type="email" placeholder="Email" className="w-full p-3 border rounded-lg" />
          <input type="tel" placeholder="Phone Number" className="w-full p-3 border rounded-lg" />
          <input type="password" placeholder="Password" className="w-full p-3 border rounded-lg" />
          <button 
            type="button"
            onClick={() => setCurrentScreen('otp')}
            className="w-full bg-blue-600 text-white p-3 rounded-lg font-semibold"
          >
            Sign Up
          </button>
        </form>
        <button 
          onClick={() => setCurrentScreen('signin')}
          className="text-blue-600 mt-4 underline"
        >
          Already have an account? Sign In
        </button>
      </div>
    ),
    signin: (
      <div className="w-full max-w-md mx-auto min-h-screen bg-white flex flex-col items-center justify-center p-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-8">Sign In</h2>
        <form className="w-full space-y-4">
          <input type="email" placeholder="Email" className="w-full p-3 border rounded-lg" />
          <input type="password" placeholder="Password" className="w-full p-3 border rounded-lg" />
          <button 
            type="button"
            onClick={() => setCurrentScreen('dashboard')}
            className="w-full bg-blue-600 text-white p-3 rounded-lg font-semibold"
          >
            Sign In
          </button>
        </form>
        <button 
          onClick={() => setCurrentScreen('roleSelection')}
          className="text-blue-600 mt-4 underline"
        >
          Create new account
        </button>
      </div>
    ),
    otp: (
      <div className="w-full max-w-md mx-auto min-h-screen bg-white flex flex-col items-center justify-center p-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">Verify Your Account</h2>
        <p className="text-gray-600 mb-8 text-center">Enter the verification code sent to your email</p>
        <div className="flex space-x-3 mb-8">
          {[1,2,3,4,5,6].map(i => (
            <input key={i} type="text" maxLength={1} className="w-12 h-12 border rounded-lg text-center text-xl" />
          ))}
        </div>
        <button 
          onClick={() => setCurrentScreen('dashboard')}
          className="w-full bg-blue-600 text-white p-3 rounded-lg font-semibold"
        >
          Verify
        </button>
      </div>
    ),
    dashboard: (
      <div className="w-full max-w-md mx-auto min-h-screen bg-white flex flex-col items-center justify-center p-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-8">Welcome to BrillPrime!</h2>
        <p className="text-gray-600 mb-4 text-center">You're now signed in and ready to use the platform.</p>
        <button 
          onClick={() => setCurrentScreen('splash')}
          className="bg-blue-600 text-white px-8 py-3 rounded-lg font-semibold"
        >
          Start Over (Demo)
        </button>
      </div>
    )
  };

  return screens[currentScreen] || screens.splash;
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrillPrimeApp />
  </React.StrictMode>
)