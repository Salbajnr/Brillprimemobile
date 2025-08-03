
import React, { useState } from 'react';

interface BatchKYCActionsProps {
  selectedDocuments: number[];
  onBatchAction: (action: string, reason: string) => void;
  onClearSelection: () => void;
}

export function BatchKYCActions({ selectedDocuments, onBatchAction, onClearSelection }: BatchKYCActionsProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [action, setAction] = useState<'approve' | 'reject' | ''>('');
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (selectedDocuments.length === 0) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!action) return;

    setIsSubmitting(true);
    try {
      await onBatchAction(action, reason);
      setAction('');
      setReason('');
      setIsModalOpen(false);
      onClearSelection();
    } catch (error) {
      console.error('Batch action failed:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const openModal = (actionType: 'approve' | 'reject') => {
    setAction(actionType);
    setIsModalOpen(true);
  };

  return (
    <>
      {/* Floating Action Bar */}
      <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 bg-white shadow-lg rounded-lg border p-4 z-40">
        <div className="flex items-center space-x-4">
          <span className="text-sm font-medium text-gray-700">
            {selectedDocuments.length} document{selectedDocuments.length !== 1 ? 's' : ''} selected
          </span>
          
          <div className="flex space-x-2">
            <button
              onClick={() => openModal('approve')}
              className="bg-green-600 text-white px-4 py-2 rounded-md text-sm hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              Bulk Approve
            </button>
            
            <button
              onClick={() => openModal('reject')}
              className="bg-red-600 text-white px-4 py-2 rounded-md text-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500"
            >
              Bulk Reject
            </button>
            
            <button
              onClick={onClearSelection}
              className="bg-gray-300 text-gray-700 px-4 py-2 rounded-md text-sm hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500"
            >
              Clear Selection
            </button>
          </div>
        </div>
      </div>

      {/* Batch Action Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                Batch {action === 'approve' ? 'Approve' : 'Reject'} Documents
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-gray-600"
                disabled={isSubmitting}
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="mb-4">
              <p className="text-gray-600">
                You are about to {action} <strong>{selectedDocuments.length}</strong> KYC document{selectedDocuments.length !== 1 ? 's' : ''}. 
                This action cannot be undone.
              </p>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {action === 'reject' ? 'Reason for Rejection *' : 'Notes (Optional)'}
                </label>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder={
                    action === 'reject' 
                      ? 'Please provide a reason for batch rejection...' 
                      : 'Add any notes for batch approval...'
                  }
                  className="w-full border border-gray-300 rounded-md px-3 py-2 h-24 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required={action === 'reject'}
                  disabled={isSubmitting}
                />
              </div>

              <div className="flex space-x-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 bg-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500"
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || (action === 'reject' && !reason.trim())}
                  className={`flex-1 px-4 py-2 rounded-md focus:outline-none focus:ring-2 ${
                    action === 'approve'
                      ? 'bg-green-600 text-white hover:bg-green-700 focus:ring-green-500'
                      : 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500'
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  {isSubmitting ? 'Processing...' : `${action === 'approve' ? 'Approve' : 'Reject'} All`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
import React, { useState } from 'react';
import { Check, X, Users } from 'lucide-react';

interface BatchKycActionsProps {
  selectedCount: number;
  onBatchApprove: () => void;
  onBatchReject: (reason: string) => void;
  onSelectAll: () => void;
  onClearSelection: () => void;
}

export function BatchKycActions({ 
  selectedCount, 
  onBatchApprove, 
  onBatchReject, 
  onSelectAll, 
  onClearSelection 
}: BatchKycActionsProps) {
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');

  const handleBatchReject = () => {
    if (!rejectionReason.trim()) {
      alert('Please provide a rejection reason');
      return;
    }
    onBatchReject(rejectionReason);
    setShowRejectModal(false);
    setRejectionReason('');
  };

  return (
    <div className="flex items-center space-x-4 bg-blue-50 p-3 rounded-md">
      <div className="flex items-center space-x-2">
        <Users className="h-4 w-4 text-blue-600" />
        <span className="text-sm font-medium text-blue-900">
          {selectedCount} selected
        </span>
      </div>

      <div className="flex space-x-2">
        <button
          onClick={onBatchApprove}
          className="flex items-center space-x-1 bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700"
        >
          <Check className="h-3 w-3" />
          <span>Approve All</span>
        </button>

        <button
          onClick={() => setShowRejectModal(true)}
          className="flex items-center space-x-1 bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700"
        >
          <X className="h-3 w-3" />
          <span>Reject All</span>
        </button>

        <button
          onClick={onSelectAll}
          className="text-blue-600 px-3 py-1 text-sm hover:text-blue-800"
        >
          Select All
        </button>

        <button
          onClick={onClearSelection}
          className="text-gray-600 px-3 py-1 text-sm hover:text-gray-800"
        >
          Clear
        </button>
      </div>

      {/* Rejection Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">Batch Rejection</h3>
            <p className="text-gray-600 mb-4">
              You are about to reject {selectedCount} documents. Please provide a reason:
            </p>
            <textarea
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-md focus:ring-red-500 focus:border-red-500"
              rows={3}
              placeholder="Provide a clear reason for rejection..."
              required
            />
            <div className="flex space-x-3 mt-4">
              <button
                onClick={handleBatchReject}
                disabled={!rejectionReason.trim()}
                className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 disabled:opacity-50"
              >
                Reject All
              </button>
              <button
                onClick={() => {
                  setShowRejectModal(false);
                  setRejectionReason('');
                }}
                className="bg-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-400"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
