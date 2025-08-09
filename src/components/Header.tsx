function Header() {
  return (
    <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <i className="fas fa-code-branch text-blue-600 text-xl"></i>
              <h1 className="text-xl font-semibold text-gray-900">CrossPlatform Monorepo</h1>
            </div>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
              <i className="fas fa-circle text-green-500 mr-1" style={{fontSize: '6px'}}></i>
              All Systems Operational
            </span>
          </div>
          <div className="flex items-center space-x-4">
            <button className="text-gray-500 hover:text-gray-700">
              <i className="fas fa-bell"></i>
            </button>
            <button className="text-gray-500 hover:text-gray-700">
              <i className="fas fa-cog"></i>
            </button>
            <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white text-sm font-medium">
              <span>JD</span>
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}

export default Header
