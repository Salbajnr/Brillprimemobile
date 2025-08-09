import React, { useEffect, useRef, useState, useCallback } from 'react';
import { MapPin, Navigation, Truck, Home } from 'lucide-react';

interface MapMarker {
  lat: number;
  lng: number;
  title: string;
  type: 'user' | 'driver' | 'station' | 'delivery' | 'merchant';
}

interface RouteInfo {
  start: { lat: number; lng: number };
  end: { lat: number; lng: number };
}

interface LiveMapProps {
  showUserLocation?: boolean;
  showNearbyUsers?: boolean;
  className?: string;
  userRole: 'CONSUMER' | 'DRIVER' | 'MERCHANT' | 'ADMIN';
  center?: { lat: number; lng: number };
  markers?: MapMarker[];
  showRoute?: RouteInfo;
  onLocationUpdate?: (location: { lat: number; lng: number }) => void;
  orderId?: string;
}

const LiveMap: React.FC<LiveMapProps> = ({
  showUserLocation = true,
  showNearbyUsers = false,
  className = '',
  userRole,
  center,
  markers = [],
  showRoute,
  onLocationUpdate,
  orderId
}) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [driverLocation, setDriverLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);
  const routeRendererRef = useRef<google.maps.DirectionsRenderer | null>(null);
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [connected, setConnected] = useState(false);
  const [driverLocations, setDriverLocations] = useState<{ [orderId: string]: any }>({});
  const [etaUpdates, setEtaUpdates] = useState<{ [orderId: string]: any }>({});
  const [eta, setEta] = useState<string | null>(null);

  // WebSocket connection
  useEffect(() => {
    const ws = new WebSocket('ws://localhost:8080'); // Replace with your WebSocket server URL

    ws.onopen = () => {
      console.log('WebSocket connected');
      setConnected(true);
      setSocket(ws);
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        if (data.type === 'driver_location') {
          setDriverLocations((prevLocations) => ({
            ...prevLocations,
            [data.orderId]: data.payload,
          }));
        } else if (data.type === 'eta_update') {
          setEtaUpdates((prevEtas) => ({
            ...prevEtas,
            [data.orderId]: data.payload,
          }));
        } else {
          console.log('Received message:', data);
        }
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    };

    ws.onclose = () => {
      console.log('WebSocket disconnected');
      setConnected(false);
      setSocket(null);
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    return () => {
      console.log('Cleaning up WebSocket');
      ws.close();
    };
  }, []);

  const subscribeToDriverTracking = useCallback(
    (orderId: string) => {
      if (socket && connected) {
        socket.send(JSON.stringify({ type: 'subscribe_driver', orderId: orderId }));
        console.log(`Subscribed to driver tracking for order ${orderId}`);
      }
    },
    [socket, connected]
  );

  const joinLiveMap = useCallback(() => {
    if (socket && connected) {
      socket.send(JSON.stringify({ type: 'join_live_map' }));
      console.log('Joined live map');
    }
  }, [socket, connected]);

  useEffect(() => {
    if (connected && orderId) {
      subscribeToDriverTracking(orderId);
      joinLiveMap();
    }
  }, [connected, orderId, subscribeToDriverTracking, joinLiveMap]);

  // Process real-time location updates
  useEffect(() => {
    if (driverLocations[orderId || 'default']) {
      const locationData = driverLocations[orderId || 'default'];
      setDriverLocation({
        lat: locationData.location.latitude || locationData.location.lat,
        lng: locationData.location.longitude || locationData.location.lng
      });

      if (locationData.eta) {
        setEta(locationData.eta);
      }

      console.log('Updated driver location:', locationData);
    }
  }, [driverLocations, orderId]);

  // Process ETA updates
  useEffect(() => {
    if (etaUpdates[orderId || 'default']) {
      const etaData = etaUpdates[orderId || 'default'];
      setEta(etaData.eta);
      console.log('Updated ETA:', etaData);
    }
  }, [etaUpdates, orderId]);

  // Get user's current location
  useEffect(() => {
    if (showUserLocation && navigator.geolocation) {
      const watchId = navigator.geolocation.watchPosition(
        (position) => {
          const newLocation = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          };
          setUserLocation(newLocation);
          setLocationError(null);

          // Notify parent component of location updates
          if (onLocationUpdate) {
            onLocationUpdate(newLocation);
          }
        },
        (error) => {
          console.error('Geolocation error:', error);
          setLocationError('Unable to get your location');
          // Fallback to Abuja center
          const fallbackLocation = { lat: 9.0765, lng: 7.3986 };
          setUserLocation(fallbackLocation);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 30000 // Cache location for 30 seconds
        }
      );

      return () => navigator.geolocation.clearWatch(watchId);
    }
  }, [showUserLocation, onLocationUpdate]);

  // Initialize Google Maps
  useEffect(() => {
    const initializeMap = () => {
      if (!mapRef.current || mapLoaded) return;

      const mapCenter = center || userLocation || { lat: 9.0765, lng: 7.3986 };

      const map = new google.maps.Map(mapRef.current, {
        center: mapCenter,
        zoom: 14,
        mapTypeId: google.maps.MapTypeId.ROADMAP,
        zoomControl: true,
        streetViewControl: false,
        fullscreenControl: false,
        mapTypeControl: false,
        styles: [
          {
            featureType: 'poi',
            elementType: 'labels',
            stylers: [{ visibility: 'off' }]
          }
        ]
      });

      mapInstanceRef.current = map;
      setMapLoaded(true);
    };

    // Load Google Maps API if not already loaded
    if (!window.google) {
      console.error('Google Maps JavaScript API not loaded. Please ensure GOOGLE_MAPS_API_KEY is configured.');
      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${process.env.GOOGLE_MAPS_API_KEY || 'YOUR_API_KEY'}&libraries=geometry,places`;
      script.async = true;
      script.defer = true;
      script.onload = initializeMap;
      document.head.appendChild(script);
    } else {
      initializeMap();
    }
  }, [center, userLocation, mapLoaded]);

  // Update markers
  useEffect(() => {
    if (!mapInstanceRef.current || !mapLoaded) return;

    // Clear existing markers
    markersRef.current.forEach(marker => marker.setMap(null));
    markersRef.current = [];

    // Add user location marker
    if (showUserLocation && userLocation) {
      const userMarker = new google.maps.Marker({
        position: userLocation,
        map: mapInstanceRef.current,
        title: 'Your Location',
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 8,
          fillColor: '#4285F4',
          fillOpacity: 1,
          strokeColor: '#ffffff',
          strokeWeight: 2
        }
      });
      markersRef.current.push(userMarker);
    }

    // Add driver location marker
    if (driverLocation) {
      const driverMarker = new google.maps.Marker({
        position: driverLocation,
        map: mapInstanceRef.current,
        title: 'Driver Location',
        icon: {
          path: google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
          scale: 6,
          fillColor: '#FF6B35',
          fillOpacity: 1,
          strokeColor: '#ffffff',
          strokeWeight: 2
        }
      });
      markersRef.current.push(driverMarker);
    }

    // Add custom markers
    markers.forEach(marker => {
      let icon: google.maps.Icon | google.maps.Symbol;

      switch (marker.type) {
        case 'driver':
          icon = {
            path: google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
            scale: 6,
            fillColor: '#FF6B35',
            fillOpacity: 1,
            strokeColor: '#ffffff',
            strokeWeight: 2
          };
          break;
        case 'station':
          icon = {
            path: google.maps.SymbolPath.CIRCLE,
            scale: 10,
            fillColor: '#4CAF50',
            fillOpacity: 1,
            strokeColor: '#ffffff',
            strokeWeight: 2
          };
          break;
        case 'delivery':
          icon = {
            path: google.maps.SymbolPath.CIRCLE,
            scale: 8,
            fillColor: '#FF5722',
            fillOpacity: 1,
            strokeColor: '#ffffff',
            strokeWeight: 2
          };
          break;
        case 'merchant':
          icon = {
            path: google.maps.SymbolPath.CIRCLE,
            scale: 8,
            fillColor: '#9C27B0',
            fillOpacity: 1,
            strokeColor: '#ffffff',
            strokeWeight: 2
          };
          break;
        default:
          icon = {
            path: google.maps.SymbolPath.CIRCLE,
            scale: 6,
            fillColor: '#757575',
            fillOpacity: 1,
            strokeColor: '#ffffff',
            strokeWeight: 2
          };
      }

      const mapMarker = new google.maps.Marker({
        position: { lat: marker.lat, lng: marker.lng },
        map: mapInstanceRef.current,
        title: marker.title,
        icon: icon
      });

      // Add info window
      const infoWindow = new google.maps.InfoWindow({
        content: `<div class="p-2"><strong>${marker.title}</strong></div>`
      });

      mapMarker.addListener('click', () => {
        infoWindow.open(mapInstanceRef.current, mapMarker);
      });

      markersRef.current.push(mapMarker);
    });
  }, [mapLoaded, userLocation, showUserLocation, markers, driverLocation]);

  // Show route if provided
  useEffect(() => {
    if (!mapInstanceRef.current || !mapLoaded || !showRoute) return;

    // Clear existing route
    if (routeRendererRef.current) {
      routeRendererRef.current.setMap(null);
    }

    const directionsService = new google.maps.DirectionsService();
    const directionsRenderer = new google.maps.DirectionsRenderer({
      draggable: false,
      polylineOptions: {
        strokeColor: '#4285F4',
        strokeWeight: 4,
        strokeOpacity: 0.8
      }
    });

    directionsRenderer.setMap(mapInstanceRef.current);
    routeRendererRef.current = directionsRenderer;

    directionsService.route(
      {
        origin: showRoute.start,
        destination: showRoute.end,
        travelMode: google.maps.TravelMode.DRIVING,
        avoidTolls: false,
        avoidHighways: false
      },
      (result, status) => {
        if (status === 'OK' && result) {
          directionsRenderer.setDirections(result);
        } else {
          console.error('Directions request failed:', status);
        }
      }
    );
  }, [mapLoaded, showRoute]);

  const getMarkerIcon = (type: string) => {
    switch (type) {
      case 'driver': return <Truck className="w-4 h-4 text-orange-500" />;
      case 'station': return <MapPin className="w-4 h-4 text-green-500" />;
      case 'delivery': return <Home className="w-4 h-4 text-red-500" />;
      case 'merchant': return <MapPin className="w-4 h-4 text-purple-500" />;
      default: return <MapPin className="w-4 h-4 text-gray-500" />;
    }
  };

  return (
    <div className={`relative ${className}`}>
      {/* Map Container */}
      <div ref={mapRef} className="w-full h-full rounded-lg" />

      {/* Loading State */}
      {!mapLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 rounded-lg">
          <div className="text-center">
            <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
            <p className="text-sm text-gray-600">Loading map...</p>
          </div>
        </div>
      )}

      {/* Location Error */}
      {locationError && (
        <div className="absolute top-2 left-2 right-2 bg-yellow-100 border border-yellow-400 text-yellow-700 px-3 py-2 rounded text-sm">
          {locationError}
        </div>
      )}

      {/* Map Legend */}
      {markers.length > 0 && (
        <div className="absolute bottom-2 left-2 bg-white rounded-lg shadow-md p-3 max-w-xs">
          <h4 className="text-sm font-semibold mb-2">Map Legend</h4>
          <div className="space-y-1">
            {showUserLocation && userLocation && (
              <div className="flex items-center space-x-2 text-xs">
                <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                <span>Your Location</span>
              </div>
            )}
            {Array.from(new Set(markers.map(m => m.type))).map(type => (
              <div key={type} className="flex items-center space-x-2 text-xs">
                {getMarkerIcon(type)}
                <span className="capitalise">{type}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* GPS Status */}
      {showUserLocation && (
        <div className="absolute top-2 right-2 bg-white rounded-lg shadow-md p-2">
          <div className="flex items-center space-x-2">
            <Navigation className={`w-4 h-4 ${userLocation ? 'text-green-500' : 'text-gray-400'}`} />
            <span className="text-xs text-gray-600">
              {userLocation ? 'GPS Active' : 'GPS Searching...'}
            </span>
          </div>
        </div>
      )}
       {/* ETA Display */}
       {eta && (
        <div className="absolute bottom-2 right-2 bg-white rounded-lg shadow-md p-2">
          <span className="text-xs text-gray-600">
            ETA: {eta}
          </span>
        </div>
      )}
    </div>
  );
};

export default LiveMap;