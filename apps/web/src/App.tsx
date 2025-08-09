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
