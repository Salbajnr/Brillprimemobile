import React, { useState } from 'react';

interface BatchKycActionsProps {
  selectedCount: number;
  onBatchAction: (action: 'approve' | 'reject', reason?: string) => void;
}

export function BatchKycActions({ selectedCount, onBatchAction }: BatchKycActionsProps) {
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');

  const handleApproveAll = () => {
    onBatchAction('approve');
  };

  const handleRejectAll = () => {
    if (rejectionReason.trim()) {
      onBatchAction('reject', rejectionReason);
      setShowRejectModal(false);
      setRejectionReason('');
    }
  };

  return (
    <div className="flex items-center space-x-3">
      <span className="text-sm text-gray-600">
        {selectedCount} selected
      </span>

      <button
        onClick={handleApproveAll}
        className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm"
      >
        Approve All
      </button>

      <button
        onClick={() => setShowRejectModal(true)}
        className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 text-sm"
      >
        Reject All
      </button>

      {/* Reject Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">Reject Documents</h3>
            <p className="text-gray-600 mb-4">
              Please provide a reason for rejecting {selectedCount} documents:
            </p>
            <textarea
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="Enter rejection reason..."
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={3}
              required
            />
            <div className="flex justify-end space-x-3 mt-4">
              <button
                onClick={() => {
                  setShowRejectModal(false);
                  setRejectionReason('');
                }}
                className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300"
              >
                Cancel
              </button>
              <button
                onClick={handleRejectAll}
                disabled={!rejectionReason.trim()}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:bg-gray-300"
              >
                Reject All
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default BatchKycActions;