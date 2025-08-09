
import React, { useState } from 'react';
import { AdminProvider, useAdmin } from '../lib/admin-auth';
import { AdminLogin } from '../components/admin-login';
import { AdminLayout } from '../components/admin-layout';
import { AdminDashboardMain } from '../components/admin-dashboard-main';
import { AdminUserManagement } from './admin-user-management';
import { AdminKYCVerification } from './admin-kyc-verification';

type AdminPageType = 'dashboard' | 'users' | 'kyc' | 'escrow' | 'transactions' | 'support' | 'analytics' | 'security';

function AdminContent() {
  const { isAuthenticated, isLoading } = useAdmin();
  const [currentPage, setCurrentPage] = useState<AdminPageType>('dashboard');

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <AdminLogin />;
  }

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <AdminDashboardMain />;
      case 'users':
        return <AdminUserManagement />;
      case 'kyc':
        return <AdminKYCVerification />;
      case 'escrow':
        return <div className="p-6"><h1 className="text-2xl font-bold">Escrow Management</h1><p className="text-gray-600">Coming soon...</p></div>;
      case 'transactions':
        return <div className="p-6"><h1 className="text-2xl font-bold">Transactions</h1><p className="text-gray-600">Coming soon...</p></div>;
      case 'support':
        return <div className="p-6"><h1 className="text-2xl font-bold">Support & Tickets</h1><p className="text-gray-600">Coming soon...</p></div>;
      case 'analytics':
        return <div className="p-6"><h1 className="text-2xl font-bold">Platform Analytics</h1><p className="text-gray-600">Coming soon...</p></div>;
      case 'security':
        return <div className="p-6"><h1 className="text-2xl font-bold">Security & Fraud</h1><p className="text-gray-600">Coming soon...</p></div>;
      default:
        return <AdminDashboardMain />;
    }
  };

  const handlePageChange = (page: string) => {
    setCurrentPage(page as AdminPageType);
  };

  return (
    <AdminLayout currentPage={currentPage} onPageChange={handlePageChange}>
      {renderPage()}
    </AdminLayout>
  );
}

export function AdminDashboard() {
  return (
    <AdminProvider>
      <AdminContent />
    </AdminProvider>
  );
}
