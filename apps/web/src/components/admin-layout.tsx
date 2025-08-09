import React, { useState, useEffect } from 'react';
import { useAdmin } from '../lib/admin-auth';

interface AdminLayoutProps {
  children: React.ReactNode;
  currentPage: string;
  onPageChange: (page: string) => void;
}

export function AdminLayout({ children, currentPage, onPageChange }: AdminLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const { user, logout } = useAdmin();

  const navigation = [
    { name: 'Dashboard', page: 'dashboard', icon: 'M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z', badge: null },
    { name: 'User Management', page: 'users', icon: 'M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3z', badge: '23' },
    { name: 'Escrow Management', page: 'escrow', icon: 'M4 4a2 2 0 00-2 2v4a2 2 0 002 2V6h10a2 2 0 00-2-2H4zm2 6a2 2 0 012-2h8a2 2 0 012 2v4a2 2 0 01-2 2H8a2 2 0 01-2-2v-4zm6 4a2 2 0 100-4 2 2 0 000 4z', badge: '7' },
    { name: 'Transactions', page: 'transactions', icon: 'M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1z', badge: '3' },
    { name: 'Support & Tickets', page: 'support', icon: 'M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7z', badge: '15' },
    { name: 'Platform Analytics', page: 'analytics', icon: 'M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z', badge: null },
    { name: 'Security & Fraud', page: 'security', icon: 'M2.166 4.999A11.954 11.954 0 0110 1.944 11.954 11.954 0 0117.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z', badge: 'pulse' },
    { name: 'Content Moderation', page: 'moderation', icon: 'M3 5a2 2 0 012-2h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V5zm5 4a1 1 0 10-2 0v6a1 1 0 102 0V9zm4 0a1 1 0 10-2 0v6a1 1 0 102 0V9z', badge: null },
  ];

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
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
          --savings-green: rgb(27, 151, 84);
          --light-green: rgb(234, 255, 243);
          --marketplace-primary: rgb(124, 45, 252);
          --grey-text: rgb(122, 125, 135);
          --error-color: rgb(200, 16, 46);
        }
        .montserrat { font-family: 'Montserrat', -apple-system, BlinkMacSystemFont, sans-serif; }
        .curved-card { border-radius: 25px; }
        .curved-button { border-radius: 25px; }
        .pulse-dot { animation: pulse 2s infinite; }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>

      <div className="flex h-screen bg-gray-50 montserrat">
        {/* Mobile sidebar backdrop */}
        {sidebarOpen && (
          <div 
            className="fixed inset-0 flex z-40 md:hidden"
            onClick={() => setSidebarOpen(false)}
          >
            <div className="fixed inset-0 bg-gray-600 bg-opacity-75" />
          </div>
        )}

        {/* Sidebar */}
        <div className={`w-64 bg-white shadow-lg flex flex-col transform ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } transition-transform duration-300 ease-in-out md:translate-x-0 md:static md:inset-0 z-50`}>
          {/* Logo/Header */}
          <div className="p-6 border-b">
            <div className="flex items-center">
              <div className="w-10 h-10 rounded-full flex items-center justify-center mr-3" style={{backgroundColor: 'var(--deep-blue-color)'}}>
                <span className="text-white font-bold text-lg">BP</span>
              </div>
              <div>
                <h2 className="text-lg font-bold" style={{color: 'var(--deep-blue-color)'}}>Brill Prime</h2>
                <p className="text-xs" style={{color: 'var(--light-text-color)'}}>Admin Panel</p>
              </div>
            </div>
          </div>

          {/* Navigation Menu */}
          <nav className="flex-1 p-4 space-y-2">
            {navigation.map((item) => (
              <button
                key={item.name}
                onClick={() => onPageChange(item.page)}
                className={`w-full flex items-center p-3 rounded-lg ${
                  currentPage === item.page
                    ? 'bg-blue-50'
                    : 'hover:bg-gray-50'
                }`}
                style={{color: currentPage === item.page ? 'var(--button-color)' : 'var(--light-text-color)'}}
              >
                <svg className="w-5 h-5 mr-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d={item.icon} clipRule="evenodd" />
                </svg>
                {item.name}
                {item.badge && item.badge !== 'pulse' && (
                  <span className={`ml-auto text-white text-xs px-2 py-1 rounded-full ${
                    item.badge === '23' ? 'bg-red-500' :
                    item.badge === '7' ? 'bg-yellow-500' :
                    item.badge === '3' ? 'bg-orange-500' :
                    item.badge === '15' ? 'bg-green-500' : 'bg-gray-500'
                  }`}>
                    {item.badge}
                  </span>
                )}
                {item.badge === 'pulse' && (
                  <div className="ml-auto pulse-dot w-2 h-2 bg-red-500 rounded-full"></div>
                )}
              </button>
            ))}
          </nav>

          {/* Admin Profile */}
          <div className="p-4 border-t">
            <div className="flex items-center">
              <div className="w-10 h-10 bg-gray-300 rounded-full mr-3 flex items-center justify-center">
                <span className="text-sm font-medium text-gray-700">
                  {user?.fullName?.charAt(0)?.toUpperCase() || 'A'}
                </span>
              </div>
              <div>
                <p className="text-sm font-medium" style={{color: 'var(--black-text-color)'}}>{user?.fullName || 'Admin User'}</p>
                <p className="text-xs" style={{color: 'var(--light-text-color)'}}>{user?.role || 'Super Admin'}</p>
              </div>
              <button 
                onClick={handleLogout}
                className="ml-auto w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100"
              >
                <svg className="w-4 h-4" style={{color: 'var(--light-text-color)'}} fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M3 3a1 1 0 011-1h12a1 1 0 011 1v3a1 1 0 01-.293.707L12 11.414V15a1 1 0 01-.293.707l-2 2A1 1 0 018 17v-5.586L3.293 6.707A1 1 0 013 6V3z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Top Header */}
          <header className="bg-white shadow-sm border-b p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <button
                  type="button"
                  className="mr-4 p-2 rounded-md text-gray-500 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-indigo-500 md:hidden"
                  onClick={() => setSidebarOpen(true)}
                >
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                </button>
                <div>
                  <h1 className="text-2xl font-bold" style={{color: 'var(--deep-blue-color)'}}>Admin Dashboard</h1>
                  <p className="text-sm" style={{color: 'var(--light-text-color)'}}>Platform overview and system monitoring</p>
                </div>
              </div>
              <div className="flex items-center space-x-4">
                {/* Real-time Indicators */}
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-green-500 rounded-full pulse-dot"></div>
                  <span className="text-sm" style={{color: 'var(--savings-green)'}}>System Online</span>
                </div>
                <div className="flex items-center space-x-2">
                  <svg className="w-5 h-5" style={{color: 'var(--light-text-color)'}} fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                  </svg>
                  <span className="text-sm" style={{color: 'var(--light-text-color)'}}>{formatTime(currentTime)}</span>
                </div>
              </div>
            </div>
          </header>

          {/* Dashboard Content */}
          <main className="flex-1 overflow-auto p-6">
            {children}
          </main>
        </div>
      </div>
    </>
  );
}