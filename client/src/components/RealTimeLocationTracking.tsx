
import React, { useState, useEffect, useRef } from 'react';
import { MapPin, Navigation, Clock, AlertCircle, Truck } from 'lucide-react';
import { useAuth } from '../hooks/use-auth';
import api from '../lib/api';

interface LocationData {
  latitude: number;
  longitude: number;
  heading?: number;
  speed?: number;
  accuracy?: number;
  timestamp: string;
}

interface OrderTracking {
  orderId: string;
  status: string;
  currentLocation?: LocationData;
  estimatedArrival?: string;
  trackingHistory: Array<{
    status: string;
    location?: LocationData;
    timestamp: string;
    notes?: string;
  }>;
  deliveryAddress: any;
  pickupAddress: any;
}

interface Props {
  orderId?: string;
  driverId?: string;
  onLocationUpdate?: (location: LocationData) => void;
  showControls?: boolean;
  autoStart?: boolean;
}

export default function RealTimeLocationTracking({
  orderId,
  driverId,
  onLocationUpdate,
  showControls = true,
  autoStart = false
}: Props) {
  const { user } = useAuth();
  const [isTracking, setIsTracking] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<LocationData | null>(null);
  const [orderTracking, setOrderTracking] = useState<OrderTracking | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const watchIdRef = useRef<number | null>(null);
  const lastUpdateRef = useRef<number>(0);

  // WebSocket connection for real-time updates
  useEffect(() => {
    if (orderId) {
      // Subscribe to order tracking updates
      api.tracking.subscribeToOrderTracking(orderId, (data: any) => {
        setOrderTracking(prev => prev ? {
          ...prev,
          status: data.status,
          currentLocation: data.location,
          estimatedArrival: data.estimatedArrival
        } : null);
      });

      // Join order tracking room
      fetchOrderTracking();
    }

    if (driverId) {
      // Subscribe to driver location updates
      api.tracking.subscribeToDriverTracking(driverId, (data: any) => {
        setCurrentLocation(data.location);
        if (onLocationUpdate) {
          onLocationUpdate(data.location);
        }
      });
    }

    return () => {
      stopTracking();
    };
  }, [orderId, driverId]);

  // Auto-start tracking if enabled
  useEffect(() => {
    if (autoStart && user?.role === 'DRIVER') {
      startTracking();
    }
  }, [autoStart, user]);

  const fetchOrderTracking = async () => {
    if (!orderId) return;

    setIsLoading(true);
    try {
      const response = await api.tracking.getOrderTracking(orderId);
      if (response.success) {
        setOrderTracking(response.tracking);
        if (response.tracking.currentLocation) {
          setCurrentLocation(response.tracking.currentLocation);
        }
      }
    } catch (error) {
      console.error('Failed to fetch order tracking:', error);
      setError('Failed to load tracking information');
    } finally {
      setIsLoading(false);
    }
  };

  const startTracking = () => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by this browser');
      return;
    }

    setError(null);
    setIsTracking(true);

    const options = {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 5000
    };

    watchIdRef.current = navigator.geolocation.watchPosition(
      handleLocationUpdate,
      handleLocationError,
      options
    );
  };

  const stopTracking = () => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setIsTracking(false);
  };

  const handleLocationUpdate = async (position: GeolocationPosition) => {
    const now = Date.now();
    
    // Throttle updates to every 5 seconds
    if (now - lastUpdateRef.current < 5000) {
      return;
    }
    
    lastUpdateRef.current = now;

    const locationData: LocationData = {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
      heading: position.coords.heading || undefined,
      speed: position.coords.speed || undefined,
      accuracy: position.coords.accuracy,
      timestamp: new Date().toISOString()
    };

    setCurrentLocation(locationData);

    // Update server if user is a driver
    if (user?.role === 'DRIVER') {
      try {
        await api.driver.updateLocation(locationData);
      } catch (error) {
        console.error('Failed to update location on server:', error);
      }
    }

    // Call callback if provided
    if (onLocationUpdate) {
      onLocationUpdate(locationData);
    }
  };

  const handleLocationError = (error: GeolocationPositionError) => {
    let errorMessage = 'Unknown location error';
    
    switch (error.code) {
      case error.PERMISSION_DENIED:
        errorMessage = 'Location access denied. Please enable location permissions.';
        break;
      case error.POSITION_UNAVAILABLE:
        errorMessage = 'Location information unavailable.';
        break;
      case error.TIMEOUT:
        errorMessage = 'Location request timed out.';
        break;
    }
    
    setError(errorMessage);
    setIsTracking(false);
  };

  const updateTrackingStatus = async (status: string, notes?: string) => {
    if (!orderId) return;

    try {
      const updateData: any = {
        status,
        notes
      };

      if (currentLocation) {
        updateData.location = {
          latitude: currentLocation.latitude,
          longitude: currentLocation.longitude
        };
      }

      const response = await api.tracking.updateDeliveryStatus(orderId, status, updateData.location);
      
      if (response.success) {
        // Refresh tracking data
        fetchOrderTracking();
      }
    } catch (error) {
      console.error('Failed to update tracking status:', error);
      setError('Failed to update tracking status');
    }
  };

  const formatDistance = (meters: number): string => {
    if (meters < 1000) {
      return `${Math.round(meters)}m`;
    }
    return `${(meters / 1000).toFixed(1)}km`;
  };

  const formatSpeed = (speed: number): string => {
    return `${Math.round(speed * 3.6)} km/h`; // Convert m/s to km/h
  };

  const formatTime = (dateString: string): string => {
    return new Date(dateString).toLocaleTimeString();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2">Loading tracking information...</span>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold flex items-center">
          <MapPin className="h-5 w-5 mr-2 text-blue-600" />
          Real-Time Tracking
        </h3>
        
        {showControls && user?.role === 'DRIVER' && (
          <div className="flex space-x-2">
            {!isTracking ? (
              <button
                onClick={startTracking}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center"
              >
                <Navigation className="h-4 w-4 mr-2" />
                Start Tracking
              </button>
            ) : (
              <button
                onClick={stopTracking}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                Stop Tracking
              </button>
            )}
          </div>
        )}
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-lg flex items-center">
          <AlertCircle className="h-4 w-4 mr-2" />
          {error}
        </div>
      )}

      {/* Current Location Display */}
      {currentLocation && (
        <div className="mb-6 p-4 bg-blue-50 rounded-lg">
          <h4 className="font-medium text-blue-900 mb-2">Current Location</h4>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-600">Coordinates:</span>
              <div className="font-mono">
                {currentLocation.latitude.toFixed(6)}, {currentLocation.longitude.toFixed(6)}
              </div>
            </div>
            <div>
              <span className="text-gray-600">Last Update:</span>
              <div>{formatTime(currentLocation.timestamp)}</div>
            </div>
            {currentLocation.speed !== undefined && (
              <div>
                <span className="text-gray-600">Speed:</span>
                <div>{formatSpeed(currentLocation.speed)}</div>
              </div>
            )}
            {currentLocation.accuracy && (
              <div>
                <span className="text-gray-600">Accuracy:</span>
                <div>{formatDistance(currentLocation.accuracy)}</div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Order Tracking Information */}
      {orderTracking && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-medium">Order #{orderTracking.orderId}</h4>
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${
              orderTracking.status === 'DELIVERED' ? 'bg-green-100 text-green-800' :
              orderTracking.status === 'IN_TRANSIT' ? 'bg-blue-100 text-blue-800' :
              orderTracking.status === 'PICKED_UP' ? 'bg-yellow-100 text-yellow-800' :
              'bg-gray-100 text-gray-800'
            }`}>
              {orderTracking.status.replace('_', ' ')}
            </span>
          </div>

          {orderTracking.estimatedArrival && (
            <div className="flex items-center text-sm text-gray-600">
              <Clock className="h-4 w-4 mr-2" />
              Estimated arrival: {formatTime(orderTracking.estimatedArrival)}
            </div>
          )}

          {/* Driver Status Updates (for drivers) */}
          {user?.role === 'DRIVER' && orderId && (
            <div className="flex space-x-2 pt-4 border-t">
              <button
                onClick={() => updateTrackingStatus('PICKED_UP')}
                className="flex-1 px-3 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700 text-sm"
              >
                Mark Picked Up
              </button>
              <button
                onClick={() => updateTrackingStatus('DELIVERED')}
                className="flex-1 px-3 py-2 bg-green-600 text-white rounded hover:bg-green-700 text-sm"
              >
                Mark Delivered
              </button>
            </div>
          )}

          {/* Tracking History */}
          <div className="pt-4 border-t">
            <h5 className="font-medium mb-3">Tracking History</h5>
            <div className="space-y-3">
              {orderTracking.trackingHistory.map((event, index) => (
                <div key={index} className="flex items-start space-x-3">
                  <div className={`w-3 h-3 rounded-full mt-1 ${
                    event.status === 'DELIVERED' ? 'bg-green-500' :
                    event.status === 'IN_TRANSIT' ? 'bg-blue-500' :
                    event.status === 'PICKED_UP' ? 'bg-yellow-500' :
                    'bg-gray-400'
                  }`} />
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-sm">
                        {event.status.replace('_', ' ')}
                      </span>
                      <span className="text-xs text-gray-500">
                        {formatTime(event.timestamp)}
                      </span>
                    </div>
                    {event.notes && (
                      <p className="text-sm text-gray-600 mt-1">{event.notes}</p>
                    )}
                    {event.location && (
                      <p className="text-xs text-gray-500 mt-1">
                        {event.location.latitude.toFixed(4)}, {event.location.longitude.toFixed(4)}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Tracking Status Indicator */}
      <div className="mt-6 pt-4 border-t">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600">Tracking Status:</span>
          <span className={`flex items-center ${isTracking ? 'text-green-600' : 'text-gray-400'}`}>
            <div className={`w-2 h-2 rounded-full mr-2 ${isTracking ? 'bg-green-500' : 'bg-gray-400'}`} />
            {isTracking ? 'Active' : 'Inactive'}
          </span>
        </div>
      </div>
    </div>
  );
}
