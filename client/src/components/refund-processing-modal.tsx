interface Transaction {
  id: string;
  amount: string;
  userId?: number;
}

interface RefundProcessingModalProps {
  isOpen: boolean;
  onClose: () => void;
  transaction: Transaction;
  onRefundProcess: (refundData: any) => Promise<void>;
}

export function RefundProcessingModal({ 
  isOpen, 
  onClose, 
  transaction, 
  onRefundProcess 
}: RefundProcessingModalProps) {
  if (!isOpen) return null;

  const handleRefund = async () => {
    await onRefundProcess({
      transactionId: transaction.id,
      amount: transaction.amount,
      reason: 'Admin initiated refund'
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">Process Refund</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            ×
          </button>
        </div>
        <div className="space-y-2 mb-6">
          <p><strong>Transaction ID:</strong> {transaction.id}</p>
          <p><strong>Refund Amount:</strong> ₦{transaction.amount}</p>
        </div>
        <div className="flex gap-2 justify-end">
          <button 
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300"
          >
            Cancel
          </button>
          <button 
            onClick={handleRefund}
            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            Process Refund
          </button>
        </div>
      </div>
    </div>
  );
}