import React, { useState, useEffect } from 'react';
import { X, DollarSign, Calendar, User, Hash, CreditCard, AlertTriangle, CheckCircle, Clock } from 'lucide-react';

interface TransactionDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  transactionId: string;
}

interface TransactionDetail {
  id: string;
  userId: number;
  recipientId?: number;
  walletId?: number;
  paymentMethodId?: number;
  orderId?: string;
  type: string;
  status: string;
  amount: string;
  fee: string;
  netAmount: string;
  currency: string;
  paystackReference?: string;
  paystackTransactionId?: string;
  gatewayResponse?: any;
  description?: string;
  metadata?: any;
  channel?: string;
  ipAddress?: string;
  userAgent?: string;
  initiatedAt: string;
  completedAt?: string;
  failedAt?: string;
  createdAt: string;
  updatedAt: string;
  user?: {
    id: number;
    userId: string;
    fullName: string;
    email: string;
    phone: string;
    role: string;
  };
}

interface AdminAction {
  id: number;
  action: string;
  details: any;
  createdAt: string;
  admin: {
    id: number;
    role: string;
    user: {
      fullName: string;
      email: string;
    };
  };
}

export function TransactionDetailModal({ isOpen, onClose, transactionId }: TransactionDetailModalProps) {
  const [transaction, setTransaction] = useState<TransactionDetail | null>(null);
  const [adminActions, setAdminActions] = useState<AdminAction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && transactionId) {
      fetchTransactionDetails();
    }
  }, [isOpen, transactionId]);

  const fetchTransactionDetails = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/admin/transactions/${transactionId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('adminToken')}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch transaction details');
      }

      const data = await response.json();
      setTransaction(data.data.transaction);
      setAdminActions(data.data.adminActions);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch transaction details');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: string, currency: string = 'NGN') => {
    const numAmount = parseFloat(amount);
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: currency === 'NGN' ? 'NGN' : 'USD',
      minimumFractionDigits: 2
    }).format(numAmount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const getStatusIcon = (status: string) => {
    switch (status.toUpperCase()) {
      case 'SUCCESS':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'PENDING':
        return <Clock className="h-5 w-5 text-yellow-500" />;
      case 'PROCESSING':
        return <Clock className="h-5 w-5 text-blue-500" />;
      case 'FAILED':
        return <X className="h-5 w-5 text-red-500" />;
      default:
        return <AlertTriangle className="h-5 w-5 text-gray-500" />;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={onClose} />

        <span className="hidden sm:inline-block sm:align-middle sm:h-screen">&#8203;</span>

        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full">
          <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900">Transaction Details</h3>
              <button
                onClick={onClose}
                className="bg-white rounded-md text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            {loading ? (
              <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : error ? (
              <div className="text-center py-12">
                <AlertTriangle className="h-12 w-12 text-red-400 mx-auto mb-4" />
                <p className="text-gray-500">{error}</p>
                <button
                  onClick={fetchTransactionDetails}
                  className="mt-4 text-blue-600 hover:text-blue-500"
                >
                  Try again
                </button>
              </div>
            ) : transaction ? (
              <div className="space-y-6">
                {/* Transaction Overview */}
                <div className="bg-gray-50 rounded-lg p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      {getStatusIcon(transaction.status)}
                      <div>
                        <h4 className="text-lg font-medium text-gray-900">
                          {formatCurrency(transaction.amount, transaction.currency)}
                        </h4>
                        <p className="text-sm text-gray-500">
                          {transaction.type} • {transaction.status}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-gray-900">Transaction ID</p>
                      <p className="text-sm text-gray-500 font-mono">{transaction.id}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <p className="text-sm font-medium text-gray-500">Amount</p>
                      <p className="text-sm text-gray-900">{formatCurrency(transaction.amount, transaction.currency)}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500">Fee</p>
                      <p className="text-sm text-gray-900">{formatCurrency(transaction.fee, transaction.currency)}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500">Net Amount</p>
                      <p className="text-sm text-gray-900">{formatCurrency(transaction.netAmount, transaction.currency)}</p>
                    </div>
                  </div>
                </div>

                {/* User Information */}
                {transaction.user && (
                  <div className="bg-white border border-gray-200 rounded-lg p-6">
                    <h5 className="text-sm font-medium text-gray-900 mb-4 flex items-center">
                      <User className="h-4 w-4 mr-2" />
                      User Information
                    </h5>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm font-medium text-gray-500">Name</p>
                        <p className="text-sm text-gray-900">{transaction.user.fullName}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-500">Email</p>
                        <p className="text-sm text-gray-900">{transaction.user.email}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-500">User ID</p>
                        <p className="text-sm text-gray-900 font-mono">{transaction.user.userId}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-500">Role</p>
                        <p className="text-sm text-gray-900 capitalize">{transaction.user.role}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Payment Details */}
                <div className="bg-white border border-gray-200 rounded-lg p-6">
                  <h5 className="text-sm font-medium text-gray-900 mb-4 flex items-center">
                    <CreditCard className="h-4 w-4 mr-2" />
                    Payment Details
                  </h5>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {transaction.channel && (
                      <div>
                        <p className="text-sm font-medium text-gray-500">Channel</p>
                        <p className="text-sm text-gray-900 capitalize">{transaction.channel}</p>
                      </div>
                    )}
                    {transaction.paystackReference && (
                      <div>
                        <p className="text-sm font-medium text-gray-500">Paystack Reference</p>
                        <p className="text-sm text-gray-900 font-mono">{transaction.paystackReference}</p>
                      </div>
                    )}
                    {transaction.paystackTransactionId && (
                      <div>
                        <p className="text-sm font-medium text-gray-500">Paystack Transaction ID</p>
                        <p className="text-sm text-gray-900 font-mono">{transaction.paystackTransactionId}</p>
                      </div>
                    )}
                    <div>
                      <p className="text-sm font-medium text-gray-500">Currency</p>
                      <p className="text-sm text-gray-900">{transaction.currency}</p>
                    </div>
                  </div>
                </div>

                {/* Timeline */}
                <div className="bg-white border border-gray-200 rounded-lg p-6">
                  <h5 className="text-sm font-medium text-gray-900 mb-4 flex items-center">
                    <Calendar className="h-4 w-4 mr-2" />
                    Timeline
                  </h5>
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm font-medium text-gray-500">Initiated</p>
                      <p className="text-sm text-gray-900">{formatDate(transaction.initiatedAt)}</p>
                    </div>
                    {transaction.completedAt && (
                      <div>
                        <p className="text-sm font-medium text-gray-500">Completed</p>
                        <p className="text-sm text-gray-900">{formatDate(transaction.completedAt)}</p>
                      </div>
                    )}
                    {transaction.failedAt && (
                      <div>
                        <p className="text-sm font-medium text-gray-500">Failed</p>
                        <p className="text-sm text-gray-900">{formatDate(transaction.failedAt)}</p>
                      </div>
                    )}
                    <div>
                      <p className="text-sm font-medium text-gray-500">Last Updated</p>
                      <p className="text-sm text-gray-900">{formatDate(transaction.updatedAt)}</p>
                    </div>
                  </div>
                </div>

                {/* Admin Actions */}
                {adminActions.length > 0 && (
                  <div className="bg-white border border-gray-200 rounded-lg p-6">
                    <h5 className="text-sm font-medium text-gray-900 mb-4 flex items-center">
                      <Hash className="h-4 w-4 mr-2" />
                      Admin Actions
                    </h5>
                    <div className="space-y-4">
                      {adminActions.map((action) => (
                        <div key={action.id} className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
                          <div className="flex-shrink-0">
                            <div className="h-2 w-2 bg-blue-500 rounded-full mt-2"></div>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <p className="text-sm font-medium text-gray-900">
                                {action.action} by {action.admin.user.fullName}
                              </p>
                              <p className="text-xs text-gray-500">
                                {formatDate(action.createdAt)}
                              </p>
                            </div>
                            {action.details && (
                              <div className="mt-2">
                                <pre className="text-xs text-gray-600 bg-white p-2 rounded border overflow-auto">
                                  {JSON.stringify(action.details, null, 2)}
                                </pre>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Metadata */}
                {transaction.metadata && (
                  <div className="bg-white border border-gray-200 rounded-lg p-6">
                    <h5 className="text-sm font-medium text-gray-900 mb-4">Metadata</h5>
                    <pre className="text-xs text-gray-600 bg-gray-50 p-4 rounded-lg overflow-auto">
                      {JSON.stringify(transaction.metadata, null, 2)}
                    </pre>
                  </div>
                )}

                {/* Gateway Response */}
                {transaction.gatewayResponse && (
                  <div className="bg-white border border-gray-200 rounded-lg p-6">
                    <h5 className="text-sm font-medium text-gray-900 mb-4">Gateway Response</h5>
                    <pre className="text-xs text-gray-600 bg-gray-50 p-4 rounded-lg overflow-auto">
                      {JSON.stringify(transaction.gatewayResponse, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            ) : null}
          </div>

          <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
            <button
              onClick={onClose}
              className="w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}