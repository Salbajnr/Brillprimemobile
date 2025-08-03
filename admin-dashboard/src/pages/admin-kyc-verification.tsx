
import React, { useState, useEffect } from 'react';
import { KYCReviewModal } from '../components/kyc-review-modal';
import { BatchKYCActions } from '../components/batch-kyc-actions';

interface UserWithKYC {
  id: number;
  userId: string;
  fullName: string;
  email: string;
  role: 'CONSUMER' | 'MERCHANT' | 'DRIVER';
  profilePicture?: string;
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
  user?: {
    id: number;
    userId: string;
    fullName: string;
    email: string;
    role: string;
  };
}

export function AdminKYCVerification() {
  const [pendingKYC, setPendingKYC] = useState<UserWithKYC[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filters, setFilters] = useState({
    status: 'PENDING',
    documentType: '',
    page: 1,
    limit: 20
  });
  const [totalPages, setTotalPages] = useState(1);
  const [totalDocuments, setTotalDocuments] = useState(0);
  const [selectedDocument, setSelectedDocument] = useState<any>(null);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [selectedDocuments, setSelectedDocuments] = useState<number[]>([]);
  const [allDocuments, setAllDocuments] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(false);

  useEffect(() => {
    loadPendingKYC();
  }, [filters]);

  // Auto-refresh every 30 seconds when enabled
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (autoRefresh) {
      interval = setInterval(() => {
        loadPendingKYC();
      }, 30000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [autoRefresh, filters]);

  const loadPendingKYC = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const token = localStorage.getItem('admin_token');
      
      if (!token) {
        setError('Authentication token not found');
        return;
      }

      const queryParams = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined) queryParams.append(key, value.toString());
      });

      const response = await fetch(`/api/admin/kyc/pending?${queryParams}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          const items = data.data.items || [];
          setPendingKYC(items);
          setAllDocuments(items.flatMap(user => 
            user.kycDocuments?.map(doc => ({
              ...doc,
              user: {
                id: user.id,
                userId: user.userId,
                fullName: user.fullName,
                email: user.email,
                role: user.role
              }
            })) || []
          ));
          setTotalPages(data.data.totalPages || 1);
          setTotalDocuments(data.data.total || 0);
        } else {
          setError(data.message || 'Failed to load KYC data');
        }
      } else if (response.status === 401) {
        setError('Authentication failed. Please login again.');
        localStorage.removeItem('admin_token');
      } else {
        setError('Failed to load KYC data');
      }
    } catch (error) {
      console.error('Failed to load pending KYC:', error);
      setError('Network error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const getDocumentTypeColor = (documentType: string) => {
    switch (documentType) {
      case 'ID_CARD': return 'bg-blue-100 text-blue-800';
      case 'BUSINESS_LICENSE': return 'bg-green-100 text-green-800';
      case 'TAX_ID': return 'bg-purple-100 text-purple-800';
      case 'DRIVER_LICENSE': return 'bg-orange-100 text-orange-800';
      case 'VEHICLE_REGISTRATION': return 'bg-red-100 text-red-800';
      case 'INSURANCE': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING': return 'bg-yellow-100 text-yellow-800';
      case 'APPROVED': return 'bg-green-100 text-green-800';
      case 'REJECTED': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const openReviewModal = (document: any) => {
    setSelectedDocument(document);
    setIsReviewModalOpen(true);
  };

  const closeReviewModal = () => {
    setSelectedDocument(null);
    setIsReviewModalOpen(false);
  };

  const handleReviewComplete = async (documentId: number, action: string, reason: string) => {
    try {
      const token = localStorage.getItem('admin_token');
      const response = await fetch(`/api/admin/kyc/${documentId}/review`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action, reason }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          // Remove the reviewed document from the list
          setAllDocuments(prev => prev.filter(doc => doc.id !== documentId));
          setPendingKYC(prev => 
            prev.map(user => ({
              ...user,
              kycDocuments: user.kycDocuments?.filter(doc => doc.id !== documentId)
            })).filter(user => user.kycDocuments && user.kycDocuments.length > 0)
          );
          
          // Remove from selection if selected
          setSelectedDocuments(prev => prev.filter(id => id !== documentId));
          
          // Show success message
          alert(data.message);
        } else {
          alert(data.message || 'Review failed');
        }
      } else {
        throw new Error('Review request failed');
      }
    } catch (error) {
      console.error('Review failed:', error);
      alert('Failed to submit review');
    }
  };

  const handleBatchAction = async (action: string, reason: string) => {
    try {
      const token = localStorage.getItem('admin_token');
      const response = await fetch('/api/admin/kyc/batch-review', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          documentIds: selectedDocuments, 
          action, 
          reason 
        }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          // Remove the processed documents from the list
          setAllDocuments(prev => prev.filter(doc => !selectedDocuments.includes(doc.id)));
          setPendingKYC(prev => 
            prev.map(user => ({
              ...user,
              kycDocuments: user.kycDocuments?.filter(doc => !selectedDocuments.includes(doc.id))
            })).filter(user => user.kycDocuments && user.kycDocuments.length > 0)
          );
          
          alert(data.message);
        } else {
          alert(data.message || 'Batch action failed');
        }
      } else {
        throw new Error('Batch action request failed');
      }
    } catch (error) {
      console.error('Batch action failed:', error);
      alert('Failed to process batch action');
    }
  };

  const handleDocumentSelection = (documentId: number, isSelected: boolean) => {
    if (isSelected) {
      setSelectedDocuments(prev => [...prev, documentId]);
    } else {
      setSelectedDocuments(prev => prev.filter(id => id !== documentId));
    }
  };

  const handleSelectAll = () => {
    const allDocumentIds = allDocuments.map(doc => doc.id);
    setSelectedDocuments(allDocumentIds);
  };

  const handleClearSelection = () => {
    setSelectedDocuments([]);
  };

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({
      ...prev,
      [key]: value,
      page: 1 // Reset to first page when filtering
    }));
  };

  const handlePageChange = (newPage: number) => {
    setFilters(prev => ({
      ...prev,
      page: newPage
    }));
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">KYC Verification</h1>
          <p className="text-gray-600">Review and approve identity documents</p>
        </div>
        
        <div className="flex items-center space-x-4">
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-700">Auto-refresh</span>
          </label>
          
          <button
            onClick={loadPendingKYC}
            disabled={isLoading}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
          >
            {isLoading ? 'Loading...' : 'Refresh'}
          </button>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
          {error}
        </div>
      )}

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg shadow border">
          <div className="text-2xl font-bold text-blue-600">{totalDocuments}</div>
          <div className="text-sm text-gray-600">Total Documents</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow border">
          <div className="text-2xl font-bold text-yellow-600">
            {allDocuments.filter(doc => doc.status === 'PENDING').length}
          </div>
          <div className="text-sm text-gray-600">Pending Review</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow border">
          <div className="text-2xl font-bold text-green-600">
            {allDocuments.filter(doc => doc.status === 'APPROVED').length}
          </div>
          <div className="text-sm text-gray-600">Approved Today</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow border">
          <div className="text-2xl font-bold text-purple-600">{selectedDocuments.length}</div>
          <div className="text-sm text-gray-600">Selected</div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow border mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
            <select
              value={filters.status}
              onChange={(e) => handleFilterChange('status', e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Status</option>
              <option value="PENDING">Pending</option>
              <option value="APPROVED">Approved</option>
              <option value="REJECTED">Rejected</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Document Type</label>
            <select
              value={filters.documentType}
              onChange={(e) => handleFilterChange('documentType', e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Types</option>
              <option value="ID_CARD">ID Card</option>
              <option value="BUSINESS_LICENSE">Business License</option>
              <option value="TAX_ID">Tax ID</option>
              <option value="DRIVER_LICENSE">Driver License</option>
              <option value="VEHICLE_REGISTRATION">Vehicle Registration</option>
              <option value="INSURANCE">Insurance</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Bulk Actions</label>
            <div className="flex space-x-2">
              <button 
                onClick={handleSelectAll}
                className="flex-1 bg-gray-500 text-white px-3 py-2 rounded-md text-sm hover:bg-gray-600"
              >
                Select All
              </button>
              <button 
                onClick={handleClearSelection}
                className="flex-1 bg-gray-300 text-gray-700 px-3 py-2 rounded-md text-sm hover:bg-gray-400"
              >
                Clear
              </button>
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Items per page</label>
            <select
              value={filters.limit}
              onChange={(e) => handleFilterChange('limit', e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="10">10</option>
              <option value="20">20</option>
              <option value="50">50</option>
              <option value="100">100</option>
            </select>
          </div>
        </div>
      </div>

      {/* Documents Table */}
      <div className="bg-white rounded-lg shadow border overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading KYC documents...</p>
          </div>
        ) : allDocuments.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-gray-500">No KYC documents found</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      <input
                        type="checkbox"
                        checked={selectedDocuments.length === allDocuments.length && allDocuments.length > 0}
                        onChange={(e) => e.target.checked ? handleSelectAll() : handleClearSelection()}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Document</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Submitted</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {allDocuments.map((document) => (
                    <tr key={document.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <input
                          type="checkbox"
                          checked={selectedDocuments.includes(document.id)}
                          onChange={(e) => handleDocumentSelection(document.id, e.target.checked)}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10">
                            <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center">
                              <span className="text-sm font-medium text-gray-700">
                                {document.user?.fullName?.charAt(0) || 'U'}
                              </span>
                            </div>
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">{document.user?.fullName}</div>
                            <div className="text-sm text-gray-500">{document.user?.email}</div>
                            <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                              {document.user?.role}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">Document #{document.id}</div>
                        <div className="text-sm text-gray-500">User ID: {document.user?.userId}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getDocumentTypeColor(document.documentType)}`}>
                          {document.documentType.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(document.status)}`}>
                          {document.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(document.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button
                          onClick={() => openReviewModal(document)}
                          className="text-blue-600 hover:text-blue-900 mr-4"
                        >
                          Review
                        </button>
                        <a
                          href={document.documentUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-gray-600 hover:text-gray-900"
                        >
                          View
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200">
                <div className="flex-1 flex justify-between sm:hidden">
                  <button
                    onClick={() => handlePageChange(filters.page - 1)}
                    disabled={filters.page <= 1}
                    className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => handlePageChange(filters.page + 1)}
                    disabled={filters.page >= totalPages}
                    className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                  >
                    Next
                  </button>
                </div>
                <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm text-gray-700">
                      Showing page <span className="font-medium">{filters.page}</span> of{' '}
                      <span className="font-medium">{totalPages}</span>
                    </p>
                  </div>
                  <div>
                    <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                      <button
                        onClick={() => handlePageChange(filters.page - 1)}
                        disabled={filters.page <= 1}
                        className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                      >
                        Previous
                      </button>
                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        const page = filters.page <= 3 ? i + 1 : filters.page - 2 + i;
                        if (page > totalPages) return null;
                        return (
                          <button
                            key={page}
                            onClick={() => handlePageChange(page)}
                            className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                              page === filters.page
                                ? 'z-10 bg-blue-50 border-blue-500 text-blue-600'
                                : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                            }`}
                          >
                            {page}
                          </button>
                        );
                      })}
                      <button
                        onClick={() => handlePageChange(filters.page + 1)}
                        disabled={filters.page >= totalPages}
                        className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                      >
                        Next
                      </button>
                    </nav>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* KYC Review Modal */}
      <KYCReviewModal
        document={selectedDocument}
        isOpen={isReviewModalOpen}
        onClose={closeReviewModal}
        onReview={handleReviewComplete}
      />

      {/* Batch Actions */}
      <BatchKYCActions
        selectedDocuments={selectedDocuments}
        onBatchAction={handleBatchAction}
        onClearSelection={handleClearSelection}
      />
    </div>
  );
}
