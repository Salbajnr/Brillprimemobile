import { useState } from 'react'

function ConfigurationTabs() {
  const [activeTab, setActiveTab] = useState('typescript')

  const tabs = [
    { id: 'typescript', label: 'TypeScript Setup' },
    { id: 'vite', label: 'Vite Configuration' },
    { id: 'packages', label: 'Package Structure' }
  ]

  const getTabContent = () => {
    switch (activeTab) {
      case 'typescript':
        return (
          <div className="bg-gray-900 rounded-lg p-4 text-green-400 font-mono text-sm overflow-x-auto">
            <div className="text-gray-400">// tsconfig.json - Root configuration</div>
            <div>{"{"}</div>
            <div className="ml-2">"compilerOptions": {"{"}</div>
            <div className="ml-4">"baseUrl": ".",</div>
            <div className="ml-4">"paths": {"{"}</div>
            <div className="ml-6">"@packages/*": ["packages/*"],</div>
            <div className="ml-6">"@shared-ui/*": ["packages/shared-ui/src/*"],</div>
            <div className="ml-6">"@business-logic/*": ["packages/business-logic/src/*"]</div>
            <div className="ml-4">{"}"}</div>
            <div className="ml-2">{"},"},</div>
            <div className="ml-2">"references": [</div>
            <div className="ml-4">{"{ \"path\": \"./apps/web\" },"}</div>
            <div className="ml-4">{"{ \"path\": \"./packages/shared-ui\" },"}</div>
            <div className="ml-4">{"{ \"path\": \"./packages/business-logic\" }"}</div>
            <div className="ml-2">]</div>
            <div>{"}"}</div>
          </div>
        )
      case 'vite':
        return (
          <div className="bg-gray-900 rounded-lg p-4 text-green-400 font-mono text-sm overflow-x-auto">
            <div className="text-gray-400">// vite.config.ts - Web app configuration</div>
            <div>import {"{ defineConfig }"} from 'vite'</div>
            <div>import react from '@vitejs/plugin-react'</div>
            <div></div>
            <div>export default defineConfig({"{"}</div>
            <div className="ml-2">plugins: [react()],</div>
            <div className="ml-2">resolve: {"{"}</div>
            <div className="ml-4">alias: {"{"}</div>
            <div className="ml-6">'@packages': '/packages',</div>
            <div className="ml-6">'@shared-ui': '/packages/shared-ui/src'</div>
            <div className="ml-4">{"}"}</div>
            <div className="ml-2">{"}"},</div>
            <div className="ml-2">server: {"{ port: 5000 }"}</div>
            <div>{"})"}</div>
          </div>
        )
      case 'packages':
        return (
          <div className="bg-gray-900 rounded-lg p-4 text-green-400 font-mono text-sm overflow-x-auto">
            <div className="text-gray-400">// Package structure overview</div>
            <div>packages/</div>
            <div className="ml-2">├── shared-ui/</div>
            <div className="ml-4">│   ├── src/components/</div>
            <div className="ml-4">│   └── package.json</div>
            <div className="ml-2">├── business-logic/</div>
            <div className="ml-4">│   ├── src/hooks/</div>
            <div className="ml-4">│   ├── src/utils/</div>
            <div className="ml-4">│   └── package.json</div>
            <div className="ml-2">├── api-client/</div>
            <div className="ml-4">│   ├── src/client.ts</div>
            <div className="ml-4">│   └── package.json</div>
            <div className="ml-2">└── constants/</div>
            <div className="ml-4">├── src/colors.ts</div>
            <div className="ml-4">├── src/config.ts</div>
            <div className="ml-4">└── package.json</div>
          </div>
        )
      default:
        return null
    }
  }

  return (
    <div className="mt-8 bg-white rounded-lg shadow-sm border border-gray-200">
      <div className="px-6 py-4 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900 flex items-center">
          <i className="fas fa-wrench mr-2 text-blue-600"></i>
          Configuration Overview
        </h2>
      </div>
      <div className="p-6">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-2 px-1 text-sm font-medium border-b-2 ${
                  activeTab === tab.id
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
        
        <div className="mt-6">
          {getTabContent()}
        </div>
      </div>
    </div>
  )
}

export default ConfigurationTabs
