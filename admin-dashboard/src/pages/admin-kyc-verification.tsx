
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
}

export function AdminKYCVerification() {
  const [pendingKYC, setPendingKYC] = useState<UserWithKYC[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filters, setFilters] = useState({
    status: '',
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

  useEffect(() => {
    loadPendingKYC();
  }, [filters]);

  const loadPendingKYC = async () => {
    try {
      setIsLoading(true);
      const token = localStorage.getItem('admin_token');
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
        }
      }
    } catch (error) {
      console.error('Failed to load pending KYC:', error);
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
      case 'APPROVED': return 'bg-green-100 text-green-800';
      case 'REJECTED': return 'bg-red-100 text-red-800';
      default: return 'bg-yellow-100 text-yellow-800';
    }
  };

  const openReviewModal = (user: any, document: any) => {
    setSelectedDocument({
      ...document,
      user: {
        id: user.id,
        userId: user.userId,
        fullName: user.fullName,
        email: user.email,
        role: user.role
      }
    });
    setIsReviewModalOpen(true);
  };

  const closeReviewModal = () => {
    setSelectedDocument(null);
    setIsReviewModalOpen(false);
  };

  const handleReviewComplete = () => {
    loadPendingKYC(); // Refresh the data
  };

  const toggleDocumentSelection = (documentId: number) => {
    setSelectedDocuments(prev => 
      prev.includes(documentId) 
        ? prev.filter(id => id !== documentId)
        : [...prev, documentId]
    );
  };

  const handleSelectAll = () => {
    const allDocumentIds = allDocuments.map(doc => doc.id);
    setSelectedDocuments(
      selectedDocuments.length === allDocumentIds.length ? [] : allDocumentIds
    );
  };

  const handleBatchAction = async (action: string, reason?: string) => {
    try {
      const token = localStorage.getItem('admin_token');
      
      // Process each selected document
      const promises = selectedDocuments.map(documentId => 
        fetch(`/api/admin/kyc/${documentId}/review`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ action, reason }),
        })
      );

      await Promise.all(promises);
      setSelectedDocuments([]);
      loadPendingKYC();
    } catch (error) {
      console.error('Batch action failed:', error);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">KYC Verification</h1>
            <p className="text-gray-600">Review and verify user documents</p>
          </div>
          <div className="text-sm text-gray-500">
            Pending Documents: {totalDocuments.toLocaleString()}
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Document Status</label>
            <select
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value, page: 1 }))}
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
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              onChange={(e) => setFilters(prev => ({ ...prev, documentType: e.target.value, page: 1 }))}
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
            <label className="block text-sm font-medium text-gray-700 mb-2">Batch Actions</label>
            <div className="flex space-x-2">
              <button 
                onClick={handleSelectAll}
                className="flex-1 bg-gray-500 text-white px-3 py-2 rounded-md text-sm hover:bg-gray-600"
              >
                {selectedDocuments.length === allDocuments.length ? 'Clear All' : 'Select All'}
              </button>
              <button 
                onClick={() => setSelectedDocuments([])}
                className="flex-1 bg-gray-300 text-gray-700 px-3 py-2 rounded-md text-sm hover:bg-gray-400"
              >
                Clear
              </button>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Actions</label>
            <button
              onClick={loadPendingKYC}
              className="w-full bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              Refresh
            </button>
          </div>
        </div>
      </div>

      {/* KYC Documents List */}
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
                      <input
                        type="checkbox"
                        checked={selectedDocuments.length === allDocuments.length && allDocuments.length > 0}
                        onChange={handleSelectAll}
                        className="rounded border-gray-300"
                      />
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      User
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Document Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Submitted
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {pendingKYC.map((user) => 
                    user.kycDocuments?.map((document) => (
                      <tr key={`${user.id}-${document.id}`} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <input
                            type="checkbox"
                            checked={selectedDocuments.includes(document.id)}
                            onChange={() => toggleDocumentSelection(document.id)}
                            className="rounded border-gray-300"
                          />
                        </td>
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
                              <div className="text-xs text-gray-400">{user.role}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getDocumentTypeColor(document.documentType)}`}>
                            {document.documentType.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(document.status)}`}>
                            {document.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(document.createdAt).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                          <button 
                            onClick={() => openReviewModal(user, document)}
                            className="text-indigo-600 hover:text-indigo-900"
                          >
                            Review
                          </button>
                          <a
                            href={document.documentUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-900"
                          >
                            View Document
                          </a>
                        </td>
                      </tr>
                    ))
                  )}
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
                    <span className="font-medium">{Math.min(filters.page * filters.limit, totalDocuments)}</span> of{' '}
                    <span className="font-medium">{totalDocuments}</span> results
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
        onClearSelection={() => setSelectedDocuments([])}
      />
    </div>
  );
}
