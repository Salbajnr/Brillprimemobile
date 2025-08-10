import { useState, useEffect } from 'react';

export default function Dashboard() {
  const [role, setRole] = useState<string>('');
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const selectedRole = localStorage.getItem('selectedRole') || 'CONSUMER';
    setRole(selectedRole);
    
    // Fetch dashboard data from API
    const fetchDashboardData = async () => {
      try {
        const response = await fetch(`/api/dashboard?role=${selectedRole}`);
        const data = await response.json();
        setDashboardData(data);
      } catch (error) {
        console.error('Failed to fetch dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  const getRoleIcon = () => {
    switch(role) {
      case 'CONSUMER': return '👤';
      case 'MERCHANT': return '🏪';
      case 'DRIVER': return '🚗';
      default: return '👤';
    }
  };

  const getRoleColor = () => {
    switch(role) {
      case 'CONSUMER': return 'bg-blue-500';
      case 'MERCHANT': return 'bg-green-500';
      case 'DRIVER': return 'bg-orange-500';
      default: return 'bg-blue-500';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-md mx-auto bg-white min-h-screen">
        {/* Header */}
        <div className={`${getRoleColor()} text-white p-6`}>
          <div className="flex items-center mb-4">
            <div className="w-12 h-12 bg-white bg-opacity-20 rounded-full flex items-center justify-center mr-4">
              <span className="text-2xl">{getRoleIcon()}</span>
            </div>
            <div>
              <h1 className="text-2xl font-bold">{role} Dashboard</h1>
              <p className="text-white text-opacity-90">Welcome to Brill Prime</p>
            </div>
          </div>
          
          {dashboardData && (
            <div className="bg-white bg-opacity-10 rounded-lg p-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-white text-opacity-70 text-sm">
                    {role === 'CONSUMER' ? 'Balance' : role === 'MERCHANT' ? 'Revenue' : 'Earnings'}
                  </p>
                  <p className="text-2xl font-bold">
                    {dashboardData.balance || dashboardData.revenue || dashboardData.earnings}
                  </p>
                </div>
                <div>
                  <p className="text-white text-opacity-70 text-sm">
                    {role === 'CONSUMER' ? 'Transactions' : role === 'MERCHANT' ? 'Orders' : 'Trips'}
                  </p>
                  <p className="text-2xl font-bold">
                    {dashboardData.transactions || dashboardData.orders || dashboardData.trips}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
          <div className="space-y-3">
            {dashboardData?.quickActions?.map((action: string, index: number) => (
              <button
                key={index}
                className="w-full p-4 bg-white border border-gray-200 rounded-lg text-left hover:bg-gray-50 transition-colors"
              >
                <span className="font-medium text-gray-900">{action}</span>
              </button>
            ))}
          </div>
        </div>

        {/* System Status */}
        <div className="p-6">
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center">
              <span className="text-green-600 mr-2">✓</span>
              <span className="text-green-800 font-medium">All systems operational</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}