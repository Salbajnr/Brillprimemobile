import React, { useState, useEffect, useRef } from 'react';
import { MapPin, Navigation, Clock, AlertCircle, Target, Truck, CheckCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useRealTimeUpdates } from '../hooks/useRealTimeUpdates';

interface LocationPoint {
  latitude: number;
  longitude: number;
  timestamp: Date;
  accuracy?: number;
  heading?: number;
  speed?: number;
}

interface DeliveryLocation {
  driverId: number;
  driverName: string;
  orderId: string;
  currentLocation: LocationPoint;
  destination: LocationPoint;
  estimatedArrival?: string;
  status: string;
  route?: LocationPoint[];
  distance?: number;
}

interface RealTimeLocationTrackingProps {
  orderId?: string;
  driverId?: number;
  isDriver?: boolean;
  showMap?: boolean;
  autoUpdateLocation?: boolean;
}

export const RealTimeLocationTracking: React.FC<RealTimeLocationTrackingProps> = ({
  orderId,
  driverId,
  isDriver = false,
  showMap = true,
  autoUpdateLocation = false
}) => {
  const [currentLocation, setCurrentLocation] = useState<LocationPoint | null>(null);
  const [deliveryLocations, setDeliveryLocations] = useState<DeliveryLocation[]>([]);
  const [locationPermission, setLocationPermission] = useState<'granted' | 'denied' | 'prompt'>('prompt');
  const [isTracking, setIsTracking] = useState(false);
  const [trackingError, setTrackingError] = useState<string | null>(null);
  const watchIdRef = useRef<number | null>(null);

  const {
    connected,
    deliveryUpdates,
    updateLocation,
    joinChatRoom
  } = useRealTimeUpdates();

  // Filter delivery updates for this order/driver
  const relevantDeliveries = deliveryUpdates.filter(delivery => 
    (orderId && delivery.orderId === orderId) || 
    (driverId && delivery.driverId === driverId)
  );

  // Request location permission
  const requestLocationPermission = async () => {
    try {
      const permission = await navigator.permissions.query({ name: 'geolocation' });
      setLocationPermission(permission.state);
      
      permission.addEventListener('change', () => {
        setLocationPermission(permission.state);
      });
    } catch (error) {
      console.error('Permission API not supported:', error);
    }
  };

  // Get current location
  const getCurrentLocation = (): Promise<LocationPoint> => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation is not supported'));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const location: LocationPoint = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            timestamp: new Date(),
            accuracy: position.coords.accuracy,
            heading: position.coords.heading || undefined,
            speed: position.coords.speed || undefined
          };
          resolve(location);
        },
        (error) => {
          reject(error);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 60000
        }
      );
    });
  };

  // Start location tracking
  const startTracking = async () => {
    if (!navigator.geolocation) {
      setTrackingError('Geolocation is not supported by this browser');
      return;
    }

    try {
      setTrackingError(null);
      const location = await getCurrentLocation();
      setCurrentLocation(location);

      if (isDriver && connected) {
        // Share driver location with customers
        updateLocation({
          latitude: location.latitude,
          longitude: location.longitude,
          trackingType: 'DELIVERY',
          sharingLevel: 'CUSTOMERS_ONLY'
        });
      }

      if (autoUpdateLocation) {
        watchIdRef.current = navigator.geolocation.watchPosition(
          (position) => {
            const newLocation: LocationPoint = {
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
              timestamp: new Date(),
              accuracy: position.coords.accuracy,
              heading: position.coords.heading || undefined,
              speed: position.coords.speed || undefined
            };

            setCurrentLocation(newLocation);

            if (isDriver && connected) {
              updateLocation({
                latitude: newLocation.latitude,
                longitude: newLocation.longitude,
                trackingType: 'DELIVERY',
                sharingLevel: 'CUSTOMERS_ONLY'
              });
            }
          },
          (error) => {
            console.error('Location tracking error:', error);
            setTrackingError(error.message);
          },
          {
            enableHighAccuracy: true,
            timeout: 5000,
            maximumAge: 30000
          }
        );
      }

      setIsTracking(true);
    } catch (error: any) {
      setTrackingError(error.message);
    }
  };

  // Stop location tracking
  const stopTracking = () => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setIsTracking(false);
  };

  // Calculate distance between two points
  const calculateDistance = (point1: LocationPoint, point2: LocationPoint): number => {
    const R = 6371; // Earth's radius in kilometers
    const dLat = (point2.latitude - point1.latitude) * Math.PI / 180;
    const dLon = (point2.longitude - point1.longitude) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(point1.latitude * Math.PI / 180) * Math.cos(point2.latitude * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  // Calculate estimated arrival time
  const calculateETA = (distance: number, averageSpeed: number = 30): string => {
    const timeInHours = distance / averageSpeed;
    const timeInMinutes = Math.round(timeInHours * 60);
    
    if (timeInMinutes < 60) {
      return `${timeInMinutes} min`;
    } else {
      const hours = Math.floor(timeInMinutes / 60);
      const minutes = timeInMinutes % 60;
      return `${hours}h ${minutes}m`;
    }
  };

  // Initialize
  useEffect(() => {
    requestLocationPermission();
  }, []);

  // Auto-start tracking for drivers
  useEffect(() => {
    if (isDriver && locationPermission === 'granted') {
      startTracking();
    }

    return () => {
      stopTracking();
    };
  }, [isDriver, locationPermission]);

  // Get status icon
  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'assigned':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'picked_up':
        return <Truck className="h-4 w-4 text-blue-500" />;
      case 'in_transit':
        return <Navigation className="h-4 w-4 text-purple-500" />;
      case 'arrived':
        return <MapPin className="h-4 w-4 text-green-500" />;
      case 'delivered':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      default:
        return <MapPin className="h-4 w-4 text-gray-500" />;
    }
  };

  return (
    <div className="space-y-4">
      {/* Connection Status */}
      <div className="flex items-center gap-2 text-sm">
        <div className={`h-2 w-2 rounded-full ${connected ? 'bg-green-500' : 'bg-red-500'}`} />
        <span className="text-gray-600">
          {connected ? 'Real-time tracking active' : 'Connecting...'}
        </span>
        {isTracking && (
          <>
            <div className="h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
            <span className="text-blue-600">Location tracking</span>
          </>
        )}
      </div>

      {/* Location Permission Alert */}
      {locationPermission === 'denied' && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Location permission is required for real-time tracking. Please enable location access in your browser settings.
          </AlertDescription>
        </Alert>
      )}

      {/* Tracking Error */}
      {trackingError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{trackingError}</AlertDescription>
        </Alert>
      )}

      {/* Current Location Card (for drivers) */}
      {isDriver && currentLocation && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5 text-blue-500" />
              Your Current Location
            </CardTitle>
          </CardHeader>
          
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="font-medium">Latitude</p>
                <p className="text-gray-600">{currentLocation.latitude.toFixed(6)}</p>
              </div>
              <div>
                <p className="font-medium">Longitude</p>
                <p className="text-gray-600">{currentLocation.longitude.toFixed(6)}</p>
              </div>
            </div>

            {currentLocation.accuracy && (
              <div className="text-sm">
                <p className="font-medium">Accuracy</p>
                <p className="text-gray-600">±{Math.round(currentLocation.accuracy)}m</p>
              </div>
            )}

            {currentLocation.speed && (
              <div className="text-sm">
                <p className="font-medium">Speed</p>
                <p className="text-gray-600">{Math.round(currentLocation.speed * 3.6)} km/h</p>
              </div>
            )}

            <div className="flex gap-2">
              {!isTracking ? (
                <Button onClick={startTracking} size="sm">
                  <Navigation className="h-4 w-4 mr-2" />
                  Start Tracking
                </Button>
              ) : (
                <Button onClick={stopTracking} variant="outline" size="sm">
                  Stop Tracking
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Active Deliveries */}
      {relevantDeliveries.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Truck className="h-5 w-5 text-blue-500" />
              {isDriver ? 'Your Deliveries' : 'Delivery Tracking'}
            </CardTitle>
          </CardHeader>
          
          <CardContent>
            <div className="space-y-4">
              {relevantDeliveries.map((delivery) => (
                <div key={delivery.deliveryId} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(delivery.status)}
                      <span className="font-medium">
                        {isDriver ? `Order #${delivery.orderId || 'N/A'}` : 'Your Delivery'}
                      </span>
                    </div>
                    <Badge variant="outline">
                      {delivery.status}
                    </Badge>
                  </div>

                  {delivery.location && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <MapPin className="h-4 w-4" />
                        <span>
                          Current: {delivery.location.latitude?.toFixed(4)}, {delivery.location.longitude?.toFixed(4)}
                        </span>
                      </div>

                      {currentLocation && delivery.location && (
                        <div className="text-sm text-gray-600">
                          <span>
                            Distance: {calculateDistance(currentLocation, {
                              latitude: delivery.location.latitude,
                              longitude: delivery.location.longitude,
                              timestamp: new Date()
                            }).toFixed(2)} km
                          </span>
                        </div>
                      )}

                      {delivery.estimatedTime && (
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Clock className="h-4 w-4" />
                          <span>ETA: {delivery.estimatedTime}</span>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="text-xs text-gray-500 mt-2">
                    Last updated: {new Date(delivery.timestamp).toLocaleTimeString()}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Location Sharing Controls (for customers) */}
      {!isDriver && locationPermission === 'granted' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-green-500" />
              Share Your Location
            </CardTitle>
          </CardHeader>
          
          <CardContent>
            <p className="text-sm text-gray-600 mb-3">
              Share your location to help drivers find you more easily.
            </p>
            
            <Button 
              onClick={() => getCurrentLocation().then(location => {
                setCurrentLocation(location);
                if (connected) {
                  updateLocation({
                    latitude: location.latitude,
                    longitude: location.longitude,
                    trackingType: 'DELIVERY',
                    sharingLevel: 'PRIVATE'
                  });
                }
              })}
              size="sm"
            >
              <Target className="h-4 w-4 mr-2" />
              Share Current Location
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Map Placeholder */}
      {showMap && (currentLocation || relevantDeliveries.length > 0) && (
        <Card>
          <CardHeader>
            <CardTitle>Live Map</CardTitle>
          </CardHeader>
          
          <CardContent>
            <div className="h-64 bg-gray-100 rounded-lg flex items-center justify-center">
              <div className="text-center text-gray-500">
                <MapPin className="h-12 w-12 mx-auto mb-2" />
                <p className="text-sm">Interactive map would be displayed here</p>
                <p className="text-xs">Showing real-time locations and routes</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default RealTimeLocationTracking;