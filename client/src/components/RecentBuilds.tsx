function RecentBuilds() {
  const builds = [
    {
      name: "apps/web",
      time: "2 minutes ago",
      status: "Success"
    },
    {
      name: "@packages/shared-ui",
      time: "5 minutes ago",
      status: "Success"
    },
    {
      name: "@packages/business-logic",
      time: "12 minutes ago",
      status: "Success"
    }
  ]

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      <div className="px-6 py-4 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900">Recent Builds</h3>
      </div>
      <div className="divide-y divide-gray-200">
        {builds.map((build, index) => (
          <div key={index} className="p-6 flex items-center space-x-3">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <div className="flex-1">
              <p className="font-medium text-gray-900">{build.name}</p>
              <p className="text-sm text-gray-500">{build.time}</p>
            </div>
            <span className="text-sm font-medium text-green-600">{build.status}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export default RecentBuilds
