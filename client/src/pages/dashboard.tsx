import { useState, useEffect } from "react";
import { useLocation } from "wouter";

export default function Dashboard() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [, setLocation] = useLocation();
  const selectedRole = localStorage.getItem("selectedRole");

  useEffect(() => {
    fetch('/api/users')
      .then(res => res.json())
      .then(data => {
        setUsers(data);
        setLoading(false);
      })
      .catch(err => {
        console.error('Error fetching users:', err);
        setLoading(false);
      });
  }, []);

  const handleRoleBasedRedirect = () => {
    if (selectedRole === 'CONSUMER') {
      setLocation("/consumer-home");
    } else if (selectedRole === 'MERCHANT') {
      setLocation("/merchant-dashboard");
    } else if (selectedRole === 'DRIVER') {
      setLocation("/driver-dashboard");
    }
  };

  return (
    <div className="w-full max-w-md mx-auto min-h-screen bg-gray-50 p-6">
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          {selectedRole === 'CONSUMER' && 'Consumer Portal'}
          {selectedRole === 'MERCHANT' && 'Merchant Dashboard'}
          {selectedRole === 'DRIVER' && 'Driver Hub'}
          {!selectedRole && 'Dashboard'}
        </h1>
        <p className="text-gray-600 mb-6">Welcome to Brillprime Financial Solutions</p>
        
        <div className="space-y-3 mb-6">
          <button 
            className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors"
            onClick={handleRoleBasedRedirect}
          >
            Go to {selectedRole || 'Main'} Dashboard
          </button>
          <button className="w-full bg-gray-600 text-white py-3 px-4 rounded-lg hover:bg-gray-700 transition-colors">
            View Transactions
          </button>
        </div>

        <div className="bg-gray-50 rounded-lg p-4">
          <h3 className="font-semibold text-gray-900 mb-2">System Status</h3>
          {loading ? (
            <p className="text-gray-600">Loading...</p>
          ) : (
            <p className="text-green-600">API Connected - {users.length} users loaded</p>
          )}
        </div>
      </div>
    </div>
  );
}