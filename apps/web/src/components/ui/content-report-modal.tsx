
import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { AlertTriangle, X } from 'lucide-react';

interface ContentReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  contentType: 'POST' | 'COMMENT' | 'PRODUCT' | 'USER';
  contentId: string;
  contentTitle?: string;
}

const REPORT_REASONS = [
  { value: 'spam', label: 'Spam or unwanted content' },
  { value: 'harassment', label: 'Harassment or bullying' },
  { value: 'hate_speech', label: 'Hate speech or discrimination' },
  { value: 'violence', label: 'Violence or dangerous content' },
  { value: 'inappropriate', label: 'Inappropriate or offensive content' },
  { value: 'copyright', label: 'Copyright infringement' },
  { value: 'fraud', label: 'Fraud or scam' },
  { value: 'other', label: 'Other (please specify)' }
];

export function ContentReportModal({ 
  isOpen, 
  onClose, 
  contentType, 
  contentId, 
  contentTitle 
}: ContentReportModalProps) {
  const [selectedReason, setSelectedReason] = useState('');
  const [customReason, setCustomReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submitReportMutation = useMutation({
    mutationFn: async (data: { contentType: string; contentId: string; reason: string }) => {
      const token = localStorage.getItem('authToken');
      const response = await fetch('http://localhost:5000/api/content/report', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(data)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to submit report');
      }

      return response.json();
    },
    onSuccess: () => {
      showNotification('Report submitted successfully. We will review it shortly.', 'success');
      onClose();
      setSelectedReason('');
      setCustomReason('');
    },
    onError: (error: any) => {
      showNotification(error.message || 'Failed to submit report', 'error');
    }
  });

  const showNotification = (message: string, type: 'success' | 'error') => {
    const notification = document.createElement('div');
    notification.className = `fixed top-4 right-4 px-4 py-2 rounded-md text-white z-50 ${
      type === 'success' ? 'bg-green-500' : 'bg-red-500'
    }`;
    notification.textContent = message;
    document.body.appendChild(notification);
    setTimeout(() => document.body.removeChild(notification), 3000);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedReason) {
      showNotification('Please select a reason for reporting', 'error');
      return;
    }

    if (selectedReason === 'other' && !customReason.trim()) {
      showNotification('Please provide a custom reason', 'error');
      return;
    }

    const reason = selectedReason === 'other' ? customReason : 
      REPORT_REASONS.find(r => r.value === selectedReason)?.label || selectedReason;

    submitReportMutation.mutate({
      contentType,
      contentId,
      reason
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              <h2 className="text-lg font-semibold text-gray-900">Report Content</h2>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {contentTitle && (
            <div className="mb-4 p-3 bg-gray-50 rounded-md">
              <p className="text-sm text-gray-600">Reporting: {contentType.toLowerCase()}</p>
              <p className="font-medium text-gray-900">{contentTitle}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Why are you reporting this content?
              </label>
              <div className="space-y-2">
                {REPORT_REASONS.map((reason) => (
                  <label key={reason.value} className="flex items-center">
                    <input
                      type="radio"
                      name="reason"
                      value={reason.value}
                      checked={selectedReason === reason.value}
                      onChange={(e) => setSelectedReason(e.target.value)}
                      className="mr-2"
                    />
                    <span className="text-sm text-gray-700">{reason.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {selectedReason === 'other' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Please provide more details
                </label>
                <textarea
                  value={customReason}
                  onChange={(e) => setCustomReason(e.target.value)}
                  placeholder="Describe why you're reporting this content..."
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                  required
                />
              </div>
            )}

            <div className="flex justify-end gap-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitReportMutation.isPending || !selectedReason}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:bg-gray-300"
              >
                {submitReportMutation.isPending ? 'Submitting...' : 'Submit Report'}
              </button>
            </div>
          </form>

          <div className="mt-4 p-3 bg-blue-50 rounded-md">
            <p className="text-xs text-blue-800">
              Your report will be reviewed by our moderation team. False reports may result in restrictions on your account.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
