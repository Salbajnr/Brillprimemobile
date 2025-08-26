interface TransactionDetailModalProps {
  transactionId: string | null;
  onClose: () => void;
}

export function TransactionDetailModal({ transactionId, onClose }: TransactionDetailModalProps) {
  if (!transactionId) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">Transaction Details</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            ×
          </button>
        </div>
        <div className="space-y-2">
          <p><strong>Transaction ID:</strong> {transactionId}</p>
          <p><strong>Status:</strong> Processing</p>
          <p><strong>Amount:</strong> ₦1,000</p>
        </div>
        <div className="mt-6 flex justify-end">
          <button 
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}