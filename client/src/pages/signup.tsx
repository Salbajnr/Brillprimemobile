import { useState } from "react";

// Using direct paths to avoid import issues during development
const logoImage = "/src/assets/images/logo.png";

export default function SignUpPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Get selected role from localStorage
  const selectedRole = localStorage.getItem("selectedRole") || "CONSUMER";

  const handleSignUp = () => {
    if (email.length < 4) {
      alert('Please enter a valid email');
      return;
    }
    
    if (password.trim().length < 8) {
      alert('Password must be at least 8 characters');
      return;
    }

    if (password !== confirmPassword) {
      alert('Passwords do not match');
      return;
    }
    
    // For now just show success message
    alert(`Sign up functionality would be implemented here for ${selectedRole} role`);
  };

  const togglePassword = () => {
    setShowPassword(!showPassword);
  };

  const toggleConfirmPassword = () => {
    setShowConfirmPassword(!showConfirmPassword);
  };

  return (
    <div className="w-full max-w-md mx-auto min-h-screen bg-white flex flex-col">
      <div className="flex-1 flex flex-col justify-center px-6 py-8">
        {/* Logo and Title */}
        <div className="text-center mb-6">
          <div className="mb-2">
            <img src={logoImage} alt="Logo" className="w-20 h-16 mx-auto object-contain" />
          </div>
          <h1 className="text-[#2d3748] text-2xl font-extrabold">Sign Up</h1>
          <p className="text-[#718096] text-sm mt-2">Create your {selectedRole.toLowerCase()} account</p>
        </div>

        {/* Email Field */}
        <div className="mb-4">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none">
              <svg className="w-5 h-5 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z"></path>
                <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z"></path>
              </svg>
            </div>
            <input 
              type="email" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full pl-12 pr-4 py-4 border border-gray-300 curved-input focus:ring-2 focus:ring-[#4682B4] focus:border-[#4682B4] text-base"
              placeholder="Email or phone number"
            />
          </div>
        </div>

        {/* Password Field */}
        <div className="mb-4">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none">
              <svg className="w-5 h-5 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd"></path>
              </svg>
            </div>
            <input 
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full pl-12 pr-14 py-4 border border-gray-300 curved-input focus:ring-2 focus:ring-[#4682B4] focus:border-[#4682B4] text-base"
              placeholder="Password"
            />
            <button type="button" onClick={togglePassword} className="absolute inset-y-0 right-0 pr-5 flex items-center">
              <svg className="w-5 h-5 text-gray-400 hover:text-gray-600" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10 12a2 2 0 100-4 2 2 0 000 4z"></path>
                <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd"></path>
              </svg>
            </button>
          </div>
        </div>

        {/* Confirm Password Field */}
        <div className="mb-4">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none">
              <svg className="w-5 h-5 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd"></path>
              </svg>
            </div>
            <input 
              type={showConfirmPassword ? "text" : "password"}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full pl-12 pr-14 py-4 border border-gray-300 curved-input focus:ring-2 focus:ring-[#4682B4] focus:border-[#4682B4] text-base"
              placeholder="Confirm Password"
            />
            <button type="button" onClick={toggleConfirmPassword} className="absolute inset-y-0 right-0 pr-5 flex items-center">
              <svg className="w-5 h-5 text-gray-400 hover:text-gray-600" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10 12a2 2 0 100-4 2 2 0 000 4z"></path>
                <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd"></path>
              </svg>
            </button>
          </div>
        </div>

        {/* Sign Up Button */}
        <button 
          onClick={handleSignUp}
          className="w-full bg-[#4682B4] text-white py-4 px-4 curved-button font-medium hover:bg-[#3a70a0] transition duration-200 mb-10"
        >
          Sign Up
        </button>

        {/* Divider */}
        <div className="flex items-center mb-5">
          <div className="flex-1 border-t border-black"></div>
          <span className="px-2 text-[#2d3748] text-sm font-light">or continue with</span>
          <div className="flex-1 border-t border-black"></div>
        </div>

        {/* Social Login Buttons */}
        <div className="flex justify-center space-x-5 mb-5">
          <button className="w-14 h-14 border border-gray-300 curved-social flex items-center justify-center hover:bg-gray-50 transition duration-200">
            <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
          </button>
          <button className="w-14 h-14 border border-gray-300 curved-social flex items-center justify-center hover:bg-gray-50 transition duration-200">
            <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
            </svg>
          </button>
          <button className="w-14 h-14 border border-gray-300 curved-social flex items-center justify-center hover:bg-gray-50 transition duration-200">
            <svg className="w-6 h-6" viewBox="0 0 24 24" fill="#1877F2">
              <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
            </svg>
          </button>
        </div>

        {/* Sign In Link */}
        <div className="text-center">
          <span className="text-[#2d3748] text-sm font-light">Already have an account? </span>
          <a href="/signin" className="text-[#4682B4] text-sm font-bold hover:underline">Sign in</a>
        </div>
      </div>
    </div>
  );
}