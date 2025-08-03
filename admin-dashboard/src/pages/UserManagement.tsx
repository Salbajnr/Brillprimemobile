import React, { useState, useEffect } from 'react';
import { adminApi } from '../lib/api';
import { UserWithKYC } from '../types/admin';

interface UserFilters {
  role?: string;
  status?: string;
  search?: string;
  page: number;
  limit: number;
}

export function UserManagement() {
  const [users, setUsers] = useState<UserWithKYC[]>([]);
  const [selectedUser, setSelectedUser] = useState<UserWithKYC | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showUserModal, setShowUserModal] = useState(false);
  const [filters, setFilters] = useState<UserFilters>({
    page: 1,
    limit: 20
  });
  const [totalPages, setTotalPages] = useState(1);
  const [totalUsers, setTotalUsers] = useState(0);

  useEffect(() => {
    loadUsers();
  }, [filters]);

  const loadUsers = async () => {
    try {
      setIsLoading(true);
      const response = await adminApi.getUsers(filters);
      if (response.success) {
        setUsers(response.data.items || []);
        setTotalPages(response.data.totalPages || 1);
        setTotalUsers(response.data.total || 0);
      }
    } catch (error) {
      console.error('Failed to load users:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = (searchTerm: string) => {
    setFilters(prev => ({ ...prev, search: searchTerm, page: 1 }));
  };

  const handleFilterChange = (key: keyof UserFilters, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value, page: 1 }));
  };

  const handleUserSelect = async (user: UserWithKYC) => {
    try {
      const response = await adminApi.getUserById(user.id);
      if (response.success) {
        setSelectedUser(response.data);
        setShowUserModal(true);
      }
    } catch (error) {
      console.error('Failed to load user details:', error);
    }
  };

  const handleStatusUpdate = async (userId: number, status: string) => {
    try {
      await adminApi.updateUserStatus(userId, status);
      loadUsers();
      if (selectedUser?.id === userId) {
        setSelectedUser(prev => prev ? { ...prev, isVerified: status === 'verified' } : null);
      }
    } catch (error) {
      console.error('Failed to update user status:', error);
    }
  };

  const handleFlagUser = async (userId: number, reason: string) => {
    try {
      await adminApi.flagUser(userId, reason);
      loadUsers();
    } catch (error) {
      console.error('Failed to flag user:', error);
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'CONSUMER': return 'bg-blue-100 text-blue-800';
      case 'MERCHANT': return 'bg-green-100 text-green-800';
      case 'DRIVER': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusColor = (isVerified: boolean) => {
    return isVerified ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
            <p className="text-gray-600">Manage and monitor platform users</p>
          </div>
          <div className="text-sm text-gray-500">
            Total Users: {totalUsers.toLocaleString()}
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Search Users</label>
            <input
              type="text"
              placeholder="Search by name, email, or ID..."
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              onChange={(e) => handleSearch(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Role</label>
            <select
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              onChange={(e) => handleFilterChange('role', e.target.value)}
            >
              <option value="">All Roles</option>
              <option value="CONSUMER">Consumer</option>
              <option value="MERCHANT">Merchant</option>
              <option value="DRIVER">Driver</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
            <select
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              onChange={(e) => handleFilterChange('status', e.target.value)}
            >
              <option value="">All Status</option>
              <option value="verified">Verified</option>
              <option value="unverified">Unverified</option>
              <option value="flagged">Flagged</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Actions</label>
            <button
              onClick={loadUsers}
              className="w-full bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      User
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Role
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Verification
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Joined
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {users.map((user) => (
                    <tr key={user.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="h-10 w-10 flex-shrink-0">
                            {user.profilePicture ? (
                              <img className="h-10 w-10 rounded-full" src={user.profilePicture} alt="" />
                            ) : (
                              <div className="h-10 w-10 rounded-full bg-indigo-600 flex items-center justify-center">
                                <span className="text-sm font-medium text-white">
                                  {user.fullName.charAt(0).toUpperCase()}
                                </span>
                              </div>
                            )}
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">{user.fullName}</div>
                            <div className="text-sm text-gray-500">{user.email}</div>
                            <div className="text-xs text-gray-400">ID: {user.userId}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getRoleColor(user.role)}`}>
                          {user.role}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(user.isVerified)}`}>
                          {user.isVerified ? 'Verified' : 'Unverified'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex space-x-1">
                          <span className={`inline-flex px-2 py-1 text-xs font-medium rounded ${
                            user.isPhoneVerified ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                          }`}>
                            📱 {user.isPhoneVerified ? 'Yes' : 'No'}
                          </span>
                          <span className={`inline-flex px-2 py-1 text-xs font-medium rounded ${
                            user.isIdentityVerified ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                          }`}>
                            🆔 {user.isIdentityVerified ? 'Yes' : 'No'}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(user.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                        <button
                          onClick={() => handleUserSelect(user)}
                          className="text-indigo-600 hover:text-indigo-900"
                        >
                          View Details
                        </button>
                        <button
                          onClick={() => handleStatusUpdate(user.id, user.isVerified ? 'unverified' : 'verified')}
                          className="text-green-600 hover:text-green-900"
                        >
                          {user.isVerified ? 'Unverify' : 'Verify'}
                        </button>
                        <button
                          onClick={() => handleFlagUser(user.id, 'Manual flag by admin')}
                          className="text-red-600 hover:text-red-900"
                        >
                          Flag
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
              <div className="flex-1 flex justify-between sm:hidden">
                <button
                  onClick={() => setFilters(prev => ({ ...prev, page: prev.page - 1 }))}
                  disabled={filters.page <= 1}
                  className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                >
                  Previous
                </button>
                <button
                  onClick={() => setFilters(prev => ({ ...prev, page: prev.page + 1 }))}
                  disabled={filters.page >= totalPages}
                  className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                >
                  Next
                </button>
              </div>
              <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm text-gray-700">
                    Showing <span className="font-medium">{((filters.page - 1) * filters.limit) + 1}</span> to{' '}
                    <span className="font-medium">{Math.min(filters.page * filters.limit, totalUsers)}</span> of{' '}
                    <span className="font-medium">{totalUsers}</span> results
                  </p>
                </div>
                <div>
                  <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                    <button
                      onClick={() => setFilters(prev => ({ ...prev, page: prev.page - 1 }))}
                      disabled={filters.page <= 1}
                      className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                    >
                      Previous
                    </button>
                    <button
                      onClick={() => setFilters(prev => ({ ...prev, page: prev.page + 1 }))}
                      disabled={filters.page >= totalPages}
                      className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                    >
                      Next
                    </button>
                  </nav>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* User Detail Modal */}
      {showUserModal && selectedUser && (
        <UserDetailModal
          user={selectedUser}
          onClose={() => setShowUserModal(false)}
          onStatusUpdate={handleStatusUpdate}
          onFlagUser={handleFlagUser}
        />
      )}
    </div>
  );
}

interface UserDetailModalProps {
  user: UserWithKYC;
  onClose: () => void;
  onStatusUpdate: (userId: number, status: string) => void;
  onFlagUser: (userId: number, reason: string) => void;
}

function UserDetailModal({ user, onClose, onStatusUpdate, onFlagUser }: UserDetailModalProps) {
  const [flagReason, setFlagReason] = useState('');
  const [showFlagInput, setShowFlagInput] = useState(false);

  const handleFlag = () => {
    if (flagReason.trim()) {
      onFlagUser(user.id, flagReason);
      setShowFlagInput(false);
      setFlagReason('');
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-11/12 max-w-2xl shadow-lg rounded-md bg-white">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium text-gray-900">User Details</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="space-y-6">
          {/* User Info */}
          <div className="flex items-center space-x-4">
            {user.profilePicture ? (
              <img className="h-16 w-16 rounded-full" src={user.profilePicture} alt="" />
            ) : (
              <div className="h-16 w-16 rounded-full bg-indigo-600 flex items-center justify-center">
                <span className="text-xl font-medium text-white">
                  {user.fullName.charAt(0).toUpperCase()}
                </span>
              </div>
            )}
            <div>
              <h4 className="text-xl font-medium text-gray-900">{user.fullName}</h4>
              <p className="text-gray-600">{user.email}</p>
              <p className="text-gray-500">ID: {user.userId}</p>
            </div>
          </div>

          {/* User Details Grid */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-500">Role</label>
              <p className="text-gray-900">{user.role}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Phone</label>
              <p className="text-gray-900">{user.phone}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Account Status</label>
              <p className="text-gray-900">{user.isVerified ? 'Verified' : 'Unverified'}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Joined Date</label>
              <p className="text-gray-900">{new Date(user.createdAt).toLocaleDateString()}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Phone Verified</label>
              <p className="text-gray-900">{user.isPhoneVerified ? 'Yes' : 'No'}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Identity Verified</label>
              <p className="text-gray-900">{user.isIdentityVerified ? 'Yes' : 'No'}</p>
            </div>
          </div>

          {/* KYC Documents */}
          {user.kycDocuments && user.kycDocuments.length > 0 && (
            <div>
              <h5 className="text-lg font-medium text-gray-900 mb-3">KYC Documents</h5>
              <div className="space-y-2">
                {user.kycDocuments.map((doc) => (
                  <div key={doc.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                    <div>
                      <p className="font-medium text-gray-900">{doc.documentType}</p>
                      <p className="text-sm text-gray-500">Uploaded {new Date(doc.createdAt).toLocaleDateString()}</p>
                    </div>
                    <div className="flex items-center space-x-3">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        doc.status === 'APPROVED' ? 'bg-green-100 text-green-800' :
                        doc.status === 'REJECTED' ? 'bg-red-100 text-red-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {doc.status}
                      </span>
                      <a
                        href={doc.documentUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-indigo-600 hover:text-indigo-900 text-sm"
                      >
                        View
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex space-x-3">
            <button
              onClick={() => onStatusUpdate(user.id, user.isVerified ? 'unverified' : 'verified')}
              className={`px-4 py-2 rounded-md text-sm font-medium ${
                user.isVerified
                  ? 'bg-yellow-600 text-white hover:bg-yellow-700'
                  : 'bg-green-600 text-white hover:bg-green-700'
              }`}
            >
              {user.isVerified ? 'Unverify User' : 'Verify User'}
            </button>
            
            <button
              onClick={() => setShowFlagInput(true)}
              className="px-4 py-2 bg-red-600 text-white rounded-md text-sm font-medium hover:bg-red-700"
            >
              Flag User
            </button>
          </div>

          {/* Flag Input */}
          {showFlagInput && (
            <div className="space-y-3">
              <label className="block text-sm font-medium text-gray-700">Flag Reason</label>
              <textarea
                value={flagReason}
                onChange={(e) => setFlagReason(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                rows={3}
                placeholder="Enter reason for flagging this user..."
              />
              <div className="flex space-x-3">
                <button
                  onClick={handleFlag}
                  className="px-4 py-2 bg-red-600 text-white rounded-md text-sm font-medium hover:bg-red-700"
                >
                  Confirm Flag
                </button>
                <button
                  onClick={() => setShowFlagInput(false)}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md text-sm font-medium hover:bg-gray-400"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}