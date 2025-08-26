import React, { useEffect, useRef, useState } from 'react';

// Google Maps type declarations
declare namespace google.maps {
  class Map {
    constructor(mapDiv: Element, opts?: MapOptions);
    setZoom(zoom: number): void;
    getZoom(): number;
    fitBounds(bounds: LatLngBounds): void;
  }
  class Marker {
    constructor(opts?: MarkerOptions);
    setMap(map: Map | null): void;
    addListener(eventName: string, handler: Function): void;
  }
  class InfoWindow {
    constructor(opts?: InfoWindowOptions);
    open(map: Map, anchor: Marker): void;
  }
  class LatLngBounds {
    constructor();
    extend(point: LatLng | LatLngLiteral): void;
  }
  interface LatLng {}
  interface LatLngLiteral {
    lat: number;
    lng: number;
  }
  interface MapOptions {
    zoom?: number;
    center?: LatLngLiteral;
    mapTypeId?: string;
    styles?: any[];
    mapTypeControl?: boolean;
    streetViewControl?: boolean;
    fullscreenControl?: boolean;
    zoomControl?: boolean;
    gestureHandling?: string;
  }
  interface MarkerOptions {
    position?: LatLngLiteral;
    map?: Map;
    title?: string;
    icon?: string;
    animation?: any;
  }
  interface InfoWindowOptions {
    content?: string;
  }
  enum MapTypeId {
    ROADMAP = 'roadmap'
  }
  namespace Animation {
    const DROP: any;
  }
  namespace event {
    function addListenerOnce(instance: any, eventName: string, handler: Function): void;
  }
}

interface LiveMapProps {
  showUserLocation?: boolean;
  showDriverLocation?: boolean;
  showMerchantLocation?: boolean;
  userCoordinates?: { lat: number; lng: number };
  driverCoordinates?: { lat: number; lng: number };
  merchantCoordinates?: { lat: number; lng: number };
  orderId?: string;
  className?: string;
  zoom?: number;
  height?: string;
}

interface MapMarker {
  position: { lat: number; lng: number };
  title: string;
  icon?: string;
  color?: string;
}

export const LiveMap: React.FC<LiveMapProps> = ({
  showUserLocation = true,
  showDriverLocation = false,
  showMerchantLocation = false,
  userCoordinates,
  driverCoordinates,
  merchantCoordinates,
  className = "w-full h-64",
  zoom = 13,
  height = "300px"
}) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);
  const [isGoogleMapsLoaded, setIsGoogleMapsLoaded] = useState(false);
  const [currentUserLocation, setCurrentUserLocation] = useState<{ lat: number; lng: number } | null>(null);

  // Load Google Maps script
  useEffect(() => {
    const loadGoogleMaps = () => {
      if (window.google && window.google.maps) {
        setIsGoogleMapsLoaded(true);
        return;
      }

      const script = document.createElement('script');
      // Get API key from environment
      const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
      if (!apiKey) {
        console.error('Google Maps API key not configured. Set VITE_GOOGLE_MAPS_API_KEY environment variable.');
        return;
      }
      
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
      script.async = true;
      script.defer = true;
      
      script.onload = () => {
        setIsGoogleMapsLoaded(true);
      };

      script.onerror = () => {
        console.error('Failed to load Google Maps script');
      };

      document.head.appendChild(script);
    };

    loadGoogleMaps();
  }, []);

  // Get user's current location
  useEffect(() => {
    if (showUserLocation && !userCoordinates) {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            setCurrentUserLocation({
              lat: position.coords.latitude,
              lng: position.coords.longitude
            });
          },
          (error) => {
            console.warn('Error getting current location:', error);
            // Default to Lagos, Nigeria if geolocation fails
            setCurrentUserLocation({
              lat: 6.5244,
              lng: 3.3792
            });
          },
          { enableHighAccuracy: true, timeout: 10000, maximumAge: 300000 }
        );
      } else {
        // Default to Lagos, Nigeria if geolocation not supported
        setCurrentUserLocation({
          lat: 6.5244,
          lng: 3.3792
        });
      }
    }
  }, [showUserLocation, userCoordinates]);

  // Initialize map
  useEffect(() => {
    if (!isGoogleMapsLoaded || !mapRef.current) return;

    const centerLocation = userCoordinates || driverCoordinates || merchantCoordinates || currentUserLocation || {
      lat: 6.5244,
      lng: 3.3792 // Default to Lagos, Nigeria
    };

    const map = new google.maps.Map(mapRef.current, {
      zoom: zoom,
      center: centerLocation,
      mapTypeId: google.maps.MapTypeId.ROADMAP,
      styles: [
        {
          featureType: "poi",
          elementType: "labels",
          stylers: [{ visibility: "off" }]
        }
      ],
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: false,
      zoomControl: true,
      gestureHandling: 'cooperative'
    });

    mapInstanceRef.current = map;

    // Clear existing markers
    markersRef.current.forEach(marker => marker.setMap(null));
    markersRef.current = [];

    // Add markers
    const markers: MapMarker[] = [];

    if (showUserLocation) {
      const userPos = userCoordinates || currentUserLocation;
      if (userPos) {
        markers.push({
          position: userPos,
          title: 'Your Location',
          icon: 'https://maps.google.com/mapfiles/ms/icons/blue-dot.png',
          color: '#4682B4'
        });
      }
    }

    if (showDriverLocation && driverCoordinates) {
      markers.push({
        position: driverCoordinates,
        title: 'Driver Location',
        icon: 'https://maps.google.com/mapfiles/ms/icons/green-dot.png',
        color: '#10B981'
      });
    }

    if (showMerchantLocation && merchantCoordinates) {
      markers.push({
        position: merchantCoordinates,
        title: 'Merchant Location',
        icon: 'https://maps.google.com/mapfiles/ms/icons/red-dot.png',
        color: '#EF4444'
      });
    }

    // Create Google Maps markers
    markers.forEach(markerData => {
      const marker = new google.maps.Marker({
        position: markerData.position,
        map: map,
        title: markerData.title,
        icon: markerData.icon,
        animation: google.maps.Animation.DROP
      });

      const infoWindow = new google.maps.InfoWindow({
        content: `<div style="color: ${markerData.color}; font-weight: bold;">${markerData.title}</div>`
      });

      marker.addListener('click', () => {
        infoWindow.open(map, marker);
      });

      markersRef.current.push(marker);
    });

    // Auto-fit bounds if multiple markers
    if (markers.length > 1) {
      const bounds = new google.maps.LatLngBounds();
      markers.forEach(marker => bounds.extend(marker.position));
      map.fitBounds(bounds);
      
      // Set maximum zoom level
      google.maps.event.addListenerOnce(map, 'bounds_changed', () => {
        if (map.getZoom()! > 15) {
          map.setZoom(15);
        }
      });
    }

  }, [isGoogleMapsLoaded, userCoordinates, driverCoordinates, merchantCoordinates, currentUserLocation, showUserLocation, showDriverLocation, showMerchantLocation, zoom]);

  // Fallback when Google Maps is not available
  if (!isGoogleMapsLoaded) {
    return (
      <div className={`${className} bg-gray-100 rounded-lg flex items-center justify-center`} style={{ height }}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#4682B4] mx-auto mb-2"></div>
          <p className="text-gray-600 text-sm">Loading map...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={className} style={{ height }}>
      <div ref={mapRef} className="w-full h-full rounded-lg" />
    </div>
  );
};

export default LiveMap;