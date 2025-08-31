
import React from 'react';
import { useLocation } from 'wouter';
import { useAdmin } from '../lib/admin-auth';
import { 
  Users, 
  BarChart3, 
  Shield, 
  MessageSquare, 
  CreditCard, 
  Monitor,
  Home,
  LogOut,
  Settings
} from 'lucide-react';
import { Button } from './ui/button';

interface AdminLayoutProps {
  children: React.ReactNode;
  currentPage?: string;
  onPageChange?: (page: string) => void;
}

const menuItems = [
  { id: 'dashboard', label: 'Dashboard', icon: Home, path: '/dashboard' },
  { id: 'users', label: 'User Management', icon: Users, path: '/users' },
  { id: 'transactions', label: 'Transactions', icon: CreditCard, path: '/transactions' },
  { id: 'escrow', label: 'Escrow Management', icon: Shield, path: '/escrow' },
  { id: 'support', label: 'Support', icon: MessageSquare, path: '/support' },
  { id: 'monitoring', label: 'System Monitoring', icon: Monitor, path: '/monitoring' },
  { id: 'analytics', label: 'Analytics', icon: BarChart3, path: '/analytics' },
];

export function AdminLayout({ children, currentPage, onPageChange }: AdminLayoutProps) {
  const { user, logout } = useAdmin();
  const [location, setLocation] = useLocation();

  const handleNavigation = (path: string, page: string) => {
    setLocation(path);
    if (onPageChange) {
      onPageChange(page);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <div className="w-64 bg-white shadow-sm border-r border-gray-200">
        <div className="p-6">
          <h1 className="text-xl font-bold text-gray-900">BrillPrime Admin</h1>
          <p className="text-sm text-gray-600 mt-1">Management Dashboard</p>
        </div>
        
        <nav className="mt-6">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentPage === item.id || location === item.path;
            
            return (
              <button
                key={item.id}
                onClick={() => handleNavigation(item.path, item.id)}
                className={`w-full flex items-center px-6 py-3 text-left hover:bg-gray-50 transition-colors ${
                  isActive ? 'bg-primary-50 border-r-2 border-primary-600 text-primary-700' : 'text-gray-700'
                }`}
              >
                <Icon className={`h-5 w-5 mr-3 ${isActive ? 'text-primary-600' : 'text-gray-400'}`} />
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* User Info */}
        <div className="absolute bottom-0 w-64 p-6 border-t border-gray-200 bg-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-900">{user?.fullName}</p>
              <p className="text-xs text-gray-500">{user?.email}</p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={logout}
              className="p-2"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        <header className="bg-white shadow-sm border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">
              {menuItems.find(item => item.id === currentPage)?.label || 'Dashboard'}
            </h2>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">
                Welcome, {user?.fullName}
              </span>
            </div>
          </div>
        </header>
        
        <main className="p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
