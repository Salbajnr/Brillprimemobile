import { useState, useEffect } from 'react'

export interface BuildStatus {
  name: string
  status: 'success' | 'failed' | 'building'
  timestamp: Date
  duration: number
}

export interface PackageInfo {
  name: string
  version: string
  type: 'app' | 'package'
  dependencies: string[]
}

export interface MonorepoStats {
  packages: PackageInfo[]
  builds: BuildStatus[]
  coverage: number
  buildTime: number
  isLoading: boolean
}

export function useMonorepoStats(): MonorepoStats {
  const [stats, setStats] = useState<MonorepoStats>({
    packages: [],
    builds: [],
    coverage: 0,
    buildTime: 0,
    isLoading: true
  })

  useEffect(() => {
    // Simulate API call to get monorepo statistics
    const fetchStats = async () => {
      // This would typically be an API call
      const mockStats: MonorepoStats = {
        packages: [
          {
            name: 'apps/web',
            version: '1.0.0',
            type: 'app',
            dependencies: ['@packages/shared-ui', '@packages/business-logic', '@packages/api-client']
          },
          {
            name: '@packages/shared-ui',
            version: '0.1.0',
            type: 'package',
            dependencies: []
          },
          {
            name: '@packages/business-logic',
            version: '0.1.0',
            type: 'package',
            dependencies: ['@packages/constants', '@packages/api-client']
          },
          {
            name: '@packages/api-client',
            version: '0.1.0',
            type: 'package',
            dependencies: ['@packages/constants']
          },
          {
            name: '@packages/constants',
            version: '0.1.0',
            type: 'package',
            dependencies: []
          }
        ],
        builds: [
          {
            name: 'apps/web',
            status: 'success',
            timestamp: new Date(Date.now() - 2 * 60 * 1000),
            duration: 1200
          },
          {
            name: '@packages/shared-ui',
            status: 'success',
            timestamp: new Date(Date.now() - 5 * 60 * 1000),
            duration: 800
          },
          {
            name: '@packages/business-logic',
            status: 'success',
            timestamp: new Date(Date.now() - 12 * 60 * 1000),
            duration: 600
          }
        ],
        coverage: 94,
        buildTime: 1.2,
        isLoading: false
      }
      
      setStats(mockStats)
    }

    fetchStats()
  }, [])

  return stats
}
