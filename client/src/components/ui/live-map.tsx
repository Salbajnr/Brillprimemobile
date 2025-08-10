import { useEffect, useRef, useState } from 'react';
import { Card, CardContent } from './card';
import { Button } from './button';
import { Badge } from './badge';
import { MapPin, Navigation, Truck, Clock } from 'lucide-react';

interface Location {
  latitude: number;
  longitude: number;
  address?: string;
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
  const [mapCenter, setMapCenter] = useState({
    latitude: driverLocation?.latitude || 6.5244,
    longitude: driverLocation?.longitude || 3.3792
  });

  const calculateDistance = (point1: Location, point2: Location): number => {
    const R = 6371; // Earth's radius in kilometers
    const dLat = ((point2.latitude - point1.latitude) * Math.PI) / 180;
    const dLon = ((point2.longitude - point1.longitude) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((point1.latitude * Math.PI) / 180) *
        Math.cos((point2.latitude * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const getEstimatedTime = (distance: number): string => {
    const averageSpeed = 30; // km/h in city traffic
    const timeInHours = distance / averageSpeed;
    const timeInMinutes = Math.round(timeInHours * 60);
    return `${timeInMinutes} min`;
  };

  useEffect(() => {
    if (driverLocation) {
      setMapCenter({
        latitude: driverLocation.latitude,
        longitude: driverLocation.longitude
      });
    }
  }, [driverLocation]);

  return (
    <Card className={`overflow-hidden ${className}`}>
      <CardContent className="p-0">
        {/* Status bar */}
        <div className="flex items-center justify-between p-3 bg-blue-50 border-b">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="bg-green-100 text-green-700 border-green-300">
              Live Tracking
            </Badge>
            {orderId && (
              <span className="text-sm text-gray-600">Order #{orderId.slice(-6)}</span>
            )}
          </div>
          <div className="flex items-center gap-1 text-sm text-blue-600">
            <Clock className="h-4 w-4" />
            <span>Real-time</span>
          </div>
        </div>

        {/* Map container */}
        <div className="relative h-64 bg-gradient-to-br from-blue-100 to-blue-200">
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center space-y-4 p-4">
              <div className="relative">
                <div className="w-16 h-16 bg-blue-500 rounded-full flex items-center justify-center mx-auto mb-2">
                  <Truck className="h-8 w-8 text-white" />
                </div>
                <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full animate-pulse"></div>
              </div>
              <div className="space-y-1">
                <div className="font-medium text-gray-800">Driver Location</div>
                <div className="text-sm text-gray-600">
                  {mapCenter.latitude.toFixed(4)}, {mapCenter.longitude.toFixed(4)}
                </div>
              </div>
            </div>
          </div>

          {/* Location markers */}
          {driverLocation && (
            <div className="absolute top-4 left-4">
              <div className="flex items-center gap-2 bg-white px-3 py-1 rounded-full shadow-sm">
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                <span className="text-sm font-medium">Driver</span>
              </div>
            </div>
          )}

          {customerLocation && (
            <div className="absolute top-4 right-4">
              <div className="flex items-center gap-2 bg-white px-3 py-1 rounded-full shadow-sm">
                <MapPin className="h-4 w-4 text-green-500" />
                <span className="text-sm font-medium">Customer</span>
              </div>
            </div>
          )}

          {merchantLocation && (
            <div className="absolute bottom-4 left-4">
              <div className="flex items-center gap-2 bg-white px-3 py-1 rounded-full shadow-sm">
                <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                <span className="text-sm font-medium">Merchant</span>
              </div>
            </div>
          )}

          {/* Animated route line */}
          {driverLocation && customerLocation && (
            <svg className="absolute inset-0 w-full h-full pointer-events-none">
              <defs>
                <linearGradient id="routeGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.8" />
                  <stop offset="100%" stopColor="#10B981" stopOpacity="0.8" />
                </linearGradient>
              </defs>
              <path
                d="M 50 50 Q 150 100 200 150"
                stroke="url(#routeGradient)"
                strokeWidth="3"
                fill="none"
                strokeDasharray="5,5"
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