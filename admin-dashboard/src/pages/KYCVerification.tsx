import React, { useState, useEffect } from 'react';
import { adminApi } from '../lib/api';
import { UserWithKYC, KYCDocument } from '../types/admin';

interface KYCFilters {
  status?: string;
  documentType?: string;
  page: number;
  limit: number;
}

export function KYCVerification() {
  const [pendingKYC, setPendingKYC] = useState<UserWithKYC[]>([]);
  const [selectedDocument, setSelectedDocument] = useState<KYCDocument | null>(null);
  const [selectedUser, setSelectedUser] = useState<UserWithKYC | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showDocumentModal, setShowDocumentModal] = useState(false);
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [selectedDocuments, setSelectedDocuments] = useState<number[]>([]);
  const [filters, setFilters] = useState<KYCFilters>({
    page: 1,
    limit: 20
  });
  const [totalPages, setTotalPages] = useState(1);
  const [totalDocuments, setTotalDocuments] = useState(0);

  useEffect(() => {
    loadPendingKYC();
  }, [filters]);

  const loadPendingKYC = async () => {
    try {
      setIsLoading(true);
      const response = await adminApi.getPendingKYC(filters);
      if (response.success) {
        setPendingKYC(response.data.items || []);
        setTotalPages(response.data.totalPages || 1);
        setTotalDocuments(response.data.total || 0);
      }
    } catch (error) {
      console.error('Failed to load pending KYC:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDocumentReview = async (documentId: number, action: 'approve' | 'reject', reason?: string) => {
    try {
      await adminApi.reviewKYC(documentId, action, reason);
      loadPendingKYC();
      setShowDocumentModal(false);
      setSelectedDocument(null);
      setSelectedUser(null);
    } catch (error) {
      console.error('KYC review failed:', error);
    }
  };

  const handleBatchAction = async (action: 'approve' | 'reject', reason?: string) => {
    try {
      for (const documentId of selectedDocuments) {
        await adminApi.reviewKYC(documentId, action, reason);
      }
      loadPendingKYC();
      setSelectedDocuments([]);
      setShowBatchModal(false);
    } catch (error) {
      console.error('Batch KYC review failed:', error);
    }
  };

  const handleDocumentSelect = (user: UserWithKYC, document: KYCDocument) => {
    setSelectedUser(user);
    setSelectedDocument(document);
    setShowDocumentModal(true);
  };

  const toggleDocumentSelection = (documentId: number) => {
    setSelectedDocuments(prev => 
      prev.includes(documentId) 
        ? prev.filter(id => id !== documentId)
        : [...prev, documentId]
    );
  };

  const selectAllDocuments = () => {
    const allDocumentIds: number[] = [];
    pendingKYC.forEach(user => {
      user.kycDocuments?.forEach(doc => {
        if (doc.status === 'PENDING') {
          allDocumentIds.push(doc.id);
        }
      });
    });
    setSelectedDocuments(allDocumentIds);
  };

  const clearSelection = () => {
    setSelectedDocuments([]);
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">KYC Verification</h1>
            <p className="text-gray-600">Review and verify user documents</p>
          </div>
          <div className="flex items-center space-x-4">
            <div className="text-sm text-gray-500">
              Pending Documents: {totalDocuments.toLocaleString()}
            </div>
            {selectedDocuments.length > 0 && (
              <button
                onClick={() => setShowBatchModal(true)}
                className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                Batch Process ({selectedDocuments.length})
              </button>
            )}
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
                onClick={selectAllDocuments}
                className="flex-1 bg-gray-500 text-white px-3 py-2 rounded-md text-sm hover:bg-gray-600"
              >
                Select All
              </button>
              <button
                onClick={clearSelection}
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
                        className="rounded border-gray-300"
                        onChange={(e) => e.target.checked ? selectAllDocuments() : clearSelection()}
                        checked={selectedDocuments.length > 0}
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
                          {document.status === 'PENDING' && (
                            <input
                              type="checkbox"
                              className="rounded border-gray-300"
                              checked={selectedDocuments.includes(document.id)}
                              onChange={() => toggleDocumentSelection(document.id)}
                            />
                          )}
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
                            onClick={() => handleDocumentSelect(user, document)}
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

      {/* Document Review Modal */}
      {showDocumentModal && selectedDocument && selectedUser && (
        <DocumentReviewModal
          document={selectedDocument}
          user={selectedUser}
          onClose={() => {
            setShowDocumentModal(false);
            setSelectedDocument(null);
            setSelectedUser(null);
          }}
          onReview={handleDocumentReview}
        />
      )}

      {/* Batch Processing Modal */}
      {showBatchModal && (
        <BatchProcessModal
          documentCount={selectedDocuments.length}
          onClose={() => setShowBatchModal(false)}
          onBatchAction={handleBatchAction}
        />
      )}
    </div>
  );
}

interface DocumentReviewModalProps {
  document: KYCDocument;
  user: UserWithKYC;
  onClose: () => void;
  onReview: (documentId: number, action: 'approve' | 'reject', reason?: string) => void;
}

function DocumentReviewModal({ document, user, onClose, onReview }: DocumentReviewModalProps) {
  const [rejectionReason, setRejectionReason] = useState('');
  const [showRejectionInput, setShowRejectionInput] = useState(false);

  const handleApprove = () => {
    onReview(document.id, 'approve');
  };

  const handleReject = () => {
    if (rejectionReason.trim()) {
      onReview(document.id, 'reject', rejectionReason);
      setShowRejectionInput(false);
      setRejectionReason('');
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-11/12 max-w-4xl shadow-lg rounded-md bg-white">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium text-gray-900">Document Review</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Document Viewer */}
          <div>
            <h4 className="text-lg font-medium text-gray-900 mb-3">Document</h4>
            <div className="border border-gray-300 rounded-lg overflow-hidden">
              <img
                src={document.documentUrl}
                alt={`${document.documentType} document`}
                className="w-full h-auto max-h-96 object-contain"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.style.display = 'none';
                  const parent = target.parentElement;
                  if (parent) {
                    parent.innerHTML = `
                      <div class="flex items-center justify-center h-64 bg-gray-100">
                        <div class="text-center">
                          <p class="text-gray-500">Unable to preview document</p>
                          <a href="${document.documentUrl}" target="_blank" class="text-indigo-600 hover:text-indigo-900 text-sm">
                            Open in new tab
                          </a>
                        </div>
                      </div>
                    `;
                  }
                }}
              />
            </div>
            <div className="mt-2 text-center">
              <a
                href={document.documentUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-indigo-600 hover:text-indigo-900 text-sm"
              >
                Open full size in new tab
              </a>
            </div>
          </div>

          {/* User and Document Info */}
          <div className="space-y-6">
            {/* User Info */}
            <div>
              <h4 className="text-lg font-medium text-gray-900 mb-3">User Information</h4>
              <div className="flex items-center space-x-4">
                {user.profilePicture ? (
                  <img className="h-12 w-12 rounded-full" src={user.profilePicture} alt="" />
                ) : (
                  <div className="h-12 w-12 rounded-full bg-indigo-600 flex items-center justify-center">
                    <span className="text-lg font-medium text-white">
                      {user.fullName.charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}
                <div>
                  <h5 className="text-lg font-medium text-gray-900">{user.fullName}</h5>
                  <p className="text-gray-600">{user.email}</p>
                  <p className="text-gray-500">{user.role} • ID: {user.userId}</p>
                </div>
              </div>
            </div>

            {/* Document Info */}
            <div>
              <h4 className="text-lg font-medium text-gray-900 mb-3">Document Details</h4>
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium text-gray-500">Document Type</label>
                  <p className="text-gray-900">{document.documentType.replace('_', ' ')}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Current Status</label>
                  <p className="text-gray-900">{document.status}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Submitted Date</label>
                  <p className="text-gray-900">{new Date(document.createdAt).toLocaleDateString()}</p>
                </div>
                {document.reviewedAt && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">Last Reviewed</label>
                    <p className="text-gray-900">{new Date(document.reviewedAt).toLocaleDateString()}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Review Actions */}
            {document.status === 'PENDING' && (
              <div className="space-y-4">
                <h4 className="text-lg font-medium text-gray-900">Review Actions</h4>
                
                <div className="flex space-x-3">
                  <button
                    onClick={handleApprove}
                    className="flex-1 bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500"
                  >
                    Approve Document
                  </button>
                  <button
                    onClick={() => setShowRejectionInput(true)}
                    className="flex-1 bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500"
                  >
                    Reject Document
                  </button>
                </div>

                {showRejectionInput && (
                  <div className="space-y-3">
                    <label className="block text-sm font-medium text-gray-700">Rejection Reason</label>
                    <textarea
                      value={rejectionReason}
                      onChange={(e) => setRejectionReason(e.target.value)}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      rows={3}
                      placeholder="Enter reason for rejection..."
                    />
                    <div className="flex space-x-3">
                      <button
                        onClick={handleReject}
                        className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
                      >
                        Confirm Rejection
                      </button>
                      <button
                        onClick={() => setShowRejectionInput(false)}
                        className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

interface BatchProcessModalProps {
  documentCount: number;
  onClose: () => void;
  onBatchAction: (action: 'approve' | 'reject', reason?: string) => void;
}

function BatchProcessModal({ documentCount, onClose, onBatchAction }: BatchProcessModalProps) {
  const [action, setAction] = useState<'approve' | 'reject'>('approve');
  const [reason, setReason] = useState('');

  const handleSubmit = () => {
    if (action === 'reject' && !reason.trim()) {
      return;
    }
    onBatchAction(action, reason);
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-11/12 max-w-md shadow-lg rounded-md bg-white">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium text-gray-900">Batch Processing</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="space-y-4">
          <p className="text-gray-600">
            You are about to process {documentCount} documents. Please select an action:
          </p>

          <div className="space-y-3">
            <label className="flex items-center">
              <input
                type="radio"
                name="action"
                value="approve"
                checked={action === 'approve'}
                onChange={(e) => setAction(e.target.value as 'approve' | 'reject')}
                className="mr-2"
              />
              <span className="text-green-600 font-medium">Approve all documents</span>
            </label>
            <label className="flex items-center">
              <input
                type="radio"
                name="action"
                value="reject"
                checked={action === 'reject'}
                onChange={(e) => setAction(e.target.value as 'approve' | 'reject')}
                className="mr-2"
              />
              <span className="text-red-600 font-medium">Reject all documents</span>
            </label>
          </div>

          {action === 'reject' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Rejection Reason (Required)
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                rows={3}
                placeholder="Enter reason for rejection..."
              />
            </div>
          )}

          <div className="flex justify-end space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={action === 'reject' && !reason.trim()}
              className={`px-4 py-2 rounded-md text-white ${
                action === 'approve'
                  ? 'bg-green-600 hover:bg-green-700'
                  : 'bg-red-600 hover:bg-red-700'
              } disabled:opacity-50`}
            >
              {action === 'approve' ? 'Approve All' : 'Reject All'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}