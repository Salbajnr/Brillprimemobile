
// Re-export shared services with mobile-specific adaptations
export { ApiService, WebSocketService, StorageAdapter } from '@shared'
export { WebSocketClient, useWebSocket } from '@shared'

// Mobile-specific services
export * from './storageAdapter'
export * from './sharedServices'
