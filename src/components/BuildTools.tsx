function BuildTools() {
  const tools = [
    {
      name: "Vite",
      description: "Dev Server",
      icon: "fas fa-bolt",
      bgColor: "bg-yellow-100",
      iconColor: "text-yellow-600",
      status: "online"
    },
    {
      name: "TypeScript",
      description: "Type Checking",
      icon: "fab fa-js-square",
      bgColor: "bg-blue-100",
      iconColor: "text-blue-600",
      status: "online"
    },
    {
      name: "Turborepo",
      description: "Build System",
      icon: "fas fa-cogs",
      bgColor: "bg-purple-100",
      iconColor: "text-purple-600",
      status: "online"
    }
  ]

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      <div className="px-6 py-4 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900">Build Tools</h3>
      </div>
      <div className="p-6 space-y-4">
        {tools.map((tool, index) => (
          <div key={index} className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className={`w-8 h-8 ${tool.bgColor} rounded-lg flex items-center justify-center`}>
                <i className={`${tool.icon} ${tool.iconColor}`}></i>
              </div>
              <div>
                <p className="font-medium text-gray-900">{tool.name}</p>
                <p className="text-sm text-gray-500">{tool.description}</p>
              </div>
            </div>
            <span className="w-2 h-2 bg-green-500 rounded-full"></span>
          </div>
        ))}
      </div>
    </div>
  )
}

export default BuildTools
