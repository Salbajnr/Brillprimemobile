
import React, { useState, useEffect } from 'react';

interface KYCDocument {
  id: number;
  documentType: string;
  documentUrl: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  reviewedBy?: number;
  reviewedAt?: string;
  createdAt: string;
  user: {
    id: number;
    userId: string;
    fullName: string;
    email: string;
    role: string;
  };
}

interface KYCReviewModalProps {
  document: KYCDocument | null;
  isOpen: boolean;
  onClose: () => void;
  onReview: () => void;
}

export function KYCReviewModal({ document, isOpen, onClose, onReview }: KYCReviewModalProps) {
  const [reviewAction, setReviewAction] = useState<'approve' | 'reject' | null>(null);
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submitReview = async () => {
    if (!document || !reviewAction) return;

    try {
      setIsSubmitting(true);
      const token = localStorage.getItem('admin_token');
      const response = await fetch(`/api/admin/kyc/${document.id}/review`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: reviewAction,
          reason: reason
        }),
      });

      if (response.ok) {
        onReview();
        onClose();
        setReviewAction(null);
        setReason('');
      }
    } catch (error) {
      console.error('Failed to submit review:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen || !document) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-hidden">
        <div className="flex justify-between items-center p-6 border-b">
          <h2 className="text-xl font-bold">Review KYC Document</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            ✕
          </button>
        </div>

        <div className="flex h-[calc(90vh-120px)]">
          {/* Document Viewer */}
          <div className="flex-1 bg-gray-100 flex items-center justify-center">
            <img
              src={document.documentUrl}
              alt="KYC Document"
              className="max-w-full max-h-full object-contain"
              onError={(e) => {
                e.currentTarget.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTEyIDJMMTMuMDkgOC4yNkwyMCA5TDEzLjA5IDE1Ljc0TDEyIDIyTDEwLjkxIDE1Ljc0TDQgOUwxMC45MSA4LjI2TDEyIDJaIiBzdHJva2U9IiM2QjczODAiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIi8+Cjwvc3ZnPgo=';
              }}
            />
          </div>

          {/* Review Panel */}
          <div className="w-96 border-l p-6 overflow-y-auto">
            <div className="space-y-6">
              {/* Document Info */}
              <div>
                <h3 className="font-medium text-gray-900 mb-3">Document Information</h3>
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="text-gray-500">Type:</span>
                    <span className="ml-2 font-medium">{document.documentType.replace('_', ' ')}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Status:</span>
                    <span className={`ml-2 px-2 py-1 text-xs rounded-full ${
                      document.status === 'APPROVED' ? 'bg-green-100 text-green-800' :
                      document.status === 'REJECTED' ? 'bg-red-100 text-red-800' :
                      'bg-yellow-100 text-yellow-800'
                    }`}>
                      {document.status}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500">Submitted:</span>
                    <span className="ml-2">{new Date(document.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>

              {/* User Info */}
              <div>
                <h3 className="font-medium text-gray-900 mb-3">User Information</h3>
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="text-gray-500">Name:</span>
                    <span className="ml-2 font-medium">{document.user.fullName}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Email:</span>
                    <span className="ml-2">{document.user.email}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Role:</span>
                    <span className="ml-2">{document.user.role}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">User ID:</span>
                    <span className="ml-2">{document.user.userId}</span>
                  </div>
                </div>
              </div>

              {/* Review Actions */}
              {document.status === 'PENDING' && (
                <div>
                  <h3 className="font-medium text-gray-900 mb-3">Review Decision</h3>
                  <div className="space-y-3">
                    <div className="flex space-x-3">
                      <button
                        onClick={() => setReviewAction('approve')}
                        className={`flex-1 py-2 px-4 rounded-md text-sm font-medium ${
                          reviewAction === 'approve'
                            ? 'bg-green-600 text-white'
                            : 'bg-green-100 text-green-800 hover:bg-green-200'
                        }`}
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => setReviewAction('reject')}
                        className={`flex-1 py-2 px-4 rounded-md text-sm font-medium ${
                          reviewAction === 'reject'
                            ? 'bg-red-600 text-white'
                            : 'bg-red-100 text-red-800 hover:bg-red-200'
                        }`}
                      >
                        Reject
                      </button>
                    </div>

                    {reviewAction && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          {reviewAction === 'approve' ? 'Approval Notes (Optional)' : 'Rejection Reason *'}
                        </label>
                        <textarea
                          value={reason}
                          onChange={(e) => setReason(e.target.value)}
                          className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          rows={3}
                          placeholder={
                            reviewAction === 'approve' 
                              ? 'Additional notes...' 
                              : 'Please specify the reason for rejection...'
                          }
                          required={reviewAction === 'reject'}
                        />
                      </div>
                    )}

                    {reviewAction && (
                      <button
                        onClick={submitReview}
                        disabled={isSubmitting || (reviewAction === 'reject' && !reason.trim())}
                        className="w-full bg-indigo-600 text-white py-2 px-4 rounded-md text-sm font-medium hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isSubmitting ? 'Submitting...' : `Submit ${reviewAction === 'approve' ? 'Approval' : 'Rejection'}`}
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Already Reviewed */}
              {document.status !== 'PENDING' && document.reviewedAt && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-medium text-gray-900 mb-2">Review History</h4>
                  <div className="text-sm text-gray-600">
                    <p>Reviewed on: {new Date(document.reviewedAt).toLocaleDateString()}</p>
                    <p>Status: {document.status}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
