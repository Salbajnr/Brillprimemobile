import Header from './components/Header'
import QuickStats from './components/QuickStats'
import ProjectStructure from './components/ProjectStructure'
import PackageDependencies from './components/PackageDependencies'
import BuildTools from './components/BuildTools'
import RecentBuilds from './components/RecentBuilds'
import QuickActions from './components/QuickActions'
import ConfigurationTabs from './components/ConfigurationTabs'

function App() {
  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <Header />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Cross-platform Demo Section */}
        <div className="mb-8 p-6 bg-white rounded-lg shadow-sm border border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Cross-Platform Monorepo Demo
          </h2>
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <p className="text-green-800">
              <strong>✓ Success!</strong> Cross-platform monorepo setup complete with:
            </p>
            <ul className="mt-2 text-green-700 text-sm list-disc list-inside space-y-1">
              <li>5 shared packages (@packages/shared, @shared-ui, @business-logic, @api-client, @constants)</li>
              <li>React Native Web compatible UI components</li>
              <li>Platform detection and unified storage</li>
              <li>TypeScript integration across all platforms</li>
              <li>Metro bundler configuration for React Native</li>
            </ul>
          </div>
        </div>
        
        <QuickStats />
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <ProjectStructure />
            <PackageDependencies />
          </div>
          
          <div className="space-y-6">
            <BuildTools />
            <RecentBuilds />
            <QuickActions />
          </div>
        </div>
        
        <ConfigurationTabs />
      </div>
    </div>
  )
}

export default App
