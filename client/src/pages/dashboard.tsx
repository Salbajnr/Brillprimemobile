import { useState, useEffect } from "react";

export default function DashboardPage() {
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    // Check if user is logged in
    const userData = localStorage.getItem('user');
    if (userData) {
      setUser(JSON.parse(userData));
    } else {
      // Redirect to sign in if not logged in
      window.location.href = '/signin';
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('user');
    localStorage.removeItem('selectedRole');
    alert('Logged out successfully');
    window.location.href = '/';
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-bold text-[#2d3748] mb-4">Loading...</h2>
          <p className="text-[#718096]">Checking authentication status</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-[#2c3e50] text-white p-4">
        <div className="max-w-md mx-auto flex justify-between items-center">
          <div>
            <h1 className="text-lg font-bold">BrillPrime Dashboard</h1>
            <p className="text-sm opacity-80">{user.role || 'User'} Portal</p>
          </div>
          <button
            onClick={handleLogout}
            className="bg-[#4682B4] text-white px-4 py-2 curved-button text-sm hover:bg-[#3a70a0] transition duration-200"
          >
            Logout
          </button>
        </div>
      </div>

      {/* User Info Card */}
      <div className="max-w-md mx-auto p-6">
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <div className="text-center mb-4">
            <div className="w-16 h-16 bg-[#4682B4] rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-white text-xl font-bold">
                {user.fullName ? user.fullName.charAt(0).toUpperCase() : user.name ? user.name.charAt(0).toUpperCase() : 'U'}
              </span>
            </div>
            <h2 className="text-xl font-bold text-[#2d3748]">
              {user.fullName || user.name || 'Welcome!'}
            </h2>
            <p className="text-[#718096]">{user.email}</p>
            <span className="inline-block bg-[#4682B4] text-white px-3 py-1 rounded-full text-sm mt-2">
              {user.role || 'Consumer'}
            </span>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h3 className="text-lg font-bold text-[#2d3748] mb-4">Quick Actions</h3>
          <div className="space-y-3">
            {user.role === 'CONSUMER' && (
              <>
                <button className="w-full bg-[#f8f9fa] text-[#2d3748] p-4 rounded-lg text-left hover:bg-gray-100 transition duration-200">
                  <div className="font-semibold">Browse Products</div>
                  <div className="text-sm text-[#718096]">Explore our catalog</div>
                </button>
                <button className="w-full bg-[#f8f9fa] text-[#2d3748] p-4 rounded-lg text-left hover:bg-gray-100 transition duration-200">
                  <div className="font-semibold">Track Orders</div>
                  <div className="text-sm text-[#718096]">View order status</div>
                </button>
              </>
            )}

            {user.role === 'MERCHANT' && (
              <>
                <button className="w-full bg-[#f8f9fa] text-[#2d3748] p-4 rounded-lg text-left hover:bg-gray-100 transition duration-200">
                  <div className="font-semibold">Manage Inventory</div>
                  <div className="text-sm text-[#718096]">Add and update products</div>
                </button>
                <button className="w-full bg-[#f8f9fa] text-[#2d3748] p-4 rounded-lg text-left hover:bg-gray-100 transition duration-200">
                  <div className="font-semibold">View Sales</div>
                  <div className="text-sm text-[#718096]">Track your earnings</div>
                </button>
              </>
            )}

            {user.role === 'DRIVER' && (
              <>
                <button className="w-full bg-[#f8f9fa] text-[#2d3748] p-4 rounded-lg text-left hover:bg-gray-100 transition duration-200">
                  <div className="font-semibold">Available Deliveries</div>
                  <div className="text-sm text-[#718096]">Find delivery jobs</div>
                </button>
                <button className="w-full bg-[#f8f9fa] text-[#2d3748] p-4 rounded-lg text-left hover:bg-gray-100 transition duration-200">
                  <div className="font-semibold">Earnings Report</div>
                  <div className="text-sm text-[#718096]">View your income</div>
                </button>
              </>
            )}

            <button className="w-full bg-[#4682B4] text-white p-4 rounded-lg hover:bg-[#3a70a0] transition duration-200">
              <div className="font-semibold">Get Started</div>
              <div className="text-sm opacity-80">Begin using BrillPrime</div>
            </button>
          </div>
        </div>

        {/* Authentication Test Info */}
        <div className="bg-white rounded-lg shadow-lg p-6 mt-6">
          <h3 className="text-lg font-bold text-[#2d3748] mb-4">Authentication Status</h3>
          <div className="text-sm space-y-2">
            <div className="flex justify-between">
              <span className="text-[#718096]">Status:</span>
              <span className="text-green-600 font-semibold">✓ Authenticated</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#718096]">Role:</span>
              <span className="font-semibold">{user.role || 'Consumer'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#718096]">Login Method:</span>
              <span className="font-semibold">{user.provider ? `${user.provider} Social` : 'Email/Password'}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}