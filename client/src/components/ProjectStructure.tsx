function ProjectStructure() {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      <div className="px-6 py-4 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900 flex items-center">
          <i className="fas fa-folder-tree mr-2 text-blue-600"></i>
          Monorepo Structure
        </h2>
      </div>
      <div className="p-6">
        <div className="font-mono text-sm space-y-1">
          <div className="flex items-center text-gray-700">
            <i className="fas fa-folder text-yellow-500 mr-2"></i>
            <span className="font-medium">crossplatform-app/</span>
          </div>
          <div className="ml-4 space-y-1">
            <div className="flex items-center text-gray-600">
              <i className="fas fa-folder text-yellow-500 mr-2"></i>
              <span>apps/</span>
            </div>
            <div className="ml-4 space-y-1">
              <div className="flex items-center text-gray-600">
                <i className="fas fa-folder text-blue-500 mr-2"></i>
                <span>web/</span>
                <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                  Vite + React
                </span>
              </div>
              <div className="ml-8 text-xs text-gray-500">
                <div>├── src/</div>
                <div>├── public/</div>
                <div>└── vite.config.ts</div>
              </div>
            </div>
            
            <div className="flex items-center text-gray-600 mt-3">
              <i className="fas fa-folder text-yellow-500 mr-2"></i>
              <span>packages/</span>
            </div>
            <div className="ml-4 space-y-2">
              <div className="flex items-center text-gray-600">
                <i className="fas fa-cube text-green-500 mr-2"></i>
                <span>shared-ui</span>
                <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                  Components
                </span>
              </div>
              <div className="flex items-center text-gray-600">
                <i className="fas fa-cube text-purple-500 mr-2"></i>
                <span>business-logic</span>
                <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800">
                  Hooks & Utils
                </span>
              </div>
              <div className="flex items-center text-gray-600">
                <i className="fas fa-cube text-orange-500 mr-2"></i>
                <span>api-client</span>
                <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-orange-100 text-orange-800">
                  API Layer
                </span>
              </div>
              <div className="flex items-center text-gray-600">
                <i className="fas fa-cube text-pink-500 mr-2"></i>
                <span>constants</span>
                <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-pink-100 text-pink-800">
                  Config
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ProjectStructure
