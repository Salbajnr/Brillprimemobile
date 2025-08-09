function QuickActions() {
  const actions = [
    {
      icon: "fas fa-play",
      text: "Start Dev Server",
      isPrimary: true
    },
    {
      icon: "fas fa-hammer",
      text: "Build All Packages",
      isPrimary: false
    },
    {
      icon: "fas fa-vial",
      text: "Run Tests",
      isPrimary: false
    }
  ]

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      <div className="px-6 py-4 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900">Quick Actions</h3>
      </div>
      <div className="p-6 space-y-3">
        {actions.map((action, index) => (
          <button
            key={index}
            className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
              action.isPrimary
                ? 'bg-blue-600 text-white hover:bg-blue-700'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <i className={action.icon}></i>
            <span>{action.text}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

export default QuickActions
