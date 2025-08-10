
import React, { useState } from 'react';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { Dialog } from './ui/dialog';

interface BatchKycActionsProps {
  selectedDocuments: string[];
  onBatchAction: (action: 'approve' | 'reject', reason?: string) => Promise<void>;
  onClearSelection: () => void;
}

export function BatchKycActions({ selectedDocuments, onBatchAction, onClearSelection }: BatchKycActionsProps) {
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [reason, setReason] = useState('');
  const [processing, setProcessing] = useState(false);

  const handleBatchApprove = async () => {
    setProcessing(true);
    try {
      await onBatchAction('approve');
      onClearSelection();
    } catch (error) {
      console.error('Batch approve failed:', error);
    } finally {
      setProcessing(false);
    }
  };

  const handleBatchReject = async () => {
    if (!reason.trim()) return;
    
    setProcessing(true);
    try {
      await onBatchAction('reject', reason);
      setShowRejectDialog(false);
      setReason('');
      onClearSelection();
    } catch (error) {
      console.error('Batch reject failed:', error);
    } finally {
      setProcessing(false);
    }
  };

  if (selectedDocuments.length === 0) {
    return null;
  }

  return (
    <div className="bg-blue-50 p-4 rounded-lg mb-4">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">
          {selectedDocuments.length} document(s) selected
        </span>
        <div className="flex gap-2">
          <Button
            size="sm"
            onClick={handleBatchApprove}
            disabled={processing}
            className="bg-green-600 hover:bg-green-700"
          >
            Approve All
          </Button>
          <Button
            size="sm"
            variant="destructive"
            onClick={() => setShowRejectDialog(true)}
            disabled={processing}
          >
            Reject All
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={onClearSelection}
          >
            Clear Selection
          </Button>
        </div>
      </div>

      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <div className="p-6">
          <h3 className="text-lg font-semibold mb-4">Reject Selected Documents</h3>
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">
              Rejection Reason (required)
            </label>
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Enter reason for rejection..."
              rows={4}
            />
          </div>
          <div className="flex gap-3">
            <Button
              onClick={handleBatchReject}
              disabled={!reason.trim() || processing}
              variant="destructive"
            >
              Confirm Reject
            </Button>
            <Button
              variant="outline"
              onClick={() => setShowRejectDialog(false)}
            >
              Cancel
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
