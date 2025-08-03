import React, { useState } from 'react';
import { useAdmin } from '../lib/admin-auth';

export function AdminLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const { login } = useAdmin();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      await login(email, password);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <style>{`
        :root {
          --button-color: rgb(70, 130, 180);
          --deep-blue-color: rgb(11, 26, 81);
          --card-color: rgb(232, 233, 235);
          --light-text-color: rgb(78, 82, 95);
          --black-text-color: rgb(13, 13, 13);
          --error-color: rgb(200, 16, 46);
        }
        .montserrat { font-family: 'Montserrat', -apple-system, BlinkMacSystemFont, sans-serif; }
        .curved-card { border-radius: 25px; }
        .curved-button { border-radius: 25px; }
      `}</style>
      
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8 montserrat">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4" style={{backgroundColor: 'var(--deep-blue-color)'}}>
              <span className="text-white font-bold text-2xl">BP</span>
            </div>
            <h2 className="text-3xl font-bold" style={{color: 'var(--deep-blue-color)'}}>
              Brill Prime Admin
            </h2>
            <p className="mt-2 text-sm" style={{color: 'var(--light-text-color)'}}>
              Sign in to your admin account
            </p>
          </div>
          
          <div className="curved-card bg-white shadow-lg p-8">
            <form className="space-y-6" onSubmit={handleSubmit}>
              {error && (
                <div className="curved-card p-4" style={{backgroundColor: 'rgba(200, 16, 46, 0.1)', borderLeft: '4px solid var(--error-color)'}}>
                  <div className="flex">
                    <svg className="w-5 h-5 mr-3" style={{color: 'var(--error-color)'}} fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92z" clipRule="evenodd" />
                    </svg>
                    <div>
                      <h3 className="text-sm font-medium" style={{color: 'var(--error-color)'}}>
                        Authentication Failed
                      </h3>
                      <div className="mt-2 text-sm" style={{color: 'var(--light-text-color)'}}>
                        <p>{error}</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
              <div className="space-y-4">
                <div>
                  <label htmlFor="email-address" className="block text-sm font-medium" style={{color: 'var(--black-text-color)'}}>
                    Email Address
                  </label>
                  <input
                    id="email-address"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    className="mt-1 appearance-none relative block w-full px-4 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 curved-button focus:outline-none focus:ring-2 focus:border-transparent"
                    style={{focusRingColor: 'var(--button-color)'}}
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                
                <div>
                  <label htmlFor="password" className="block text-sm font-medium" style={{color: 'var(--black-text-color)'}}>
                    Password
                  </label>
                  <input
                    id="password"
                    name="password"
                    type="password"
                    autoComplete="current-password"
                    required
                    className="mt-1 appearance-none relative block w-full px-4 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 curved-button focus:outline-none focus:ring-2 focus:border-transparent"
                    style={{focusRingColor: 'var(--button-color)'}}
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium curved-button text-white focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 transition-colors"
                  style={{
                    backgroundColor: 'var(--button-color)',
                    focusRingColor: 'var(--button-color)'
                  }}
                  onMouseEnter={(e) => {
                    if (!isLoading) {
                      e.currentTarget.style.backgroundColor = 'rgb(60, 120, 170)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isLoading) {
                      e.currentTarget.style.backgroundColor = 'var(--button-color)';
                    }
                  }}
                >
                  {isLoading ? (
                    <div className="flex items-center">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Signing in...
                    </div>
                  ) : (
                    'Sign in to Admin Panel'
                  )}
                </button>
              </div>
            </form>
          </div>
          
          <div className="text-center">
            <p className="text-xs" style={{color: 'var(--light-text-color)'}}>
              Secure admin access • Contact support if you need assistance
            </p>
          </div>
        </div>
      </div>
    </>
  );
}