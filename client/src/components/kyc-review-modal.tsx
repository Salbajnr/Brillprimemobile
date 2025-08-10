
import React, { useState } from 'react';
import { Dialog } from './ui/dialog';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';

interface KycDocument {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  documentType: 'ID_CARD' | 'PASSPORT' | 'DRIVER_LICENSE' | 'UTILITY_BILL';
  documentUrl: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  submittedAt: string;
  reviewedAt?: string;
  reviewedBy?: string;
  rejectionReason?: string;
}

interface KycReviewModalProps {
  document: KycDocument;
  isOpen: boolean;
  onClose: () => void;
  onReview: (id: string, action: 'approve' | 'reject', reason?: string) => Promise<void>;
}

export function KycReviewModal({ document, isOpen, onClose, onReview }: KycReviewModalProps) {
  const [reason, setReason] = useState('');
  const [processing, setProcessing] = useState(false);

  const handleReview = async (action: 'approve' | 'reject') => {
    setProcessing(true);
    try {
      await onReview(document.id, action, reason);
      onClose();
    } catch (error) {
      console.error('Review failed:', error);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <div className="p-6 max-w-2xl">
        <h2 className="text-xl font-bold mb-4">Review KYC Document</h2>
        
        <div className="mb-4">
          <p><strong>User:</strong> {document.userName} ({document.userEmail})</p>
          <p><strong>Document Type:</strong> {document.documentType}</p>
          <p><strong>Submitted:</strong> {new Date(document.submittedAt).toLocaleDateString()}</p>
        </div>

        <div className="mb-4">
          <img 
            src={document.documentUrl} 
            alt="KYC Document" 
            className="max-w-full h-auto border rounded"
          />
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">
            Review Notes (required for rejection)
          </label>
          <Textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Enter review notes..."
            rows={4}
          />
        </div>

        <div className="flex gap-3">
          <Button
            onClick={() => handleReview('approve')}
            disabled={processing}
            className="bg-green-600 hover:bg-green-700"
          >
            Approve
          </Button>
          <Button
            onClick={() => handleReview('reject')}
            disabled={processing || !reason.trim()}
            variant="destructive"
          >
            Reject
          </Button>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
