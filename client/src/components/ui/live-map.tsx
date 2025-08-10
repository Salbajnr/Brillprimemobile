
import { useState, useEffect, useRef } from 'react';
import { MapPin, Navigation, Truck } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

interface Location {
  latitude: number;
  longitude: number;
  timestamp?: number;
}

interface LiveMapProps {
  driverLocation?: Location;
  customerLocation?: Location;
  merchantLocation?: Location;
  orderId?: string;
  className?: string;
}

export default function LiveMap({
  driverLocation,
  customerLocation,
  merchantLocation,
  orderId,
  className = ''
}: LiveMapProps) {
  const [mapCenter, setMapCenter] = useState<Location>({
    latitude: 6.5244,
    longitude: 3.3792 // Lagos coordinates as default
  });

  const [zoom, setZoom] = useState(13);

  useEffect(() => {
    // Center map on driver location if available
    if (driverLocation) {
      setMapCenter(driverLocation);
    } else if (customerLocation) {
      setMapCenter(customerLocation);
    }
  }, [driverLocation, customerLocation]);

  const calculateDistance = (loc1: Location, loc2: Location): number => {
    const R = 6371; // Earth's radius in kilometers
    const dLat = (loc2.latitude - loc1.latitude) * Math.PI / 180;
    const dLon = (loc2.longitude - loc1.longitude) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(loc1.latitude * Math.PI / 180) * Math.cos(loc2.latitude * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  const getEstimatedTime = (distance: number): string => {
    const avgSpeed = 30; // km/h in city traffic
    const timeHours = distance / avgSpeed;
    const timeMinutes = Math.round(timeHours * 60);
    return `${timeMinutes} min`;
  };

  return (
    <Card className={`w-full ${className}`}>
      <CardContent className="p-0">
        <div className="relative w-full h-64 bg-gray-100 rounded-lg overflow-hidden">
          {/* Map placeholder with coordinates grid */}
          <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-blue-50 to-green-50">
            <div className="text-center text-gray-500">
              <MapPin className="h-8 w-8 mx-auto mb-2" />
              <p className="text-sm font-medium">Live Map View</p>
              <p className="text-xs">Integrate with Google Maps API</p>
            </div>
          </div>

          {/* Coordinate grid overlay */}
          <div className="absolute inset-0 opacity-10">
            <div className="grid grid-cols-8 grid-rows-6 h-full">
              {Array.from({ length: 48 }).map((_, i) => (
                <div key={i} className="border border-gray-300" />
              ))}
            </div>
          </div>

          {/* Location markers */}
          {driverLocation && (
            <div 
              className="absolute transform -translate-x-1/2 -translate-y-1/2 z-10"
              style={{
                left: '60%', // Simulated position
                top: '40%'
              }}
            >
              <div className="bg-blue-500 text-white p-2 rounded-full shadow-lg animate-pulse">
                <Truck className="h-4 w-4" />
              </div>
              <div className="mt-1 text-xs text-center bg-white px-2 py-1 rounded shadow">
                Driver
              </div>
            </div>
          )}

          {customerLocation && (
            <div 
              className="absolute transform -translate-x-1/2 -translate-y-1/2 z-10"
              style={{
                left: '75%', // Simulated position
                top: '60%'
              }}
            >
              <div className="bg-green-500 text-white p-2 rounded-full shadow-lg">
                <MapPin className="h-4 w-4" />
              </div>
              <div className="mt-1 text-xs text-center bg-white px-2 py-1 rounded shadow">
                Destination
              </div>
            </div>
          )}

          {merchantLocation && (
            <div 
              className="absolute transform -translate-x-1/2 -translate-y-1/2 z-10"
              style={{
                left: '40%', // Simulated position
                top: '30%'
              }}
            >
              <div className="bg-orange-500 text-white p-2 rounded-full shadow-lg">
                <MapPin className="h-4 w-4" />
              </div>
              <div className="mt-1 text-xs text-center bg-white px-2 py-1 rounded shadow">
                Merchant
              </div>
            </div>
          )}

          {/* Route line (simulated) */}
          {driverLocation && customerLocation && (
            <svg className="absolute inset-0 w-full h-full z-5">
              <path
                d="M 60% 40% Q 68% 45% 75% 60%"
                stroke="#3B82F6"
                strokeWidth="3"
                fill="none"
                strokeDasharray="10,5"
                className="animate-pulse"
              />
            </svg>
          )}
        </div>

        {/* Map info bar */}
        <div className="p-3 bg-white border-t">
          <div className="flex justify-between items-center text-sm">
            <div className="flex items-center gap-2">
              <Navigation className="h-4 w-4 text-blue-500" />
              <span className="font-medium">
                {mapCenter.latitude.toFixed(4)}, {mapCenter.longitude.toFixed(4)}
              </span>
            </div>
            {driverLocation && customerLocation && (
              <div className="text-right">
                <div className="font-medium text-green-600">
                  {getEstimatedTime(calculateDistance(driverLocation, customerLocation))} away
                </div>
                <div className="text-xs text-gray-500">
                  {calculateDistance(driverLocation, customerLocation).toFixed(1)} km
                </div>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
import { useEffect, useRef, useState } from 'react';
import { Card, CardContent } from './card';
import { Button } from './button';
import { Badge } from './badge';
import { MapPin, Navigation, Truck, Clock } from 'lucide-react';

declare global {
  interface Window {
    google: any;
    initMap: () => void;
  }
}

interface LiveMapProps {
  driverLocation?: {
    latitude: number;
    longitude: number;
    heading?: number;
  };
  destination?: {
    latitude: number;
    longitude: number;
    address?: string;
  };
  orderStatus?: string;
  eta?: string;
  className?: string;
  showControls?: boolean;
}

export default function LiveMap({ 
  driverLocation, 
  destination, 
  orderStatus = 'in_transit',
  eta = '15 minutes',
  className = '',
  showControls = true 
}: LiveMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const driverMarkerRef = useRef<any>(null);
  const destinationMarkerRef = useRef<any>(null);
  const [isMapLoaded, setIsMapLoaded] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);

  // Default location (Lagos, Nigeria)
  const defaultLocation = {
    latitude: 6.5244,
    longitude: 3.3792
  };

  const currentDriverLocation = driverLocation || defaultLocation;
  const currentDestination = destination || {
    latitude: 6.4474,
    longitude: 3.3903,
    address: "Victoria Island, Lagos"
  };

  useEffect(() => {
    const loadGoogleMaps = () => {
      // For demo purposes, we'll create a mock map interface
      // In production, you would load the actual Google Maps API
      if (!window.google) {
        // Mock Google Maps for development
        window.google = {
          maps: {
            Map: class MockMap {
              constructor(element: HTMLElement, options: any) {
                element.innerHTML = `
                  <div style="
                    width: 100%;
                    height: 100%;
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    color: white;
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                    position: relative;
                    overflow: hidden;
                  ">
                    <div style="
                      position: absolute;
                      top: 0;
                      left: 0;
                      right: 0;
                      bottom: 0;
                      background-image: 
                        radial-gradient(circle at 20% 50%, rgba(120, 119, 198, 0.3) 0%, transparent 50%),
                        radial-gradient(circle at 80% 20%, rgba(255, 255, 255, 0.1) 0%, transparent 50%),
                        radial-gradient(circle at 40% 80%, rgba(120, 119, 198, 0.2) 0%, transparent 50%);
                    "></div>
                    <div style="
                      z-index: 2;
                      text-align: center;
                      max-width: 300px;
                      padding: 20px;
                    ">
                      <div style="
                        width: 60px;
                        height: 60px;
                        background: rgba(255, 255, 255, 0.2);
                        border-radius: 50%;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        margin: 0 auto 16px;
                        backdrop-filter: blur(10px);
                        border: 1px solid rgba(255, 255, 255, 0.3);
                      ">
                        🗺️
                      </div>
                      <h3 style="
                        margin: 0 0 8px 0;
                        font-size: 18px;
                        font-weight: 600;
                      ">Live Map View</h3>
                      <p style="
                        margin: 0 0 16px 0;
                        font-size: 14px;
                        opacity: 0.9;
                        line-height: 1.4;
                      ">Real-time tracking with Google Maps integration ready for production deployment</p>
                      <div style="
                        display: flex;
                        gap: 12px;
                        justify-content: center;
                        flex-wrap: wrap;
                      ">
                        <div style="
                          background: rgba(255, 255, 255, 0.2);
                          padding: 8px 12px;
                          border-radius: 20px;
                          font-size: 12px;
                          backdrop-filter: blur(10px);
                          border: 1px solid rgba(255, 255, 255, 0.3);
                        ">📍 Driver Location</div>
                        <div style="
                          background: rgba(255, 255, 255, 0.2);
                          padding: 8px 12px;
                          border-radius: 20px;
                          font-size: 12px;
                          backdrop-filter: blur(10px);
                          border: 1px solid rgba(255, 255, 255, 0.3);
                        ">🎯 Destination</div>
                      </div>
                    </div>
                  </div>
                `;
              }
            },
            Marker: class MockMarker {
              constructor(options: any) {}
              setPosition() {}
              setMap() {}
            },
            InfoWindow: class MockInfoWindow {
              constructor(options: any) {}
              open() {}
              close() {}
            }
          }
        };
      }

      if (mapRef.current) {
        try {
          mapInstanceRef.current = new window.google.maps.Map(mapRef.current, {
            zoom: 13,
            center: { lat: currentDriverLocation.latitude, lng: currentDriverLocation.longitude },
            styles: [
              {
                featureType: "all",
                elementType: "geometry.fill",
                stylers: [{ color: "#f5f5f5" }]
              },
              {
                featureType: "road",
                elementType: "geometry",
                stylers: [{ color: "#ffffff" }]
              }
            ]
          });

          setIsMapLoaded(true);
          setMapError(null);
        } catch (error) {
          console.error('Map initialization error:', error);
          setMapError('Failed to load map');
        }
      }
    };

    loadGoogleMaps();
  }, [currentDriverLocation.latitude, currentDriverLocation.longitude]);

  // Update driver marker when location changes
  useEffect(() => {
    if (isMapLoaded && mapInstanceRef.current && currentDriverLocation) {
      if (driverMarkerRef.current) {
        driverMarkerRef.current.setPosition({
          lat: currentDriverLocation.latitude,
          lng: currentDriverLocation.longitude
        });
      } else {
        driverMarkerRef.current = new window.google.maps.Marker({
          position: { lat: currentDriverLocation.latitude, lng: currentDriverLocation.longitude },
          map: mapInstanceRef.current,
          title: "Driver Location",
          icon: {
            url: "data:image/svg+xml;charset=UTF-8,%3csvg width='32' height='32' viewBox='0 0 32 32' fill='none' xmlns='http://www.w3.org/2000/svg'%3e%3ccircle cx='16' cy='16' r='14' fill='%234682b4'/%3e%3cpath d='M16 8v16M8 16h16' stroke='white' stroke-width='2'/%3e%3c/svg%3e",
            scaledSize: new window.google.maps.Size(32, 32)
          }
        });
      }
    }
  }, [isMapLoaded, currentDriverLocation]);

  // Update destination marker
  useEffect(() => {
    if (isMapLoaded && mapInstanceRef.current && currentDestination) {
      if (destinationMarkerRef.current) {
        destinationMarkerRef.current.setPosition({
          lat: currentDestination.latitude,
          lng: currentDestination.longitude
        });
      } else {
        destinationMarkerRef.current = new window.google.maps.Marker({
          position: { lat: currentDestination.latitude, lng: currentDestination.longitude },
          map: mapInstanceRef.current,
          title: currentDestination.address || "Destination",
          icon: {
            url: "data:image/svg+xml;charset=UTF-8,%3csvg width='32' height='32' viewBox='0 0 32 32' fill='none' xmlns='http://www.w3.org/2000/svg'%3e%3cpath d='M16 4c-6.627 0-12 5.373-12 12 0 9 12 16 12 16s12-7 12-16c0-6.627-5.373-12-12-12zm0 16c-2.209 0-4-1.791-4-4s1.791-4 4-4 4 1.791 4 4-1.791 4-4 4z' fill='%23dc2626'/%3e%3c/svg%3e",
            scaledSize: new window.google.maps.Size(32, 32)
          }
        });
      }
    }
  }, [isMapLoaded, currentDestination]);

  const handleCenterOnDriver = () => {
    if (mapInstanceRef.current && currentDriverLocation) {
      mapInstanceRef.current.setCenter({
        lat: currentDriverLocation.latitude,
        lng: currentDriverLocation.longitude
      });
      mapInstanceRef.current.setZoom(15);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-500';
      case 'confirmed': return 'bg-blue-500';
      case 'in_transit': return 'bg-green-500';
      case 'delivered': return 'bg-gray-500';
      case 'cancelled': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <Card className={`overflow-hidden ${className}`}>
      <CardContent className="p-0">
        <div className="relative">
          {/* Map Container */}
          <div 
            ref={mapRef} 
            className="w-full h-64 bg-gray-100"
            style={{ minHeight: '256px' }}
          />
          
          {/* Status Overlay */}
          {showControls && (
            <div className="absolute top-4 left-4 right-4 flex items-start justify-between">
              <div className="flex flex-col gap-2">
                <Badge 
                  variant="secondary" 
                  className={`${getStatusColor(orderStatus)} text-white`}
                >
                  <Truck className="w-3 h-3 mr-1" />
                  {orderStatus.replace('_', ' ').toUpperCase()}
                </Badge>
                
                {eta && (
                  <Badge variant="outline" className="bg-white/90 text-gray-700">
                    <Clock className="w-3 h-3 mr-1" />
                    ETA: {eta}
                  </Badge>
                )}
              </div>
              
              <Button
                size="sm"
                variant="outline"
                onClick={handleCenterOnDriver}
                className="bg-white/90 hover:bg-white"
              >
                <Navigation className="w-4 h-4" />
              </Button>
            </div>
          )}

          {/* Error State */}
          {mapError && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
              <div className="text-center p-4">
                <MapPin className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                <p className="text-gray-600 text-sm">{mapError}</p>
              </div>
            </div>
          )}

          {/* Location Info */}
          {showControls && currentDestination && (
            <div className="absolute bottom-4 left-4 right-4">
              <div className="bg-white/95 backdrop-blur-sm rounded-lg p-3 border border-gray-200">
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-red-500" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {currentDestination.address || 'Destination'}
                    </p>
                    <p className="text-xs text-gray-600">
                      {currentDestination.latitude.toFixed(4)}, {currentDestination.longitude.toFixed(4)}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
