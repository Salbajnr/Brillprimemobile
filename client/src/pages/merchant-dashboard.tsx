export default function MerchantDashboard() {
  return (
    <div className="w-full max-w-md mx-auto min-h-screen bg-gray-50 p-6">
      <div className="bg-white rounded-lg shadow-md p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Merchant Dashboard</h1>
        <p className="text-gray-600 mb-6">Manage your business and accept payments</p>
        
        <div className="space-y-3">
          <button className="w-full bg-green-600 text-white py-3 px-4 rounded-lg hover:bg-green-700 transition-colors">
            View Sales
          </button>
          <button className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors">
            Accept Payment
          </button>
          <button className="w-full bg-purple-600 text-white py-3 px-4 rounded-lg hover:bg-purple-700 transition-colors">
            Manage Inventory
          </button>
        </div>
      </div>
    </div>
  );
}