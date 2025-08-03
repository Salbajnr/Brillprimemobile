
import React, { useState, useEffect } from 'react';

interface UserDetails {
  id: number;
  userId: string;
  fullName: string;
  email: string;
  phone: string;
  role: 'CONSUMER' | 'MERCHANT' | 'DRIVER';
  isVerified: boolean;
  isPhoneVerified: boolean;
  isIdentityVerified: boolean;
  profilePicture?: string;
  createdAt: string;
  kycDocuments?: KYCDocument[];
}

interface KYCDocument {
  id: number;
  documentType: string;
  documentUrl: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  reviewedBy?: number;
  reviewedAt?: string;
  createdAt: string;
}

interface UserDetailModalProps {
  userId: number | null;
  isOpen: boolean;
  onClose: () => void;
  onStatusUpdate: () => void;
}

export function UserDetailModal({ userId, isOpen, onClose, onStatusUpdate }: UserDetailModalProps) {
  const [user, setUser] = useState<UserDetails | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('profile');

  useEffect(() => {
    if (userId && isOpen) {
      loadUserDetails();
    }
  }, [userId, isOpen]);

  const loadUserDetails = async () => {
    if (!userId) return;
    
    try {
      setIsLoading(true);
      const token = localStorage.getItem('admin_token');
      const response = await fetch(`/api/admin/users/${userId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setUser(data.data);
        }
      }
    } catch (error) {
      console.error('Failed to load user details:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const updateUserStatus = async (status: string, reason?: string) => {
    if (!userId) return;

    try {
      const token = localStorage.getItem('admin_token');
      const response = await fetch(`/api/admin/users/${userId}/status`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status, reason }),
      });

      if (response.ok) {
        await loadUserDetails();
        onStatusUpdate();
      }
    } catch (error) {
      console.error('Failed to update user status:', error);
    }
  };

  const flagAccount = async (reason: string, severity: string) => {
    if (!userId) return;

    try {
      const token = localStorage.getItem('admin_token');
      const response = await fetch(`/api/admin/security/flag-account/${userId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ reason, severity }),
      });

      if (response.ok) {
        await loadUserDetails();
        onStatusUpdate();
      }
    } catch (error) {
      console.error('Failed to flag account:', error);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-hidden">
        <div className="flex justify-between items-center p-6 border-b">
          <h2 className="text-xl font-bold">User Details</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            ✕
          </button>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
          </div>
        ) : user ? (
          <div className="flex flex-col h-full">
            {/* Tabs */}
            <div className="flex border-b">
              <button
                className={`px-6 py-3 ${activeTab === 'profile' ? 'border-b-2 border-indigo-500 text-indigo-600' : 'text-gray-500'}`}
                onClick={() => setActiveTab('profile')}
              >
                Profile
              </button>
              <button
                className={`px-6 py-3 ${activeTab === 'kyc' ? 'border-b-2 border-indigo-500 text-indigo-600' : 'text-gray-500'}`}
                onClick={() => setActiveTab('kyc')}
              >
                KYC Documents
              </button>
              <button
                className={`px-6 py-3 ${activeTab === 'actions' ? 'border-b-2 border-indigo-500 text-indigo-600' : 'text-gray-500'}`}
                onClick={() => setActiveTab('actions')}
              >
                Actions
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              {activeTab === 'profile' && (
                <div className="space-y-6">
                  <div className="flex items-center space-x-4">
                    <div className="h-20 w-20 flex-shrink-0">
                      {user.profilePicture ? (
                        <img className="h-20 w-20 rounded-full" src={user.profilePicture} alt="" />
                      ) : (
                        <div className="h-20 w-20 rounded-full bg-indigo-600 flex items-center justify-center">
                          <span className="text-xl font-medium text-white">
                            {user.fullName.charAt(0).toUpperCase()}
                          </span>
                        </div>
                      )}
                    </div>
                    <div>
                      <h3 className="text-2xl font-bold text-gray-900">{user.fullName}</h3>
                      <p className="text-gray-600">{user.email}</p>
                      <p className="text-sm text-gray-500">ID: {user.userId}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Phone</label>
                      <p className="mt-1 text-sm text-gray-900">{user.phone}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Role</label>
                      <span className="mt-1 inline-flex px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                        {user.role}
                      </span>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Account Status</label>
                      <span className={`mt-1 inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                        user.isVerified ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {user.isVerified ? 'Verified' : 'Unverified'}
                      </span>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Phone Verified</label>
                      <span className={`mt-1 inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                        user.isPhoneVerified ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {user.isPhoneVerified ? 'Yes' : 'No'}
                      </span>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Identity Verified</label>
                      <span className={`mt-1 inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                        user.isIdentityVerified ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {user.isIdentityVerified ? 'Yes' : 'No'}
                      </span>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Joined</label>
                      <p className="mt-1 text-sm text-gray-900">
                        {new Date(user.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'kyc' && (
                <div className="space-y-4">
                  {user.kycDocuments && user.kycDocuments.length > 0 ? (
                    user.kycDocuments.map((document) => (
                      <div key={document.id} className="border rounded-lg p-4">
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <h4 className="font-medium text-gray-900">
                              {document.documentType.replace('_', ' ')}
                            </h4>
                            <p className="text-sm text-gray-500">
                              Submitted: {new Date(document.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                            document.status === 'APPROVED' ? 'bg-green-100 text-green-800' :
                            document.status === 'REJECTED' ? 'bg-red-100 text-red-800' :
                            'bg-yellow-100 text-yellow-800'
                          }`}>
                            {document.status}
                          </span>
                        </div>
                        <div className="flex space-x-2">
                          <a
                            href={document.documentUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-800 text-sm"
                          >
                            View Document
                          </a>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-gray-500">No KYC documents uploaded</p>
                  )}
                </div>
              )}

              {activeTab === 'actions' && (
                <div className="space-y-6">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="font-medium text-gray-900 mb-3">Account Status</h4>
                    <div className="flex space-x-3">
                      <button
                        onClick={() => updateUserStatus(user.isVerified ? 'unverified' : 'verified')}
                        className={`px-4 py-2 rounded-md text-sm font-medium ${
                          user.isVerified 
                            ? 'bg-yellow-600 text-white hover:bg-yellow-700'
                            : 'bg-green-600 text-white hover:bg-green-700'
                        }`}
                      >
                        {user.isVerified ? 'Unverify Account' : 'Verify Account'}
                      </button>
                    </div>
                  </div>

                  <div className="bg-red-50 rounded-lg p-4">
                    <h4 className="font-medium text-red-900 mb-3">Security Actions</h4>
                    <div className="space-y-3">
                      <button
                        onClick={() => flagAccount('Suspicious activity detected', 'HIGH')}
                        className="bg-red-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-red-700"
                      >
                        Flag Account
                      </button>
                      <p className="text-sm text-red-700">
                        Flagging will mark the account as suspicious and restrict access.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="p-6">
            <p className="text-gray-500">User not found</p>
          </div>
        )}
      </div>
    </div>
  );
}
