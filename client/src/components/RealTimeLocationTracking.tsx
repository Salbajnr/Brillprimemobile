import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { MapPin, Navigation } from 'lucide-react'

interface LocationData {
  lat: number
  lng: number
  address: string
  lastUpdate: string
}

export default function RealTimeLocationTracking() {
  const [driverLocation, setDriverLocation] = useState<LocationData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Simulate real-time location updates
    const mockLocation: LocationData = {
      lat: 6.5244,
      lng: 3.3792,
      address: "Victoria Island, Lagos",
      lastUpdate: new Date().toISOString()
    }
    
    setDriverLocation(mockLocation)
    setLoading(false)

    // Simulate location updates every 30 seconds
    const interval = setInterval(() => {
      setDriverLocation(prev => prev ? {
        ...prev,
        lat: prev.lat + (Math.random() - 0.5) * 0.001,
        lng: prev.lng + (Math.random() - 0.5) * 0.001,
        lastUpdate: new Date().toISOString()
      } : null)
    }, 30000)

    return () => clearInterval(interval)
  }, [])

  if (loading || !driverLocation) {
    return <div className="p-4">Loading location...</div>
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapPin className="h-5 w-5" />
          Driver Location
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Navigation className="h-4 w-4 text-blue-600" />
            <span className="text-sm">{driverLocation.address}</span>
          </div>
          <div className="text-xs text-gray-500">
            Coordinates: {driverLocation.lat.toFixed(4)}, {driverLocation.lng.toFixed(4)}
          </div>
          <div className="text-xs text-gray-500">
            Last update: {new Date(driverLocation.lastUpdate).toLocaleTimeString()}
          </div>
          <div className="w-full h-48 bg-gray-200 rounded-md flex items-center justify-center">
            <div className="text-center">
              <MapPin className="h-8 w-8 mx-auto mb-2 text-gray-400" />
              <p className="text-sm text-gray-500">Map view would be here</p>
              <p className="text-xs text-gray-400">Integrate with Google Maps</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}