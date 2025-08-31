import React, { useState, useEffect } from 'react';
import { QrCode, Eye, Download, Calendar, CreditCard, CheckCircle, XCircle, Clock } from 'lucide-react';
import { useToast } from "../hooks/use-toast";

interface Receipt {
  id: number;
  receiptNumber: string;
  amount: string;
  currency: string;
  paymentMethod: string;
  serviceType: string;
  status: string;
  scannedAt?: string;
  createdAt: string;
  consumerName?: string;
  consumerEmail?: string;
}

interface QRReceiptsListProps {
  className?: string;
}

export function QRReceiptsList({ className = "" }: QRReceiptsListProps) {
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedReceipt, setSelectedReceipt] = useState<Receipt | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const { toast } = useToast();

  // Fetch user receipts
  const fetchReceipts = async (pageNum = 1) => {
    try {
      setIsLoading(pageNum === 1);
      const response = await fetch(`/api/qr-receipts?page=${pageNum}&limit=20`);
      const data = await response.json();

      if (data.success) {
        if (pageNum === 1) {
          setReceipts(data.data.receipts);
        } else {
          setReceipts(prev => [...prev, ...data.data.receipts]);
        }
        setHasMore(data.data.pagination.hasMore);
      } else {
        setError(data.message || 'Failed to load receipts');
      }
    } catch (err) {
      setError('Network error - please try again');
      console.error('Receipts fetch error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchReceipts();
  }, []);

  const loadMore = () => {
    if (hasMore && !isLoading) {
      const nextPage = page + 1;
      setPage(nextPage);
      fetchReceipts(nextPage);
    }
  };

  const viewReceiptDetails = async (receipt: Receipt) => {
    try {
      const response = await fetch(`/api/qr-receipts/${receipt.id}`);
      const data = await response.json();

      if (data.success) {
        setSelectedReceipt(data.data);
      } else {
        toast({
          title: "Error",
          description: "Failed to load receipt details",
          variant: "destructive",
        });
      }
    } catch (err) {
      toast({
        title: "Error",
        description: "Network error loading receipt",
        variant: "destructive",
      });
    }
  };

  const downloadReceipt = async (receipt: Receipt) => {
    try {
      const response = await fetch(`/api/qr-receipts/${receipt.id}`);
      const data = await response.json();

      if (data.success && data.data.qrCodeImage) {
        const link = document.createElement('a');
        link.download = `receipt-${receipt.receiptNumber}.png`;
        link.href = data.data.qrCodeImage;
        link.click();

        toast({
          title: "Receipt Downloaded",
          description: `Receipt ${receipt.receiptNumber} downloaded`,
        });
      } else {
        toast({
          title: "Download Failed",
          description: "Unable to download receipt QR code",
          variant: "destructive",
        });
      }
    } catch (err) {
      toast({
        title: "Download Error",
        description: "Network error during download",
        variant: "destructive",
      });
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'SCANNED':
        return <Eye className="h-4 w-4 text-blue-600" />;
      case 'EXPIRED':
        return <Clock className="h-4 w-4 text-orange-600" />;
      default:
        return <XCircle className="h-4 w-4 text-gray-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return 'text-green-600 bg-green-50';
      case 'SCANNED':
        return 'text-blue-600 bg-blue-50';
      case 'EXPIRED':
        return 'text-orange-600 bg-orange-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  if (isLoading && receipts.length === 0) {
    return (
      <div className={`space-y-4 ${className}`}>
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">Payment Receipts</h2>
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="animate-pulse bg-white rounded-lg shadow p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="h-10 w-10 bg-gray-200 rounded"></div>
                  <div className="space-y-2">
                    <div className="h-4 bg-gray-200 rounded w-24"></div>
                    <div className="h-3 bg-gray-200 rounded w-16"></div>
                  </div>
                </div>
                <div className="h-8 bg-gray-200 rounded w-20"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`text-center py-8 ${className}`}>
        <QrCode className="h-12 w-12 mx-auto text-gray-400 mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Unable to Load Receipts</h3>
        <p className="text-gray-600 mb-4">{error}</p>
        <button
          onClick={() => fetchReceipts()}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900">Payment Receipts</h2>
        <span className="text-sm text-gray-500">{receipts.length} receipts</span>
      </div>

      {receipts.length === 0 ? (
        <div className="text-center py-8">
          <QrCode className="h-12 w-12 mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Receipts Yet</h3>
          <p className="text-gray-600">
            Your payment receipts with QR codes will appear here after transactions
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {receipts.map(receipt => (
            <div key={receipt.id} className="bg-white rounded-lg shadow border hover:shadow-md transition-shadow">
              <div className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="flex-shrink-0">
                      <QrCode className="h-8 w-8 text-blue-600" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center space-x-2">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {receipt.receiptNumber}
                        </p>
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(receipt.status)}`}>
                          {getStatusIcon(receipt.status)}
                          <span className="ml-1">{receipt.status}</span>
                        </span>
                      </div>
                      <div className="flex items-center space-x-4 mt-1">
                        <div className="flex items-center text-gray-500 text-sm">
                          <CreditCard className="h-3 w-3 mr-1" />
                          {receipt.currency} {parseFloat(receipt.amount).toLocaleString()}
                        </div>
                        <div className="flex items-center text-gray-500 text-sm">
                          <Calendar className="h-3 w-3 mr-1" />
                          {new Date(receipt.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                      <div className="flex items-center space-x-4 mt-1">
                        <span className="text-xs text-gray-500">{receipt.paymentMethod}</span>
                        <span className="text-xs text-gray-500">{receipt.serviceType}</span>
                      </div>
                      {receipt.scannedAt && (
                        <div className="text-xs text-blue-600 mt-1">
                          Scanned: {new Date(receipt.scannedAt).toLocaleDateString()}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => viewReceiptDetails(receipt)}
                      className="inline-flex items-center px-3 py-1 border border-gray-300 shadow-sm text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50"
                    >
                      <Eye className="h-3 w-3 mr-1" />
                      View
                    </button>
                    <button
                      onClick={() => downloadReceipt(receipt)}
                      className="inline-flex items-center px-3 py-1 border border-gray-300 shadow-sm text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50"
                    >
                      <Download className="h-3 w-3 mr-1" />
                      QR
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}

          {hasMore && (
            <div className="text-center pt-4">
              <button
                onClick={loadMore}
                disabled={isLoading}
                className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 disabled:opacity-50"
              >
                {isLoading ? 'Loading...' : 'Load More'}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Receipt Detail Modal */}
      {selectedReceipt && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b px-4 py-3 flex items-center justify-between">
              <h3 className="text-lg font-medium">Receipt Details</h3>
              <button
                onClick={() => setSelectedReceipt(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <XCircle className="h-5 w-5" />
              </button>
            </div>
            <div className="p-4">
              {selectedReceipt.qrCodeImage && (
                <div className="text-center mb-4">
                  <img
                    src={selectedReceipt.qrCodeImage}
                    alt={`QR Code for ${selectedReceipt.receiptNumber}`}
                    className="w-48 h-48 mx-auto border rounded"
                  />
                  <p className="text-xs text-gray-500 mt-2">
                    Show this QR code to merchants for verification
                  </p>
                </div>
              )}
              <div className="space-y-3 text-sm">
                <div className="grid grid-cols-2 gap-2">
                  <span className="text-gray-600">Receipt:</span>
                  <span className="font-medium">{selectedReceipt.receiptNumber}</span>
                  <span className="text-gray-600">Amount:</span>
                  <span className="font-medium">{selectedReceipt.currency} {parseFloat(selectedReceipt.amount).toLocaleString()}</span>
                  <span className="text-gray-600">Method:</span>
                  <span className="font-medium">{selectedReceipt.paymentMethod}</span>
                  <span className="text-gray-600">Service:</span>
                  <span className="font-medium">{selectedReceipt.serviceType}</span>
                  <span className="text-gray-600">Status:</span>
                  <span className={`font-medium ${selectedReceipt.status === 'ACTIVE' ? 'text-green-600' : 'text-gray-600'}`}>
                    {selectedReceipt.status}
                  </span>
                  <span className="text-gray-600">Date:</span>
                  <span className="font-medium">{new Date(selectedReceipt.createdAt).toLocaleDateString()}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}