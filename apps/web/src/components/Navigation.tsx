import { Home, Search, ShoppingCart, User, Menu, Bell, MessageSquare, MapPin, Activity } from "lucide-react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/use-auth";
import RealTimeNotificationCenter from './RealTimeNotificationCenter';
import { useRealTimeUpdates } from '../hooks/useRealTimeUpdates';

export default function Navigation() {
  const [location, setLocation] = useLocation();
  const { user } = useAuth();
  const { connected, getUnreadNotificationsCount, getActiveDeliveries } = useRealTimeUpdates();

  const unreadCount = getUnreadNotificationsCount();
  const activeDeliveries = getActiveDeliveries().length;

  const navItems = [
    { icon: Home, label: "Home", path: user?.role === "CONSUMER" ? "/consumer-home" : user?.role === "MERCHANT" ? "/merchant-dashboard" : "/driver-dashboard" },
    { icon: Search, label: "Search", path: "/merchants" },
    { icon: ShoppingCart, label: "Orders", path: "/order-history", badge: activeDeliveries > 0 ? activeDeliveries : null },
    { icon: MessageSquare, label: "Chat", path: "/chat" },
    { icon: User, label: "Profile", path: "/profile" }
  ];

  const isActive = (path: string) => location === path;

  return (
    <>
      {/* Top Navigation Bar with Real-time Features */}
      <div className="fixed top-0 left-0 right-0 bg-white border-b border-gray-200 px-4 py-2 max-w-md mx-auto z-50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h1 className="font-bold text-lg text-blue-600">Brillprime</h1>
            <div className={`h-2 w-2 rounded-full ${connected ? 'bg-green-500' : 'bg-red-500'}`} />
          </div>
          
          <div className="flex items-center gap-2">
            {/* Real-time Notifications */}
            <RealTimeNotificationCenter />
            
            {/* Location Tracking (for drivers) */}
            {user?.role === 'DRIVER' && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setLocation('/delivery-tracking')}
                className="relative p-2"
              >
                <MapPin className="h-5 w-5" />
                {activeDeliveries > 0 && (
                  <Badge className="absolute -top-1 -right-1 h-4 w-4 rounded-full p-0 flex items-center justify-center text-xs">
                    {activeDeliveries}
                  </Badge>
                )}
              </Button>
            )}
            
            {/* Admin Dashboard (for admins) */}
            {user?.role === 'ADMIN' && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setLocation('/admin-real-time')}
                className="p-2"
              >
                <Activity className="h-5 w-5" />
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-2 max-w-md mx-auto">
        <div className="flex justify-around">
          {navItems.map((item) => (
            <Button
              key={item.path}
              variant="ghost"
              size="sm"
              onClick={() => setLocation(item.path)}
              className={`flex flex-col items-center space-y-1 p-2 relative ${
                isActive(item.path) ? "text-blue-600" : "text-gray-600"
              }`}
            >
              <div className="relative">
                <item.icon className="h-5 w-5" />
                {item.badge && (
                  <Badge className="absolute -top-2 -right-2 h-4 w-4 rounded-full p-0 flex items-center justify-center text-xs">
                    {item.badge}
                  </Badge>
                )}
              </div>
              <span className="text-xs">{item.label}</span>
            </Button>
          ))}
        </div>
      </div>
    </>
  );
}