import React, { useState } from 'react';
import { X, DollarSign, AlertTriangle, CheckCircle } from 'lucide-react';

interface RefundProcessingModalProps {
  isOpen: boolean;
  onClose: () => void;
  transaction: {
    id: string;
    amount: string;
    currency: string;
    user?: {
      fullName: string;
      email: string;
    };
    description?: string;
  };
  onRefundProcess: (refundData: {
    reason: string;
    refundType: 'FULL' | 'PARTIAL';
    amount?: string;
    notify: boolean;
  }) => Promise<void>;
}

export function RefundProcessingModal({
  isOpen,
  onClose,
  transaction,
  onRefundProcess
}: RefundProcessingModalProps) {
  const [refundType, setRefundType] = useState<'FULL' | 'PARTIAL'>('FULL');
  const [refundAmount, setRefundAmount] = useState('');
  const [reason, setReason] = useState('');
  const [notify, setNotify] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const formatCurrency = (amount: string, currency: string = 'NGN') => {
    const numAmount = parseFloat(amount);
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: currency === 'NGN' ? 'NGN' : 'USD',
      minimumFractionDigits: 2
    }).format(numAmount);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!reason.trim()) {
      setError('Please provide a reason for the refund');
      return;
    }

    if (refundType === 'PARTIAL' && (!refundAmount || parseFloat(refundAmount) <= 0)) {
      setError('Please enter a valid refund amount');
      return;
    }

    if (refundType === 'PARTIAL' && parseFloat(refundAmount) > parseFloat(transaction.amount)) {
      setError('Refund amount cannot exceed transaction amount');
      return;
    }

    try {
      setProcessing(true);
      setError(null);

      await onRefundProcess({
        reason: reason.trim(),
        refundType,
        amount: refundType === 'PARTIAL' ? refundAmount : transaction.amount,
        notify
      });

      // Reset form
      setReason('');
      setRefundAmount('');
      setRefundType('FULL');
      setNotify(true);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to process refund');
    } finally {
      setProcessing(false);
    }
  };

  const handleClose = () => {
    if (!processing) {
      setReason('');
      setRefundAmount('');
      setRefundType('FULL');
      setNotify(true);
      setError(null);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={handleClose} />

        <span className="hidden sm:inline-block sm:align-middle sm:h-screen">&#8203;</span>

        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
          <form onSubmit={handleSubmit}>
            <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center">
                  <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-100 sm:mx-0 sm:h-10 sm:w-10">
                    <DollarSign className="h-6 w-6 text-red-600" />
                  </div>
                  <div className="ml-4">
                    <h3 className="text-lg leading-6 font-medium text-gray-900">
                      Process Refund
                    </h3>
                    <p className="text-sm text-gray-500">
                      Refund for transaction {transaction.id.slice(0, 8)}...
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleClose}
                  disabled={processing}
                  className="bg-white rounded-md text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              <div className="space-y-6">
                {/* Transaction Details */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="text-sm font-medium text-gray-900 mb-2">Transaction Details</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-500">Amount:</span>
                      <span className="text-sm font-medium text-gray-900">
                        {formatCurrency(transaction.amount, transaction.currency)}
                      </span>
                    </div>
                    {transaction.user && (
                      <>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-500">Customer:</span>
                          <span className="text-sm text-gray-900">{transaction.user.fullName}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-500">Email:</span>
                          <span className="text-sm text-gray-900">{transaction.user.email}</span>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* Refund Type */}
                <div>
                  <label className="text-base font-medium text-gray-900">Refund Type</label>
                  <p className="text-sm leading-5 text-gray-500">Select the type of refund to process.</p>
                  <fieldset className="mt-4">
                    <legend className="sr-only">Refund type</legend>
                    <div className="space-y-4">
                      <div className="flex items-center">
                        <input
                          id="full-refund"
                          name="refund-type"
                          type="radio"
                          checked={refundType === 'FULL'}
                          onChange={() => setRefundType('FULL')}
                          className="focus:ring-blue-500 h-4 w-4 text-blue-600 border-gray-300"
                        />
                        <label htmlFor="full-refund" className="ml-3 block text-sm font-medium text-gray-700">
                          Full Refund - {formatCurrency(transaction.amount, transaction.currency)}
                        </label>
                      </div>
                      <div className="flex items-center">
                        <input
                          id="partial-refund"
                          name="refund-type"
                          type="radio"
                          checked={refundType === 'PARTIAL'}
                          onChange={() => setRefundType('PARTIAL')}
                          className="focus:ring-blue-500 h-4 w-4 text-blue-600 border-gray-300"
                        />
                        <label htmlFor="partial-refund" className="ml-3 block text-sm font-medium text-gray-700">
                          Partial Refund
                        </label>
                      </div>
                    </div>
                  </fieldset>
                </div>

                {/* Partial Refund Amount */}
                {refundType === 'PARTIAL' && (
                  <div>
                    <label htmlFor="refund-amount" className="block text-sm font-medium text-gray-700">
                      Refund Amount
                    </label>
                    <div className="mt-1 relative rounded-md shadow-sm">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <span className="text-gray-500 sm:text-sm">₦</span>
                      </div>
                      <input
                        type="number"
                        name="refund-amount"
                        id="refund-amount"
                        value={refundAmount}
                        onChange={(e) => setRefundAmount(e.target.value)}
                        step="0.01"
                        min="0.01"
                        max={transaction.amount}
                        placeholder="0.00"
                        className="focus:ring-blue-500 focus:border-blue-500 block w-full pl-8 pr-12 sm:text-sm border-gray-300 rounded-md"
                      />
                      <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                        <span className="text-gray-500 sm:text-sm">{transaction.currency}</span>
                      </div>
                    </div>
                    <p className="mt-1 text-xs text-gray-500">
                      Maximum refundable amount: {formatCurrency(transaction.amount, transaction.currency)}
                    </p>
                  </div>
                )}

                {/* Reason */}
                <div>
                  <label htmlFor="reason" className="block text-sm font-medium text-gray-700">
                    Reason for Refund <span className="text-red-500">*</span>
                  </label>
                  <div className="mt-1">
                    <textarea
                      id="reason"
                      name="reason"
                      rows={3}
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      placeholder="Please provide a detailed reason for the refund..."
                      className="shadow-sm focus:ring-blue-500 focus:border-blue-500 mt-1 block w-full sm:text-sm border-gray-300 rounded-md"
                      required
                    />
                  </div>
                  <p className="mt-1 text-xs text-gray-500">
                    This reason will be included in the refund notification to the customer.
                  </p>
                </div>

                {/* Notification Option */}
                <div className="flex items-center">
                  <input
                    id="notify-customer"
                    name="notify-customer"
                    type="checkbox"
                    checked={notify}
                    onChange={(e) => setNotify(e.target.checked)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="notify-customer" className="ml-2 block text-sm text-gray-900">
                    Send notification to customer
                  </label>
                </div>

                {/* Error Message */}
                {error && (
                  <div className="rounded-md bg-red-50 p-4">
                    <div className="flex">
                      <div className="flex-shrink-0">
                        <AlertTriangle className="h-5 w-5 text-red-400" />
                      </div>
                      <div className="ml-3">
                        <h3 className="text-sm font-medium text-red-800">Error</h3>
                        <div className="mt-2 text-sm text-red-700">
                          <p>{error}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Warning */}
                <div className="rounded-md bg-yellow-50 p-4">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <AlertTriangle className="h-5 w-5 text-yellow-400" />
                    </div>
                    <div className="ml-3">
                      <h3 className="text-sm font-medium text-yellow-800">Important</h3>
                      <div className="mt-2 text-sm text-yellow-700">
                        <p>
                          This action cannot be undone. The refund will be processed immediately and 
                          the customer will be notified if selected.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
              <button
                type="submit"
                disabled={processing || !reason.trim()}
                className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {processing ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Processing...
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Process Refund
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={handleClose}
                disabled={processing}
                className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}