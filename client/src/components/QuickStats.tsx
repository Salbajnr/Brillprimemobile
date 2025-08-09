function QuickStats() {
  const stats = [
    {
      title: "Web App Status",
      value: "Deployed",
      icon: "fas fa-globe",
      bgColor: "bg-green-100",
      iconColor: "text-green-600",
      valueColor: "text-green-600",
      subtitle: "Last deploy: 2 minutes ago"
    },
    {
      title: "Shared Packages",
      value: "8",
      icon: "fas fa-cubes",
      bgColor: "bg-blue-100",
      iconColor: "text-blue-600",
      valueColor: "text-blue-600",
      subtitle: "All packages synced"
    },
    {
      title: "TypeScript Coverage",
      value: "94%",
      icon: "fab fa-js-square",
      bgColor: "bg-green-100",
      iconColor: "text-green-600",
      valueColor: "text-green-600",
      subtitle: "+2% from last week"
    },
    {
      title: "Build Time",
      value: "1.2s",
      icon: "fas fa-bolt",
      bgColor: "bg-gray-100",
      iconColor: "text-gray-600",
      valueColor: "text-gray-600",
      subtitle: "Vite optimized"
    }
  ]

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      {stats.map((stat, index) => (
        <div key={index} className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">{stat.title}</p>
              <p className={`text-2xl font-bold ${stat.valueColor}`}>{stat.value}</p>
            </div>
            <div className={`w-12 h-12 ${stat.bgColor} rounded-lg flex items-center justify-center`}>
              <i className={`${stat.icon} ${stat.iconColor} text-xl`}></i>
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-2">{stat.subtitle}</p>
        </div>
      ))}
    </div>
  )
}

export default QuickStats
