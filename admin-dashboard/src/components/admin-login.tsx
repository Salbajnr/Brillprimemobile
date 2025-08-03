
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAdmin } from '../lib/admin-auth';

export function AdminLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAdmin();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
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
              <div className="curved-card p-4 text-sm" style={{backgroundColor: 'rgba(200, 16, 46, 0.1)', color: 'var(--error-color)'}}>
                {error}
              </div>
            )}

            <div>
              <label htmlFor="email" className="block text-sm font-medium mb-2" style={{color: 'var(--black-text-color)'}}>
                Email Address
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-3 curved-button border border-gray-300 focus:outline-none focus:ring-2 focus:ring-opacity-50"
                style={{borderColor: 'var(--card-color)', '--tw-ring-color': 'var(--button-color)'}}
                placeholder="admin@brillprime.com"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium mb-2" style={{color: 'var(--black-text-color)'}}>
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-4 py-3 curved-button border border-gray-300 focus:outline-none focus:ring-2 focus:ring-opacity-50"
                style={{borderColor: 'var(--card-color)', '--tw-ring-color': 'var(--button-color)'}}
                placeholder="Enter your password"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 px-4 curved-button text-white font-semibold focus:outline-none focus:ring-2 focus:ring-opacity-50 disabled:opacity-50"
              style={{backgroundColor: 'var(--button-color)', '--tw-ring-color': 'var(--button-color)'}}
            >
              {isLoading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
