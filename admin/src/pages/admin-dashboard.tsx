
import { useState } from 'react';
import { useAdmin } from '../lib/admin-auth';
import { AdminLayout } from '../components/admin-layout';
import { AdminDashboardMain } from '../components/admin-dashboard-main';
import { AdminUserManagement } from './admin-user-management';
import { AdminSupport } from './admin-support';
import { AdminTransactions } from './admin-transactions';
import { AdminMonitoring } from './admin-monitoring';
import { AdminEscrowManagement } from './admin-escrow-management';

type AdminPageType = 'dashboard' | 'users' | 'transactions' | 'escrow' | 'support' | 'monitoring' | 'analytics' | 'security';

export function AdminDashboard() {
  const { isAuthenticated, isLoading } = useAdmin();
  const [currentPage, setCurrentPage] = useState<AdminPageType>('dashboard');

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading admin dashboard...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    window.location.href = '/admin/login';
    return null;
  }

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <AdminDashboardMain />;
      case 'users':
        return <AdminUserManagement />;
      case 'transactions':
        return <AdminTransactions />;
      case 'support':
        return <AdminSupport />;
      case 'monitoring':
        return <AdminMonitoring />;
      case 'escrow':
        return <AdminEscrowManagement />;
      case 'analytics':
        return (
          <div className="p-6">
            <h1 className="text-2xl font-bold text-gray-900">Platform Analytics</h1>
            <p className="text-gray-600 mt-2">Advanced analytics and reporting tools coming soon...</p>
          </div>
        );
      case 'security':
        return (
          <div className="p-6">
            <h1 className="text-2xl font-bold text-gray-900">Security Center</h1>
            <p className="text-gray-600 mt-2">Security monitoring and threat detection tools coming soon...</p>
          </div>
        );
      default:
        return <AdminDashboardMain />;
    }
  };

  const handlePageChange = (page: string) => {
    setCurrentPage(page as AdminPageType);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminLayout currentPage={currentPage} onPageChange={handlePageChange}>
        {renderPage()}
      </AdminLayout>
    </div>
  );
}
