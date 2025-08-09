
import React, { useState } from 'react';

interface KYCReviewModalProps {
  document: any;
  isOpen: boolean;
  onClose: () => void;
  onReview: (documentId: number, action: string, reason: string) => void;
}

export function KYCReviewModal({ document, isOpen, onClose, onReview }: KYCReviewModalProps) {
  const [action, setAction] = useState<'approve' | 'reject' | ''>('');
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [imageError, setImageError] = useState(false);

  if (!isOpen || !document) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!action) return;

    setIsSubmitting(true);
    try {
      await onReview(document.id, action, reason);
      setAction('');
      setReason('');
      onClose();
    } catch (error) {
      console.error('Review submission failed:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleImageLoad = () => {
    setImageError(false);
  };

  const handleImageError = () => {
    setImageError(true);
  };

  const getDocumentTypeDisplayName = (type: string) => {
    const types: { [key: string]: string } = {
      'ID_CARD': 'ID Card',
      'BUSINESS_LICENSE': 'Business License',
      'TAX_ID': 'Tax ID',
      'DRIVER_LICENSE': 'Driver License',
      'VEHICLE_REGISTRATION': 'Vehicle Registration',
      'INSURANCE': 'Insurance Document'
    };
    return types[type] || type;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-4xl mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Review KYC Document</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
            disabled={isSubmitting}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Document Information */}
          <div className="space-y-4">
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="font-semibold text-lg mb-3">Document Information</h3>
              <div className="space-y-2">
                <div>
                  <label className="text-sm font-medium text-gray-500">Document Type</label>
                  <p className="text-gray-900">{getDocumentTypeDisplayName(document.documentType)}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Status</label>
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                    document.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' :
                    document.status === 'APPROVED' ? 'bg-green-100 text-green-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {document.status}
                  </span>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Submitted</label>
                  <p className="text-gray-900">{new Date(document.createdAt).toLocaleDateString()}</p>
                </div>
              </div>
            </div>

            {/* User Information */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="font-semibold text-lg mb-3">User Information</h3>
              <div className="space-y-2">
                <div>
                  <label className="text-sm font-medium text-gray-500">Name</label>
                  <p className="text-gray-900">{document.user?.fullName || 'N/A'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Email</label>
                  <p className="text-gray-900">{document.user?.email || 'N/A'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Role</label>
                  <p className="text-gray-900">{document.user?.role || 'N/A'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">User ID</label>
                  <p className="text-gray-900">{document.user?.userId || 'N/A'}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Document Image */}
          <div className="space-y-4">
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="font-semibold text-lg mb-3">Document Image</h3>
              <div className="border-2 border-gray-200 rounded-lg overflow-hidden">
                {!imageError ? (
                  <img
                    src={document.documentUrl}
                    alt="KYC Document"
                    className="w-full h-64 object-contain bg-white"
                    onLoad={handleImageLoad}
                    onError={handleImageError}
                  />
                ) : (
                  <div className="w-full h-64 bg-gray-100 flex items-center justify-center">
                    <div className="text-center">
                      <svg className="w-12 h-12 text-gray-400 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <p className="text-gray-500">Image could not be loaded</p>
                      <a 
                        href={document.documentUrl} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800 underline"
                      >
                        Open in new tab
                      </a>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Review Actions */}
            <form onSubmit={handleSubmit} className="bg-gray-50 p-4 rounded-lg">
              <h3 className="font-semibold text-lg mb-3">Review Decision</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Action</label>
                  <select
                    value={action}
                    onChange={(e) => setAction(e.target.value as 'approve' | 'reject' | '')}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                    disabled={isSubmitting}
                  >
                    <option value="">Select action</option>
                    <option value="approve">Approve</option>
                    <option value="reject">Reject</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {action === 'reject' ? 'Reason for Rejection *' : 'Review Notes (Optional)'}
                  </label>
                  <textarea
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder={action === 'reject' ? 'Please provide a reason for rejection...' : 'Add any additional notes...'}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 h-24 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required={action === 'reject'}
                    disabled={isSubmitting}
                  />
                </div>

                <div className="flex space-x-3">
                  <button
                    type="button"
                    onClick={onClose}
                    className="flex-1 bg-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500"
                    disabled={isSubmitting}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={!action || isSubmitting}
                    className={`flex-1 px-4 py-2 rounded-md focus:outline-none focus:ring-2 ${
                      action === 'approve'
                        ? 'bg-green-600 text-white hover:bg-green-700 focus:ring-green-500'
                        : action === 'reject'
                        ? 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500'
                        : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    }`}
                  >
                    {isSubmitting ? 'Processing...' : action === 'approve' ? 'Approve' : action === 'reject' ? 'Reject' : 'Select Action'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
import React, { useState } from 'react';
import { X, Check, Ban, Download, Eye } from 'lucide-react';

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

interface KycReviewModalProps {
  document: KycDocument;
  isOpen: boolean;
  onClose: () => void;
  onReview: (documentId: number, action: 'approve' | 'reject', reason?: string) => Promise<void>;
}

export function KycReviewModal({ document, isOpen, onClose, onReview }: KycReviewModalProps) {
  const [rejectionReason, setRejectionReason] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  if (!isOpen) return null;

  const handleApprove = async () => {
    setIsProcessing(true);
    try {
      await onReview(document.id, 'approve');
      onClose();
    } catch (error) {
      console.error('Approval failed:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!rejectionReason.trim()) {
      alert('Please provide a rejection reason');
      return;
    }
    
    setIsProcessing(true);
    try {
      await onReview(document.id, 'reject', rejectionReason);
      onClose();
    } catch (error) {
      console.error('Rejection failed:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">KYC Document Review</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div>
            <h3 className="text-lg font-semibold mb-4">User Information</h3>
            <div className="space-y-2">
              <p><strong>Name:</strong> {document.userInfo.fullName}</p>
              <p><strong>Email:</strong> {document.userInfo.email}</p>
              <p><strong>Role:</strong> {document.userInfo.role}</p>
              <p><strong>Document Type:</strong> {document.documentType.replace(/_/g, ' ')}</p>
              <p><strong>Submitted:</strong> {new Date(document.submittedAt).toLocaleString()}</p>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-4">Document</h3>
            <div className="border rounded-lg p-4">
              <img 
                src={document.documentUrl} 
                alt="KYC Document" 
                className="w-full h-auto max-h-64 object-contain"
              />
              <div className="mt-2 flex space-x-2">
                <a 
                  href={document.documentUrl} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center space-x-1 text-blue-600 hover:text-blue-800"
                >
                  <Eye className="h-4 w-4" />
                  <span>View Full Size</span>
                </a>
                <a 
                  href={document.documentUrl} 
                  download
                  className="flex items-center space-x-1 text-blue-600 hover:text-blue-800"
                >
                  <Download className="h-4 w-4" />
                  <span>Download</span>
                </a>
              </div>
            </div>
          </div>
        </div>

        {document.status === 'PENDING' && (
          <div className="mt-6">
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Rejection Reason (required for rejection)
              </label>
              <textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                rows={3}
                placeholder="Provide a clear reason for rejection..."
              />
            </div>

            <div className="flex space-x-4">
              <button
                onClick={handleApprove}
                disabled={isProcessing}
                className="flex items-center space-x-2 bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50"
              >
                <Check className="h-4 w-4" />
                <span>{isProcessing ? 'Processing...' : 'Approve'}</span>
              </button>

              <button
                onClick={handleReject}
                disabled={isProcessing || !rejectionReason.trim()}
                className="flex items-center space-x-2 bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 disabled:opacity-50"
              >
                <Ban className="h-4 w-4" />
                <span>{isProcessing ? 'Processing...' : 'Reject'}</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
