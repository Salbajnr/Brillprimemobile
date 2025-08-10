
import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { MapPin, Navigation, Clock, Truck, Signal, Battery } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

interface LocationData {
  lat: number
  lng: number
  address: string
  lastUpdate: string
  heading?: number
  speed?: number
  eta?: string
  distance?: string
}

interface DriverStatus {
  isOnline: boolean
  batteryLevel: number
  signalStrength: number
  status: 'AVAILABLE' | 'BUSY' | 'OFFLINE'
}

export default function RealTimeLocationTracking() {
  const [driverLocation, setDriverLocation] = useState<LocationData | null>(null)
  const [driverStatus, setDriverStatus] = useState<DriverStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)

  useEffect(() => {
    let socket: WebSocket | null = null;
    let locationInterval: NodeJS.Timeout | null = null;

    const connectWebSocket = () => {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}`;
      
      socket = new WebSocket(wsUrl);
      
      socket.onopen = () => {
        console.log('Connected to real-time tracking');
        socket?.send(JSON.stringify({ type: 'join_driver_tracking' }));
      };

      socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          if (data.type === 'driver_location_update') {
            setDriverLocation({
              lat: data.latitude,
              lng: data.longitude,
              address: data.address || 'Current Location',
              lastUpdate: new Date().toISOString(),
              heading: data.heading,
              speed: data.speed,
              eta: data.eta,
              distance: data.distance
            });
            setLastUpdate(new Date());
          }
          
          if (data.type === 'driver_status_update') {
            setDriverStatus(data.status);
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      socket.onclose = () => {
        console.log('WebSocket connection closed, attempting to reconnect...');
        setTimeout(connectWebSocket, 3000);
      };
    };

    const fetchDriverLocation = async () => {
      try {
        const response = await fetch('/api/tracking/driver-location/current');
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.location) {
            setDriverLocation(data.location);
            setLastUpdate(new Date());
          }
        }
      } catch (error) {
        console.error('Error fetching location:', error);
      } finally {
        setLoading(false);
      }
    };

    // Initial fetch
    fetchDriverLocation();
    
    // Connect WebSocket for real-time updates
    connectWebSocket();
    
    // Fallback polling every 30 seconds
    locationInterval = setInterval(fetchDriverLocation, 30000);

    return () => {
      if (socket) {
        socket.close();
      }
      if (locationInterval) {
        clearInterval(locationInterval);
      }
    };
  }, []);

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'AVAILABLE':
        return 'bg-green-100 text-green-800';
      case 'BUSY':
        return 'bg-yellow-100 text-yellow-800';
      case 'OFFLINE':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getBatteryColor = (level: number) => {
    if (level > 60) return 'text-green-600';
    if (level > 30) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getSignalColor = (strength: number) => {
    if (strength > 70) return 'text-green-600';
    if (strength > 40) return 'text-yellow-600';
    return 'text-red-600';
  };

  if (loading) {
    return (
      <Card className="w-full">
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            <span className="ml-2 text-gray-600">Loading real-time location...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!driverLocation) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Driver Location
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">
            <MapPin className="h-12 w-12 mx-auto mb-2 text-gray-400" />
            <p className="text-gray-600">Location not available</p>
            <p className="text-sm text-gray-400">Waiting for GPS signal...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Truck className="h-5 w-5" />
            Live Driver Tracking
          </div>
          {driverStatus && (
            <Badge className={getStatusColor(driverStatus.status)}>
              {driverStatus.status}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Location Info */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Navigation className="h-4 w-4 text-blue-600" />
            <span className="text-sm font-medium">{driverLocation.address}</span>
          </div>
          <div className="text-xs text-gray-500">
            Coordinates: {driverLocation.lat.toFixed(6)}, {driverLocation.lng.toFixed(6)}
          </div>
        </div>

        {/* ETA and Distance */}
        {(driverLocation.eta || driverLocation.distance) && (
          <div className="flex gap-4 p-3 bg-blue-50 rounded-lg">
            {driverLocation.eta && (
              <div className="flex items-center gap-1">
                <Clock className="h-4 w-4 text-blue-600" />
                <span className="text-sm font-medium">ETA: {driverLocation.eta}</span>
              </div>
            )}
            {driverLocation.distance && (
              <div className="flex items-center gap-1">
                <MapPin className="h-4 w-4 text-blue-600" />
                <span className="text-sm font-medium">{driverLocation.distance}</span>
              </div>
            )}
          </div>
        )}

        {/* Driver Status */}
        {driverStatus && (
          <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1">
                <Battery className={`h-4 w-4 ${getBatteryColor(driverStatus.batteryLevel)}`} />
                <span className="text-sm">{driverStatus.batteryLevel}%</span>
              </div>
              <div className="flex items-center gap-1">
                <Signal className={`h-4 w-4 ${getSignalColor(driverStatus.signalStrength)}`} />
                <span className="text-sm">{driverStatus.signalStrength}%</span>
              </div>
            </div>
          </div>
        )}

        {/* Movement Info */}
        {(driverLocation.speed !== undefined || driverLocation.heading !== undefined) && (
          <div className="flex gap-4 text-sm text-gray-600">
            {driverLocation.speed !== undefined && (
              <span>Speed: {driverLocation.speed.toFixed(1)} km/h</span>
            )}
            {driverLocation.heading !== undefined && (
              <span>Heading: {driverLocation.heading}°</span>
            )}
          </div>
        )}

        {/* Last Update */}
        <div className="text-xs text-gray-500 text-center">
          Last update: {lastUpdate ? lastUpdate.toLocaleTimeString() : 'Never'}
          <div className="mt-1">
            {lastUpdate && (
              <span className="inline-flex items-center gap-1">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                Live tracking active
              </span>
            )}
          </div>
        </div>

        {/* Map Placeholder */}
        <div className="w-full h-48 bg-gray-200 rounded-md flex items-center justify-center">
          <div className="text-center">
            <MapPin className="h-8 w-8 mx-auto mb-2 text-blue-500" />
            <p className="text-sm text-gray-600">Live Map View</p>
            <p className="text-xs text-gray-400">
              Lat: {driverLocation.lat.toFixed(4)}, Lng: {driverLocation.lng.toFixed(4)}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
