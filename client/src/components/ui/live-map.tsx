
import { useState, useEffect, useRef } from 'react';
import { MapPin, Navigation, Clock } from 'lucide-react';

interface LiveMapProps {
  orderId?: string;
  driverLocation?: {
    latitude: number;
    longitude: number;
    timestamp?: Date;
  };
  destination?: {
    latitude: number;
    longitude: number;
    address?: string;
  };
  className?: string;
}

const LiveMap: React.FC<LiveMapProps> = ({
  orderId,
  driverLocation,
  destination,
  className = "w-full h-64 rounded-lg"
}) => {
  const [currentLocation, setCurrentLocation] = useState(driverLocation);
  const [eta, setEta] = useState<string | null>(null);
  const mapRef = useRef<HTMLDivElement>(null);

  // Simulate map updates (in real implementation, use actual map library)
  useEffect(() => {
    if (driverLocation) {
      setCurrentLocation(driverLocation);
      
      // Calculate ETA (simplified)
      if (destination) {
        const distance = calculateDistance(
          driverLocation.latitude,
          driverLocation.longitude,
          destination.latitude,
          destination.longitude
        );
        const avgSpeed = 25; // km/h
        const etaMinutes = Math.round((distance / avgSpeed) * 60);
        setEta(`${etaMinutes} min`);
      }
    }
  }, [driverLocation, destination]);

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  return (
    <div className={className}>
      <div 
        ref={mapRef}
        className="relative w-full h-full bg-blue-50 rounded-lg border-2 border-blue-200 overflow-hidden"
      >
        {/* Mock map background */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-100 to-green-100">
          <div className="absolute top-1/4 left-1/4 w-8 h-8 bg-blue-500 rounded-full opacity-20"></div>
          <div className="absolute top-1/2 right-1/3 w-6 h-6 bg-green-500 rounded-full opacity-20"></div>
          <div className="absolute bottom-1/3 left-1/2 w-10 h-10 bg-gray-400 rounded-full opacity-20"></div>
        </div>

        {/* Driver location marker */}
        {currentLocation && (
          <div 
            className="absolute transform -translate-x-1/2 -translate-y-1/2 z-10"
            style={{
              left: '60%',
              top: '40%'
            }}
          >
            <div className="bg-blue-600 p-2 rounded-full shadow-lg animate-pulse">
              <Navigation className="w-4 h-4 text-white" />
            </div>
            <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-1">
              <div className="bg-black text-white text-xs px-2 py-1 rounded whitespace-nowrap">
                Driver
              </div>
            </div>
          </div>
        )}

        {/* Destination marker */}
        {destination && (
          <div 
            className="absolute transform -translate-x-1/2 -translate-y-1/2 z-10"
            style={{
              left: '30%',
              top: '70%'
            }}
          >
            <div className="bg-red-600 p-2 rounded-full shadow-lg">
              <MapPin className="w-4 h-4 text-white" />
            </div>
            <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-1">
              <div className="bg-black text-white text-xs px-2 py-1 rounded whitespace-nowrap">
                Destination
              </div>
            </div>
          </div>
        )}

        {/* Route line (simplified) */}
        {currentLocation && destination && (
          <svg className="absolute inset-0 w-full h-full pointer-events-none">
            <line
              x1="60%"
              y1="40%"
              x2="30%"
              y2="70%"
              stroke="#3B82F6"
              strokeWidth="3"
              strokeDasharray="10,5"
              className="animate-pulse"
            />
          </svg>
        )}

        {/* ETA display */}
        {eta && (
          <div className="absolute top-4 right-4 bg-white rounded-lg shadow-lg px-3 py-2">
            <div className="flex items-center space-x-2">
              <Clock className="w-4 h-4 text-blue-600" />
              <span className="text-sm font-medium">ETA: {eta}</span>
            </div>
          </div>
        )}

        {/* Status indicator */}
        <div className="absolute bottom-4 left-4 bg-white rounded-lg shadow-lg px-3 py-2">
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-sm font-medium">Live Tracking</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LiveMap;
