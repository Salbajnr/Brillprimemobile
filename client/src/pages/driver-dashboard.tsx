export default function DriverDashboard() {
  return (
    <div className="w-full max-w-md mx-auto min-h-screen bg-gray-50 p-6">
      <div className="bg-white rounded-lg shadow-md p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Driver Dashboard</h1>
        <p className="text-gray-600 mb-6">Manage deliveries and track earnings</p>
        
        <div className="space-y-3">
          <button className="w-full bg-green-600 text-white py-3 px-4 rounded-lg hover:bg-green-700 transition-colors">
            Available Orders
          </button>
          <button className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors">
            Track Delivery
          </button>
          <button className="w-full bg-orange-600 text-white py-3 px-4 rounded-lg hover:bg-orange-700 transition-colors">
            View Earnings
          </button>
        </div>
      </div>
    </div>
  );
}