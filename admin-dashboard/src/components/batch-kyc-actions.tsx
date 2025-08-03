
import React, { useState } from 'react';

interface BatchKYCActionsProps {
  selectedDocuments: number[];
  onBatchAction: (action: string, reason?: string) => void;
  onClearSelection: () => void;
}

export function BatchKYCActions({ selectedDocuments, onBatchAction, onClearSelection }: BatchKYCActionsProps) {
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [batchAction, setBatchAction] = useState<'approve' | 'reject' | null>(null);
  const [batchReason, setBatchReason] = useState('');

  const handleBatchSubmit = () => {
    if (batchAction && (batchAction === 'approve' || batchReason.trim())) {
      onBatchAction(batchAction, batchReason);
      setShowBatchModal(false);
      setBatchAction(null);
      setBatchReason('');
    }
  };

  if (selectedDocuments.length === 0) return null;

  return (
    <>
      <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 bg-white shadow-lg rounded-lg border p-4 z-40">
        <div className="flex items-center space-x-4">
          <span className="text-sm font-medium text-gray-700">
            {selectedDocuments.length} document{selectedDocuments.length !== 1 ? 's' : ''} selected
          </span>
          
          <div className="flex space-x-2">
            <button
              onClick={() => {
                setBatchAction('approve');
                setShowBatchModal(true);
              }}
              className="bg-green-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-green-700"
            >
              Batch Approve
            </button>
            
            <button
              onClick={() => {
                setBatchAction('reject');
                setShowBatchModal(true);
              }}
              className="bg-red-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-red-700"
            >
              Batch Reject
            </button>
            
            <button
              onClick={onClearSelection}
              className="bg-gray-300 text-gray-700 px-4 py-2 rounded-md text-sm font-medium hover:bg-gray-400"
            >
              Clear Selection
            </button>
          </div>
        </div>
      </div>

      {/* Batch Action Modal */}
      {showBatchModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg w-full max-w-md p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold">
                Batch {batchAction === 'approve' ? 'Approve' : 'Reject'} Documents
              </h3>
              <button
                onClick={() => setShowBatchModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                You are about to {batchAction} {selectedDocuments.length} KYC document{selectedDocuments.length !== 1 ? 's' : ''}.
                This action cannot be undone.
              </p>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {batchAction === 'approve' ? 'Notes (Optional)' : 'Reason for Rejection *'}
                </label>
                <textarea
                  value={batchReason}
                  onChange={(e) => setBatchReason(e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  rows={3}
                  placeholder={
                    batchAction === 'approve' 
                      ? 'Additional notes for all documents...' 
                      : 'Please specify the reason for batch rejection...'
                  }
                  required={batchAction === 'reject'}
                />
              </div>

              <div className="flex space-x-3">
                <button
                  onClick={() => setShowBatchModal(false)}
                  className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-md text-sm font-medium hover:bg-gray-400"
                >
                  Cancel
                </button>
                <button
                  onClick={handleBatchSubmit}
                  disabled={batchAction === 'reject' && !batchReason.trim()}
                  className={`flex-1 py-2 px-4 rounded-md text-sm font-medium text-white disabled:opacity-50 disabled:cursor-not-allowed ${
                    batchAction === 'approve' 
                      ? 'bg-green-600 hover:bg-green-700' 
                      : 'bg-red-600 hover:bg-red-700'
                  }`}
                >
                  Confirm {batchAction === 'approve' ? 'Approval' : 'Rejection'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
