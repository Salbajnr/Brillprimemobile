import React, { useEffect, useRef, useState } from 'react';
import { useAuth } from '@/hooks/use-auth';

interface LiveMapProps {
  showUserLocation?: boolean;
  showNearbyUsers?: boolean;
  onLocationUpdate?: (lat: number, lng: number) => void;
  className?: string;
  userRole?: 'CONSUMER' | 'MERCHANT' | 'DRIVER';
}

interface UserLocation {
  id: number;
  fullName: string;
  role: string;
  latitude: number;
  longitude: number;
  isActive: boolean;
}

declare global {
  interface Window {
    L: any;
  }
}

export default function LiveMap({ 
  showUserLocation = true, 
  showNearbyUsers = false, 
  onLocationUpdate, 
  className = "",
  userRole 
}: LiveMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const userMarkerRef = useRef<any>(null);
  const nearbyMarkersRef = useRef<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [userLocation, setUserLocation] = useState<{lat: number, lng: number} | null>(null);
  const [nearbyUsers, setNearbyUsers] = useState<UserLocation[]>([]);
  const { user } = useAuth();

  // Get user's current location
  const getCurrentLocation = (): Promise<{lat: number, lng: number}> => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation is not supported'));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          resolve({ lat, lng });
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

  // Update user location in database
  const updateLocationInDatabase = async (lat: number, lng: number) => {
    if (!user) return;
    
    try {
      await fetch('/api/user/location', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user.id,
          latitude: lat,
          longitude: lng,
          isActive: true
        }),
      });
    } catch (error) {
      console.error('Failed to update location:', error);
    }
  };

  // Fetch nearby users based on role visibility
  const fetchNearbyUsers = async (lat: number, lng: number) => {
    if (!showNearbyUsers || !user) return;

    try {
      // Only show vendor/driver locations to consumers and other drivers/vendors
      const response = await fetch(`/api/user/nearby?lat=${lat}&lng=${lng}&role=${user.role}&radius=5000`);
      const data = await response.json();
      
      if (data.success) {
        setNearbyUsers(data.users || []);
      }
    } catch (error) {
      console.error('Failed to fetch nearby users:', error);
    }
  };

  // Initialize map
  const initializeMap = async () => {
    if (!mapRef.current || mapInstanceRef.current) return;

    try {
      // Load Leaflet CSS and JS
      const leafletCSS = document.createElement('link');
      leafletCSS.rel = 'stylesheet';
      leafletCSS.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(leafletCSS);

      if (!window.L) {
        const leafletJS = document.createElement('script');
        leafletJS.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
        await new Promise((resolve) => {
          leafletJS.onload = resolve;
          document.head.appendChild(leafletJS);
        });
      }

      // Get user location
      const location = await getCurrentLocation();
      setUserLocation(location);

      // Initialize map centered on user location
      mapInstanceRef.current = window.L.map(mapRef.current).setView([location.lat, location.lng], 15);

      // Add tile layer
      window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
      }).addTo(mapInstanceRef.current);

      if (showUserLocation) {
        // Add user location marker
        const userIcon = window.L.divIcon({
          className: 'custom-user-marker',
          html: `<div class="w-4 h-4 bg-blue-500 rounded-full border-2 border-white shadow-lg pulse"></div>`,
          iconSize: [16, 16],
          iconAnchor: [8, 8]
        });

        userMarkerRef.current = window.L.marker([location.lat, location.lng], { icon: userIcon })
          .addTo(mapInstanceRef.current)
          .bindPopup(`<strong>You are here</strong><br/>Your current location`);
      }

      // Update location in database
      await updateLocationInDatabase(location.lat, location.lng);
      
      // Fetch nearby users if needed
      if (showNearbyUsers) {
        await fetchNearbyUsers(location.lat, location.lng);
      }

      // Notify parent component
      if (onLocationUpdate) {
        onLocationUpdate(location.lat, location.lng);
      }

      setIsLoading(false);

    } catch (error) {
      console.error('Failed to initialize map:', error);
      setIsLoading(false);
    }
  };

  // Update nearby user markers
  const updateNearbyMarkers = () => {
    if (!mapInstanceRef.current) return;

    // Clear existing markers
    nearbyMarkersRef.current.forEach(marker => {
      mapInstanceRef.current.removeLayer(marker);
    });
    nearbyMarkersRef.current = [];

    // Add markers for nearby users
    nearbyUsers.forEach(nearbyUser => {
      let markerColor = '#10b981'; // green for merchants
      let markerLabel = '🏪';
      
      if (nearbyUser.role === 'DRIVER') {
        markerColor = '#f59e0b'; // amber for drivers
        markerLabel = '🚗';
      } else if (nearbyUser.role === 'CONSUMER') {
        markerColor = '#3b82f6'; // blue for consumers
        markerLabel = '👤';
      }

      const nearbyIcon = window.L.divIcon({
        className: 'custom-nearby-marker',
        html: `<div class="w-6 h-6 rounded-full border-2 border-white shadow-lg flex items-center justify-center text-xs" style="background-color: ${markerColor}">${markerLabel}</div>`,
        iconSize: [24, 24],
        iconAnchor: [12, 12]
      });

      const marker = window.L.marker([nearbyUser.latitude, nearbyUser.longitude], { icon: nearbyIcon })
        .addTo(mapInstanceRef.current)
        .bindPopup(`<strong>${nearbyUser.fullName}</strong><br/>${nearbyUser.role.toLowerCase()}`);

      nearbyMarkersRef.current.push(marker);
    });
  };

  // Watch user location changes
  useEffect(() => {
    let watchId: number;

    if (showUserLocation && userLocation) {
      watchId = navigator.geolocation.watchPosition(
        async (position) => {
          const newLat = position.coords.latitude;
          const newLng = position.coords.longitude;
          
          // Update user marker
          if (userMarkerRef.current) {
            userMarkerRef.current.setLatLng([newLat, newLng]);
          }

          // Update location in database
          await updateLocationInDatabase(newLat, newLng);

          // Refresh nearby users
          if (showNearbyUsers) {
            await fetchNearbyUsers(newLat, newLng);
          }

          if (onLocationUpdate) {
            onLocationUpdate(newLat, newLng);
          }
        },
        (error) => console.error('Location watch error:', error),
        {
          enableHighAccuracy: true,
          timeout: 30000,
          maximumAge: 60000
        }
      );
    }

    return () => {
      if (watchId) {
        navigator.geolocation.clearWatch(watchId);
      }
    };
  }, [showUserLocation, userLocation, showNearbyUsers, onLocationUpdate]);

  // Update markers when nearby users change
  useEffect(() => {
    updateNearbyMarkers();
  }, [nearbyUsers]);

  // Initialize map on mount
  useEffect(() => {
    initializeMap();

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  return (
    <div className={`relative ${className}`}>
      <div ref={mapRef} className="w-full h-full rounded-lg" />
      
      {isLoading && (
        <div className="absolute inset-0 bg-blue-50 rounded-lg flex items-center justify-center">
          <div className="text-center">
            <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
            <p className="text-sm text-gray-600">Loading map...</p>
          </div>
        </div>
      )}

      <style jsx>{`
        .pulse {
          animation: pulse 2s infinite;
        }
        
        @keyframes pulse {
          0% {
            transform: scale(1);
            opacity: 1;
          }
          50% {
            transform: scale(1.2);
            opacity: 0.7;
          }
          100% {
            transform: scale(1);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
}