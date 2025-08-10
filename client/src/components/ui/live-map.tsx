
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
