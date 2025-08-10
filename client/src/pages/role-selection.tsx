import { useState } from 'react';
import { useLocation } from 'wouter';

export default function RoleSelectionPage() {
  const [selectedRole, setSelectedRole] = useState<string>('');
  const [, setLocation] = useLocation();

  const roles = [
    {
      id: 'CONSUMER',
      title: 'Consumer',
      description: 'Send money, pay bills, and manage your finances',
      icon: '👤',
      color: 'bg-blue-500'
    },
    {
      id: 'MERCHANT',
      title: 'Merchant',
      description: 'Accept payments, manage your business, and grow your revenue',
      icon: '🏪',
      color: 'bg-green-500'
    },
    {
      id: 'DRIVER',
      title: 'Driver',
      description: 'Earn money by delivering goods and providing transport services',
      icon: '🚗',
      color: 'bg-orange-500'
    }
  ];

  const handleContinue = () => {
    if (selectedRole) {
      localStorage.setItem('selectedRole', selectedRole);
      setLocation('/dashboard');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center items-center p-6">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Choose Your Role</h1>
          <p className="text-gray-600">Select how you want to use Brill Prime</p>
        </div>

        <div className="space-y-4 mb-8">
          {roles.map((role) => (
            <button
              key={role.id}
              onClick={() => setSelectedRole(role.id)}
              className={`w-full p-4 rounded-lg border-2 text-left transition-all ${
                selectedRole === role.id
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 bg-white hover:border-gray-300'
              }`}
            >
              <div className="flex items-center">
                <div className={`w-12 h-12 ${role.color} rounded-full flex items-center justify-center mr-4`}>
                  <span className="text-2xl">{role.icon}</span>
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900 mb-1">{role.title}</h3>
                  <p className="text-sm text-gray-600">{role.description}</p>
                </div>
              </div>
            </button>
          ))}
        </div>

        <button
          onClick={handleContinue}
          disabled={!selectedRole}
          className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Continue as {selectedRole ? roles.find(r => r.id === selectedRole)?.title : 'Selected Role'}
        </button>
      </div>
    </div>
  );
}