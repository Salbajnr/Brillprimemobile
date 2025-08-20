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
            <div className="social-icon google-icon w-6 h-6 bg-gray-400 rounded"></div>
          </button>
          <button className="w-14 h-14 border border-gray-300 curved-social flex items-center justify-center hover:bg-gray-50 transition duration-200">
            <div className="social-icon apple-icon w-6 h-6 bg-gray-400 rounded"></div>
          </button>
          <button className="w-14 h-14 border border-gray-300 curved-social flex items-center justify-center hover:bg-gray-50 transition duration-200">
            <div className="social-icon facebook-icon w-6 h-6 bg-gray-400 rounded"></div>
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