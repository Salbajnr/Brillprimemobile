function PackageDependencies() {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      <div className="px-6 py-4 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900 flex items-center">
          <i className="fas fa-project-diagram mr-2 text-blue-600"></i>
          Package Dependencies
        </h2>
      </div>
      <div className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-3">
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="font-medium text-blue-900 mb-2">apps/web</div>
              <div className="text-sm space-y-1">
                <div className="flex items-center text-blue-700">
                  <i className="fas fa-arrow-right mr-2 text-xs"></i>
                  @packages/shared-ui
                </div>
                <div className="flex items-center text-blue-700">
                  <i className="fas fa-arrow-right mr-2 text-xs"></i>
                  @packages/business-logic
                </div>
                <div className="flex items-center text-blue-700">
                  <i className="fas fa-arrow-right mr-2 text-xs"></i>
                  @packages/api-client
                </div>
              </div>
            </div>
          </div>
          
          <div className="space-y-3">
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="font-medium text-green-900 mb-2">@packages/business-logic</div>
              <div className="text-sm space-y-1">
                <div className="flex items-center text-green-700">
                  <i className="fas fa-arrow-right mr-2 text-xs"></i>
                  @packages/constants
                </div>
                <div className="flex items-center text-green-700">
                  <i className="fas fa-arrow-right mr-2 text-xs"></i>
                  @packages/api-client
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default PackageDependencies
