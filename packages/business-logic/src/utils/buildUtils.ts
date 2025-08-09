export function formatBuildTime(seconds: number): string {
  if (seconds < 60) {
    return `${seconds.toFixed(1)}s`
  }
  
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60
  
  return `${minutes}m ${remainingSeconds.toFixed(1)}s`
}

export function calculateCoverage(covered: number, total: number): number {
  if (total === 0) return 0
  return Math.round((covered / total) * 100)
}

export function getBuildStatusColor(status: 'success' | 'failed' | 'building'): string {
  switch (status) {
    case 'success':
      return 'text-green-600'
    case 'failed':
      return 'text-red-600'
    case 'building':
      return 'text-yellow-600'
    default:
      return 'text-gray-600'
  }
}

export function formatTimestamp(date: Date): string {
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const minutes = Math.floor(diff / 60000)
  
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes} minutes ago`
  
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} hours ago`
  
  const days = Math.floor(hours / 24)
  return `${days} days ago`
}
