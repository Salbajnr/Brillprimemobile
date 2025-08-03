
import React, { useState, useEffect, useCallback } from 'react';
import { FileText, Eye, Check, X, Clock, User, Camera, Download, RefreshCw } from 'lucide-react';
import { KycReviewModal } from '../components/kyc-review-modal';
import { BatchKycActions } from '../components/batch-kyc-actions';
import io, { Socket } from 'socket.io-client';

interface KycDocument {
  id: number;
  userId: number;
  userInfo: {
    fullName: string;
    email: string;
    role: string;
    profilePicture?: string;
  };
  documentType: 'ID_CARD' | 'DRIVER_LICENSE' | 'BUSINESS_LICENSE' | 'VEHICLE_REGISTRATION';
  documentUrl: string;
  faceImageUrl?: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  submittedAt: string;
  reviewedAt?: string;
  reviewedBy?: number;
  rejectionReason?: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  verificationData?: any;
}

interface KycFilters {
  status: string;
  documentType: string;
  priority: string;
  search: string;
  dateRange: string;
  page: number;
  limit: number;
}

export default function AdminKycVerification() {
  const [documents, setDocuments] = useState<KycDocument[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDocument, setSelectedDocument] = useState<KycDocument | null>(null);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [selectedDocuments, setSelectedDocuments] = useState<Set<number>>(new Set());
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [socket, setSocket] = useState<Socket | null>(null);
  
  const [filters, setFilters] = useState<KycFilters>({
    status: 'PENDING',
    documentType: '',
    priority: '',
    search: '',
    dateRange: '',
    page: 1,
    limit: 20
  });

  const [stats, setStats] = useState({
    pending: 0,
    approved: 0,
    rejected: 0,
    todaySubmissions: 0,
    avgProcessingTime: 0
  });

  // Initialize WebSocket connection
  useEffect(() => {
    const newSocket = io('ws://localhost:5000', {
      path: '/ws',
      transports: ['websocket']
    });

    newSocket.on('connect', () => {
      console.log('KYC admin connected to WebSocket');
      newSocket.emit('join_admin_room', 'kyc_verification');
    });

    newSocket.on('new_kyc_submission', (document: KycDocument) => {
      setDocuments(prevDocs => [document, ...prevDocs]);
      setStats(prev => ({ ...prev, pending: prev.pending + 1, todaySubmissions: prev.todaySubmissions + 1 }));
    });

    newSocket.on('kyc_status_updated', (update: { documentId: number; status: string; reviewedBy: number }) => {
      setDocuments(prevDocs =>
        prevDocs.map(doc =>
          doc.id === update.documentId
            ? { ...doc, status: update.status as any, reviewedAt: new Date().toISOString(), reviewedBy: update.reviewedBy }
            : doc
        )
      );
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, []);

  // Load KYC documents from backend
  const loadDocuments = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const queryParams = new URLSearchParams({
        page: filters.page.toString(),
        limit: filters.limit.toString(),
        ...(filters.status && { status: filters.status }),
        ...(filters.documentType && { documentType: filters.documentType }),
        ...(filters.priority && { priority: filters.priority }),
        ...(filters.search && { search: filters.search }),
        ...(filters.dateRange && { dateRange: filters.dateRange })
      });

      const response = await fetch(`/api/admin/kyc-documents?${queryParams}`, {
        method: 'GET',
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error(`Failed to load KYC documents: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.success) {
        setDocuments(data.data.documents);
        setStats(data.data.stats);
      } else {
        throw new Error(data.message || 'Failed to load KYC documents');
      }
    } catch (err) {
      console.error('Error loading KYC documents:', err);
      setError(err instanceof Error ? err.message : 'Failed to load KYC documents');
    } finally {
      setIsLoading(false);
    }
  }, [filters]);

  // Load documents on component mount and filter changes
  useEffect(() => {
    loadDocuments();
  }, [loadDocuments]);

  // Auto-refresh functionality
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      loadDocuments();
    }, 30000); // Refresh every 30 seconds

    return () => clearInterval(interval);
  }, [autoRefresh, loadDocuments]);

  const handleDocumentAction = async (documentId: number, action: 'approve' | 'reject', reason?: string) => {
    try {
      const response = await fetch(`/api/admin/kyc-documents/${documentId}/review`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({ action, reason })
      });

      if (!response.ok) {
        throw new Error('Review action failed');
      }

      const result = await response.json();
      if (result.success) {
        // Update local state
        setDocuments(prevDocs =>
          prevDocs.map(doc =>
            doc.id === documentId
              ? { 
                  ...doc, 
                  status: action === 'approve' ? 'APPROVED' : 'REJECTED',
                  reviewedAt: new Date().toISOString(),
                  rejectionReason: reason
                }
              : doc
          )
        );

        // Emit real-time update
        if (socket) {
          socket.emit('kyc_review_completed', { 
            documentId, 
            action, 
            userId: result.data.userId,
            timestamp: Date.now() 
          });
        }
      }
    } catch (err) {
      console.error('Document review error:', err);
      setError(`Failed to ${action} document`);
    }
  };

  const handleBatchAction = async (documentIds: number[], action: 'approve' | 'reject', reason?: string) => {
    try {
      const response = await fetch('/api/admin/kyc-documents/batch-review', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({ documentIds, action, reason })
      });

      if (!response.ok) {
        throw new Error('Batch review failed');
      }

      const result = await response.json();
      if (result.success) {
        // Refresh documents after batch action
        loadDocuments();
        setSelectedDocuments(new Set());
        
        // Emit real-time update
        if (socket) {
          socket.emit('kyc_batch_review_completed', { 
            documentIds, 
            action, 
            count: documentIds.length,
            timestamp: Date.now() 
          });
        }
      }
    } catch (err) {
      console.error('Batch review error:', err);
      setError(`Failed to ${action} documents`);
    }
  };

  const openDocumentReview = (document: KycDocument) => {
    setSelectedDocument(document);
    setShowReviewModal(true);
  };

  const toggleDocumentSelection = (documentId: number) => {
    setSelectedDocuments(prev => {
      const newSet = new Set(prev);
      if (newSet.has(documentId)) {
        newSet.delete(documentId);
      } else {
        newSet.add(documentId);
      }
      return newSet;
    });
  };

  const selectAllDocuments = () => {
    const pendingDocs = documents.filter(doc => doc.status === 'PENDING').map(doc => doc.id);
    setSelectedDocuments(new Set(pendingDocs));
  };

  const clearSelection = () => {
    setSelectedDocuments(new Set());
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING': return 'bg-yellow-100 text-yellow-800';
      case 'APPROVED': return 'bg-green-100 text-green-800';
      case 'REJECTED': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'URGENT': return 'bg-red-100 text-red-800';
      case 'HIGH': return 'bg-orange-100 text-orange-800';
      case 'MEDIUM': return 'bg-yellow-100 text-yellow-800';
      case 'LOW': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getDocumentTypeIcon = (type: string) => {
    switch (type) {
      case 'ID_CARD': return <FileText className="h-4 w-4" />;
      case 'DRIVER_LICENSE': return <FileText className="h-4 w-4" />;
      case 'BUSINESS_LICENSE': return <FileText className="h-4 w-4" />;
      case 'VEHICLE_REGISTRATION': return <FileText className="h-4 w-4" />;
      default: return <FileText className="h-4 w-4" />;
    }
  };

  return (
    <div className="p-6">
      {/* Header with stats */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">KYC Verification</h1>
            <p className="text-gray-600">Review and verify user identity documents</p>
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
              onClick={loadDocuments}
              disabled={isLoading}
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 flex items-center space-x-2"
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              <span>{isLoading ? 'Loading...' : 'Refresh'}</span>
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="flex items-center">
              <Clock className="h-8 w-8 text-yellow-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Pending Review</p>
                <p className="text-2xl font-bold text-gray-900">{stats.pending}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="flex items-center">
              <Check className="h-8 w-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Approved</p>
                <p className="text-2xl font-bold text-gray-900">{stats.approved}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="flex items-center">
              <X className="h-8 w-8 text-red-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Rejected</p>
                <p className="text-2xl font-bold text-gray-900">{stats.rejected}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="flex items-center">
              <FileText className="h-8 w-8 text-blue-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Today's Submissions</p>
                <p className="text-2xl font-bold text-gray-900">{stats.todaySubmissions}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="flex items-center">
              <Clock className="h-8 w-8 text-purple-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Avg. Processing</p>
                <p className="text-2xl font-bold text-gray-900">{stats.avgProcessingTime}h</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
          {error}
        </div>
      )}

      {/* Filters and Batch Actions */}
      <div className="bg-white rounded-lg shadow mb-6">
        <div className="p-4 border-b border-gray-200">
          <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
            <div className="flex flex-col md:flex-row gap-4 flex-1">
              <select
                value={filters.status}
                onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value, page: 1 }))}
                className="px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">All Status</option>
                <option value="PENDING">Pending</option>
                <option value="APPROVED">Approved</option>
                <option value="REJECTED">Rejected</option>
              </select>
              
              <select
                value={filters.documentType}
                onChange={(e) => setFilters(prev => ({ ...prev, documentType: e.target.value, page: 1 }))}
                className="px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">All Document Types</option>
                <option value="ID_CARD">ID Card</option>
                <option value="DRIVER_LICENSE">Driver License</option>
                <option value="BUSINESS_LICENSE">Business License</option>
                <option value="VEHICLE_REGISTRATION">Vehicle Registration</option>
              </select>

              <select
                value={filters.priority}
                onChange={(e) => setFilters(prev => ({ ...prev, priority: e.target.value, page: 1 }))}
                className="px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">All Priorities</option>
                <option value="URGENT">Urgent</option>
                <option value="HIGH">High</option>
                <option value="MEDIUM">Medium</option>
                <option value="LOW">Low</option>
              </select>

              <input
                type="text"
                placeholder="Search by user name or email..."
                value={filters.search}
                onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value, page: 1 }))}
                className="px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 min-w-64"
              />
            </div>

            {selectedDocuments.size > 0 && (
              <BatchKycActions
                selectedCount={selectedDocuments.size}
                onBatchApprove={() => handleBatchAction(Array.from(selectedDocuments), 'approve')}
                onBatchReject={(reason) => handleBatchAction(Array.from(selectedDocuments), 'reject', reason)}
                onSelectAll={selectAllDocuments}
                onClearSelection={clearSelection}
              />
            )}
          </div>
        </div>
      </div>

      {/* Documents Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <input
                    type="checkbox"
                    checked={selectedDocuments.size > 0 && selectedDocuments.size === documents.filter(d => d.status === 'PENDING').length}
                    onChange={selectedDocuments.size === documents.filter(d => d.status === 'PENDING').length ? clearSelection : selectAllDocuments}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  User & Document
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type & Priority
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
              {isLoading ? (
                Array.from({ length: 5 }).map((_, index) => (
                  <tr key={index} className="animate-pulse">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="h-4 w-4 bg-gray-300 rounded"></div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="h-10 w-10 bg-gray-300 rounded-full"></div>
                        <div className="ml-4">
                          <div className="h-4 bg-gray-300 rounded w-32"></div>
                          <div className="h-3 bg-gray-300 rounded w-48 mt-1"></div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="h-6 bg-gray-300 rounded w-24"></div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="h-6 bg-gray-300 rounded w-20"></div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="h-4 bg-gray-300 rounded w-24"></div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="h-8 bg-gray-300 rounded w-20"></div>
                    </td>
                  </tr>
                ))
              ) : documents.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                    No KYC documents found matching your criteria
                  </td>
                </tr>
              ) : (
                documents.map((document) => (
                  <tr key={document.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      {document.status === 'PENDING' && (
                        <input
                          type="checkbox"
                          checked={selectedDocuments.has(document.id)}
                          onChange={() => toggleDocumentSelection(document.id)}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10">
                          {document.userInfo.profilePicture ? (
                            <img className="h-10 w-10 rounded-full" src={document.userInfo.profilePicture} alt="" />
                          ) : (
                            <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center">
                              <User className="h-6 w-6 text-gray-600" />
                            </div>
                          )}
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">{document.userInfo.fullName}</div>
                          <div className="text-sm text-gray-500">{document.userInfo.email}</div>
                          <div className="text-xs text-gray-400">{document.userInfo.role}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex flex-col space-y-2">
                        <div className="flex items-center space-x-2">
                          {getDocumentTypeIcon(document.documentType)}
                          <span className="text-sm text-gray-900">
                            {document.documentType.replace(/_/g, ' ')}
                          </span>
                        </div>
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getPriorityColor(document.priority)}`}>
                          {document.priority}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(document.status)}`}>
                        {document.status}
                      </span>
                      {document.rejectionReason && (
                        <div className="text-xs text-red-600 mt-1">
                          {document.rejectionReason}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(document.submittedAt).toLocaleDateString()}
                      <div className="text-xs text-gray-400">
                        {new Date(document.submittedAt).toLocaleTimeString()}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => openDocumentReview(document)}
                          className="text-blue-600 hover:text-blue-900"
                          title="Review Document"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        {document.status === 'PENDING' && (
                          <>
                            <button
                              onClick={() => handleDocumentAction(document.id, 'approve')}
                              className="text-green-600 hover:text-green-900"
                              title="Approve"
                            >
                              <Check className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleDocumentAction(document.id, 'reject', 'Manual rejection')}
                              className="text-red-600 hover:text-red-900"
                              title="Reject"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </>
                        )}
                        <a
                          href={document.documentUrl}
                          download
                          className="text-gray-600 hover:text-gray-900"
                          title="Download"
                        >
                          <Download className="h-4 w-4" />
                        </a>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* KYC Review Modal */}
      {showReviewModal && selectedDocument && (
        <KycReviewModal
          document={selectedDocument}
          isOpen={showReviewModal}
          onClose={() => {
            setShowReviewModal(false);
            setSelectedDocument(null);
          }}
          onReview={handleDocumentAction}
        />
      )}
    </div>
  );
}
